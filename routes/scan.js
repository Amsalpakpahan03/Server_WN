const express = require("express");
const router = express.Router();
const { generateOrderToken } = require("../utils/orderToken");

router.get("/table/:tableNumber", (req, res) => {
  const tableNumber = req.params.tableNumber;

  const token = generateOrderToken(tableNumber);

  res.redirect(
    `https://client-iota-ten-83.vercel.app//order?table=${tableNumber}&token=${token}`,
  );
});

module.exports = router;
