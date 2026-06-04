const axios = require("axios");

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

// Send a batch of events and get a trust score back
async function getTrustScore(userId, events) {
  try {
    const response = await axios.post(`${ML_URL}/score`, {
      user_id: userId,
      events,
    });
    return response.data;
  } catch (err) {
    // ML service might not be running — return a safe default
    console.warn("⚠️  ML service unavailable:", err.message);
    return { score: 85, action: "allow", model_trained: false };
  }
}

// Trigger model training for a user with stored samples
async function trainModel(userId, samples) {
  try {
    const response = await axios.post(`${ML_URL}/train`, {
      user_id: userId,
      samples,
    });
    return response.data;
  } catch (err) {
    console.warn("⚠️  ML training failed:", err.message);
    return { success: false, error: err.message };
  }
}

// Check if a trained model exists for this user
async function getModelStatus(userId) {
  try {
    const response = await axios.get(`${ML_URL}/status/${userId}`);
    return response.data;
  } catch (err) {
    return { trained: false };
  }
}

module.exports = {
  getTrustScore,
  trainModel,
  getModelStatus,
};
