const Menu = require("../models/Menu");

const BASE_URL = process.env.BASE_URL;

exports.getAllMenu = async () => {
  return await Menu.find();
};

exports.createMenu = async (payload, compressedImage) => {
  const { name, price, category, description } = payload;

  const imageUrl = compressedImage
    ? `${process.env.BASE_URL || ""}/uploads/${compressedImage}`
    : "";

  const newMenu = new Menu({
    name,
    price: Number(price),
    category,
    description: description || "",
    image_url: imageUrl,
  });

  return await newMenu.save();
};

exports.updateMenu = async (id, payload) => {
  return await Menu.findByIdAndUpdate(id, { $set: payload }, { new: true });
};

exports.deleteMenu = async (id) => {
  return await Menu.findByIdAndDelete(id);
};
