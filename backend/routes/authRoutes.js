const express = require("express");
const router = express.Router();

const { handleRegister, handleLogin, handleGetMe } = require("../controllers/userController");
const { requireAuth } = require("../middlewares/auth");
const { handleSendOtp, handleVerifyOtp } = require("../controllers/userController");

router.post("/otp/send",   requireAuth, handleSendOtp);
router.post("/otp/verify", requireAuth, handleVerifyOtp);


router.post("/register", handleRegister);
router.post("/login", handleLogin);
router.get("/me", requireAuth, handleGetMe); // Get current user info

module.exports = router;
