const express = require("express");
const router = express.Router();

const menuController = require("../controllers/menuController");
const orderController = require("../controllers/orderController");
const analyticsController = require("../controllers/analyticsController");
const authAdmin = require("../middlewares/authAdmin");
const { upload } = require("../middlewares/uploadMenuImage");

module.exports = (io) => {
  console.log("[ROUTES] Initializing routes...");

  // ================= MENU ROUTES =================
  router.get("/menu", menuController.getAllMenu);
  router.get("/admin/menu", menuController.getAllMenuAdmin);
  router.get("/menu/deleted", menuController.getDeletedMenu);
  router.post("/menu", upload.single("image"), menuController.createMenu);
  router.put("/menu/:id", menuController.updateMenu);
  router.patch("/menu/:id/toggle-availability", menuController.toggleAvailability);
  router.patch("/admin/menu/:id/toggle-availability", menuController.toggleAvailability);
  router.delete("/menu/:id", menuController.deleteMenu);
  router.put("/menu/:id/restore", menuController.restoreMenu);
  router.delete("/menu/:id/permanent", menuController.permanentDeleteMenu);

  // ================= ORDER ROUTES =================
  router.post("/orders", orderController.createOrder(io));
  router.get("/orders", orderController.getAllOrders);
  router.get("/orders/:id", orderController.getOrderById);
  router.put("/orders/:id/items", orderController.addItemsToOrder(io));
  router.put("/orders/:id/status", orderController.updateStatus(io));
  router.put("/orders/:id/category-status", orderController.updateCategoryStatus(io));
  router.put("/orders/:id/update-category-status", orderController.updateCategoryStatus(io));
  router.delete("/orders/:id", orderController.deleteOrder);

  // ================= ADMIN ORDER ROUTES =================
  router.post("/admin/orders", authAdmin, orderController.createAdminOrder(io));
  router.put("/admin/orders/:id", authAdmin, orderController.updateAdminOrder(io));
  router.get("/admin/orders/all", authAdmin, orderController.getAdminOrders);

  // ================= ANALYTICS ROUTES =================
  router.get("/analytics/best-selling", analyticsController.getBestSellingMenu);
  router.get("/analytics/sales-summary", analyticsController.getSalesSummary);
  router.get("/analytics/orders-history", analyticsController.getOrdersHistory);
  router.get("/analytics/orders-stats", analyticsController.getOrdersStats);
  router.get("/analytics/order-report", analyticsController.getOrderReport);

  return router;
};