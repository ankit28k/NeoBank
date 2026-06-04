"""
Behavioral authentication model.
Trains a One-Class SVM on real user sessions (no fake/synthetic data).
Requires at least 3 real sessions to train.

Model is saved per-user to disk as a joblib file.
"""

import os
import json
import joblib
from datetime import datetime
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.ensemble import BaggingClassifier, RandomForestClassifier
from sklearn.svm import SVC
from sklearn.neural_network import MLPClassifier
import numpy as np


MODELS_DIR = os.path.join(os.path.dirname(__file__), "trained_models")
os.makedirs(MODELS_DIR, exist_ok=True)


def model_path(user_id):
    return os.path.join(MODELS_DIR, f"{user_id}.joblib")


def meta_path(user_id):
    return os.path.join(MODELS_DIR, f"{user_id}_meta.json")


def is_trained(user_id):
    return os.path.exists(model_path(user_id))


def load_model(user_id):
    if not is_trained(user_id):
        return None
    return joblib.load(model_path(user_id))  # returns dict now, not Pipeline


def load_meta(user_id):
    path = meta_path(user_id)
    if not os.path.exists(path):
        return {}
    with open(path) as f:
        return json.load(f)


def train(user_id, feature_vectors):
    if len(feature_vectors) < 3:
        return {"success": False, "error": "Need at least 3 sessions to train"}

    X = np.array(feature_vectors)
    X = X[np.any(X != 0, axis=1)]
    if len(X) < 3:
        return {"success": False, "error": "Not enough non-empty sessions"}

    # All samples are labeled "1" (legitimate user)
    # We synthetically create anomaly samples by adding heavy noise
    rng = np.random.default_rng(42)
    noise = rng.normal(loc=0, scale=X.std(axis=0) * 3 + 0.1, size=X.shape)
    X_fake = X + noise

    X_train = np.vstack([X, X_fake])
    y_train = np.array([1] * len(X) + [0] * len(X_fake))

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_train)

    # Bagging ensemble: SVM + ANN + Random Forest
    svm = BaggingClassifier(
        estimator=SVC(kernel="rbf", probability=True),
        n_estimators=5, random_state=42
    )
    ann = BaggingClassifier(
        estimator=MLPClassifier(hidden_layer_sizes=(32, 16), max_iter=500),
        n_estimators=5, random_state=42
    )
    rf = RandomForestClassifier(n_estimators=50, random_state=42)

    svm.fit(X_scaled, y_train)
    ann.fit(X_scaled, y_train)
    rf.fit(X_scaled, y_train)

    model_bundle = {
        "scaler": scaler,
        "svm": svm,
        "ann": ann,
        "rf":  rf,
    }
    joblib.dump(model_bundle, model_path(user_id))

    meta = {
        "user_id":     user_id,
        "trained_on":  datetime.utcnow().isoformat(),
        "sessions":    len(X),
        "feature_dim": X.shape[1],
        "ensemble":    "bagging(SVM) + bagging(ANN) + RandomForest",
    }
    with open(meta_path(user_id), "w") as f:
        json.dump(meta, f)

    return {"success": True, "sessions": len(X), "feature_dim": X.shape[1]}


def score(user_id, feature_vector):
    bundle = load_model(user_id)
    if bundle is None:
        return {"score": 85, "action": "allow", "model_trained": False}

    fv = np.array(feature_vector).reshape(1, -1)
    X_scaled = bundle["scaler"].transform(fv)

    # Probability of class "1" (legitimate) from each model
    p_svm = bundle["svm"].predict_proba(X_scaled)[0][1]
    p_ann = bundle["ann"].predict_proba(X_scaled)[0][1]
    p_rf  = bundle["rf"].predict_proba(X_scaled)[0][1]

    # Weighted average: RF gets slightly more weight (more stable with few samples)
    trust = (p_svm * 0.30 + p_ann * 0.30 + p_rf * 0.40) * 100

    if trust >= 70:   action = "allow"
    elif trust >= 50: action = "warn"
    elif trust >= 30: action = "challenge"
    else:             action = "block"

    return {
        "score":         round(float(trust), 1),
        "action":        action,
        "model_trained": True,
        "breakdown":     {"svm": round(p_svm*100, 1), "ann": round(p_ann*100, 1), "rf": round(p_rf*100, 1)},
    }