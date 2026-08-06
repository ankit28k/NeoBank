import { useEffect, useState, useRef } from "react";
import { Activity, Fingerprint, Clock, ShieldQuestion } from "lucide-react";
import { useBehavior } from "../context/BehaviorContext.jsx";
import client from "../api/client.js";

export default function Security() {
  const { refreshStatus } = useBehavior();

  const [status,   setStatus]   = useState(null);
  const [training, setTraining] = useState(false);
  const [trainMsg, setTrainMsg] = useState("");

  const [otpStep,    setOtpStep]    = useState("idle");
  const [otpInput,   setOtpInput]   = useState("");
  const [otpDevHint, setOtpDevHint] = useState("");
  const [otpError,   setOtpError]   = useState("");

  useEffect(() => {
    loadStatus();
  }, []);

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

  const [typingPhase, setTypingPhase] = useState("idle");
  const [promptIndex, setPromptIndex] = useState(0);
  const [typedText,   setTypedText]   = useState("");
  const [keyLog,      setKeyLog]      = useState([]);
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
      if (data.trainingStarted) { loadStatus(); refreshStatus(); }
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
      setOtpDevHint(data.devHint);
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

  return (
    <div className="space-y-5 max-w-3xl">

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

      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>Security Center</h1>
        <p className="text-slate-500 text-sm mt-1">Behavioral authentication — train your personal model</p>
      </div>

      <div className="glass rounded-2xl p-5"
           style={{ border: "1px solid rgba(0,212,255,0.1)", background: "rgba(0,212,255,0.02)" }}>
        <h2 className="text-sm font-semibold text-slate-200 mb-3" style={{ fontFamily: "Syne, sans-serif" }}>
          How Behavioral Auth Works
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { step: "1", text: "Verify with a one-time code, then type a few short phrases. The rhythm is recorded." },
            { step: "2", text: "A binary classifier trains — your patterns vs everyone else's in the system." },
            { step: "3", text: "At login and before transfers, you type a phrase again — the model checks it's really you." },
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

      <div className="grid grid-cols-2 gap-4">
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
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(30,41,59,1)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${(promptIndex / TYPING_PROMPTS.length) * 100}%`, background: "#00d4ff" }} />
                </div>
                <span className="text-xs text-slate-500 font-num shrink-0">{promptIndex + 1} / {TYPING_PROMPTS.length}</span>
              </div>

              <div className="p-4 rounded-xl" style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.12)" }}>
                <p className="text-xs text-slate-500 mb-2">Type this exactly:</p>
                <p className="text-base text-white font-medium tracking-wide">{TYPING_PROMPTS[promptIndex]}</p>
              </div>

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
    </div>
  );
}