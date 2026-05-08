const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    tableNumber: {
      type: String,
      required: true,
    },

    items: [
      {
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
        category: {
          type: String,
          enum: ["Makanan", "Minuman", "Cemilan", "Paket"],
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "cooking", "served"],
          default: "pending",
        },
        // FIELD BARU UNTUK PAKET INCLUDE MINUMAN
        isIncludedInPackage: {
          type: Boolean,
          default: false,
        },
        parentPackageName: {
          type: String,
          default: "",
        },
        isPackage: {
          type: Boolean,
          default: false,
        },
      },
    ],

    totalPrice: {
      type: Number,
      default: 0,
    },

    // Status global order (untuk keseluruhan pesanan)
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

// Index untuk optimasi query
OrderSchema.index({ createdAt: 1, _id: 1 });
OrderSchema.index({ tableNumber: 1, createdAt: -1 });

module.exports = mongoose.model("Order", OrderSchema);
