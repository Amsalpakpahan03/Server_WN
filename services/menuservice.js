const Menu = require("../models/Menu");

// Ambil BASE_URL, fallback ke localhost jika tidak ada
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

exports.getAllMenu = async () => {
  try {
    const menus = await Menu.find();
    console.log(`[MENU SERVICE] Retrieved ${menus.length} menus`);
    return menus;
  } catch (error) {
    console.error("[MENU SERVICE] Error in getAllMenu:", error);
    throw error;
  }
};

exports.createMenu = async (payload, compressedImage) => {
  try {
    const { name, price, category, description } = payload;

    // Pastikan URL gambar lengkap dengan domain
    let imageUrl = "";
    if (compressedImage) {
      imageUrl = `${BASE_URL}/uploads/${compressedImage}`;
      console.log("[MENU SERVICE] Saving image URL:", imageUrl);
    } else {
      console.log("[MENU SERVICE] No image uploaded for menu:", name);
    }

    const newMenu = new Menu({
      name,
      price: Number(price),
      category,
      description: description || "",
      image_url: imageUrl,
    });

    const savedMenu = await newMenu.save();
    console.log("[MENU SERVICE] Menu saved successfully:", savedMenu._id);
    console.log("[MENU SERVICE] Image URL saved:", savedMenu.image_url);
    return savedMenu;
  } catch (error) {
    console.error("[MENU SERVICE] Error in createMenu:", error);
    throw error;
  }
};

exports.updateMenu = async (id, payload) => {
  try {
    const updatedMenu = await Menu.findByIdAndUpdate(
      id, 
      { $set: payload }, 
      { new: true }
    );
    console.log("[MENU SERVICE] Menu updated:", id);
    return updatedMenu;
  } catch (error) {
    console.error("[MENU SERVICE] Error in updateMenu:", error);
    throw error;
  }
};

exports.deleteMenu = async (id) => {
  try {
    const deletedMenu = await Menu.findByIdAndDelete(id);
    console.log("[MENU SERVICE] Menu deleted:", id);
    return deletedMenu;
  } catch (error) {
    console.error("[MENU SERVICE] Error in deleteMenu:", error);
    throw error;
  }
};

// Optional: Function untuk update image saja
exports.updateMenuImage = async (id, compressedImage) => {
  try {
    const imageUrl = compressedImage
      ? `${BASE_URL}/uploads/${compressedImage}`
      : "";
    
    const updatedMenu = await Menu.findByIdAndUpdate(
      id,
      { $set: { image_url: imageUrl } },
      { new: true }
    );1
    console.log("[MENU SERVICE] Menu image updated:", id);
    return updatedMenu;
  } catch (error) {
    console.error("[MENU SERVICE] Error in updateMenuImage:", error);
    throw error;
  }
};

// Optional: Function untuk get menu by ID
exports.getMenuById = async (id) => {
  try {
    const menu = await Menu.findById(id);
    return menu;
  } catch (error) {
    console.error("[MENU SERVICE] Error in getMenuById:", error);
    throw error;
  }
};

// Optional: Function untuk get menu by category
exports.getMenuByCategory = async (category) => {
  try {
    const menus = await Menu.find({ category: category });
    return menus;
  } catch (error) {
    console.error("[MENU SERVICE] Error in getMenuByCategory:", error);
    throw error;
  }
};