import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, ArrowLeftRight, Receipt, CreditCard, Shield, User, LogOut, Bell } from "lucide-react";
import { BehaviorProvider } from "../context/BehaviorContext.jsx";
import { TrustBadge } from "./TrustBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const NAV = [
  { to: "/dashboard",    icon: LayoutDashboard, label: "Dashboard"    },
  { to: "/transfer",     icon: ArrowLeftRight,  label: "Transfer"     },
  { to: "/transactions", icon: Receipt,         label: "Transactions" },
  { to: "/cards",        icon: CreditCard,      label: "Cards"        },
  { to: "/security",     icon: Shield,          label: "Security"     },
  { to: "/profile",      icon: User,            label: "Profile"      },
];

function Sidebar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <aside
      className="fixed left-0 top-0 h-full w-52 flex flex-col z-40"
      style={{ background: "rgba(10,15,30,0.95)", borderRight: "1px solid rgba(0,212,255,0.07)" }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "rgba(0,212,255,0.07)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)" }}>
            <Shield size={15} style={{ color: "#00d4ff" }} />
          </div>
          <span className="text-white font-bold text-lg" style={{ fontFamily: "Syne, sans-serif" }}>NeoBank</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive ? "" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`
            }
            style={({ isActive }) => isActive ? {
              background: "rgba(0,212,255,0.08)",
              border: "1px solid rgba(0,212,255,0.12)",
              color: "#00d4ff",
            } : {}}
          >
            {({ isActive }) => (
              <>
                <Icon size={15} style={{ color: isActive ? "#00d4ff" : undefined }} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-2.5 border-t" style={{ borderColor: "rgba(51,65,85,0.3)" }}>
        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-red-400 transition-colors w-full"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </aside>
  );
}

function Topbar() {
  return (
    <header
      className="fixed top-0 left-52 right-0 h-13 flex items-center px-6 z-30 gap-3"
      style={{
        height: "52px",
        background: "rgba(10,15,30,0.9)",
        borderBottom: "1px solid rgba(0,212,255,0.07)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex-1" />
      <TrustBadge />
      <button
        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 relative"
        style={{ background: "rgba(30,41,59,0.5)", border: "none", cursor: "pointer" }}
      >
        <Bell size={14} />
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: "#00d4ff" }} />
      </button>
    </header>
  );
}

export default function DashboardLayout() {
  return (
    <BehaviorProvider>
      <div className="min-h-screen bg-grid" style={{ background: "#020617" }}>
        <Sidebar />
        <Topbar />
        <main className="ml-52 pt-[52px] min-h-screen">
          <div className="p-6 max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </BehaviorProvider>
  );
}
