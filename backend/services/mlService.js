const axios = require("axios");

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

async function getModelStatus(userId) {
  try {
    const response = await axios.get(`${ML_URL}/status/${userId}`);
    return response.data;
  } catch {
    return { trained: false };
  }
}

module.exports = { getModelStatus };