const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    accountNumber: {
      type: String,
      unique: true,
    },
    balance: {
      type: Number,
      default: 100000, // ₹1,00,000 starting balance
    },
    otpCode: { 
      type: String 
    },
    otpExpiresAt: { 
      type: Date 
    },
    otpVerifiedAt: {
      type: Date 
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User; // Export the model
