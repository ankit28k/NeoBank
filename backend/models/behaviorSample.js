const mongoose = require("mongoose");

// Each document = one labeled behavioral session the user submits for training
const behaviorSampleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Raw events array (keystroke/mouse/scroll/click)
    events: {
      type: Array,
      required: true,
    },
    // Label: 1 = legitimate (this is me), 0 = anomalous (for future use)
    label: {
      type: Number,
      default: 1,
    },
    // Feature vector extracted by ML service (stored for re-training)
    featureVector: {
      type: Array,
      default: [],
    },
    sessionDurationMs: {
      type: Number,
    },
  },
  { timestamps: true }
);

const BehaviorSample = mongoose.model("BehaviorSample", behaviorSampleSchema);

module.exports = BehaviorSample; // Export the model
