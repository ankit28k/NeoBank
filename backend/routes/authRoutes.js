const express = require("express");
const router = express.Router();

const { handleRegister, handleLogin, handleGetMe } = require("../controllers/userController");
const { requireAuth } = require("../middlewares/auth");

router.post("/register", handleRegister);
router.post("/login", handleLogin);
router.get("/me", requireAuth, handleGetMe); // Get current user info

module.exports = router;
