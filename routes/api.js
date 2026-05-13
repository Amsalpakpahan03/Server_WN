const express = require("express");
const router = express.Router();

const menuController = require("../controllers/menuController");
const orderController = require("../controllers/orderController");
const { upload } = require("../middlewares/uploadMenuImage");

module.exports = (io) => {
  console.log("[ROUTES] Initializing routes...");

  // ================= MENU ROUTES =================
  router.get("/menu", menuController.getAllMenu);
  router.post("/menu", upload.single("image"), menuController.createMenu);
  router.put("/menu/:id", menuController.updateMenu);
  router.delete("/menu/:id", menuController.deleteMenu);

  // ================= ORDER ROUTES =================
  router.post("/orders", orderController.createOrder(io));
  router.get("/orders", orderController.getAllOrders);
  router.get("/orders/:id", orderController.getOrderById);
  router.put("/orders/:id/status", orderController.updateStatus(io));
  router.put("/orders/:id/category-status", orderController.updateCategoryStatus(io));
  router.put("/orders/:id/update-category-status", orderController.updateCategoryStatus(io));
  router.delete("/orders/:id", orderController.deleteOrder);

  return router;
};