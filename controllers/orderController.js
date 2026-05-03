// controllers/OrderController.js
const Order = require("../models/Order");
const orderService = require("../services/OrderService");

const getTableFromReq = (req) => {
  return req.body.tableNumber || req.query.tableNumber || req.headers['x-table-number'] || req.tableNumber;
};

// ================= CREATE ORDER =================
exports.createOrder = (io) => async (req, res) => {
  console.log("\n========== [CONTROLLER] CREATE ORDER ==========");
  console.log("[CONTROLLER] Body:", JSON.stringify(req.body, null, 2));
  console.log("[CONTROLLER] Headers:", req.headers.authorization);
  
  try {
    const tableNumber = getTableFromReq(req);
    console.log("[CONTROLLER] Table number:", tableNumber);
    
    if (!tableNumber) {
      console.log("[CONTROLLER] ❌ No table number");
      return res.status(400).json({ 
        success: false,
        message: "Table number is required" 
      });
    }

    // Validasi items
    if (!req.body.items || !Array.isArray(req.body.items) || req.body.items.length === 0) {
      console.log("[CONTROLLER] ❌ No items");
      return res.status(400).json({ 
        success: false,
        message: "Items are required and must be a non-empty array" 
      });
    }

    console.log("[CONTROLLER] ✅ Calling service...");
    const savedOrder = await orderService.createOrder({
      tableNumber,
      items: req.body.items,
      totalPrice: req.body.totalPrice || 0,
    });

    console.log("[CONTROLLER] ✅ Order saved:", savedOrder._id);
    
    io.emit("newOrder", savedOrder);

    res.status(201).json({
      success: true,
      data: savedOrder,
      message: "Order created successfully"
    });
  } catch (err) {
    console.error("[CONTROLLER] ❌ ERROR:", err.message);
    console.error("[CONTROLLER] Stack:", err.stack);
    
    if (err.message === "TABLE_INVALID") {
      return res.status(400).json({ 
        success: false,
        message: "Table tidak valid" 
      });
    }
    
    if (err.message === "TABLE_OCCUPIED") {
      return res.status(409).json({ 
        success: false,
        message: "Meja sedang digunakan, selesaikan pesanan terlebih dahulu" 
      });
    }
    
    if (err.message === "ITEMS_REQUIRED") {
      return res.status(400).json({ 
        success: false,
        message: "Items wajib diisi" 
      });
    }

    if (err.name === "ValidationError") {
      return res.status(400).json({ 
        success: false,
        message: "Data tidak valid",
        details: err.message 
      });
    }

    res.status(500).json({ 
      success: false,
      message: "Gagal membuat order", 
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }
};

// ================= GET ALL ORDERS =================
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
    res.json({
      success: true,
      data: orders,
    });
  } catch (err) {
    console.error("Error getAllOrders:", err);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data pesanan",
      error: err.message,
    });
  }
};

// ================= GET ORDER BY ID =================
exports.getOrderById = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (err) {
    console.error("Error getOrderById:", err);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data pesanan",
      error: err.message,
    });
  }
};

// ================= UPDATE STATUS GLOBAL =================
exports.updateStatus = (io) => async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const order = await orderService.updateStatus(id, status);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order tidak ditemukan",
      });
    }

    io.emit("orderStatusUpdated", order);

    res.json({
      success: true,
      message: "Status pesanan berhasil diupdate",
      data: order,
    });
  } catch (err) {
    console.error("Error updateStatus:", err);
    res.status(500).json({
      success: false,
      message: "Gagal update status",
      error: err.message,
    });
  }
};

// ================= UPDATE STATUS PER KATEGORI =================
exports.updateCategoryStatus = (io) => async (req, res) => {
  try {
    const { id } = req.params;
    const { category, status } = req.body;

    console.log(`[UPDATE CATEGORY] Order: ${id}, Category: ${category}, Status: ${status}`);

    const validCategories = ["Makanan", "Minuman", "Cemilan", "Paket"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Kategori tidak valid",
      });
    }

    const validStatus = ["pending", "cooking", "served"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status tidak valid",
      });
    }

    const order = await orderService.updateCategoryStatus(id, category, status);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order tidak ditemukan",
      });
    }

    io.emit("orderStatusUpdated", order);

    res.json({
      success: true,
      message: `Item dengan kategori ${category} berhasil diupdate menjadi ${status}`,
      data: order,
    });
  } catch (err) {
    console.error("Error updateCategoryStatus:", err);
    res.status(500).json({
      success: false,
      message: "Gagal update status kategori",
      error: err.message,
    });
  }
};

// ================= UPDATE STATUS PER ITEM =================
exports.updateItemStatus = (io) => async (req, res) => {
  try {
    const { id } = req.params;
    const { itemIndex, status } = req.body;

    if (itemIndex === undefined || !status) {
      return res.status(400).json({
        success: false,
        message: "itemIndex dan status required",
      });
    }

    const validStatus = ["pending", "cooking", "served"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status tidak valid",
      });
    }

    const order = await orderService.updateItemStatus(id, itemIndex, status);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order tidak ditemukan",
      });
    }

    io.emit("orderStatusUpdated", order);

    res.json({
      success: true,
      message: `Status item berhasil diupdate menjadi ${status}`,
      data: order,
    });
  } catch (err) {
    console.error("Error updateItemStatus:", err);
    res.status(500).json({
      success: false,
      message: "Gagal update status item",
      error: err.message,
    });
  }
};

// ================= DELETE ORDER =================
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order tidak ditemukan",
      });
    }

    res.json({
      success: true,
      message: "Pesanan berhasil dihapus",
      data: order,
    });
  } catch (err) {
    console.error("Error deleteOrder:", err);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus pesanan",
      error: err.message,
    });
  }
};