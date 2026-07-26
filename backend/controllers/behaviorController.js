const axios = require("axios");

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";
const OTP_WINDOW_MS = 10 * 60 * 1000; // OTP stays valid for 10 min after verification

function extractFeatures(keystrokes, wpm, durationMs) {
  const dwells  = keystrokes.map(k => k.dwell).filter(Boolean);
  const flights = keystrokes.map(k => k.flight).filter(Boolean);

  const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const std  = arr => {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
  };

  const shiftDwells = keystrokes
    .filter(k => ["Shift", "ShiftLeft", "ShiftRight"].includes(k.key))
    .map(k => k.dwell).filter(Boolean);

  const numDwells = keystrokes
    .filter(k => k.key && /^[0-9]$/.test(k.key))
    .map(k => k.dwell).filter(Boolean);

  const specialCount   = keystrokes.filter(k => ["@", "#", "!", ".", ",", "$", "%"].includes(k.key)).length;
  const backspaceCount = keystrokes.filter(k => k.key === "Backspace").length;

  return {
    dwell_mean: mean(dwells),   dwell_std: std(dwells),
    flight_mean: mean(flights), flight_std: std(flights),
    keystroke_count: keystrokes.length,
    wpm: wpm || 0, duration_ms: durationMs || 0,
    shift_dwell_mean: mean(shiftDwells), shift_count: shiftDwells.length,
    num_dwell_mean: mean(numDwells),     num_count: numDwells.length,
    special_count: specialCount, backspace_count: backspaceCount,
  };
}

// POST /api/behavior/enroll — gated by OTP
async function handleEnroll(req, res) {
  const { keystrokes, wpm, durationMs } = req.body;
  const userId = req.user._id.toString();

  if (!keystrokes || keystrokes.length === 0) {
    return res.status(400).json({ error: "No keystrokes provided" });
  }

  const freshOtp = req.user.otpVerifiedAt &&
    (Date.now() - new Date(req.user.otpVerifiedAt).getTime() < OTP_WINDOW_MS);

  if (!freshOtp) {
    return res.status(403).json({ error: "OTP verification required", requiresOtp: true });
  }

  const features = extractFeatures(keystrokes, wpm, durationMs);

  try {
    const response = await axios.post(`${ML_URL}/enroll`, { user_id: userId, features });
    return res.json(response.data);
  } catch (err) {
    return res.status(500).json({ error: "ML service unavailable" });
  }
}

// POST /api/behavior/verify — at login and transfer
async function handleVerify(req, res) {
  const { keystrokes, wpm, durationMs } = req.body;
  const userId = req.user._id.toString();

  if (!keystrokes || keystrokes.length === 0) {
    return res.status(400).json({ error: "No keystrokes provided" });
  }

  const features = extractFeatures(keystrokes, wpm, durationMs);

  try {
    const response = await axios.post(`${ML_URL}/verify`, { user_id: userId, features });
    return res.json(response.data);
  } catch (err) {
    return res.json({ prediction: "genuine", confidence: null, fallback: true });
  }
}

// GET /api/behavior/status
async function handleGetStatus(req, res) {
  const userId = req.user._id.toString();

  const otpVerified = !!(req.user.otpVerifiedAt &&
    (Date.now() - new Date(req.user.otpVerifiedAt).getTime() < OTP_WINDOW_MS));

  try {
    const { data } = await axios.get(`${ML_URL}/status/${userId}`);
    return res.json({
      samplesCollected:     data.samplesCollected,
      samplesNeededToTrain: data.samplesNeededToTrain,
      canTrain:             data.canTrain,
      modelTrained:         data.trained,
      lastTrained:          data.lastTrained,
      isNewUser:            !data.trained && data.samplesCollected === 0,
      otpVerified,
    });
  } catch {
    return res.json({
      samplesCollected: 0, modelTrained: false,
      isNewUser: true, otpVerified,
    });
  }
}

module.exports = { handleEnroll, handleVerify, handleGetStatus };