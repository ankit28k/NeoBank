import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shield, CheckCircle, XCircle } from "lucide-react";
import client from "../api/client.js";

const PROMPTS = [
  "Transfer@500 Now!",
  "Secure#Bank2024",
  "Pay to Rahul Rs.1000",
  "Account@NeoBank #2024",
  "Send Rs.750 to Priya!",
];

export default function Verify() {
  const navigate        = useNavigate();
  const [params]        = useSearchParams();
  const nextPage        = params.get("next") || "/dashboard";
  const context         = params.get("action") === "confirm" ? "transfer" : "login";
  const [failCount, setFailCount] = useState(0);
  const MAX_FAILS = 3;

  // Pick a random prompt each time
  const prompt = useRef(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]).current;

  const [typedText,  setTypedText]  = useState("");
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null); // null | "genuine" | "imposter"
  const [confidence, setConfidence] = useState(null);

  const keyDownRef    = useRef({});
  const keyLog        = useRef([]);
  const startTimeRef  = useRef(null);

  const handleKeyDown = (e) => {
    keyDownRef.current[e.key] = performance.now();
  };

  const handleKeyUp = (e) => {
    const now  = performance.now();
    const down = keyDownRef.current[e.key];
    if (!down) return;

    const log = keyLog.current;
    log.push({
      key:    e.key,
      dwell:  now - down,
      flight: log.length > 0 ? now - log[log.length - 1].upTime : null,
      upTime: now,
    });
    delete keyDownRef.current[e.key];
  };

  const handleSubmit = async () => {
    if (typedText.length < prompt.length * 0.7) return;

    setLoading(true);
    const durationMs = startTimeRef.current ? performance.now() - startTimeRef.current : 0;
    const wpm        = (typedText.trim().split(" ").length / (durationMs / 60000)) || 0;

    try {
      const { data } = await client.post("/behavior/verify", {
        keystrokes: keyLog.current,
        wpm,
        durationMs,
        context,
      });

      setResult(data.prediction);
      setConfidence(data.confidence);

      if (data.prediction === "genuine" || data.fallback) {
        setTimeout(() => navigate(nextPage), 1500);
      } 
      else {
        // Imposter
        const newFailCount = failCount + 1;
        setFailCount(newFailCount);
        setResult("imposter");
        setConfidence(data.confidence);
      
        if (newFailCount >= MAX_FAILS) {
          // Hard block — clear session and send to login
          setTimeout(() => {
            localStorage.clear();
            navigate("/login?reason=security");
          }, 2000);
        }
      }

    } catch {
      // On error fail open
      setTimeout(() => navigate(nextPage), 1000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center p-4"
         style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(0,212,255,0.04), transparent 60%), #020617" }}>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
               style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)" }}>
            <Shield size={22} style={{ color: "#00d4ff" }} />
          </div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
            Behavioral Verification
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Type the phrase below to verify your identity
          </p>
        </div>

        <div className="glass rounded-2xl p-7 space-y-5">

          {/* Prompt */}
          <div className="p-4 rounded-xl text-center"
               style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.12)" }}>
            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Type this phrase</p>
            <p className="text-lg font-mono font-semibold text-white tracking-wide">{prompt}</p>
          </div>

          {/* Input */}
          {result === null && (
            <div className="space-y-2">
              <input
                autoFocus
                className="neo-input font-mono text-center text-base"
                placeholder="Start typing..."
                value={typedText}
                onChange={e => {
                  if (!startTimeRef.current) startTimeRef.current = performance.now();
                  setTypedText(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                disabled={loading}
              />
              <div className="flex justify-between text-xs text-slate-600 font-num">
                <span>{typedText.length} / {prompt.length} chars</span>
                {typedText.length > 0 && (
                  <span style={{
                    color: typedText === prompt.slice(0, typedText.length) ? "#34d399" : "#f87171"
                  }}>
                    {typedText === prompt.slice(0, typedText.length) ? "✓ correct" : "✗ mismatch"}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Result */}
          {result === "genuine" && (
            <div className="flex items-center gap-3 p-4 rounded-xl"
                 style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <CheckCircle size={18} style={{ color: "#34d399" }} />
              <div>
                <p className="text-sm font-semibold text-white">Identity Verified</p>
                {confidence && (
                  <p className="text-xs text-slate-400 font-num">Confidence: {(confidence * 100).toFixed(1)}%</p>
                )}
              </div>
            </div>
          )}

            {result === "imposter" && (
            <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 rounded-xl"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <XCircle size={18} style={{ color: "#f87171" }} />
                <div>
                    <p className="text-sm font-semibold text-white">Verification Failed</p>
                    <p className="text-xs text-slate-400">
                    {failCount >= MAX_FAILS
                        ? "Too many failed attempts — logging out..."
                        : `Typing pattern mismatch. ${MAX_FAILS - failCount} attempt${MAX_FAILS - failCount === 1 ? "" : "s"} remaining.`}
                    </p>
                    {confidence && (
                    <p className="text-xs text-slate-500 font-num mt-1">
                        Confidence: {(confidence * 100).toFixed(1)}% (need ≥50%)
                    </p>
                    )}
                </div>
                </div>
                {failCount < MAX_FAILS && (
                <button className="neo-btn w-full" onClick={() => {
                    setResult(null);
                    setTypedText("");
                    keyLog.current = [];
                    startTimeRef.current = null;
                }}>
                    Try Again
                </button>
                )}
            </div>
            )}

          {/* Submit */}
          {result === null && (
            <button
              className="neo-btn w-full"
              onClick={handleSubmit}
              disabled={loading || typedText.length < prompt.length * 0.7}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 rounded-full animate-spin"
                        style={{ borderColor: "rgba(2,6,23,0.3)", borderTopColor: "#020617" }} />
                  Verifying...
                </span>
              ) : "Verify Identity"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}