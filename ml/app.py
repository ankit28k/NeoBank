from flask import Flask, request, jsonify
from flask_cors import CORS

import model as ml_model

app = Flask(__name__)
CORS(app)

ENROLL_MIN = 5


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/enroll", methods=["POST"])
def enroll():
    data     = request.get_json()
    user_id  = data.get("user_id")
    features = data.get("features", {})

    if not user_id or not features:
        return jsonify({"error": "user_id and features required"}), 400

    count = ml_model.append_row_and_replace(user_id, features, keep_n=10)
    print(f"[ENROLL] user_id={user_id} count={count}")

    training_started = False
    if count >= ENROLL_MIN:
        result = ml_model.train_from_csv(user_id)
        training_started = result.get("success", False)
        print(f"[ENROLL->TRAIN] result={result}")

    return jsonify({
        "enrolled":        count,
        "needMore":        max(0, ENROLL_MIN - count),
        "trainingStarted": training_started,
    })


@app.route("/verify", methods=["POST"])
def verify():
    data     = request.get_json()
    user_id  = data.get("user_id")
    features = data.get("features", {})

    print(f"\n[VERIFY] user_id={user_id}")
    result = ml_model.verify_row(user_id, features)
    print(f"[VERIFY] result={result}")
    return jsonify(result)


@app.route("/status/<user_id>")
def status(user_id):
    trained = ml_model.is_trained(user_id)
    meta    = ml_model.load_meta(user_id) if trained else {}
    count   = ml_model.count_user_rows(user_id)

    return jsonify({
        "trained":              trained,
        "lastTrained":          meta.get("trained_on"),
        "samplesCollected":     count,
        "samplesNeededToTrain": max(0, ENROLL_MIN - count),
        "canTrain":             count >= ENROLL_MIN,
        "pos_samples":          meta.get("pos_samples", 0),
        "neg_samples":          meta.get("neg_samples", 0),
    })


if __name__ == "__main__":
    print("NeoBank ML Service running on port 5001")
    app.run(host="0.0.0.0", port=5001, debug=True)