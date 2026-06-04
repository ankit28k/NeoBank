import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownLeft, Search } from "lucide-react";
import client from "../api/client.js";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filter,       setFilter]       = useState("all"); // all | credit | debit

  useEffect(() => {
    client.get("/transactions")
      .then(r => setTransactions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = transactions.filter(tx => {
    const matchSearch = tx.description.toLowerCase().includes(search.toLowerCase());
    const matchType   = filter === "all" || tx.type === filter;
    return matchSearch && matchType;
  });

  const totalIn  = filtered.filter(t => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter(t => t.type === "debit").reduce((s, t)  => s + t.amount, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>Transactions</h1>
        <p className="text-slate-500 text-sm mt-1">Your complete transaction history</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Total In</p>
          <p className="text-xl font-bold font-num" style={{ color: "#34d399" }}>
            +₹{totalIn.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Total Out</p>
          <p className="text-xl font-bold font-num text-slate-300">
            -₹{totalOut.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="neo-input" style={{ paddingLeft: "2.25rem" }} placeholder="Search transactions..."
                 value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {["all", "credit", "debit"].map(t => (
            <button key={t} onClick={() => setFilter(t)}
                    className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{
                      cursor: "pointer",
                      background: filter === t ? "rgba(0,212,255,0.15)" : "rgba(30,41,59,0.5)",
                      color:      filter === t ? "#00d4ff" : "#94a3b8",
                      border:     filter === t ? "1px solid rgba(0,212,255,0.3)" : "1px solid rgba(51,65,85,0.3)",
                    }}>
              {t === "all" ? "All" : t === "credit" ? "Credits" : "Debits"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-600 text-sm">
            {transactions.length === 0 ? "No transactions yet — make your first transfer!" : "No results found"}
          </div>
        ) : filtered.map((tx, i) => (
          <div key={tx._id}
               className="flex items-center gap-4 p-4 hover:bg-slate-800/25 transition-colors"
               style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(30,41,59,0.5)" : "none" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: tx.type === "credit" ? "rgba(16,185,129,0.1)" : "rgba(30,41,59,1)" }}>
              {tx.type === "credit"
                ? <ArrowDownLeft size={14} style={{ color: "#34d399" }} />
                : <ArrowUpRight  size={14} style={{ color: "#64748b" }} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200 font-medium truncate">{tx.description}</p>
              <p className="text-xs text-slate-500">
                {new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                {tx.recipientName ? ` · ${tx.recipientName}` : ""}
              </p>
            </div>
            <span className="font-num font-semibold text-sm shrink-0"
                  style={{ color: tx.type === "credit" ? "#34d399" : "#cbd5e1" }}>
              {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toLocaleString("en-IN")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
