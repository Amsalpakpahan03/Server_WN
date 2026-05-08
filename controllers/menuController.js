const Menu = require("../models/Menu");

exports.getAllMenu = async (req, res) => {
  try {
    const menus = await Menu.find().sort({ createdAt: -1 });
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

exports.createMenu = async (req, res) => {
  try {
    console.log("[MENU CONTROLLER] Creating menu with data:", req.body);
    console.log("[MENU CONTROLLER] Compressed image:", req.compressedImage);

    const menuData = {
      name: req.body.name,
      category: req.body.category,
      price: req.body.price,
      description: req.body.description || "",
      image_url: req.compressedImage || null,
      isAvailable: true,
    };

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
    const updatedMenu = await Menu.findByIdAndUpdate(
      req.params.id,
      req.body,
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
    const deletedMenu = await Menu.findByIdAndDelete(req.params.id);

    if (!deletedMenu) {
      return res.status(404).json({
        success: false,
        message: "Menu tidak ditemukan"
      });
    }

    res.json({
      success: true,
      message: "Menu berhasil dihapus"
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