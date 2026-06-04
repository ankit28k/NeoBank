import { useEffect, useState } from "react";
import { Shield, Activity, Fingerprint, RefreshCw, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useBehavior } from "../context/BehaviorContext.jsx";
import client from "../api/client.js";

export default function Security() {
  const { trustScore } = useBehavior();

  const [status,   setStatus]   = useState(null);   // { samplesCollected, canTrain, modelTrained }
  const [training, setTraining] = useState(false);
  const [trainMsg, setTrainMsg] = useState("");
  const [history,  setHistory]  = useState([]);     // running trust score history for chart

  // Load behavior status on mount
  useEffect(() => {
    loadStatus();
  }, []);

  // Append new trust score to history when it updates
  useEffect(() => {
    if (trustScore?.score != null) {
      setHistory(prev => {
        const entry = {
          t:     new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          score: trustScore.score,
        };
        return [...prev.slice(-30), entry]; // keep last 30 readings
      });
    }
  }, [trustScore]);

  const loadStatus = () => {
    client.get("/behavior/status")
      .then(r => setStatus(r.data))
      .catch(() => {});
  };

  const handleTrain = async () => {
    setTraining(true);
    setTrainMsg("");
    try {
      const { data } = await client.post("/behavior/train");
      setTrainMsg(data.message);
      loadStatus();
    } catch (err) {
      setTrainMsg(err.response?.data?.error || "Training failed");
    } finally {
      setTraining(false);
    }
  };

  const score  = trustScore?.score  ?? null;
  const action = trustScore?.action ?? "allow";

  const scoreColor = score == null ? "#64748b"
    : score >= 70 ? "#10b981"
    : score >= 50 ? "#f59e0b"
    : "#ef4444";

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>Security Center</h1>
        <p className="text-slate-500 text-sm mt-1">Behavioral authentication — train your personal model</p>
      </div>

      {/* ── How it works ── */}
      <div className="glass rounded-2xl p-5"
           style={{ border: "1px solid rgba(0,212,255,0.1)", background: "rgba(0,212,255,0.02)" }}>
        <h2 className="text-sm font-semibold text-slate-200 mb-3" style={{ fontFamily: "Syne, sans-serif" }}>
          How Behavioral Auth Works
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { step: "1", text: "Use the app normally — navigate, type, click, scroll. SDK silently records your patterns." },
            { step: "2", text: "Once 3+ sessions are collected, hit Train. A One-Class SVM learns your unique behavior." },
            { step: "3", text: "The model scores every 8 seconds. Unusual behavior lowers trust — too low blocks transfers." },
          ].map(({ step, text }) => (
            <div key={step} className="flex gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-0.5"
                   style={{ background: "rgba(0,212,255,0.15)", color: "#00d4ff" }}>
                {step}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Live trust score */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Live Score</p>
            <Shield size={14} style={{ color: scoreColor }} />
          </div>
          {score != null ? (
            <>
              <p className="text-3xl font-bold font-num" style={{ color: scoreColor }}>{Math.round(score)}</p>
              <p className="text-xs mt-1" style={{ color: scoreColor }}>{action}</p>
            </>
          ) : (
            <p className="text-2xl font-bold text-slate-600 font-num">—</p>
          )}
        </div>

        {/* Sessions collected */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Sessions</p>
            <Fingerprint size={14} style={{ color: "#8b5cf6" }} />
          </div>
          <p className="text-3xl font-bold font-num text-white">{status?.samplesCollected ?? "—"}</p>
          <p className="text-xs text-slate-500 mt-1">
            {status ? (status.canTrain ? "Ready to train ✓" : `Need ${status.samplesNeededToTrain} more`) : "Loading..."}
          </p>
        </div>

        {/* Model status */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Model</p>
            <Activity size={14} style={{ color: "#06b6d4" }} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full"
                 style={{ background: status?.modelTrained ? "#10b981" : "#64748b" }} />
            <p className="text-sm font-medium text-white">
              {status?.modelTrained ? "Trained" : "Not trained"}
            </p>
          </div>
          {status?.lastTrained && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Clock size={10} />
              {new Date(status.lastTrained).toLocaleDateString("en-IN")}
            </p>
          )}
        </div>
      </div>

      {/* ── Train button ── */}
      <div className="glass rounded-2xl p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white" style={{ fontFamily: "Syne, sans-serif" }}>Train Your Model</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {status?.canTrain
              ? `${status.samplesCollected} sessions ready — click to train your One-Class SVM`
              : `Use the app a bit more — need ${status?.samplesNeededToTrain ?? 3} more sessions`}
          </p>
          {trainMsg && (
            <p className="text-xs mt-1" style={{ color: trainMsg.includes("trained") ? "#34d399" : "#f87171" }}>
              {trainMsg}
            </p>
          )}
        </div>
        <button
          className="neo-btn shrink-0 flex items-center gap-2"
          onClick={handleTrain}
          disabled={training || !status?.canTrain}
        >
          {training ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: "rgba(2,6,23,0.3)", borderTopColor: "#020617" }} />
              Training...
            </span>
          ) : (
            <><RefreshCw size={14} /> Train Now</>
          )}
        </button>
      </div>

      {/* ── Live trust score timeline ── */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300" style={{ fontFamily: "Syne, sans-serif" }}>
            Trust Score — Live Timeline
          </h2>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#10b981" }} /> Safe ≥70
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#f59e0b" }} /> Warn 50–70
            </span>
          </div>
        </div>

        {history.length >= 2 ? (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={history}>
              <XAxis dataKey="t" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                formatter={v => [v.toFixed(1), "Trust"]}
              />
              <ReferenceLine y={70} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.4} />
              <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.4} />
              <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.4} />
              <Line type="monotone" dataKey="score" stroke="#00d4ff" strokeWidth={2}
                    dot={false} activeDot={{ r: 4, fill: "#00d4ff" }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[160px] flex flex-col items-center justify-center gap-2 text-slate-600">
            <Activity size={24} />
            <p className="text-sm">
              {status?.modelTrained
                ? "Waiting for behavioral data — use the app a bit more"
                : "Train your model first to see live scoring"}
            </p>
          </div>
        )}
      </div>

      {/* ── Threshold reference ── */}
      <div className="glass rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-slate-300 mb-3" style={{ fontFamily: "Syne, sans-serif" }}>Score Thresholds</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Allow",     range: "≥ 70", color: "#10b981", desc: "Normal behavior. Full access." },
            { label: "Warn",      range: "50–70", color: "#f59e0b", desc: "Slight deviation. Badge pulses." },
            { label: "Challenge", range: "30–50", color: "#ef4444", desc: "Transfers blocked." },
            { label: "Block",     range: "< 30",  color: "#7f1d1d", desc: "Forced logout." },
          ].map(({ label, range, color, desc }) => (
            <div key={label} className="p-3 rounded-xl" style={{ background: "rgba(30,41,59,0.4)", border: "1px solid rgba(51,65,85,0.2)" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-xs font-semibold text-white">{label}</span>
              </div>
              <p className="text-xs font-num mb-1" style={{ color }}>{range}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
