import { Shield, ShieldAlert, ShieldCheck, ShieldX, ShieldQuestion } from "lucide-react";
import { useBehavior } from "../context/BehaviorContext.jsx";
import { Link } from "react-router-dom";

export function TrustBadge() {
  const { trustScore, isNewUser } = useBehavior();

  // New user — no model trained yet
  if (isNewUser || (!trustScore)) {
    return (
      <Link to="/security"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.2)",
              color: "#fbbf24",
              textDecoration: "none",
            }}
            title="Set up behavioral authentication">
        <ShieldQuestion size={12} />
        <span>Setup Required</span>
      </Link>
    );
  }

  const score  = trustScore.score  ?? 85;
  const action = trustScore.action ?? "allow";

  const configs = {
    allow:     { color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.2)",  Icon: ShieldCheck, label: "Secure"     },
    warn:      { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.2)",  Icon: Shield,      label: "Monitoring" },
    challenge: { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.2)",   Icon: ShieldAlert, label: "Suspicious" },
    block:     { color: "#7f1d1d", bg: "rgba(127,29,29,0.2)",   border: "rgba(239,68,68,0.4)",   Icon: ShieldX,     label: "Blocked"    },
  };

  const { color, bg, border, Icon, label } = configs[action] || configs.allow;

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
      style={{ background: bg, border: `1px solid ${border}`, color }}
      title={`Trust Score: ${Math.round(score)}/100`}
    >
      <Icon size={12} />
      <span className="font-num">{Math.round(score)}</span>
      <span className="opacity-75 hidden sm:inline">{label}</span>

      {(action === "warn" || action === "challenge") && (
        <span className="relative flex h-1.5 w-1.5 ml-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: color }} />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: color }} />
        </span>
      )}
    </div>
  );
}
