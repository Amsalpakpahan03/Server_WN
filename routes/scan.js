const express = require("express");
const router = express.Router();
const { generateOrderToken } = require("../utils/orderToken");

// Ambil FRONTEND_URL dari environment variable, dengan fallback default
const FRONTEND_URL = process.env.FRONTEND_URL || "https://client-wn.vercel.app";

router.get("/table/:tableNumber", (req, res) => {
  const tableNumber = req.params.tableNumber;
  const token = generateOrderToken(tableNumber);

  // Redirect ke frontend yang sudah di-set di environment variable
  res.redirect(`${FRONTEND_URL}/order?table=${tableNumber}&token=${token}`);
});

module.exports = router;