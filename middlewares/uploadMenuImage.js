// const multer = require('multer');
// const path = require('path');

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/');
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + '-' + file.originalname);
//   }
// });

// const upload = multer({ storage });
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// ================= MULTER =================

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// ================= COMPRESS IMAGE =================

const compressMenuImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

    const filename = `menu-${Date.now()}.jpg`;
    const filepath = path.join(uploadDir, filename);

    await sharp(req.file.buffer)
      .resize(500, 500)
      .jpeg({ quality: 80 })
      .toFile(filepath);

    req.compressedImage = filename;
    next();
  } catch (err) {
    console.error("Image compress error:", err);
    res.status(500).json({ message: "Gagal memproses gambar" });
  }
};

// ================= EXPORT =================

module.exports = {
  upload,
  compressMenuImage,
};
