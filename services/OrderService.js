const Order = require("../models/Order");

// ================= CREATE ORDER =================
// exports.createOrder = async ({ tableNumber, items, totalPrice }) => {
//   if (!tableNumber) {
//     throw new Error("TABLE_INVALID");
//   }

//   const orderData = {
//     tableNumber,
//     items,
//     totalPrice,
//     status: "pending",
//   };

//   const newOrder = new Order(orderData);
//   return await newOrder.save();
// };
// services/OrderService.js

exports.createOrder = async ({ tableNumber, items, totalPrice }) => {
  if (!tableNumber) {
    throw new Error("TABLE_INVALID");
  }

  // PROTEKSI: Cek apakah meja ini punya order yang masih diproses
  const activeOrder = await Order.findOne({
    tableNumber,
    status: "pending",
  });

  if (activeOrder) {
    throw new Error("TABLE_OCCUPIED"); // Lempar error jika meja masih dipakai
  }

  const orderData = {
    tableNumber,
    items,
    totalPrice,
    status: "pending",
  };

  const newOrder = new Order(orderData);
  return await newOrder.save();
};
// ================= GET ALL ORDERS =================
// exports.getAllOrders = async () => {
//   return await Order.find().sort({ createdAt: -1 });
// };
exports.getAllOrders = async () => {
  return await Order.find().sort({ createdAt: 1, _id: 1 });
};

// ================= GET ORDER BY ID =================
exports.getOrderById = async (id) => {
  return await Order.findById(id);
};

// ================= UPDATE STATUS =================
exports.updateStatus = async (id, status) => {
  return await Order.findByIdAndUpdate(id, { status }, { new: true });
};
