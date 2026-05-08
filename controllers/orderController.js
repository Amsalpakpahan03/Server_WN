const Order = require("../models/Order");
const Menu = require("../models/Menu");
const orderService = require("../services/OrderService");

const getTableFromReq = (req) => req.tableNumber;

// ================= FUNGSI UNTUK EXPAND PAKET =================
const expandPackageItems = async (items) => {
  const expandedItems = [];

  for (const item of items) {
    console.log(
      `[EXPAND] Processing item: ${item.name}, category: ${item.category}`,
    );

    // Cari menu item dari database berdasarkan nama
    const menuItem = await Menu.findOne({ name: item.name });

    if (
      menuItem &&
      menuItem.category === "Paket" &&
      menuItem.includesDrinks === true
    ) {
      console.log(
        `[EXPAND] Paket ditemukan: ${item.name}, include drinks: true`,
      );

      // 1. Tambahkan item paket itu sendiri
      expandedItems.push({
        name: item.name,
        description: item.description || "",
        quantity: item.quantity,
        price: item.price,
        category: "Paket",
        status: "pending",
        isPackage: true,
      });

      // 2. Tambahkan minuman untuk setiap quantity paket
      if (menuItem.includedDrinkIds && menuItem.includedDrinkIds.length > 0) {
        // Ambil data minuman berdasarkan ID
        const drinks = await Menu.find({
          _id: { $in: menuItem.includedDrinkIds },
        });
        console.log(`[EXPAND] Menemukan ${drinks.length} minuman untuk paket`);

        for (let i = 0; i < item.quantity; i++) {
          for (const drink of drinks) {
            expandedItems.push({
              name: drink.name,
              description: `Minuman gratis dari paket ${item.name}`,
              quantity: 1,
              price: 0,
              category: "Minuman",
              status: "pending",
              isIncludedInPackage: true,
              parentPackageName: item.name,
            });
            console.log(`[EXPAND] Menambahkan minuman: ${drink.name} (gratis)`);
          }
        }
      } else {
        // Jika tidak ada minuman spesifik, tambahkan minuman default
        console.log(
          `[EXPAND] Tidak ada minuman spesifik, tambahkan minuman default`,
        );
        for (let i = 0; i < item.quantity; i++) {
          expandedItems.push({
            name: `Minuman (${item.name})`,
            description: `Minuman yang termasuk dalam paket ${item.name}`,
            quantity: 1,
            price: 0,
            category: "Minuman",
            status: "pending",
            isIncludedInPackage: true,
            parentPackageName: item.name,
          });
        }
      }
    } else {
      // Bukan paket dengan include drinks, tambahkan biasa
      console.log(`[EXPAND] Item biasa: ${item.name}`);
      expandedItems.push({
        name: item.name,
        description: item.description || "",
        quantity: item.quantity,
        price: item.price,
        category: item.category,
        status: "pending",
      });
    }
  }

  console.log(`[EXPAND] Total items setelah expand: ${expandedItems.length}`);
  return expandedItems;
};

// ================= CREATE ORDER =================
exports.createOrder = (io) => async (req, res) => {
  try {
    const tableNumber = getTableFromReq(req);

    console.log(
      "[CREATE ORDER] Request body:",
      JSON.stringify(req.body, null, 2),
    );

    // EXPAND PAKET SEBELUM DISIMPAN
    const expandedItems = await expandPackageItems(req.body.items);

    console.log(
      "[CREATE ORDER] Items setelah expand:",
      JSON.stringify(expandedItems, null, 2),
    );

    // Hitung ulang total price (minuman gratis tidak dihitung)
    const totalPrice = expandedItems.reduce((sum, item) => {
      if (!item.isIncludedInPackage) {
        return sum + item.price * item.quantity;
      }
      return sum;
    }, 0);

    const savedOrder = await orderService.createOrder({
      tableNumber,
      items: expandedItems,
      totalPrice,
    });

    console.log(
      `[CREATE ORDER] Order berhasil dibuat dengan ${expandedItems.length} items`,
    );

    io.emit("newOrder", savedOrder);
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error("[CREATE ORDER] Error:", err);
    if (err.message === "TABLE_INVALID") {
      return res.status(400).json({ message: "Table tidak valid" });
    }
    res
      .status(500)
      .json({ message: "Gagal membuat order", error: err.message });
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
      req.body.status,
    );
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

    console.log(
      `[UPDATE CATEGORY] Order: ${id}, Category: ${category}, Status: ${status}`,
    );

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

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order tidak ditemukan",
      });
    }

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

    const allItemsServed = order.items.every(
      (item) => item.status === "served",
    );
    if (allItemsServed && order.status !== "served") {
      order.status = "served";
      console.log(
        `[UPDATE CATEGORY] All items served, updating global status to served`,
      );
    }

    await order.save();
    console.log(`[UPDATE CATEGORY] Successfully updated ${updatedCount} items`);

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

// ================= UPDATE STATUS PER ITEM =================
exports.updateItemStatus = (io) => async (req, res) => {
  try {
    const { id } = req.params;
    const { itemIndex, status } = req.body;

    const validStatus = ["pending", "cooking", "served"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status tidak valid",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order tidak ditemukan",
      });
    }

    if (itemIndex < 0 || itemIndex >= order.items.length) {
      return res.status(400).json({
        success: false,
        message: "Index item tidak valid",
      });
    }

    order.items[itemIndex].status = status;

    const allItemsServed = order.items.every(
      (item) => item.status === "served",
    );
    if (allItemsServed && order.status !== "served") {
      order.status = "served";
    }

    await order.save();
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
