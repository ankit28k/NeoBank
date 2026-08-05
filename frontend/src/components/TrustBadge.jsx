import { ShieldCheck, ShieldQuestion } from "lucide-react";
import { useBehavior } from "../context/BehaviorContext.jsx";
import { Link } from "react-router-dom";

export function TrustBadge() {
  const { modelTrained } = useBehavior();

  if (!modelTrained) {
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

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
      style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981" }}
      title="Behavioral profile active — verified at login and transfers"
    >
      <ShieldCheck size={12} />
      <span>Protected</span>
    </div>
  );
}