import { AlertTriangle, CheckCircle2, CircleAlert } from "lucide-react";
import { riskLabel, riskLevel } from "../types";

interface RiskBadgeProps {
  score: number;
  compact?: boolean;
}

export function RiskBadge({ score, compact = false }: RiskBadgeProps) {
  const level = riskLevel(score);
  const styles = {
    critical: "border-red-400/25 bg-red-400/10 text-red-200",
    medium: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    low: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
  }[level];
  const Icon = level === "critical" ? AlertTriangle : level === "medium" ? CircleAlert : CheckCircle2;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}>
      <Icon className="h-3.5 w-3.5" />
      {!compact && riskLabel(score)}
      <span className="font-mono">{Math.round(score)}</span>
    </span>
  );
}