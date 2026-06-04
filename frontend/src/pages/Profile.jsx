import { useState } from "react";
import { User, Mail, CreditCard, Shield, Edit3, Save, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Profile() {
  const { user, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name,    setName]    = useState(user?.name || "");

  const handleSave = () => {
    // In a real app: PATCH /api/auth/me
    const updated = { ...user, name };
    localStorage.setItem("nb_user", JSON.stringify(updated));
    setEditing(false);
  };

  const fields = [
    { Icon: User,       label: "Full Name",      value: editing ? null : (user?.name || "—") },
    { Icon: Mail,       label: "Email",           value: user?.email || "—" },
    { Icon: CreditCard, label: "Account Number",  value: user?.accountNumber || "—" },
  ];

  const secSettings = [
    { label: "Behavioral Authentication", desc: "Continuous identity scoring", on: true  },
    { label: "Transfer Alerts",           desc: "Notify on every transaction", on: true  },
    { label: "Login Notifications",       desc: "Alert on new device sign-in", on: true  },
    { label: "Two-Factor Auth",           desc: "OTP for high-value transfers", on: false },
  ];

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your personal information</p>
      </div>

      {/* Avatar + header */}
      <div className="glass rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0"
             style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)", color: "#00d4ff", fontFamily: "Syne, sans-serif" }}>
          {user?.name?.[0]?.toUpperCase() || "U"}
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-white">{user?.name}</h2>
          <p className="text-sm text-slate-500">{user?.email}</p>
          <p className="text-xs text-slate-600 mt-0.5 font-num">Balance: ₹{(user?.balance || 0).toLocaleString("en-IN")}</p>
        </div>
        <button onClick={() => setEditing(v => !v)}
                className="neo-btn-ghost flex items-center gap-1.5 text-xs" style={{ padding: "7px 14px" }}>
          {editing ? <><X size={13} /> Cancel</> : <><Edit3 size={13} /> Edit</>}
        </button>
      </div>

      {/* Personal info */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-slate-300" style={{ fontFamily: "Syne, sans-serif" }}>Personal Information</h3>
          {editing && (
            <button onClick={handleSave} className="neo-btn flex items-center gap-1.5 text-xs" style={{ padding: "6px 14px" }}>
              <Save size={12} /> Save
            </button>
          )}
        </div>

        {fields.map(({ Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 p-3 rounded-xl"
               style={{ background: "rgba(30,41,59,0.35)", border: "1px solid rgba(51,65,85,0.2)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                 style={{ background: "rgba(51,65,85,0.5)" }}>
              <Icon size={13} className="text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 mb-0.5">{label}</p>
              {label === "Full Name" && editing ? (
                <input
                  className="bg-transparent text-sm text-white outline-none w-full"
                  style={{ borderBottom: "1px solid rgba(0,212,255,0.3)", paddingBottom: "2px" }}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              ) : (
                <p className="text-sm text-slate-200 font-num truncate">{value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Security settings */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-300 mb-1" style={{ fontFamily: "Syne, sans-serif" }}>Security Settings</h3>
        {secSettings.map(item => (
          <div key={item.label} className="flex items-center justify-between p-3 rounded-xl"
               style={{ background: "rgba(30,41,59,0.35)", border: "1px solid rgba(51,65,85,0.2)" }}>
            <div className="flex items-center gap-3">
              <Shield size={13} style={{ color: item.on ? "#34d399" : "#64748b" }} />
              <div>
                <p className="text-sm text-slate-200">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
            </div>
            {/* Visual-only toggle */}
            <div className="w-9 h-5 rounded-full relative transition-colors"
                 style={{ background: item.on ? "#10b981" : "#334155" }}>
              <div className="absolute w-3.5 h-3.5 rounded-full bg-white top-[3px] transition-transform"
                   style={{ left: item.on ? "19px" : "3px" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Danger zone */}
      <div className="glass rounded-2xl p-5"
           style={{ border: "1px solid rgba(239,68,68,0.15)" }}>
        <h3 className="text-sm font-semibold text-red-400 mb-3" style={{ fontFamily: "Syne, sans-serif" }}>Sign Out</h3>
        <button onClick={logout} className="neo-btn-ghost text-sm"
                style={{ color: "#f87171", borderColor: "rgba(239,68,68,0.3)" }}>
          Sign out of all devices
        </button>
      </div>
    </div>
  );
}
