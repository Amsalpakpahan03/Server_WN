const mongoose = require("mongoose");

const MenuSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      enum: ["Paket", "Makanan", "Minuman", "Cemilan"],
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    description: {
      type: String,
      default: "",
    },

    image_url: {
      type: String,
      default: null,
      trim: true,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    // FIELD BARU UNTUK PAKET
    includesDrinks: {
      type: Boolean,
      default: false,
    },

    // OPTIONAL: daftar minuman yang termasuk dalam paket
    includedDrinkIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Menu",
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Menu", MenuSchema);
