const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const User = require("../models/user");
const { generateToken } = require("../services/auth");

// POST /api/auth/register
async function handleRegister(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate a unique 12-digit account number
  const accountNumber = Date.now().toString().slice(-10) + Math.floor(Math.random() * 100).toString().padStart(2, "0");

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    accountNumber,
    balance: 100000, // ₹1,00,000 starting balance
  });

  const token = generateToken(user._id.toString());

  return res.status(201).json({
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      accountNumber: user.accountNumber,
      balance: user.balance,
    },
  });
}

// POST /api/auth/login
async function handleLogin(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = generateToken(user._id.toString());

  return res.json({
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      accountNumber: user.accountNumber,
      balance: user.balance,
    },
  });
}

// GET /api/auth/me
async function handleGetMe(req, res) {
  const user = req.user;
  return res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    accountNumber: user.accountNumber,
    balance: user.balance,
  });
}

module.exports = {
  handleRegister,
  handleLogin,
  handleGetMe,
};
