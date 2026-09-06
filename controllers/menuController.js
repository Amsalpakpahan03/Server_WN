const Menu = require("../models/Menu");

const parseBoolean = (value) => value === true || value === "true" || value === "1";
const parseVariants = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    return JSON.parse(value);
  } catch (err) {
    console.error("Failed to parse variants:", err);
    return [];
  }
};

exports.getAllMenu = async (req, res) => {
  try {
    // Filter hanya menu yang tersedia dan tidak dihapus
    const menus = await Menu.find({ isDeleted: false, isAvailable: true }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: menus,
      message: "Menu retrieved successfully"
    });
  } catch (err) {
    console.error("[MENU CONTROLLER] Error in getAllMenu:", err);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data menu",
      error: err.message
    });
  }
};

exports.getAllMenuAdmin = async (req, res) => {
  try {
    // Admin dapat melihat semua menu yang tidak dihapus, termasuk yang nonaktif
    const menus = await Menu.find({ isDeleted: false }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: menus,
      message: "Admin menu retrieved successfully"
    });
  } catch (err) {
    console.error("[MENU CONTROLLER] Error in getAllMenuAdmin:", err);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data menu admin",
      error: err.message
    });
  }
};

exports.toggleAvailability = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu tidak ditemukan"
      });
    }

    if (menu.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Tidak dapat mengubah status menu yang telah dihapus"
      });
    }

    menu.isAvailable = !menu.isAvailable;
    await menu.save();

    res.json({
      success: true,
      data: menu,
      message: `Menu berhasil ${menu.isAvailable ? "diaktifkan" : "dinonaktifkan"}`
    });
  } catch (err) {
    console.error("[MENU CONTROLLER] Error in toggleAvailability:", err);
    res.status(500).json({
      success: false,
      message: "Gagal mengubah status ketersediaan menu",
      error: err.message
    });
  }
};

exports.createMenu = async (req, res) => {
  try {
    console.log("[MENU CONTROLLER] Creating menu with data:", req.body);
    console.log("[MENU CONTROLLER] File:", req.file);  // ← Tambahkan ini
    console.log("[MENU CONTROLLER] Compressed image:", req.compressedImage);

    // ✅ PRIORITAS: Ambil dari req.file jika ada
    let imageUrl = null;
    
    if (req.file) {
      // File langsung dari multer
      imageUrl = req.file.filename;
    } else if (req.compressedImage) {
      // File setelah kompresi (jika ada)
      imageUrl = req.compressedImage;
    }

    const menuData = {
      name: req.body.name,
      category: req.body.category,
      price: Number(req.body.price) || 0,
      description: req.body.description || "",
      image_url: imageUrl,  // ← Gunakan variabel imageUrl
      isAvailable: true,
      hasTemperature: parseBoolean(req.body.hasTemperature),
      extraPriceForIce: Number(req.body.extraPriceForIce) || 1000,
      hasVariants: parseBoolean(req.body.hasVariants),
      variants: parseVariants(req.body.variants),
    };

    if (menuData.category !== "Minuman") {
      menuData.hasTemperature = false;
      menuData.extraPriceForIce = 0;
    }

    if (menuData.category !== "Makanan") {
      menuData.hasVariants = false;
      menuData.variants = [];
    }

    // Jika paket dan include drinks
    if (req.body.category === "Paket" && req.body.includesDrinks === "true") {
      menuData.includesDrinks = true;
      if (req.body.includedDrinkIds) {
        try {
          menuData.includedDrinkIds = JSON.parse(req.body.includedDrinkIds);
        } catch (e) {
          console.error("Gagal parse includedDrinkIds:", e);
        }
      }
    }

    const menu = new Menu(menuData);
    const savedMenu = await menu.save();

    console.log("[MENU CONTROLLER] Menu created with image_url:", savedMenu.image_url);

    res.status(201).json({
      success: true,
      data: savedMenu,
      message: "Menu berhasil ditambahkan"
    });
  } catch (err) {
    console.error("[MENU CONTROLLER] Error in createMenu:", err);
    res.status(500).json({
      success: false,
      message: "Gagal membuat menu",
      error: err.message
    });
  }
};

exports.updateMenu = async (req, res) => {
  try {
    const updateData = {
      ...req.body,
    };

    if (req.body.hasTemperature !== undefined) {
      updateData.hasTemperature = parseBoolean(req.body.hasTemperature);
    }

    if (req.body.hasVariants !== undefined) {
      updateData.hasVariants = parseBoolean(req.body.hasVariants);
    }

    if (req.body.extraPriceForIce !== undefined) {
      updateData.extraPriceForIce = Number(req.body.extraPriceForIce) || 0;
    }

    if (req.body.variants) {
      updateData.variants = parseVariants(req.body.variants);
    }

    const updatedMenu = await Menu.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedMenu) {
      return res.status(404).json({
        success: false,
        message: "Menu tidak ditemukan"
      });
    }

    res.json({
      success: true,
      data: updatedMenu,
      message: "Menu berhasil diupdate"
    });
  } catch (err) {
    console.error("[MENU CONTROLLER] Error in updateMenu:", err);
    res.status(500).json({
      success: false,
      message: "Gagal update menu",
      error: err.message
    });
  }
};

exports.deleteMenu = async (req, res) => {
  try {
    // Soft delete: tandai sebagai dihapus tanpa benar-benar menghapus data
    const menu = await Menu.findById(req.params.id);

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu tidak ditemukan"
      });
    }

    if (menu.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Menu sudah dihapus sebelumnya"
      });
    }

    menu.isDeleted = true;
    menu.deletedAt = new Date();
    await menu.save();

    res.json({
      success: true,
      message: "Menu berhasil dihapus (soft delete)"
    });
  } catch (err) {
    console.error("[MENU CONTROLLER] Error in deleteMenu:", err);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus menu",
      error: err.message
    });
  }
};

// ============= RESTORE SOFT DELETED MENU =============
exports.restoreMenu = async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu tidak ditemukan"
      });
    }

    if (!menu.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Menu tidak dalam status dihapus"
      });
    }

    menu.isDeleted = false;
    menu.deletedAt = null;
    await menu.save();

    res.json({
      success: true,
      data: menu,
      message: "Menu berhasil direstore"
    });
  } catch (err) {
    console.error("[MENU CONTROLLER] Error in restoreMenu:", err);
    res.status(500).json({
      success: false,
      message: "Gagal restore menu",
      error: err.message
    });
  }
};

// ============= PERMANENT DELETE MENU =============
exports.permanentDeleteMenu = async (req, res) => {
  try {
    const menu = await Menu.findByIdAndDelete(req.params.id);

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: "Menu tidak ditemukan"
      });
    }

    res.json({
      success: true,
      message: "Menu berhasil dihapus secara permanen"
    });
  } catch (err) {
    console.error("[MENU CONTROLLER] Error in permanentDeleteMenu:", err);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus menu secara permanen",
      error: err.message
    });
  }
};

// ============= GET DELETED MENUS (FOR ADMIN) =============
exports.getDeletedMenu = async (req, res) => {
  try {
    const deletedMenus = await Menu.find({ isDeleted: true }).sort({ deletedAt: -1 });
    res.json({
      success: true,
      data: deletedMenus,
      message: "Deleted menus retrieved successfully"
    });
  } catch (err) {
    console.error("[MENU CONTROLLER] Error in getDeletedMenu:", err);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data menu yang dihapus",
      error: err.message
    });
  }
};