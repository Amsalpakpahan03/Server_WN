const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    tableNumber: { type: String, required: true },

    items: [
      {
        name: String,
        quantity: Number,
        price: Number,
      },
    ],

    totalPrice: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["pending", "cooking", "served", "paid"],
      default: "pending",
    },
  },
  {
    timestamps: true // createdAt & updatedAt otomatis
  }
);

/**
 * Index untuk FCFS queue
 */
OrderSchema.index({ createdAt: 1, _id: 1 });

module.exports = mongoose.model("Order", OrderSchema);
