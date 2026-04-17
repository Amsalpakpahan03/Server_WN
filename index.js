require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const compression = require("compression");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// Import Utils & Models
const { generateOrderToken } = require("./utils/orderToken");
const Admin = require("./models/Admin");

// ================= APP & SERVER CONFIG =================

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Validasi Env
if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing in .env");
if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is missing in .env");

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:55923",
  "http://127.0.0.1:55923",
  "https://d4aa1b22-168c-44e1-a9a4-b990fed0bf50-00-2u5l4uo2l2hlm.sisko.replit.dev",
];

// ================= GLOBAL MIDDLEWARE =================

app.use(compression());
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= SOCKET.IO SETUP =================

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "PATCH"],
  },
});

// ================= AUTH ROUTES =================

// Endpoint untuk mendaftarkan Admin baru
app.post("/api/register", async (req, res) => {
  const { username, password, secretCode } = req.body;

  try {
    // KEAMANAN: Gunakan kode rahasia agar tidak sembarang orang bisa register via Postman
    // Anda bisa mengganti "NDESO2026" dengan kode pilihan Anda
    if (secretCode !== "NDESO2026") {
      return res.status(403).json({ message: "Kode registrasi tidak valid!" });
    }

    // 1. Cek apakah username sudah digunakan
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ message: "Username sudah terdaftar" });
    }

    // 2. Hash password menggunakan bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Simpan admin baru ke database
    const newAdmin = new Admin({
      username,
      password: hashedPassword,
      role: "admin" // Default sebagai admin
    });

    await newAdmin.save();

    res.status(201).json({ 
      success: true, 
      message: "Admin berhasil didaftarkan!" 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal melakukan registrasi" });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ message: "Username tidak ditemukan" });
    }

    // Menggunakan Bcrypt (Sangat disarankan untuk skripsi)
    // Jika data di DB masih plain text, ganti sementara ke: const isMatch = (password === admin.password);
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Password salah" });
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ success: true, token });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ================= BUSINESS ROUTES =================

app.use("/scan", require("./routes/scan"));

// Inject IO ke dalam apiRoutes
const apiRoutes = require("./routes/api")(io);
app.use("/api", apiRoutes);

// ================= STATIC FILES =================

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.use("/uploads", express.static(uploadDir, {
  maxAge: "7d",
  etag: true,
  immutable: true,
}));

// ================= DATABASE CONNECTION =================

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log(" Connected to MongoDB Atlas"))
  .catch((err) => console.error(" MongoDB Connection Error:", err));

// ================= SOCKET LOGIC =================

// Di server.js, perbaiki bagian socket logic

const tableLocks = {}; // Format: { tableId: { clientId, lastSeen } }

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  /* ================= TABLE LOCK ================= */
  socket.on("tryAccessTable", ({ tableId, clientId }) => {
    // LOCK PER MEJA, BUKAN GLOBAL
    const lock = tableLocks[tableId];

    if (lock) {
      // Cek apakah lock expired (lebih dari 10 detik tidak ada heartbeat)
      const expired = Date.now() - lock.lastSeen > 10000;
      
      if (!expired && lock.clientId !== clientId) {
        // Lock masih aktif dan client berbeda
        return socket.emit("accessDenied", {
          message: `Meja ${tableId} sedang digunakan di perangkat lain`,
        });
      }
      
      if (expired) {
        // Lock expired, hapus dan beri akses ke client baru
        console.log(`Lock for table ${tableId} expired, granting access to new client`);
        delete tableLocks[tableId];
      }
    }

    // Beri akses ke meja ini
    tableLocks[tableId] = {
      clientId,
      lastSeen: Date.now(),
    };

    socket.join(`table-${tableId}`);
    socket.emit("accessGranted", { 
      message: `Akses diberikan untuk meja ${tableId}` 
    });
    
    console.log(`Client ${clientId} granted access to table ${tableId}`);
  });

  socket.on("heartbeat", ({ tableId, clientId }) => {
    // Update lastSeen hanya jika client yang sama masih memegang lock
    if (tableLocks[tableId]?.clientId === clientId) {
      tableLocks[tableId].lastSeen = Date.now();
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    
    // Optional: Hapus lock ketika client disconnect
    // Tapi hati-hati, bisa menyebabkan masalah jika ingin pindah meja
    for (const tableId in tableLocks) {
      // Cari clientId berdasarkan socket? Ini agak rumit
      // Lebih baik biarkan heartbeat yang handle
    }
  });
});


app.post("/api/reset-table-lock/:tableNumber", (req, res) => {
  const tableNumber = req.params.tableNumber;
  
  if (tableLocks[tableNumber]) {
    delete tableLocks[tableNumber];
    res.json({ success: true, message: `Lock untuk meja ${tableNumber} telah direset` });
  } else {
    res.json({ success: true, message: `Tidak ada lock untuk meja ${tableNumber}` });
  }
});

// ================= UTIL & TEST =================

app.get("/test-token/:table", (req, res) => {
  const token = generateOrderToken(req.params.table);
  res.json({ token });
});

// ================= SERVER START =================

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});