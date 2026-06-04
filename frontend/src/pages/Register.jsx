import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import client from "../api/client.js";

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form,    setForm]    = useState({ name: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 8)       { setError("Password must be at least 8 characters"); return; }

    setLoading(true);
    setError("");

    try {
      const { data } = await client.post("/auth/register", {
        name: form.name, email: form.email, password: form.password,
      });
      login(data.user, data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center p-4"
         style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(0,212,255,0.04), transparent 60%), #020617" }}>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)" }}>
              <Shield size={20} style={{ color: "#00d4ff" }} />
            </div>
            <span className="text-2xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>NeoBank</span>
          </div>
          <p className="text-slate-500 text-sm">Open your account in seconds</p>
        </div>

        <div className="glass rounded-2xl p-7">
          <h1 className="text-xl font-semibold text-white mb-1" style={{ fontFamily: "Syne, sans-serif" }}>Create account</h1>
          <p className="text-slate-500 text-sm mb-6">Join NeoBank today</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm"
                 style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: "Full Name", key: "name",    type: "text",     ph: "Ankit Kumar"     },
              { label: "Email",     key: "email",   type: "email",    ph: "you@example.com" },
              { label: "Password",  key: "password", type: "password", ph: "Min 8 characters" },
              { label: "Confirm",   key: "confirm",  type: "password", ph: "Repeat password"  },
            ].map(({ label, key, type, ph }) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>
                <input className="neo-input" type={type} placeholder={ph}
                       value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required />
              </div>
            ))}

            <button type="submit" className="neo-btn w-full mt-1" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 rounded-full animate-spin"
                        style={{ borderColor: "rgba(2,6,23,0.3)", borderTopColor: "#020617" }} />
                  Creating...
                </span>
              ) : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#00d4ff" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
