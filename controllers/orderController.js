const Order = require("../models/Order");
const Menu = require("../models/Menu");
const orderService = require("../services/OrderService");

// ================= FUNGSI GET TABLE NUMBER =================
const getTableFromReq = (req) => {
  // Coba dari body dulu (POST request)
  if (req.body && req.body.tableNumber) {
    return req.body.tableNumber;
  }
  // Coba dari query params (GET request)
  if (req.query && req.query.table) {
    return req.query.table;
  }
  // Coba dari URL params
  if (req.params && req.params.tableNumber) {
    return req.params.tableNumber;
  }
  // Fallback ke property lama
  return req.tableNumber;
};

// ================= FUNGSI UNTUK EXPAND PAKET =================
const expandPackageItems = async (items) => {
  const expandedItems = [];

  for (const item of items) {
    console.log(`[EXPAND] Processing item: ${item.name} | productId: ${item.productId}`);

    // SKIP jika ini sudah minuman dari paket (dikirim dari frontend)
    if (item.isIncludedInPackage === true) {
      console.log(`[EXPAND] SKIPPING - already expanded drink: ${item.name}`);
      expandedItems.push({
        name: item.name,
        description: item.description || "",
        quantity: item.quantity,
        price: 0,
        category: "Minuman",
        status: "pending",
        isIncludedInPackage: true,
        parentPackageName: item.parentPackageName || item.packageName
      });
      continue;
    }

    let menuItem = null;

    // Cari berdasarkan productId (dari frontend)
    if (item.productId) {
      try {
        menuItem = await Menu.findById(item.productId);
        if (menuItem) console.log(`[EXPAND] Found by productId: ${menuItem.name}`);
      } catch (err) {
        console.warn(`productId error: ${item.productId}`);
      }
    }

    // Jika tidak ditemukan, cari berdasarkan name (fallback)
    if (!menuItem && item.name) {
      menuItem = await Menu.findOne({ name: item.name });
      if (menuItem) console.log(`[EXPAND] Found by name: ${menuItem.name}`);
    }

    if (!menuItem) {
      console.log(`[EXPAND] Item not found: ${item.name}`);
      expandedItems.push({
        name: item.name,
        description: item.description || "",
        quantity: item.quantity,
        price: item.price || 0,
        category: item.category || "Lainnya",
        status: "pending"
      });
      continue;
    }

    // Jika PAKET dengan include drinks
    if (menuItem.category === "Paket" && menuItem.includesDrinks === true) {
      console.log(`[EXPAND] PAKET with drinks: ${item.name}`);

      // 1. Tambah paket utama
      expandedItems.push({
        name: item.name,
        description: item.description || menuItem.description || "",
        quantity: item.quantity,
        price: item.price || menuItem.price,
        category: "Paket",
        status: "pending",
        isPackage: true
      });

      // 2. Tambah minuman dari paket
      if (menuItem.includedDrinkIds && menuItem.includedDrinkIds.length > 0) {
        const drinks = await Menu.find({ _id: { $in: menuItem.includedDrinkIds } });
        console.log(`[EXPAND] Adding ${drinks.length} drinks for package`);

        for (let i = 0; i < item.quantity; i++) {
          for (const drink of drinks) {
            expandedItems.push({
              name: drink.name,
              description: `Minuman gratis dari paket ${menuItem.name}`,
              quantity: 1,
              price: 0,
              category: "Minuman",
              status: "pending",
              isIncludedInPackage: true,
              parentPackageName: menuItem.name
            });
            console.log(`[EXPAND] Added drink: ${drink.name}`);
          }
        }
      }
    } else {
      // Item biasa (bukan paket)
      console.log(`[EXPAND] Regular item: ${item.name}`);
      expandedItems.push({
        name: item.name,
        description: item.description || menuItem.description || "",
        quantity: item.quantity,
        price: item.price || menuItem.price,
        category: menuItem.category,
        status: "pending"
      });
    }
  }

  console.log(`[EXPAND] Total expanded items: ${expandedItems.length}`);
  return expandedItems;
};

// ================= CREATE ORDER =================
exports.createOrder = (io) => async (req, res) => {
  try {
    console.log("[CREATE ORDER] ========== START ==========");
    console.log("[CREATE ORDER] Full req.body:", JSON.stringify(req.body, null, 2));
    
    const tableNumber = getTableFromReq(req);
    
    console.log("[CREATE ORDER] tableNumber from getTableFromReq:", tableNumber);
    
    if (!tableNumber) {
      console.log("[CREATE ORDER] ❌ No tableNumber found!");
      return res.status(400).json({ message: "Table tidak valid" });
    }
    
    // EXPAND PAKET
    const expandedItems = await expandPackageItems(req.body.items || []);
    
    console.log("[CREATE ORDER] Items setelah expand:", JSON.stringify(expandedItems, null, 2));
    
    // Hitung total price (minuman gratis tidak dihitung)
    const totalPrice = expandedItems.reduce((sum, item) => {
      if (!item.isIncludedInPackage) {
        return sum + (item.price || 0) * (item.quantity || 1);
      }
      return sum;
    }, 0);
    
    const notes = typeof req.body.notes === "string" ? req.body.notes.trim() : "";

    console.log("[CREATE ORDER] Total price:", totalPrice);
    console.log("[CREATE ORDER] Calling orderService with tableNumber:", tableNumber);
    
    const savedOrder = await orderService.createOrder({
      tableNumber: String(tableNumber),
      items: expandedItems,
      totalPrice,
      notes,
    });
    
    console.log(`[CREATE ORDER] ✅ Order created successfully with ${expandedItems.length} items`);
    
    io.emit("newOrder", savedOrder);
    res.status(201).json(savedOrder);
    
  } catch (err) {
    console.error("[CREATE ORDER] ❌ Error:", err);
    if (err.message === "TABLE_INVALID") {
      return res.status(400).json({ message: "Table tidak valid" });
    }
    res.status(500).json({ message: "Gagal membuat order", error: err.message });
  }
};

// ================= GET ALL ORDERS =================
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    console.error("Error getAllOrders:", err);
    res.status(500).json({ success: false, message: "Gagal mengambil data pesanan", error: err.message });
  }
};

// ================= GET ORDER BY ID =================
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order tidak ditemukan" });
    }
    res.json({ success: true, data: order });
  } catch (err) {
    console.error("Error getOrderById:", err);
    res.status(500).json({ success: false, message: "Gagal mengambil data pesanan", error: err.message });
  }
};

// ================= UPDATE STATUS GLOBAL =================
exports.updateStatus = (io) => async (req, res) => {
  try {
    const order = await orderService.updateStatus(req.params.id, req.body.status);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order tidak ditemukan" });
    }
    io.emit("orderStatusUpdated", order);
    res.json({ success: true, message: "Status pesanan berhasil diupdate", data: order });
  } catch (err) {
    console.error("Error updateStatus:", err);
    res.status(500).json({ success: false, message: "Gagal update status", error: err.message });
  }
};

// ================= UPDATE STATUS PER KATEGORI =================
exports.updateCategoryStatus = (io) => async (req, res) => {
  try {
    const { id } = req.params;
    const { category, status } = req.body;

    const validCategories = ["Makanan", "Minuman", "Cemilan", "Paket"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ success: false, message: "Kategori tidak valid" });
    }

    const validStatus = ["pending", "cooking", "served"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({ success: false, message: "Status tidak valid" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order tidak ditemukan" });
    }

    let updatedCount = 0;
    order.items = order.items.map((item) => {
      if (item.category === category && item.status !== "served") {
        updatedCount++;
        return { ...item, status: status };
      }
      return item;
    });

    if (updatedCount === 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Tidak ada item dengan kategori ${category} yang perlu diupdate` 
      });
    }

    const allItemsServed = order.items.every((item) => item.status === "served");
    if (allItemsServed && order.status !== "served") {
      order.status = "served";
    }

    await order.save();
    io.emit("orderStatusUpdated", order);
    
    res.json({ 
      success: true, 
      message: `${updatedCount} item dengan kategori ${category} berhasil diupdate menjadi ${status}`, 
      data: order 
    });
    
  } catch (err) {
    console.error("Error updateCategoryStatus:", err);
    res.status(500).json({ success: false, message: "Gagal update status kategori", error: err.message });
  }
};

// ================= DELETE ORDER =================
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order tidak ditemukan" });
    }
    res.json({ success: true, message: "Pesanan berhasil dihapus", data: order });
  } catch (err) {
    console.error("Error deleteOrder:", err);
    res.status(500).json({ success: false, message: "Gagal menghapus pesanan", error: err.message });
  }
};


// ================= ADD ITEMS TO EXISTING ORDER =================
exports.addItemsToOrder = (io) => async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    console.log("[ADD ITEMS] ========== START ==========");
    console.log("[ADD ITEMS] Order ID:", id);
    console.log("[ADD ITEMS] New items:", JSON.stringify(items, null, 2));

    // Cari order yang sudah ada
    const order = await Order.findById(id);
    if (!order) {
      console.log("[ADD ITEMS] ❌ Order not found");
      return res.status(404).json({ success: false, message: "Order tidak ditemukan" });
    }

    // Cek apakah order sudah selesai (paid)
    if (order.status === "paid") {
      console.log("[ADD ITEMS] ❌ Order already paid");
      return res.status(400).json({ 
        success: false, 
        message: "Pesanan sudah dibayar, tidak bisa menambah menu lagi" 
      });
    }

    // EXPAND PAKET untuk item baru
    const expandedNewItems = await expandPackageItems(items);
    console.log("[ADD ITEMS] Expanded new items:", JSON.stringify(expandedNewItems, null, 2));

    // Hitung total harga item baru (minuman gratis tidak dihitung)
    const newItemsTotal = expandedNewItems.reduce((sum, item) => {
      if (!item.isIncludedInPackage) {
        return sum + (item.price || 0) * (item.quantity || 1);
      }
      return sum;
    }, 0);

    console.log("[ADD ITEMS] New items total price:", newItemsTotal);

    const notes = typeof req.body.notes === "string" ? req.body.notes.trim() : undefined;

    // Tambahkan item baru ke order yang sudah ada
    order.items.push(...expandedNewItems);
    order.totalPrice += newItemsTotal;

    if (notes !== undefined) {
      order.notes = notes;
      console.log("[ADD ITEMS] Order notes updated");
    }

    // Update status global order jika perlu
    // Jika order sebelumnya sudah served, reset ke cooking karena ada item baru
    if (order.status === "served") {
      order.status = "cooking";
      console.log("[ADD ITEMS] Order status changed from served to cooking");
    } else if (order.status !== "paid" && order.status !== "cooking") {
      order.status = "pending";
      console.log("[ADD ITEMS] Order status set to pending");
    }

    await order.save();
    console.log("[ADD ITEMS] ✅ Items added successfully, new total price:", order.totalPrice);

    const newItemNames = expandedNewItems.map((item) => item.name);
    io.emit("orderItemsAdded", {
      orderId: order._id,
      tableNumber: order.tableNumber,
      newItems: expandedNewItems,
      totalAddedPrice: newItemsTotal,
      newItemNames,
    });

    // Emit socket event untuk update real-time
    io.emit("orderStatusUpdated", order);

    // Emit khusus ke meja yang bersangkutan
    io.to(`table_${order.tableNumber}`).emit("orderStatusUpdated", order);

    res.json({ 
      success: true, 
      message: `${expandedNewItems.length} item berhasil ditambahkan ke pesanan`,
      data: order 
    });

  } catch (err) {
    console.error("[ADD ITEMS] ❌ Error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Gagal menambahkan item ke pesanan", 
      error: err.message 
    });
  }
};

// ================= ADMIN CREATE ORDER =================
exports.createAdminOrder = (io) => async (req, res) => {
  try {
    const { tableNumber, items, status, notes } = req.body;
    const expandedItems = await expandPackageItems(items || []);

    const totalPrice = expandedItems.reduce((sum, item) => {
      if (!item.isIncludedInPackage) {
        return sum + (item.price || 0) * (item.quantity || 1);
      }
      return sum;
    }, 0);

    const savedOrder = await orderService.createOrder({
      tableNumber: String(tableNumber),
      items: expandedItems,
      totalPrice,
      notes,
      status,
    });

    io.emit("newOrder", savedOrder);
    res.status(201).json({ success: true, data: savedOrder });
  } catch (err) {
    console.error("[ADMIN CREATE ORDER] ❌ Error:", err);
    res.status(500).json({ success: false, message: "Gagal membuat order manual", error: err.message });
  }
};

// ================= ADMIN UPDATE ORDER =================
exports.updateAdminOrder = (io) => async (req, res) => {
  try {
    const { items, status, notes, totalPrice } = req.body;
    const orderId = req.params.id;
    let expandedItems;

    if (items) {
      expandedItems = await expandPackageItems(items);
    }

    const updatedOrder = await orderService.updateOrder(orderId, {
      items: expandedItems,
      status,
      notes,
      totalPrice,
    });

    io.emit("orderStatusUpdated", updatedOrder);
    res.json({ success: true, data: updatedOrder });
  } catch (err) {
    console.error("[ADMIN UPDATE ORDER] ❌ Error:", err);
    res.status(500).json({ success: false, message: "Gagal mengedit order manual", error: err.message });
  }
};

// ================= ADMIN GET ORDERS =================
exports.getAdminOrders = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await orderService.getOrdersPage(page, limit);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[ADMIN GET ORDERS] ❌ Error:", err);
    res.status(500).json({ success: false, message: "Gagal mengambil daftar order admin", error: err.message });
  }
};