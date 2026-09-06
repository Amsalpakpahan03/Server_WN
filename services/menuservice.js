const Menu = require("../models/Menu");

exports.getAllMenu = async () => {
  return await Menu.find().sort({ createdAt: -1 });
};

exports.createMenu = async (data, compressedImage) => {
  try {
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

    const menuData = {
      name: data.name,
      category: data.category,
      price: Number(data.price) || 0,
      description: data.description || "",
      image_url: compressedImage || null,
      isAvailable: true,
      hasTemperature: parseBoolean(data.hasTemperature),
      extraPriceForIce: Number(data.extraPriceForIce) || 1000,
      hasVariants: parseBoolean(data.hasVariants),
      variants: parseVariants(data.variants),
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
    if (data.category === "Paket" && data.includesDrinks === "true") {
      menuData.includesDrinks = true;
      if (data.includedDrinkIds) {
        try {
          menuData.includedDrinkIds = JSON.parse(data.includedDrinkIds);
        } catch (e) {
          console.error("Gagal parse includedDrinkIds:", e);
        }
      }
    }

    const menu = new Menu(menuData);
    return await menu.save();
  } catch (err) {
    throw err;
  }
};

exports.updateMenu = async (id, data) => {
  return await Menu.findByIdAndUpdate(id, data, { new: true });
};

exports.deleteMenu = async (id) => {
  return await Menu.findByIdAndDelete(id);
};
