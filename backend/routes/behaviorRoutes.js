const express = require("express");
const router = express.Router();

const {
  handleIngestEvents,
  handleTrainModel,
  handleGetStatus,
  handleGetScore,
} = require("../controllers/behaviorController");
const { requireAuth } = require("../middlewares/auth");

// All behavior routes require authentication
router.post("/events", requireAuth, handleIngestEvents);
router.post("/train", requireAuth, handleTrainModel);
router.get("/status", requireAuth, handleGetStatus);
router.get("/score", requireAuth, handleGetScore);

module.exports = router;
