import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Send, AlertTriangle, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useBehavior } from "../context/BehaviorContext.jsx";
import client from "../api/client.js";

export default function Transfer() {
  const { user, updateBalance } = useAuth();
  const { trustScore }          = useBehavior();
  const navigate                = useNavigate();

  const score = trustScore?.score ?? 85;

  const [form,    setForm]    = useState({ recipientName: "", recipientAccount: "", amount: "", description: "" });
  const [step,    setStep]    = useState("form");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Check if returning from verify page with a pending transfer
  useEffect(() => {
    const pending = sessionStorage.getItem("pendingTransfer");
    if (pending && window.location.search.includes("action=confirm")) {
      setForm(JSON.parse(pending));
      setStep("confirm");
      sessionStorage.removeItem("pendingTransfer");
    }
  }, []);

  const handleReview = (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { setError("Enter a valid amount"); return; }
    if (parseFloat(form.amount) > 50000)               { setError("Max transfer is ₹50,000"); return; }
    if (parseFloat(form.amount) > (user?.balance || 0)) { setError("Insufficient balance"); return; }
    setError("");

    // Save form then go to behavioral verify
    sessionStorage.setItem("pendingTransfer", JSON.stringify(form));
    navigate("/verify?next=/transfer&action=confirm");
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await client.post("/transactions/transfer", {
        recipientName:    form.recipientName,
        recipientAccount: form.recipientAccount,
        amount:           parseFloat(form.amount),
        description:      form.description || `Transfer to ${form.recipientName}`,
      });
      updateBalance(data.newBalance);
      setStep("success");
    } catch (err) {
      setError(err.response?.data?.error || "Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep("form");
    setForm({ recipientName: "", recipientAccount: "", amount: "", description: "" });
    setError("");
  };

  if (step === "success") return (
    <div className="max-w-md mx-auto text-center py-16">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
           style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
        <CheckCircle size={28} style={{ color: "#34d399" }} />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "Syne, sans-serif" }}>Transfer Successful</h2>
      <p className="text-slate-400 mb-1 font-num text-lg">₹{parseFloat(form.amount).toLocaleString("en-IN")}</p>
      <p className="text-slate-500 text-sm mb-8">sent to {form.recipientName}</p>
      <button className="neo-btn" onClick={resetForm}>Make Another Transfer</button>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>Send Money</h1>
        <p className="text-slate-500 text-sm mt-1">Transfer funds to any bank account</p>
      </div>

      {step === "form" && (
        <form onSubmit={handleReview} className="glass rounded-2xl p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg text-sm"
                 style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide">Recipient Name</label>
              <input className="neo-input" placeholder="Full name" value={form.recipientName}
                     onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide">Account Number</label>
              <input className="neo-input font-num" placeholder="Account number" value={form.recipientAccount}
                     onChange={e => setForm(f => ({ ...f, recipientAccount: e.target.value }))} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide">Amount (₹)</label>
              <input className="neo-input font-num" type="number" placeholder="0.00" min="1" max="50000"
                     value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wide">Note (optional)</label>
              <input className="neo-input" placeholder="What's this for?" value={form.description}
                     onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Available: <span className="font-num text-slate-400">₹{(user?.balance || 0).toLocaleString("en-IN")}</span>
            &nbsp;·&nbsp; Max: <span className="font-num text-slate-400">₹50,000</span>
          </p>

          <button type="submit" className="neo-btn w-full">
            <Send size={14} /> Review Transfer
          </button>
        </form>
      )}

      {step === "confirm" && (
        <div className="glass rounded-2xl p-6 space-y-5">
          <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "Syne, sans-serif" }}>Confirm Transfer</h3>

          <div className="space-y-0">
            {[
              { label: "To",      val: form.recipientName    },
              { label: "Account", val: form.recipientAccount },
              { label: "Amount",  val: `₹${parseFloat(form.amount).toLocaleString("en-IN")}` },
              { label: "Note",    val: form.description || "—" },
            ].map(row => (
              <div key={row.label} className="flex justify-between py-3"
                   style={{ borderBottom: "1px solid rgba(30,41,59,1)" }}>
                <span className="text-sm text-slate-500">{row.label}</span>
                <span className="text-sm text-slate-200 font-medium font-num">{row.val}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="p-3 rounded-lg text-sm"
                 style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button className="neo-btn-ghost flex-1" onClick={() => { setStep("form"); setError(""); }}>Back</button>
            <button className="neo-btn flex-1" onClick={handleConfirm} disabled={loading}>
              {loading
                ? <span className="w-4 h-4 border-2 rounded-full animate-spin"
                        style={{ borderColor: "rgba(2,6,23,0.3)", borderTopColor: "#020617" }} />
                : <><CheckCircle size={14} /> Confirm &amp; Send</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}