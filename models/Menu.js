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

    hasTemperature: {
      type: Boolean,
      default: false,
    },
    extraPriceForIce: {
      type: Number,
      default: 1000,
      min: 0,
    },

    hasVariants: {
      type: Boolean,
      default: false,
    },
    variants: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        extraPrice: {
          type: Number,
          required: true,
          default: 0,
          min: 0,
        },
      },
    ],

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

    // SOFT DELETE FIELDS
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    // Untuk tracking data asli
    originalId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Menu", MenuSchema);
