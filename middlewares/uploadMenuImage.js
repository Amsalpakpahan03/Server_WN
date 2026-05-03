const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// ================= MULTER =================

const storage = multer.memoryStorage();

// Add file filter to validate file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung. Gunakan JPG, PNG, atau WEBP'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: fileFilter
});

// ================= HELPER: VALIDATE & FIX JPEG =================

const validateAndFixImage = async (buffer) => {
  try {
    // Try to get metadata to validate image
    await sharp(buffer).metadata();
    return buffer;
  } catch (error) {
    console.log("Image validation failed:", error.message);
    
    // Handle corrupt JPEG
    if (error.message.includes("Corrupt JPEG") || error.message.includes("extraneous bytes")) {
      // Find JPEG start marker (0xFF 0xD8)
      const jpegStart = buffer.indexOf(Buffer.from([0xFF, 0xD8]));
      
      if (jpegStart !== -1) {
        // Extract valid JPEG part
        const fixedBuffer = buffer.slice(jpegStart);
        
        // Verify the fixed buffer
        await sharp(fixedBuffer).metadata();
        console.log("Image successfully repaired");
        return fixedBuffer;
      }
    }
    
    throw error;
  }
};

// ================= COMPRESS IMAGE =================

const compressMenuImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    // Validate and fix corrupt image
    let imageBuffer;
    try {
      imageBuffer = await validateAndFixImage(req.file.buffer);
    } catch (validationError) {
      console.error("Image validation error:", validationError);
      return res.status(400).json({ 
        message: "File gambar rusak atau tidak valid. Silakan coba dengan gambar lain.",
        error: validationError.message
      });
    }

    // Create uploads directory if not exists
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const filename = `menu-${Date.now()}.jpg`;
    const filepath = path.join(uploadDir, filename);

    // Compress and save image with error handling
    await sharp(imageBuffer)
      .resize(500, 500, {
        fit: 'cover',
        position: 'center',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality: 80,
        progressive: true,
        force: true // Force JPEG output even if input is different format
      })
      .toFile(filepath);

    req.compressedImage = filename;
    next();
  } catch (err) {
    console.error("Image compress error:", err);
    
    // Send more specific error message based on error type
    let errorMessage = "Gagal memproses gambar";
    if (err.message.includes("Corrupt JPEG")) {
      errorMessage = "File JPEG rusak. Silakan coba dengan gambar lain atau konversi ke format PNG terlebih dahulu.";
    } else if (err.message.includes("unsupported image format")) {
      errorMessage = "Format gambar tidak didukung. Gunakan JPG, PNG, atau WEBP.";
    } else if (err.message.includes("input buffer has corrupt header")) {
      errorMessage = "File gambar rusak. Silakan coba dengan gambar yang berbeda.";
    }
    
    res.status(500).json({ 
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ================= EXPORT =================

module.exports = {
  upload,
  compressMenuImage,
};