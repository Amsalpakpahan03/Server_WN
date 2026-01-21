const menuService = require("../services/menuservice");

exports.getAllMenu = async (req, res) => {
  try {
    const menus = await menuService.getAllMenu();
    res.json(menus);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.createMenu = async (req, res) => {
  try {
    const savedMenu = await menuService.createMenu(
      req.body,
      req.compressedImage
    );
    res.status(201).json(savedMenu);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal membuat menu" });
  }
};

exports.updateMenu = async (req, res) => {
  try {
    const updatedMenu = await menuService.updateMenu(
      req.params.id,
      req.body
    );
    res.json(updatedMenu);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.deleteMenu = async (req, res) => {
  try {
    await menuService.deleteMenu(req.params.id);
    res.json("Menu deleted successfully");
  } catch (err) {
    res.status(500).json(err);
  }
};
