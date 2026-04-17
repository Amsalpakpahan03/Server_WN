const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true // Agar tidak ada username ganda
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    default: "admin" 
  }
}, { timestamps: true });

module.exports = mongoose.model("Admin", AdminSchema);