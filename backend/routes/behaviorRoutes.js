const express = require("express");
const router = express.Router();

const {
  handleIngestEvents,
  handleTrainModel,
  handleGetStatus,
  handleGetScore,
  handleTrainTyping,
} = require("../controllers/behaviorController");
const { requireAuth } = require("../middlewares/auth");

// All behavior routes require authentication
router.post("/events", requireAuth, handleIngestEvents);
router.post("/train", requireAuth, handleTrainModel);
router.get("/status", requireAuth, handleGetStatus);
router.get("/score", requireAuth, handleGetScore);
router.post("/train-typing", requireAuth, handleTrainTyping);

module.exports = router;






