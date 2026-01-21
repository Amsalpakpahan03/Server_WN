const rateLimit = require("express-rate-limit");

/* ================= PUBLIC ================= */
// Akses umum (menu, lihat order, dll)
const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Terlalu banyak request. Silakan coba lagi."
  },
});

/* ================= ORDER ================= */
// Order harus ketat (anti spam order)
const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    message: "Terlalu banyak order dalam waktu singkat."
  },
});

/* ================= UPLOAD ================= */
// Upload image paling berat
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    message: "Upload terlalu sering. Tunggu sebentar."
  },
});

/* ================= ADMIN ================= */
// Admin → longgar tapi tetap aman
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: {
    message: "Terlalu banyak request admin."
  },
});

/* ================= AUTH ================= */
// Login brute force protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5,
  message: {
    message: "Terlalu banyak percobaan login. Coba lagi nanti."
  },
});

module.exports = {
  publicLimiter,
  orderLimiter,
  uploadLimiter,
  adminLimiter,
  authLimiter,
};
