const jwt = require("jsonwebtoken");
const SECRET = process.env.ORDER_TOKEN_SECRET || "ndeso-secret";

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Token meja tidak ada" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.tableNumber = decoded.tableNumber;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token meja invalid / expired" });
  }
};
