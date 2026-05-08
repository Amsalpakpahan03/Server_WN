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

// ================= CORS CONFIGURATION (DIPERBAIKI) =================

// Izinkan semua origin yang diperlukan dari environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) : [
  "http://localhost:3000",
  "https://client-wn.vercel.app"
];

// CORS middleware yang lebih fleksibel
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Cek apakah origin diizinkan (support regex)
  const isAllowed = allowedOrigins.some((allowed) => {
    if (allowed instanceof RegExp) {
      return allowed.test(origin);
    }
    return allowed === origin;
  });

  if (isAllowed || origin?.includes("vercel.app") || !origin) {
    res.header("Access-Control-Allow-Origin", origin || "*");
  }

  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header("Access-Control-Allow-Credentials", "true");

  // HEADER PENTING UNTUK GAMBAR DI HP
  res.header("Cross-Origin-Resource-Policy", "cross-origin");
  res.header("Cross-Origin-Embedder-Policy", "credentialless");
  res.header("Access-Control-Expose-Headers", "Content-Length, Content-Type");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// ================= GLOBAL MIDDLEWARE =================

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= SOCKET.IO SETUP (DENGAN CORS) =================

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Izinkan semua origin dari localhost dan vercel.app
      if (
        !origin ||
        origin.includes("localhost") ||
        origin.includes("vercel.app") ||
        allowedOrigins.some((allowed) =>
          allowed instanceof RegExp ? allowed.test(origin) : allowed === origin,
        )
      ) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH"],
    credentials: true,
  },
});

// ================= AUTH ROUTES =================

// Endpoint untuk mendaftarkan Admin baru
app.post("/api/register", async (req, res) => {
  const { username, password, secretCode } = req.body;

  try {
    // KEAMANAN: Gunakan kode rahasia agar tidak sembarang orang bisa register via Postman
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
      role: "admin",
    });

    await newAdmin.save();

    res.status(201).json({
      success: true,
      message: "Admin berhasil didaftarkan!",
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

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Password salah" });
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
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

// ================= STATIC FILES (DIPERBAIKI UNTUK GAMBAR) =================

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Middleware untuk static files dengan header CORS yang benar
app.use(
  "/uploads",
  (req, res, next) => {
    // Set header CORS untuk gambar
    res.header("Cross-Origin-Resource-Policy", "cross-origin");
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Cache-Control", "public, max-age=2592000, immutable");
    next();
  },
  express.static(uploadDir, {
    maxAge: "30d",
    etag: true,
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Access-Control-Allow-Origin", "*");
      }
    },
  }),
);

// ================= DATABASE CONNECTION =================

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ================= SOCKET LOGIC =================

const tableLocks = {}; // Format: { tableId: { clientId, lastSeen } }

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  /* ================= TABLE LOCK ================= */
  socket.on("tryAccessTable", ({ tableId, clientId }) => {
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
        console.log(
          `Lock for table ${tableId} expired, granting access to new client`,
        );
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
      message: `Akses diberikan untuk meja ${tableId}`,
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
  });
});

// ================= RESET TABLE LOCK =================

app.post("/api/reset-table-lock/:tableNumber", (req, res) => {
  const tableNumber = req.params.tableNumber;

  if (tableLocks[tableNumber]) {
    delete tableLocks[tableNumber];
    res.json({
      success: true,
      message: `Lock untuk meja ${tableNumber} telah direset`,
    });
  } else {
    res.json({
      success: true,
      message: `Tidak ada lock untuk meja ${tableNumber}`,
    });
  }
});

// ================= UTIL & TEST =================

// Test endpoint dengan CORS header yang benar
app.get("/test-token/:table", (req, res) => {
  const token = generateOrderToken(req.params.table);
  res.json({ token });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    cors: "Enabled for Vercel",
  });
});

// UPDATE ALL LOCALHOST IMAGES
app.get("/api/migrate-images", async (req, res) => {
  const Menu = require("./models/Menu");

  try {
    // Cari semua menu dengan image_url mengandung localhost atau uploads/
    const menus = await Menu.find({
      $or: [{ image_url: /localhost/ }, { image_url: /^\/uploads/ }],
    });

    console.log(`Found ${menus.length} images to migrate`);

    const BASE_URL = process.env.BASE_URL || "https://103.123.19.59.nip.io";
    let updated = 0;

    for (const menu of menus) {
      let oldUrl = menu.image_url;
      let newUrl = oldUrl;

      // Case 1: http://localhost:5000/uploads/xxx.jpg
      if (oldUrl.includes("localhost:5000")) {
        newUrl = oldUrl.replace("http://localhost:5000", BASE_URL);
      }
      // Case 2: /uploads/xxx.jpg (relative path)
      else if (oldUrl.startsWith("/uploads")) {
        newUrl = `${BASE_URL}${oldUrl}`;
      }

      if (newUrl !== oldUrl) {
        menu.image_url = newUrl;
        await menu.save();
        updated++;
        console.log(`✅ ${menu.name}: ${oldUrl} → ${newUrl}`);
      }
    }

    res.json({
      success: true,
      message: `Migrated ${updated} images`,
      updatedCount: updated,
    });
  } catch (error) {
    console.error("Migration error:", error);
    res.status(500).json({ error: error.message });
  }
});

// FIX LOCALHOST IMAGES
app.get("/api/fix-localhost-images", async (req, res) => {
  const Menu = require("./models/Menu");

  try {
    const result = await Menu.updateMany(
      { image_url: /localhost:5000/ },
      {
        $set: {
          image_url: {
            $replaceOne: {
              input: "$image_url",
              find: "http://localhost:5000",
              replacement: process.env.BASE_URL || "https://103.123.19.59.nip.io",
            },
          },
        },
      },
    );

    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} images`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// FIX MIXED CONTENT
app.get("/api/fix-mixed-content", async (req, res) => {
  const Menu = require("./models/Menu");

  try {
    // Cari semua menu dengan image_url mengandung localhost
    const menus = await Menu.find({ image_url: /localhost:5000/ });

    let updatedCount = 0;
    for (const menu of menus) {
      const newUrl = menu.image_url.replace(
        "http://localhost:5000",
        process.env.BASE_URL || "https://103.123.19.59.nip.io",
      );
      menu.image_url = newUrl;
      await menu.save();
      updatedCount++;
      console.log(`Updated: ${menu.name} - ${newUrl}`);
    }

    res.json({
      message: "Mixed content fixed",
      updated: updatedCount,
      menus: menus.map((m) => ({ name: m.name, image_url: m.image_url })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= ENDPOINT REFRESH GAMBAR (BARU) =================
app.post("/api/refresh-images", async (req, res) => {
  const Menu = require("./models/Menu");

  try {
    // Hapus timestamp dari semua URL gambar
    const menus = await Menu.find({ image_url: { $ne: null, $ne: "" } });
    let updated = 0;

    for (const menu of menus) {
      if (menu.image_url && !menu.image_url.includes("no-image.png")) {
        // Hapus timestamp lama jika ada
        const cleanUrl = menu.image_url.split("?")[0];
        if (cleanUrl !== menu.image_url) {
          menu.image_url = cleanUrl;
          await menu.save();
          updated++;
        }
      }
    }

    res.json({
      success: true,
      message: `Cleaned ${updated} image URLs`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk rename gambar lama (jalankan sekali)
app.get("/api/rename-old-images", async (req, res) => {
  const Menu = require("./models/Menu");
  const fs = require("fs");
  const path = require("path");

  try {
    const menus = await Menu.find({ image_url: { $ne: null } });
    let renamed = 0;

    for (const menu of menus) {
      if (menu.image_url && !menu.image_url.includes("no-image")) {
        const oldPath = path.join(__dirname, "uploads", menu.image_url);
        const ext = path.extname(menu.image_url);
        const newName = `new-${Date.now()}-${menu._id}${ext}`;
        const newPath = path.join(__dirname, "uploads", newName);

        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
          menu.image_url = newName;
          await menu.save();
          renamed++;
          console.log(`Renamed: ${menu.name}`);
        }
      }
    }

    res.json({ message: `Renamed ${renamed} images` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Perbaiki semua URL gambar yang masih pakai server lama
app.get("/api/update-image-urls", async (req, res) => {
  const Menu = require("./models/Menu");

  try {
    // Cari semua menu yang image_url-nya masih pakai server lama (d4aa1b22...)
    const menus = await Menu.find({
      image_url: /d4aa1b22-168c-44e1-a9a4-b990fed0bf50/,
    });

    let updated = 0;

    for (const menu of menus) {
      // Ambil hanya nama file dari URL lama
      const oldUrl = menu.image_url;
      const filename = oldUrl.split("/").pop();

      // Update jadi hanya nama file (tanpa domain)
      menu.image_url = filename;
      await menu.save();
      updated++;

      console.log(`✅ ${menu.name}: ${oldUrl} → ${filename}`);
    }

    res.json({
      success: true,
      message: `Berhasil memperbaiki ${updated} menu`,
      updatedCount: updated,
      menus: menus.map((m) => ({ name: m.name, new_url: m.image_url })),
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/copy-old-images", async (req, res) => {
  const https = require("https");
  const fs = require("fs");
  const path = require("path");
  const Menu = require("./models/Menu");

  const OLD_SERVER =
    "https://d4aa1b22-168c-44e1-a9a4-b990fed0bf50-00-2u5l4uo2l2hlm.sisko.replit.dev";
  const uploadDir = path.join(__dirname, "uploads");

  const menus = await Menu.find({
    image_url: {
      $in: [
        "menu-1769696403504.jpg",
        "menu-1769696478311.jpg",
        "menu-1769696535876.jpg",
        "menu-1769696594875.jpg",
        "menu-1769696629491.jpg",
        "menu-1769696678070.jpg",
        "menu-1769696872597.jpg",
        "menu-1769696987637.jpg",
        "menu-1769697310054.jpg",
        "menu-1769697359181.jpg",
        "menu-1769697402211.jpg",
        "menu-1769697474890.jpg",
      ],
    },
  });

  let copied = 0;
  let failed = [];

  for (const menu of menus) {
    const oldUrl = `${OLD_SERVER}/uploads/${menu.image_url}`;
    const filePath = path.join(uploadDir, menu.image_url);

    // Cek apakah file sudah ada
    if (fs.existsSync(filePath)) {
      console.log(`✅ File sudah ada: ${menu.image_url}`);
      copied++;
      continue;
    }

    try {
      await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        https
          .get(oldUrl, (response) => {
            if (response.statusCode === 200) {
              response.pipe(file);
              file.on("finish", () => {
                file.close();
                console.log(`✅ Copied: ${menu.image_url}`);
                resolve();
              });
            } else {
              reject(new Error(`HTTP ${response.statusCode}`));
            }
          })
          .on("error", reject);
      });
      copied++;
    } catch (error) {
      failed.push({ name: menu.name, url: oldUrl, error: error.message });
      console.log(`❌ Failed: ${menu.name}`);
    }
  }

  res.json({
    message: `Selesai. Berhasil copy ${copied} file, gagal ${failed.length}`,
    failed,
  });
});

// ================= SERVER START =================

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for Vercel deployments`);
  console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
});
