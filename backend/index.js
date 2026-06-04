require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const connectToMongoDB = require("./config/db");

// Route imports
const authRoutes        = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const behaviorRoutes    = require("./routes/behaviorRoutes");

const app = express();
const PORT = process.env.PORT || 8000;

// --- 1. CORS (allow React dev server) ---
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173"],
  credentials: true,
}));

// --- 2. Core Middleware ---
app.use(express.json({ limit: "5mb" })); // Events can be large
app.use(express.urlencoded({ extended: false }));

// --- 3. Routes ---
app.use("/api/auth",         authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/behavior",     behaviorRoutes);

// --- 4. Health check ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- 5. Database Connection & Server Start ---
connectToMongoDB(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/neobank")
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 NeoBank server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
  });
