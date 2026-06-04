"""
NeoBank ML Microservice
========================
Flask server exposing:
  POST /train         — train model from user's real sessions
  POST /score         — score a batch of events
  GET  /status/<id>   — check if model is trained
  GET  /last-score/<id> — last cached score

Run: python app.py
Port: 5001
"""

import json
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

from features import safe_extract
import model as ml_model

app = Flask(__name__)
CORS(app)

# In-memory cache of last computed score per user
_last_scores = {}


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/train", methods=["POST"])
def train():
    """
    Body: { user_id: str, samples: [[events], [events], ...] }
    Each item in samples is a list of raw browser events for one session.
    Trains the model on all provided samples.
    """
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "No data provided"}), 400

    user_id = data.get("user_id")
    samples = data.get("samples", [])

    if not user_id or not samples:
        return jsonify({"success": False, "error": "user_id and samples required"}), 400

    # Extract feature vectors from all sessions
    feature_vectors = []
    for session_events in samples:
        fv = safe_extract(session_events)
        if fv is not None:
            feature_vectors.append(fv)

    if len(feature_vectors) < 3:
        return jsonify({
            "success": False,
            "error": f"Only {len(feature_vectors)} valid sessions. Need at least 3.",
        }), 400

    result = ml_model.train(user_id, feature_vectors)
    return jsonify(result)


@app.route("/score", methods=["POST"])
def score():
    """
    Body: { user_id: str, events: [event, event, ...] }
    Returns trust score for this batch of events.
    """
    data = request.get_json()
    if not data:
        return jsonify({"score": 85, "action": "allow", "model_trained": False})

    user_id = data.get("user_id")
    events  = data.get("events", [])

    if not user_id or not events:
        return jsonify({"score": 85, "action": "allow", "model_trained": False})

    fv = safe_extract(events)
    if fv is None:
        return jsonify({"score": 85, "action": "allow", "model_trained": False})

    result = ml_model.score(user_id, fv)

    # Cache the last score for this user
    _last_scores[user_id] = result

    return jsonify(result)


@app.route("/status/<user_id>")
def status(user_id):
    trained = ml_model.is_trained(user_id)
    meta    = ml_model.load_meta(user_id) if trained else {}
    return jsonify({
        "trained":     trained,
        "lastTrained": meta.get("trained_on"),
        "sessions":    meta.get("sessions", 0),
    })


@app.route("/last-score/<user_id>")
def last_score(user_id):
    result = _last_scores.get(user_id, {"score": 85, "action": "allow"})
    return jsonify(result)


if __name__ == "__main__":
    print("🧠 NeoBank ML Service running on port 5001")
    app.run(host="0.0.0.0", port=5001, debug=True)
