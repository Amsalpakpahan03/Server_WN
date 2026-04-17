const Order = require("../models/Order");
const orderService = require("../services/OrderService"); // TAMBAHKAN INI

const getTableFromReq = (req) => req.tableNumber;

// ================= CREATE ORDER =================
exports.createOrder = (io) => async (req, res) => {
  try {
    const tableNumber = getTableFromReq(req);

    const savedOrder = await orderService.createOrder({
      tableNumber,
      items: req.body.items,
      totalPrice: req.body.totalPrice,
    });

    // Emit event ke semua client yang terhubung
    io.emit("newOrder", savedOrder);

    res.status(201).json(savedOrder);
  } catch (err) {
    if (err.message === "TABLE_INVALID") {
      return res.status(400).json({ message: "Table tidak valid" });
    }

    res.status(500).json({ message: "Gagal membuat order", error: err });
  }
};

// ================= GET ALL ORDERS =================
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
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
    const order = await Order.findById(req.params.id);

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
    const order = await orderService.updateStatus(
      req.params.id,
      req.body.status
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order tidak ditemukan",
      });
    }

    // Emit event ke semua client
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

// ================= UPDATE STATUS PER KATEGORI (UNTUK MINUMAN) =================
exports.updateCategoryStatus = (io) => async (req, res) => {
  try {
    const { id } = req.params;
    const { category, status } = req.body;

    console.log(
      `[UPDATE CATEGORY] Order: ${id}, Category: ${category}, Status: ${status}`,
    );

    // Validasi category
    const validCategories = ["Makanan", "Minuman", "Cemilan", "Paket"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Kategori tidak valid",
      });
    }

    // Validasi status
    const validStatus = ["pending", "cooking", "served"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status tidak valid",
      });
    }

    // Ambil order dari database
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order tidak ditemukan",
      });
    }

    // Update status untuk semua item dengan kategori tertentu
    let updated = false;
    let updatedCount = 0;

    order.items = order.items.map((item) => {
      if (item.category === category && item.status !== "served") {
        updated = true;
        updatedCount++;
        return { ...item, status: status };
      }
      return item;
    });

    if (!updated) {
      return res.status(400).json({
        success: false,
        message: `Tidak ada item dengan kategori ${category} yang perlu diupdate`,
      });
    }

    // Cek apakah semua item sudah served
    const allItemsServed = order.items.every(
      (item) => item.status === "served",
    );

    // Update status global order jika semua item sudah served
    if (allItemsServed && order.status !== "served") {
      order.status = "served";
      console.log(
        `[UPDATE CATEGORY] All items served, updating global status to served`,
      );
    }

    // Simpan perubahan
    await order.save();

    console.log(`[UPDATE CATEGORY] Successfully updated ${updatedCount} items`);

    // Emit event ke semua client
    io.emit("orderStatusUpdated", order);

    res.json({
      success: true,
      message: `${updatedCount} item dengan kategori ${category} berhasil diupdate menjadi ${status}`,
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

// ================= UPDATE STATUS PER ITEM (INDIVIDUAL) =================
exports.updateItemStatus = (io) => async (req, res) => {
  try {
    const { id } = req.params;
    const { itemIndex, status } = req.body;

    // Validasi status
    const validStatus = ["pending", "cooking", "served"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status tidak valid",
      });
    }

    // Ambil order dari database
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order tidak ditemukan",
      });
    }

    // Validasi index item
    if (itemIndex < 0 || itemIndex >= order.items.length) {
      return res.status(400).json({
        success: false,
        message: "Index item tidak valid",
      });
    }

    // Update status item
    order.items[itemIndex].status = status;

    // Cek apakah semua item sudah served
    const allItemsServed = order.items.every(
      (item) => item.status === "served",
    );

    // Update status global order jika semua item sudah served
    if (allItemsServed && order.status !== "served") {
      order.status = "served";
    }

    // Simpan perubahan
    await order.save();

    // Emit event ke semua client
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