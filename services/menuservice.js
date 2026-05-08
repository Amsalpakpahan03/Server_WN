const Menu = require("../models/Menu");

exports.getAllMenu = async () => {
  return await Menu.find().sort({ createdAt: -1 });
};

exports.createMenu = async (data, compressedImage) => {
  try {
    const menuData = {
      name: data.name,
      category: data.category,
      price: data.price,
      description: data.description || "",
      image_url: compressedImage || null,
      isAvailable: true,
    };

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
