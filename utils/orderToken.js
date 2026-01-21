const jwt = require("jsonwebtoken");

const SECRET = process.env.ORDER_TOKEN_SECRET || "ndeso-secret";

function generateOrderToken(tableNumber) {
  return jwt.sign(
    { tableNumber },
    SECRET,
    { expiresIn: "2h" } // token mati otomatis
  );
}

function verifyOrderToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = {
  generateOrderToken,
  verifyOrderToken
};
