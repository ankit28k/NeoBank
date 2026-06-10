const BehaviorSample = require("../models/behaviorSample");
const { getTrustScore, trainModel, getModelStatus } = require("../services/mlService");

// POST /api/behavior/events — receive behavioral events from browser
async function handleIngestEvents(req, res) {
  const { events, sessionDurationMs } = req.body;

  if (!events || !Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: "Events array is required" });
  }

  // Get trust score from ML service (non-blocking — respond immediately)
  const scoreResult = await getTrustScore(req.user._id.toString(), events);

  // Persist raw events for training (in background, don't wait)
  BehaviorSample.create({
    userId: req.user._id,
    events,
    label: 1, // assume legitimate — user can label later
    sessionDurationMs: sessionDurationMs || 0,
  }).catch((err) => console.error("Failed to save behavior sample:", err.message));

  return res.json(scoreResult);
}

// POST /api/behavior/train — user submits their behavior data to train the ML model
async function handleTrainModel(req, res) {
  const userId = req.user._id.toString();

  // Load all stored behavior samples for this user
  const samples = await BehaviorSample.find({ userId: req.user._id, label: 1 })
    .sort({ createdAt: -1 })
    .limit(100); // Use last 100 sessions for training

  if (samples.length < 3) {
    return res.status(400).json({
      error: "Need at least 3 behavior sessions to train. Use the app more first!",
      samplesCollected: samples.length,
    });
  }

  // Send samples to Python ML service for training
  const result = await trainModel(userId, samples.map((s) => s.events));

  return res.json({
    message: result.success
      ? `Model trained on ${samples.length} sessions!`
      : "Training failed — ML service may be offline",
    samplesUsed: samples.length,
    ...result,
  });
}

// GET /api/behavior/status — how many sessions collected, model trained?
async function handleGetStatus(req, res) {
  const userId = req.user._id;
  const sampleCount = await BehaviorSample.countDocuments({ userId, label: 1 });
  const mlStatus = await getModelStatus(req.user._id.toString());

  return res.json({
    samplesCollected:     sampleCount,
    samplesNeededToTrain: Math.max(0, 1 - sampleCount),
    canTrain:             sampleCount >= 1,
    modelTrained:         mlStatus.trained,
    lastTrained:          mlStatus.lastTrained || null,
    isNewUser:            !mlStatus.trained && sampleCount === 0, // ← add this
  });
}

// GET /api/behavior/score — get latest trust score for current session
async function handleGetScore(req, res) {
  const userId = req.user._id.toString();
  const mlStatus = await getModelStatus(userId);

  if (!mlStatus.trained) {
    return res.json({
      score: 85,
      action: "allow",
      message: "Model not trained yet — train it first for live scoring",
      modelTrained: false,
    });
  }

  // Return last cached score from ML service
  try {
    const response = await require("axios").get(
      `${process.env.ML_SERVICE_URL || "http://localhost:5001"}/last-score/${userId}`
    );
    return res.json({ ...response.data, modelTrained: true });
  } catch {
    return res.json({ score: 85, action: "allow", modelTrained: true });
  }
}

async function handleTrainTyping(req, res) {
  const { samples } = req.body;  // array of { keystrokes, wpm, durationMs, accuracy }

  if (!samples || samples.length < 1) {
    return res.status(400).json({ error: "Need all 5 typing prompts completed" });
  }

  // Convert typing samples to event format and store
  const allEvents = samples.flatMap(s =>
    (s.keystrokes || []).map(k => ({
      event_type:  "keystroke",
      key:         k.key,
      dwell_time:  k.dwell,
      flight_time: k.flight,
      wpm:         s.wpm,
      timestamp:   Date.now(),
    }))
  );

  await BehaviorSample.create({
    userId:  req.user._id,
    events:  allEvents,
    label:   1,
    sessionDurationMs: samples.reduce((s, x) => s + (x.durationMs || 0), 0),
  });

  // Now trigger training with all stored samples
  const allSamples = await BehaviorSample.find({ userId: req.user._id, label: 1 })
    .sort({ createdAt: -1 }).limit(100);

  const result = await trainModel(req.user._id.toString(), allSamples.map(s => s.events));

  return res.json({
    message:     result.success ? `Model trained on your typing patterns!` : "Training failed",
    samplesUsed: allSamples.length,
    ...result,
  });
}

module.exports = {
  handleIngestEvents,
  handleTrainModel,
  handleGetStatus,
  handleGetScore,
  handleTrainTyping,
};
