"""
Feature extraction from raw browser behavioral events.
Extracts numeric features from keystroke, mouse, scroll, and click events.
All features are derived purely from real user input — no synthetic data.
"""

import numpy as np


def extract_features(events):
    """
    Given a list of raw browser events, return a 1D numpy feature vector.
    Returns None if events are too sparse to be meaningful.
    """
    if not events or len(events) < 3:
        return None

    keystroke_events = [e for e in events if e.get("event_type") == "keystroke"]
    mouse_events     = [e for e in events if e.get("event_type") == "mouse"]
    scroll_events    = [e for e in events if e.get("event_type") == "scroll"]
    click_events     = [e for e in events if e.get("event_type") == "click"]

    features = []

    # --- Keystroke features (up to 6 values) ---
    dwell_times  = [e["dwell_time"]  for e in keystroke_events if e.get("dwell_time")]
    flight_times = [e["flight_time"] for e in keystroke_events if e.get("flight_time")]

    if dwell_times:
        features += [np.mean(dwell_times), np.std(dwell_times) if len(dwell_times) > 1 else 0]
    else:
        features += [0.0, 0.0]

    if flight_times:
        features += [np.mean(flight_times), np.std(flight_times) if len(flight_times) > 1 else 0]
    else:
        features += [0.0, 0.0]

    features.append(len(keystroke_events))  # total keystrokes
    # Typing speed (chars per second, rough estimate)
    if len(keystroke_events) > 1:
        t_start = min(e["timestamp"] for e in keystroke_events if e.get("timestamp"))
        t_end   = max(e["timestamp"] for e in keystroke_events if e.get("timestamp"))
        duration = (t_end - t_start) / 1000.0  # ms → seconds
        features.append(len(keystroke_events) / max(duration, 1.0))
    else:
        features.append(0.0)

    # --- Mouse features (up to 5 values) ---
    velocities = [e["mouse_velocity"] for e in mouse_events if e.get("mouse_velocity")]
    accels     = [e["mouse_acceleration"] for e in mouse_events if e.get("mouse_acceleration")]

    if velocities:
        features += [np.mean(velocities), np.std(velocities) if len(velocities) > 1 else 0, np.max(velocities)]
    else:
        features += [0.0, 0.0, 0.0]

    if accels:
        features += [np.mean(np.abs(accels))]
    else:
        features += [0.0]

    features.append(len(mouse_events))  # total mouse moves

    # --- Scroll features (up to 4 values) ---
    scroll_deltas  = [abs(e["scroll_delta"])   for e in scroll_events if e.get("scroll_delta")]
    scroll_vels    = [e["scroll_velocity"]     for e in scroll_events if e.get("scroll_velocity")]

    features.append(len(scroll_events))
    features.append(np.mean(scroll_deltas)     if scroll_deltas else 0.0)
    features.append(np.mean(scroll_vels)       if scroll_vels   else 0.0)
    features.append(np.std(scroll_vels)        if len(scroll_vels) > 1 else 0.0)

    # --- Click features (up to 4 values) ---
    click_durations = [e["click_duration"] for e in click_events if e.get("click_duration")]

    features.append(len(click_events))
    features.append(np.mean(click_durations)  if click_durations else 0.0)
    features.append(np.std(click_durations)   if len(click_durations) > 1 else 0.0)

    # Inter-click intervals
    if len(click_events) > 1:
        click_times = sorted([e["timestamp"] for e in click_events if e.get("timestamp")])
        intervals = [click_times[i+1] - click_times[i] for i in range(len(click_times) - 1)]
        features.append(np.mean(intervals) if intervals else 0.0)
    else:
        features.append(0.0)

    # --- Session-level features (up to 3 values) ---
    all_timestamps = [e["timestamp"] for e in events if e.get("timestamp")]
    if len(all_timestamps) >= 2:
        session_ms = max(all_timestamps) - min(all_timestamps)
        features.append(session_ms)
        features.append(len(events) / max(session_ms / 1000.0, 1.0))  # events per second
    else:
        features += [0.0, 0.0]

    features.append(len(events))  # total event count

    return np.array(features, dtype=np.float64)


def safe_extract(events):
    """Returns feature vector or zero vector if extraction fails."""
    try:
        fv = extract_features(events)
        return fv if fv is not None else np.zeros(25)
    except Exception as e:
        print(f"Feature extraction error: {e}")
        return np.zeros(25)
