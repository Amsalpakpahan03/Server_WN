const Order = require("../models/Order");

// ================= CREATE ORDER =================
exports.createOrder = async ({ tableNumber, items, totalPrice }) => {
  if (!tableNumber) {
    throw new Error("TABLE_INVALID");
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
  return await Order.find()
    .sort({ createdAt: 1, _id: 1 });
};


// ================= GET ORDER BY ID =================
exports.getOrderById = async (id) => {
  return await Order.findById(id);
};

// ================= UPDATE STATUS =================
exports.updateStatus = async (id, status) => {
  return await Order.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );
};

// Tambahkan ini di services/OrderService.js
exports.updateCategoryStatus = async (orderId, category, status) => {
  if (category === "ALL") {
    return await Order.findByIdAndUpdate(
      orderId,
      { status: status },
      { new: true }
    );
  }

  // Update status hanya untuk items yang memiliki kategori yang sesuai
  const updatedOrder = await Order.findOneAndUpdate(
    { _id: orderId },
    { $set: { "items.$[elem].status": status } },
    {
      arrayFilters: [{ "elem.category": category }],
      new: true,
    }
  );

  // Logika Otomatis: Jika semua item sudah 'served', status pesanan utama jadi 'served'
  if (updatedOrder && updatedOrder.items.length > 0) {
    const allItemsServed = updatedOrder.items.every(
      (item) => item.status === "served"
    );
    if (allItemsServed && updatedOrder.status !== "paid") {
      updatedOrder.status = "served";
      await updatedOrder.save();
    }
  }

  return updatedOrder;
};

