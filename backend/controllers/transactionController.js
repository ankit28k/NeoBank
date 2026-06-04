const User = require("../models/user");
const Transaction = require("../models/transaction");

// GET /api/transactions — get user's transaction history
async function handleGetTransactions(req, res) {
  const transactions = await Transaction.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);

  return res.json(transactions);
}

// POST /api/transactions/transfer — send money
async function handleTransfer(req, res) {
  const { recipientAccount, recipientName, amount, description } = req.body;
  const sender = req.user;

  if (!recipientAccount || !amount) {
    return res.status(400).json({ error: "Recipient account and amount are required" });
  }

  const transferAmount = parseFloat(amount);
  if (isNaN(transferAmount) || transferAmount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  if (transferAmount > 50000) {
    return res.status(400).json({ error: "Transfer limit is ₹50,000 per transaction" });
  }

  // Fetch fresh balance from DB
  const senderDoc = await User.findById(sender._id);
  if (senderDoc.balance < transferAmount) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  // Deduct balance
  senderDoc.balance -= transferAmount;
  await senderDoc.save();

  // Record debit transaction
  await Transaction.create({
    userId: sender._id,
    type: "debit",
    amount: transferAmount,
    description: description || `Transfer to ${recipientName || recipientAccount}`,
    category: "Transfer",
    recipientName: recipientName || "Unknown",
    recipientAccount,
    balanceAfter: senderDoc.balance,
    status: "completed",
  });

  return res.json({
    message: "Transfer successful",
    newBalance: senderDoc.balance,
  });
}

module.exports = {
  handleGetTransactions,
  handleTransfer,
};
