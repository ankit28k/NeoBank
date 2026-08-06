import { useEffect, useState, useRef } from "react";
import { Shield, Activity, Fingerprint, Clock, ShieldQuestion } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useBehavior } from "../context/BehaviorContext.jsx";
import client from "../api/client.js";

export default function Security() {

  const [status,   setStatus]   = useState(null);   // { samplesCollected, canTrain, modelTrained }
  const [training, setTraining] = useState(false);
  const [trainMsg, setTrainMsg] = useState("");
  const [history,  setHistory]  = useState([]);     // running trust score history for chart

  const [otpStep,    setOtpStep]    = useState("idle"); // idle | sent | verified
  const [otpInput,   setOtpInput]   = useState("");
  const [otpDevHint, setOtpDevHint] = useState("");
  const [otpError,   setOtpError]   = useState("");

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
      .then(r => {
        setStatus(r.data);
        if (r.data.otpVerified) setOtpStep("verified");
      })
      .catch(() => {});
  };

  const TYPING_PROMPTS = [
    "Transfer@500 Now!",
    "Secure#Bank2024",
    "Pay to Rahul Rs.1000",
    "Account@NeoBank #2024",
    "Send Rs.750 to Priya!",
  ];

  const [typingPhase, setTypingPhase] = useState("idle"); // idle | prompting | done
  const [promptIndex, setPromptIndex] = useState(0);
  const [typedText,   setTypedText]   = useState("");
  const [keyLog,       setKeyLog]     = useState([]); // live keystroke log for current prompt
  const keyDownRef     = useRef({});
  const promptStartRef = useRef(null);

  const handleKeyDown = (e) => {
    keyDownRef.current[e.key] = performance.now();
  };

  const handleKeyUp = (e) => {
    const now  = performance.now();
    const down = keyDownRef.current[e.key];
    if (!down) return;
    setKeyLog(prev => [...prev, {
      key:    e.key,
      dwell:  now - down,
      flight: prev.length > 0 ? now - prev[prev.length - 1].upTime : null,
      upTime: now,
    }]);
    delete keyDownRef.current[e.key];
  };

  // Called after each individual prompt is typed
  const handlePromptDone = async () => {
    const durationMs = performance.now() - promptStartRef.current;
    const wpm = (typedText.trim().split(" ").length / (durationMs / 60000)) || 0;

    try {
      const { data } = await client.post("/behavior/enroll", {
        keystrokes: keyLog,
        wpm,
        durationMs,
      });
      setTrainMsg(
        data.trainingStarted
          ? `Training started — ${data.enrolled} sessions collected`
          : `Saved — ${data.needMore} more prompts needed`
      );
      if (data.trainingStarted) loadStatus();
    } catch {
      setTrainMsg("Failed to save — check connection");
    }

    setTypedText("");
    setKeyLog([]);

    if (promptIndex + 1 >= TYPING_PROMPTS.length) {
      setTypingPhase("done");
      loadStatus();
    } else {
      setPromptIndex(i => i + 1);
      promptStartRef.current = performance.now();
    }
  };

  const handleCancelTyping = () => {
    setTypingPhase("idle");
    setTypedText("");
    setKeyLog([]);
    setPromptIndex(0);
  };

  const handleSendOtp = async () => {
    setOtpError("");
    try {
      const { data } = await client.post("/auth/otp/send");
      setOtpStep("sent");
      setOtpDevHint(data.devHint); // demo only — no real email service wired up
    } catch {
      setOtpError("Failed to send OTP");
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError("");
    try {
      await client.post("/auth/otp/verify", { code: otpInput });
      setOtpStep("verified");
    } catch (err) {
      setOtpError(err.response?.data?.error || "Invalid OTP");
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

      {/* ── New user onboarding banner ── */}
      {status?.isNewUser && (
        <div className="p-5 rounded-2xl"
            style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <div className="flex items-start gap-3">
            <ShieldQuestion size={18} style={{ color: "#fbbf24", marginTop: 2, flexShrink: 0 }} />
            <div>
              <p className="text-sm font-semibold text-white mb-1" style={{ fontFamily: "Syne, sans-serif" }}>
                Welcome! Set up your behavioral profile
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                NeoBank uses your unique typing rhythm to verify it's really you — even after login.
                Complete the typing test below once to activate continuous authentication.
                This takes about 2 minutes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ── */}
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
            { step: "1", text: "Verify with a one-time code, then type a few short phrases. SDK records your keystroke rhythm." },
            { step: "2", text: "A binary classifier trains — your patterns vs everyone else's in the system." },
            { step: "3", text: "At login and before transfers, you're asked to type a phrase again — the model checks it's really you." },
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

      {/* ── OTP gate before enrollment ── */}
      {otpStep !== "verified" && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
            Verify it's you before enrolling
          </p>
          <p className="text-xs text-slate-500">
            We send a one-time code to confirm your identity before recording typing patterns.
          </p>

          {otpStep === "idle" && (
            <button className="neo-btn" onClick={handleSendOtp}>Send OTP</button>
          )}

          {otpStep === "sent" && (
            <div className="space-y-2">
              {otpDevHint && (
                <p className="text-xs" style={{ color: "#fbbf24" }}>
                  Demo mode — no email service wired up. Your code: <span className="font-num font-bold">{otpDevHint}</span>
                </p>
              )}
              <input className="neo-input font-num" placeholder="6-digit code" maxLength={6}
                     value={otpInput} onChange={e => setOtpInput(e.target.value)} />
              {otpError && <p className="text-xs" style={{ color: "#f87171" }}>{otpError}</p>}
              <button className="neo-btn" onClick={handleVerifyOtp}>Verify Code</button>
            </div>
          )}
        </div>
      )}

      {/* ── Train button — only shown after OTP verified ── */}
      {otpStep === "verified" && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
                Train on Typing Patterns
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Type {TYPING_PROMPTS.length} short sentences — model learns your keystroke rhythm
              </p>
              {trainMsg && (
                <p className="text-xs mt-1" style={{ color: trainMsg.includes("started") ? "#34d399" : "#f87171" }}>
                  {trainMsg}
                </p>
              )}
            </div>
            {typingPhase === "idle" && (
              <button className="neo-btn shrink-0" onClick={() => { setTypingPhase("prompting"); promptStartRef.current = performance.now(); }}>
                Start Typing Test
              </button>
            )}
          </div>

          {typingPhase === "prompting" && (
            <div className="space-y-3">
              {/* Progress */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(30,41,59,1)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${(promptIndex / TYPING_PROMPTS.length) * 100}%`, background: "#00d4ff" }} />
                </div>
                <span className="text-xs text-slate-500 font-num shrink-0">{promptIndex + 1} / {TYPING_PROMPTS.length}</span>
              </div>

              {/* Prompt */}
              <div className="p-4 rounded-xl" style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.12)" }}>
                <p className="text-xs text-slate-500 mb-2">Type this exactly:</p>
                <p className="text-base text-white font-medium tracking-wide">{TYPING_PROMPTS[promptIndex]}</p>
              </div>

              {/* Input */}
              <div className="relative">
                <input
                  autoFocus
                  className="neo-input font-mono"
                  placeholder="Start typing..."
                  value={typedText}
                  onChange={e => {
                    if (!promptStartRef.current) promptStartRef.current = performance.now();
                    setTypedText(e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                />
                <p className="text-xs text-slate-500 mt-1 font-num">
                  {typedText.length} / {TYPING_PROMPTS[promptIndex].length} chars
                  {typedText.length > 0 && (
                    <span style={{ color: typedText === TYPING_PROMPTS[promptIndex].slice(0, typedText.length) ? "#34d399" : "#f87171" }}>
                      {" "}· {typedText === TYPING_PROMPTS[promptIndex].slice(0, typedText.length) ? "✓ correct" : "✗ mismatch"}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex gap-3">
                <button className="neo-btn-ghost flex-1" onClick={handleCancelTyping}>
                  Cancel
                </button>
                <button
                  className="neo-btn flex-1"
                  onClick={handlePromptDone}
                  disabled={typedText.length < TYPING_PROMPTS[promptIndex].length * 0.8}
                >
                  {promptIndex + 1 >= TYPING_PROMPTS.length ? "Finish & Train" : "Next →"}
                </button>
              </div>
            </div>
          )}

          {typingPhase === "done" && training && (
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span className="w-4 h-4 border-2 rounded-full animate-spin shrink-0"
                    style={{ borderColor: "rgba(0,212,255,0.2)", borderTopColor: "#00d4ff" }} />
              Training model on your typing patterns...
            </div>
          )}
        </div>
      )}

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