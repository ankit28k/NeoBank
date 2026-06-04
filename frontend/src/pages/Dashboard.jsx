import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, ArrowUpRight, ArrowDownLeft, Eye, EyeOff } from "lucide-react";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "../context/AuthContext.jsx";
import { useBehavior } from "../context/BehaviorContext.jsx";
import client from "../api/client.js";

function TrustPanel({ trustScore }) {
  if (!trustScore) return (
    <div className="glass rounded-2xl p-5 flex items-center justify-center h-40">
      <p className="text-slate-500 text-sm text-center">Train your behavioral model<br/>in Security page</p>
    </div>
  );

  const score    = trustScore.score ?? 85;
  const barColor = score >= 70 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="glass rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300" style={{ fontFamily: "Syne, sans-serif" }}>Trust Score</h3>
        <span className="font-num text-2xl font-bold" style={{ color: barColor }}>{Math.round(score)}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className="trust-bar h-full rounded-full" style={{ width: `${score}%`, background: barColor }} />
      </div>
      <p className="text-xs text-slate-500">{trustScore.action === "allow" ? "✓ Identity verified" : `⚠ ${trustScore.action}`}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user }       = useAuth();
  const { trustScore } = useBehavior();

  const [transactions, setTransactions] = useState([]);
  const [hideBalance,  setHideBalance]  = useState(false);

  useEffect(() => {
    client.get("/transactions").then(r => setTransactions(r.data)).catch(() => {});
  }, []);

  const balance = user?.balance ?? 0;

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  };

  // Chart: total spend by day (last 7 from transactions)
  const chartData = (() => {
    const map = {};
    transactions.slice(0, 30).forEach(tx => {
      const day = new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      if (!map[day]) map[day] = 0;
      if (tx.type === "debit") map[day] += tx.amount;
    });
    return Object.entries(map).slice(-7).map(([date, amount]) => ({ date, amount }));
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
          {greeting()}, {user?.name?.split(" ")[0] || "User"} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">Here's your financial overview</p>
      </div>

      {/* Balance + Trust Score */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 glass rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
               style={{ background: "radial-gradient(circle, rgba(0,212,255,0.05), transparent 70%)", transform: "translate(30%,-30%)" }} />
          <p className="text-slate-500 text-xs uppercase tracking-widest mb-2">Total Balance</p>
          <div className="flex items-end gap-3 mb-5">
            <span className="text-4xl font-bold font-num text-white">
              {hideBalance ? "₹ ••••••" : `₹${balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
            </span>
            <button onClick={() => setHideBalance(v => !v)} className="mb-1 text-slate-500 hover:text-slate-300 transition-colors"
                    style={{ background: "none", border: "none", cursor: "pointer" }}>
              {hideBalance ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg w-fit"
               style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <TrendingUp size={13} style={{ color: "#10b981" }} />
            <span className="text-xs font-num font-medium" style={{ color: "#10b981" }}>Account active</span>
          </div>
        </div>

        <TrustPanel trustScore={trustScore} />
      </div>

      {/* Chart + Quick actions */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-300" style={{ fontFamily: "Syne, sans-serif" }}>Spending</h2>
            <span className="text-xs text-slate-500">Last 7 days</span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }}
                         formatter={v => [`₹${v.toLocaleString("en-IN")}`, "Spent"]} />
                <Area type="monotone" dataKey="amount" stroke="#00d4ff" strokeWidth={2} fill="url(#grad)" dot={{ fill: "#00d4ff", r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[150px] flex items-center justify-center text-slate-600 text-sm">
              No transactions yet — make your first transfer!
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-4 flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-slate-300 mb-1" style={{ fontFamily: "Syne, sans-serif" }}>Quick Actions</h2>
          {[
            { label: "Send Money",   to: "/transfer",     color: "#00d4ff" },
            { label: "Transactions", to: "/transactions", color: "#8b5cf6" },
            { label: "My Cards",     to: "/cards",        color: "#10b981" },
            { label: "Security",     to: "/security",     color: "#f59e0b" },
          ].map(a => (
            <Link key={a.label} to={a.to}
                  className="flex items-center justify-between p-2.5 rounded-xl transition-all"
                  style={{ background: "rgba(30,41,59,0.4)", border: "1px solid rgba(51,65,85,0.3)", textDecoration: "none" }}>
              <span className="text-sm text-slate-300">{a.label}</span>
              <ArrowUpRight size={13} style={{ color: a.color }} />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300" style={{ fontFamily: "Syne, sans-serif" }}>Recent Transactions</h2>
          <Link to="/transactions" className="text-xs" style={{ color: "#00d4ff", textDecoration: "none" }}>View all →</Link>
        </div>

        {transactions.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-6">No transactions yet</p>
        ) : (
          <div className="space-y-1">
            {transactions.slice(0, 5).map(tx => (
              <div key={tx._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/30 transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                     style={{ background: tx.type === "credit" ? "rgba(16,185,129,0.1)" : "rgba(30,41,59,1)" }}>
                  {tx.type === "credit"
                    ? <ArrowDownLeft size={14} style={{ color: "#34d399" }} />
                    : <ArrowUpRight  size={14} style={{ color: "#64748b" }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 font-medium truncate">{tx.description}</p>
                  <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
                <span className="font-num text-sm font-semibold" style={{ color: tx.type === "credit" ? "#34d399" : "#cbd5e1" }}>
                  {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
