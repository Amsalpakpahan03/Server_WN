const menuService = require("../services/menuservice");

exports.getAllMenu = async (req, res) => {
  try {
    const menus = await menuService.getAllMenu();
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
    
    const savedMenu = await menuService.createMenu(
      req.body,
      req.compressedImage
    );
    
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
    const updatedMenu = await menuService.updateMenu(
      req.params.id,
      req.body
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
    const deletedMenu = await menuService.deleteMenu(req.params.id);
    
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