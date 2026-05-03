// routes/api.js
const express = require("express");
const router = express.Router();

const menuController = require("../controllers/menuController");
const orderController = require("../controllers/orderController");
const validateOrderToken = require("../middlewares/validateOrderToken");
const adminAuth = require("../middlewares/authAdmin");

const {
  publicLimiter,
  orderLimiter,
  uploadLimiter,
} = require("../middlewares/rateLimiter");

const { upload, compressMenuImage } = require("../middlewares/uploadMenuImage");

module.exports = (io) => {
  console.log("[ROUTES] Initializing routes...");

  /* ================= MENU ================= */
  router.get("/menu", publicLimiter, menuController.getAllMenu);
  router.post("/menu", uploadLimiter, upload.single("image"), compressMenuImage, menuController.createMenu);
  router.put("/menu/:id", publicLimiter, menuController.updateMenu);
  router.delete("/menu/:id", publicLimiter, menuController.deleteMenu);

  /* ================= ORDERS ================= */
  // COMMENT VALIDATE TOKEN DULU UNTUK TESTING
  router.post("/orders", orderLimiter, orderController.createOrder(io));
  // router.post("/orders", orderLimiter, validateOrderToken, orderController.createOrder(io));
  
  router.put("/orders/:id/category-status", orderController.updateCategoryStatus(io));
  router.put("/orders/:id/update-category-status", orderController.updateCategoryStatus(io));
  
  router.get("/orders", publicLimiter, orderController.getAllOrders);
  router.get("/orders/:id", publicLimiter, orderController.getOrderById);
  router.put("/orders/:id/status", publicLimiter, orderController.updateStatus(io));
  router.delete("/orders/:id", orderController.deleteOrder);

  return router;
};