import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.preprocessing import StandardScaler, PowerTransformer
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.ensemble import BaggingClassifier, RandomForestClassifier
from sklearn.svm import SVC
from sklearn.neural_network import MLPClassifier

MODELS_DIR = os.path.join(os.path.dirname(__file__), "trained_models")
CSV_PATH   = os.path.join(os.path.dirname(__file__), "keystroke_data.csv")
os.makedirs(MODELS_DIR, exist_ok=True)

FEATURE_COLUMNS = [
    "dwell_mean", "dwell_std", "flight_mean", "flight_std",
    "keystroke_count", "wpm", "duration_ms",
    "shift_dwell_mean", "shift_count",
    "num_dwell_mean", "num_count",
    "special_count", "backspace_count",
]

ENROLL_MIN = 5


# ── Paths ─────────────────────────────────────────────────────────────
def model_path(user_id):
    return os.path.join(MODELS_DIR, f"{user_id}.pkl")

def meta_path(user_id):
    return os.path.join(MODELS_DIR, f"{user_id}_meta.json")

def is_trained(user_id):
    return os.path.exists(model_path(user_id))

def load_model(user_id):
    if not is_trained(user_id):
        return None
    return joblib.load(model_path(user_id))

def load_meta(user_id):
    path = meta_path(user_id)
    if not os.path.exists(path):
        return {}
    with open(path) as f:
        return json.load(f)


# ── CSV storage ───────────────────────────────────────────────────────
def _load_csv():
    if os.path.exists(CSV_PATH):
        return pd.read_csv(CSV_PATH)
    cols = ["user_id"] + FEATURE_COLUMNS + ["timestamp"]
    return pd.DataFrame(columns=cols)

def _save_csv(df):
    df.to_csv(CSV_PATH, index=False)

def count_user_rows(user_id):
    df = _load_csv()
    if len(df) == 0:
        return 0
    return int((df["user_id"] == user_id).sum())

def append_row_and_replace(user_id, features, keep_n=10):
    """
    Append one enrollment row for this user, keeping only the most recent
    `keep_n` rows for them (replace-last-N behavior on re-enrollment).
    """
    df = _load_csv()

    new_row = {"user_id": user_id, "timestamp": datetime.utcnow().isoformat()}
    for col in FEATURE_COLUMNS:
        new_row[col] = float(features.get(col, 0))

    df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)

    user_rows = df[df["user_id"] == user_id].sort_values("timestamp", ascending=False)
    if len(user_rows) > keep_n:
        drop_idx = user_rows.iloc[keep_n:].index
        df = df.drop(index=drop_idx)

    _save_csv(df)
    return count_user_rows(user_id)


# ── Synthetic negative class (only used when no other real users exist) ──
def generate_human_negatives(n_samples, feature_names):
    rng = np.random.default_rng(42)
    ranges = {
        "dwell_mean": (60, 180), "dwell_std": (10, 60),
        "flight_mean": (50, 200), "flight_std": (20, 80),
        "keystroke_count": (15, 40), "wpm": (20, 90),
        "duration_ms": (3000, 15000),
        "shift_dwell_mean": (80, 250), "shift_count": (1, 8),
        "num_dwell_mean": (70, 200), "num_count": (0, 6),
        "special_count": (0, 4), "backspace_count": (0, 5),
    }
    rows = []
    for _ in range(n_samples):
        row = {f: float(rng.uniform(*ranges.get(f, (0, 100)))) for f in feature_names}
        rows.append(row)
    return rows


# ── Training ──────────────────────────────────────────────────────────
def train_from_csv(user_id):
    df = _load_csv()

    df_pos = df[df["user_id"] == user_id]
    df_neg = df[df["user_id"] != user_id]

    if len(df_pos) == 0:
        return {"success": False, "error": "No samples for this user"}

    X_pos = df_pos[FEATURE_COLUMNS].fillna(0).values

    if len(df_neg) < 3:
        neg_rows = generate_human_negatives(15, FEATURE_COLUMNS)
        X_neg = pd.DataFrame(neg_rows)[FEATURE_COLUMNS].values
    else:
        X_neg = df_neg[FEATURE_COLUMNS].fillna(0).values

    X = np.vstack([X_pos, X_neg])
    y = np.array([1] * len(X_pos) + [0] * len(X_neg))

    k        = min(len(FEATURE_COLUMNS), X.shape[1])
    selector = SelectKBest(f_classif, k=k)
    selector.fit(X, y)
    mask              = selector.get_support()
    selected_features = [FEATURE_COLUMNS[i] for i, m in enumerate(mask) if m]
    X_sel             = X[:, mask]

    scaler          = StandardScaler()
    power_transform = PowerTransformer()
    X_scaled        = scaler.fit_transform(X_sel)
    X_transformed   = power_transform.fit_transform(X_scaled)

    svm = BaggingClassifier(estimator=SVC(kernel="rbf", probability=True), n_estimators=5, random_state=42)
    ann = BaggingClassifier(estimator=MLPClassifier(hidden_layer_sizes=(32, 16), max_iter=500), n_estimators=5, random_state=42)
    rf  = RandomForestClassifier(n_estimators=50, random_state=42)

    svm.fit(X_transformed, y)
    ann.fit(X_transformed, y)
    rf.fit(X_transformed, y)

    bundle = {
        "scaler": scaler, "power_transform": power_transform,
        "selected_features": selected_features,
        "svm": svm, "ann": ann, "rf": rf,
    }
    # joblib.dump overwrites the existing file — old model replaced automatically
    joblib.dump(bundle, model_path(user_id))

    meta = {
        "user_id":     user_id,
        "trained_on":  datetime.utcnow().isoformat(),
        "pos_samples": int(len(X_pos)),
        "neg_samples": int(len(X_neg)),
    }
    with open(meta_path(user_id), "w") as f:
        json.dump(meta, f)

    return {"success": True, "pos_samples": len(X_pos), "neg_samples": len(X_neg)}


# ── Scoring ───────────────────────────────────────────────────────────
def verify_row(user_id, feature_dict):
    bundle = load_model(user_id)
    if bundle is None:
        return {"prediction": "genuine", "confidence": None, "model_trained": False}

    selected = bundle["selected_features"]
    row      = np.array([float(feature_dict.get(col, 0)) for col in selected]).reshape(1, -1)

    scaled      = bundle["scaler"].transform(row)
    transformed = bundle["power_transform"].transform(scaled)

    p_svm = bundle["svm"].predict_proba(transformed)[0][1]
    p_ann = bundle["ann"].predict_proba(transformed)[0][1]
    p_rf  = bundle["rf"].predict_proba(transformed)[0][1]

    confidence = round(p_svm * 0.30 + p_ann * 0.30 + p_rf * 0.40, 3)
    prediction = "genuine" if confidence >= 0.5 else "imposter"

    return {
        "prediction": prediction, "confidence": confidence, "model_trained": True,
        "breakdown": {"svm": round(p_svm, 3), "ann": round(p_ann, 3), "rf": round(p_rf, 3)},
    }