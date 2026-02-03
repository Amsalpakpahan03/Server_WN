const orderService = require("../services/OrderService");

/**
 * ❗ CATATAN PENTING
 * Tidak mengakses req di level module
 */
const getTableFromReq = (req) => req.tableNumber;

// ================= CREATE ORDER =================
// exports.createOrder = (io) => async (req, res) => {
//   try {
//     const tableNumber = getTableFromReq(req);

//     const savedOrder = await orderService.createOrder({
//       tableNumber,
//       items: req.body.items,
//       totalPrice: req.body.totalPrice,
//     });

//     io.emit("newOrder", savedOrder);

//     res.status(201).json(savedOrder);
//   } catch (err) {
//     if (err.message === "TABLE_INVALID") {
//       return res.status(400).json({ message: "Table tidak valid" });
//     }

//     res.status(500).json({ message: "Gagal membuat order", error: err });
//   }
// };
// controllers/OrderController.js

exports.createOrder = (io) => async (req, res) => {
  try {
    const tableNumber = getTableFromReq(req);
    const savedOrder = await orderService.createOrder({
      tableNumber,
      items: req.body.items,
      totalPrice: req.body.totalPrice,
    });

    io.emit("newOrder", savedOrder);
    res.status(201).json(savedOrder);
  } catch (err) {
    if (err.message === "TABLE_INVALID") {
      return res.status(400).json({ message: "Table tidak valid" });
    }
    // Tambahkan pesan ini
    if (err.message === "TABLE_OCCUPIED") {
      return res
        .status(429)
        .json({ message: "Terlalu banyak order dalam waktu singkat." });
    }

    res
      .status(500)
      .json({ message: "Gagal membuat order", error: err.message });
  }
};

// ================= GET ALL ORDERS =================
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
    res.json(orders);
  } catch (err) {
    res.status(500).json(err);
  }
};

// ================= GET ORDER BY ID =================
exports.getOrderById = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order tidak ditemukan" });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json(err);
  }
};

// ================= UPDATE STATUS =================
exports.updateStatus = (io) => async (req, res) => {
  try {
    const order = await orderService.updateStatus(
      req.params.id,
      req.body.status,
    );

    if (!order) {
      return res.status(404).json({ message: "Order tidak ditemukan" });
    }

    io.emit("orderStatusUpdated", order);

    res.json(order);
  } catch (err) {
    res.status(500).json(err);
  }
};
