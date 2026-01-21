require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const compression = require("compression");
const { generateOrderToken } = require("./utils/orderToken");

// ================= APP & SERVER =================

const app = express();
const server = http.createServer(app);

// ================= CONFIG =================

const PORT = process.env.PORT || 5000;

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:55923",
  "http://127.0.0.1:55923",
];

const DB_URI = process.env.MONGODB_URI;

if (!DB_URI) {
  throw new Error("MONGODB_URI is not defined in .env");
}

// ================= SOCKET.IO =================

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "PATCH"],
  },
});

// ================= GLOBAL MIDDLEWARE =================

app.use(compression());

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= ROUTES =================

app.use("/scan", require("./routes/scan"));

const apiRoutes = require("./routes/api")(io);
app.use("/api", apiRoutes);

// ================= STATIC FILES =================

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use(
  "/uploads",
  express.static(uploadDir, {
    maxAge: "7d",
    etag: true,
    immutable: true,
  })
);

// ================= DATABASE =================

mongoose
  .connect(DB_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// ================= SOCKET LOGIC =================

const tableLocks = {};

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("tryAccessTable", ({ tableId, clientId }) => {
    const lock = tableLocks[tableId];

    if (lock && lock.clientId !== clientId) {
      const isExpired = Date.now() - lock.lastSeen > 10000;
      if (!isExpired) {
        return socket.emit("accessDenied", {
          message: "Meja sedang digunakan",
        });
      }
    }

    tableLocks[tableId] = {
      clientId,
      lastSeen: Date.now(),
    };

    socket.join(`table-${tableId}`);
    socket.emit("accessGranted");
  });

  socket.on("heartbeat", ({ tableId, clientId }) => {
    if (
      tableLocks[tableId] &&
      tableLocks[tableId].clientId === clientId
    ) {
      tableLocks[tableId].lastSeen = Date.now();
    }
  });

  socket.on("leaveTable", (tableId) => {
    delete tableLocks[tableId];
    console.log(`Table ${tableId} is now free`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// ================= UTIL =================

app.get("/test-token/:table", (req, res) => {
  const token = generateOrderToken(req.params.table);
  res.json({ token });
});

// ================= SERVER START =================

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
