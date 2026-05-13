// services/OrderService.js
const Order = require("../models/Order");

exports.createOrder = async ({ tableNumber, items, totalPrice }) => {
  console.log("[SERVICE] Creating order with:", { tableNumber, itemsCount: items?.length, totalPrice });
  
  if (!tableNumber) {
    throw new Error("TABLE_INVALID");
  }

  // Validasi items
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error("ITEMS_REQUIRED");
  }

  // Validasi setiap item memiliki field required
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.name) throw new Error(`Item ${i}: name required`);
    if (!item.quantity) throw new Error(`Item ${i}: quantity required`);
    // Price boleh 0 (untuk minuman gratis)
if (item.price === undefined || item.price === null) {
  throw new Error(`Item ${i}: price required`);
}
    if (!item.category) throw new Error(`Item ${i}: category required`);
  }

  // PROTEKSI: Cek apakah meja ini punya order yang masih diproses
  const activeOrder = await Order.findOne({
    tableNumber: tableNumber.toString(),
    status: { $in: ["pending", "cooking", "served"] }
  });

  if (activeOrder) {
    console.log("[SERVICE] Table occupied:", tableNumber);
    throw new Error("TABLE_OCCUPIED");
  }

  const orderData = {
    tableNumber: tableNumber.toString(),
    items: items.map(item => ({
      name: item.name,
      quantity: Number(item.quantity),
      price: Number(item.price),
      category: item.category,
      status: item.status || "pending"
    })),
    totalPrice: Number(totalPrice) || 0,
    status: "pending",
  };

  console.log("[SERVICE] Order data prepared:", JSON.stringify(orderData, null, 2));
  
  const newOrder = new Order(orderData);
  const saved = await newOrder.save();
  console.log("[SERVICE] Order saved:", saved._id);
  
  return saved;
};

// ================= GET ALL ORDERS =================
exports.getAllOrders = async () => {
  return await Order.find().sort({ createdAt: 1, _id: 1 });
};

// ================= GET ORDER BY ID =================
exports.getOrderById = async (id) => {
  if (!id) return null;
  return await Order.findById(id);
};

// ================= UPDATE STATUS =================
exports.updateStatus = async (id, status) => {
  const validStatus = ["pending", "cooking", "served", "paid"];
  if (!validStatus.includes(status)) {
    throw new Error("INVALID_STATUS");
  }
  
  return await Order.findByIdAndUpdate(id, { status }, { new: true });
};

// ================= UPDATE CATEGORY STATUS =================
exports.updateCategoryStatus = async (orderId, category, status) => {
  const validStatus = ["pending", "cooking", "served"];
  if (!validStatus.includes(status)) {
    throw new Error("INVALID_STATUS");
  }

  const order = await Order.findById(orderId);
  if (!order) return null;

  // Update status untuk semua item dengan kategori tertentu
  let updatedCount = 0;
  order.items = order.items.map((item) => {
    if (item.category === category && item.status !== "served") {
      updatedCount++;
      return { ...item, status: status };
    }
    return item;
  });

  if (updatedCount === 0) return order;

  // Cek apakah semua item sudah served
  const allItemsServed = order.items.every(
    (item) => item.status === "served"
  );

  // Update status global order jika semua item sudah served
  if (allItemsServed && order.status !== "paid") {
    order.status = "served";
  }

  await order.save();
  return order;
};

// ================= UPDATE ITEM STATUS =================
exports.updateItemStatus = async (orderId, itemIndex, status) => {
  const validStatus = ["pending", "cooking", "served"];
  if (!validStatus.includes(status)) {
    throw new Error("INVALID_STATUS");
  }

  const order = await Order.findById(orderId);
  if (!order) return null;

  if (itemIndex < 0 || itemIndex >= order.items.length) {
    throw new Error("INVALID_ITEM_INDEX");
  }

  // Update status item
  order.items[itemIndex].status = status;

  // Cek apakah semua item sudah served
  const allItemsServed = order.items.every(
    (item) => item.status === "served"
  );

  // Update status global order jika semua item sudah served
  if (allItemsServed && order.status !== "paid") {
    order.status = "served";
  }

  await order.save();
  return order;
};
