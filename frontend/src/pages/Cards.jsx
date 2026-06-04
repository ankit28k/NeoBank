import { useState } from "react";
import { CreditCard, Eye, EyeOff, Lock, Unlock, Wifi } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const CARDS = [
  {
    id: 1, type: "Visa", variant: "Platinum",
    number: "4532 •••• •••• 8821", expiry: "12/27",
    limit: 200000, used: 34520,
    gradient: ["#0f172a", "#1a2744"], accent: "#00d4ff",
  },
  {
    id: 2, type: "Mastercard", variant: "Gold",
    number: "5412 •••• •••• 3394", expiry: "08/26",
    limit: 100000, used: 12800,
    gradient: ["#1a0a2e", "#2a1550"], accent: "#a78bfa",
  },
];

export default function Cards() {
  const { user }   = useAuth();
  const [selected, setSelected] = useState(0);
  const [frozen,   setFrozen]   = useState({});
  const [showFull, setShowFull] = useState(false);

  const card    = CARDS[selected];
  const isFroz  = !!frozen[card.id];
  const usePct  = (card.used / card.limit) * 100;
  const barColor = usePct > 80 ? "#ef4444" : usePct > 60 ? "#f59e0b" : "#10b981";

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>My Cards</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your debit and credit cards</p>
      </div>

      {/* Card tabs */}
      <div className="flex gap-3">
        {CARDS.map((c, i) => (
          <button key={c.id} onClick={() => setSelected(i)}
                  className="flex-1 p-3.5 rounded-xl text-left transition-all"
                  style={{
                    cursor: "pointer",
                    background: selected === i ? "rgba(0,212,255,0.06)" : "rgba(30,41,59,0.3)",
                    border: selected === i ? "1px solid rgba(0,212,255,0.35)" : "1px solid rgba(51,65,85,0.3)",
                  }}>
            <p className="text-xs text-slate-500 mb-0.5">{c.type} · {c.variant}</p>
            <p className="text-sm font-num text-slate-300">····{c.number.slice(-4)}</p>
          </button>
        ))}
      </div>

      {/* Card visual */}
      <div className="relative rounded-2xl p-6 overflow-hidden select-none"
           style={{
             background: `linear-gradient(135deg, ${card.gradient[0]}, ${card.gradient[1]})`,
             border: `1px solid ${card.accent}22`,
             minHeight: 180,
           }}>
        {/* Glow orb */}
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none opacity-20"
             style={{ background: `radial-gradient(circle, ${card.accent}, transparent)`, transform: "translate(40%,-40%)" }} />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">NeoBank</p>
              <p className="text-sm font-semibold text-white">{card.variant}</p>
            </div>
            <div className="flex items-center gap-2">
              {isFroz && (
                <span className="text-xs px-2 py-1 rounded-lg"
                      style={{ color: "#60a5fa", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
                  Frozen
                </span>
              )}
              <Wifi size={18} style={{ color: card.accent }} />
            </div>
          </div>

          <p className="font-num text-xl tracking-[0.2em] text-white mb-6">
            {showFull ? card.number.replace(/•/g, "2") : card.number}
          </p>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Card Holder</p>
              <p className="text-sm text-white font-medium">{user?.name || "Account Holder"}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-0.5">Expires</p>
              <p className="text-sm font-num text-white">{card.expiry}</p>
            </div>
            <CreditCard size={26} style={{ color: card.accent }} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            Icon: showFull ? EyeOff : Eye,
            label: showFull ? "Hide" : "Show Details",
            onClick: () => setShowFull(v => !v),
            color: "#94a3b8",
          },
          {
            Icon: isFroz ? Unlock : Lock,
            label: isFroz ? "Unfreeze" : "Freeze Card",
            onClick: () => setFrozen(f => ({ ...f, [card.id]: !isFroz })),
            color: isFroz ? "#34d399" : "#60a5fa",
          },
          {
            Icon: CreditCard,
            label: "New Card",
            onClick: () => alert("Card request submitted!"),
            color: "#94a3b8",
          },
        ].map(({ Icon, label, onClick, color }) => (
          <button key={label} onClick={onClick}
                  className="glass rounded-xl p-4 text-center transition-all hover:border-slate-600"
                  style={{ cursor: "pointer" }}>
            <Icon size={18} className="mx-auto mb-2" style={{ color }} />
            <p className="text-xs text-slate-400">{label}</p>
          </button>
        ))}
      </div>

      {/* Credit limit */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-sm font-semibold text-slate-300" style={{ fontFamily: "Syne, sans-serif" }}>Credit Limit</p>
          <p className="text-sm font-num text-slate-400">
            ₹{card.used.toLocaleString("en-IN")} / ₹{card.limit.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(30,41,59,1)" }}>
          <div className="trust-bar h-full rounded-full" style={{ width: `${usePct}%`, background: barColor }} />
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Used {usePct.toFixed(1)}%</span>
          <span>Available ₹{(card.limit - card.used).toLocaleString("en-IN")}</span>
        </div>
      </div>
    </div>
  );
}
