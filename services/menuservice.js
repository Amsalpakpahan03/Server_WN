const Menu = require("../models/Menu");

exports.getAllMenu = async () => {
  return await Menu.find();
};

exports.createMenu = async ({ name, price, category, description }, compressedImage) => {
  const imageUrl = compressedImage
    ? `http://localhost:5000/uploads/${compressedImage}`
    : "";

  const newMenu = new Menu({
    name,
    price,
    category,
    description,
    image_url: imageUrl,
  });

  return await newMenu.save();
};

exports.updateMenu = async (id, payload) => {
  return await Menu.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true }
  );
};

exports.deleteMenu = async (id) => {
  return await Menu.findByIdAndDelete(id);
};
