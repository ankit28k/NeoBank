import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Shield, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import client from "../api/client.js";

export default function Login() {
  const navigate = useNavigate();
  const { login }  = useAuth();
  const [params]   = useSearchParams();

  const [form,    setForm]    = useState({ email: "", password: "" });
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(
    params.get("reason") === "security" ? "Session ended — unusual activity detected." : ""
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data } = await client.post("/auth/login", form);
      login(data.user, data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center p-4"
         style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(0,212,255,0.04), transparent 60%), #020617" }}>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)" }}>
              <Shield size={20} style={{ color: "#00d4ff" }} />
            </div>
            <span className="text-2xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>NeoBank</span>
          </div>
          <p className="text-slate-500 text-sm">Secured by behavioral intelligence</p>
        </div>

        <div className="glass rounded-2xl p-7">
          <h1 className="text-xl font-semibold text-white mb-1" style={{ fontFamily: "Syne, sans-serif" }}>Welcome back</h1>
          <p className="text-slate-500 text-sm mb-6">Sign in to your account</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm"
                 style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Email</label>
              <input className="neo-input" type="email" placeholder="you@example.com"
                     value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input className="neo-input" style={{ paddingRight: "3rem" }}
                       type={showPw ? "text" : "password"} placeholder="••••••••"
                       value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
                <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        style={{ background: "none", border: "none", cursor: "pointer" }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" className="neo-btn w-full mt-1" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 rounded-full animate-spin"
                        style={{ borderColor: "rgba(2,6,23,0.3)", borderTopColor: "#020617" }} />
                  Signing in...
                </span>
              ) : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          New to NeoBank?{" "}
          <Link to="/register" style={{ color: "#00d4ff" }}>Create account</Link>
        </p>
      </div>
    </div>
  );
}
