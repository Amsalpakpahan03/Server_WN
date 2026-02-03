const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    tableNumber: { type: String, required: true },

    items: [
      {
        name: String,
        quantity: Number,
        price: Number,
        // Tambahkan kategori untuk membedakan item
        category: {
          type: String,
          enum: ["Makanan", "Minuman", "Cemilan", "Paket"],
          required: true,
        },
        // Tambahkan status per item (Bisa dipisah: pending -> served)
        status: {
          type: String,
          enum: ["pending", "cooking", "served"],
          default: "pending",
        },
      },
    ],

    totalPrice: { type: Number, default: 0 },

    // Status utama tetap ada sebagai indikator progres keseluruhan
    status: {
      type: String,
      enum: ["pending", "cooking", "served", "paid"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

OrderSchema.index({ createdAt: 1, _id: 1 });

module.exports = mongoose.model("Order", OrderSchema);
