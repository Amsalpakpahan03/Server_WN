// middlewares/validateOrderToken.js
const jwt = require("jsonwebtoken");
const SECRET = process.env.ORDER_TOKEN_SECRET || "ndeso-secret";

module.exports = (req, res, next) => {
  console.log("[VALIDATE] ========== TOKEN VALIDATION ==========");
  console.log("[VALIDATE] Authorization header:", req.headers.authorization);
  
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    console.log("[VALIDATE] ❌ No token provided");
    return res.status(401).json({ 
      success: false,
      message: "Token meja tidak ada" 
    });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.tableNumber = decoded.tableNumber;
    console.log("[VALIDATE] ✅ Token valid for table:", req.tableNumber);
    console.log("[VALIDATE] ======================================");
    next();
  } catch (err) {
    console.log("[VALIDATE] ❌ Token invalid:", err.message);
    console.log("[VALIDATE] ======================================");
    return res.status(401).json({ 
      success: false,
      message: "Token meja invalid / expired" 
    });
  }
};