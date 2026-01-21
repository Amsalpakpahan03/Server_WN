const express = require("express");
const router = express.Router();

const menuController = require("../controllers/menuController");
const orderController = require("../controllers/orderController");
const validateOrderToken = require("../middlewares/validateOrderToken");

const {
  publicLimiter,
  orderLimiter,
  uploadLimiter,
} = require("../middlewares/rateLimiter");

const { upload, compressMenuImage } = require("../middlewares/uploadMenuImage");

module.exports = (io) => {
  /* ================= MENU ================= */

  router.get(
    "/menu",
    publicLimiter,
    menuController.getAllMenu
  );

  router.post(
    "/menu",
    uploadLimiter,
    upload.single("image"),
    compressMenuImage,
    menuController.createMenu
  );

  router.put(
    "/menu/:id",
    publicLimiter,
    menuController.updateMenu
  );

  router.delete(
    "/menu/:id",
    publicLimiter,
    menuController.deleteMenu
  );

  /* ================= ORDERS ================= */

  // ✅ CREATE ORDER (WAJIB TOKEN MEJA)
  router.post(
    "/orders",
    orderLimiter,
    validateOrderToken,
    orderController.createOrder(io)
  );

  // 🔒 GET ORDERS (ADMIN / DASHBOARD)
  router.get(
    "/orders",
    publicLimiter,
    orderController.getAllOrders
  );

  router.get(
    "/orders/:id",
    publicLimiter,
    orderController.getOrderById
  );

  router.put(
    "/orders/:id/status",
    publicLimiter,
    orderController.updateStatus(io)
  );

  return router;
};
