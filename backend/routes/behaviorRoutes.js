const express = require("express");
const router  = express.Router();

const {
  handleEnroll,
  handleVerify,
  handleGetStatus,
} = require("../controllers/behaviorController");
const { requireAuth } = require("../middlewares/auth");

router.post("/enroll",  requireAuth, handleEnroll);
router.post("/verify",  requireAuth, handleVerify);
router.get("/status",   requireAuth, handleGetStatus);

module.exports = router;