const express = require("express");
const router = express.Router();

const { handleGetTransactions, handleTransfer } = require("../controllers/transactionController");
const { requireAuth } = require("../middlewares/auth");

// All transaction routes require authentication
router.get("/", requireAuth, handleGetTransactions);
router.post("/transfer", requireAuth, handleTransfer);

module.exports = router;
