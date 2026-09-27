import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
  accent: "blue" | "red" | "amber" | "green";
}

export function MetricCard({ label, value, hint, icon: Icon, accent }: MetricCardProps) {
  const colors = {
    blue: "text-blue-300 bg-blue-400/10 border-blue-300/15",
    red: "text-red-300 bg-red-400/10 border-red-300/15",
    amber: "text-amber-200 bg-amber-300/10 border-amber-300/15",
    green: "text-emerald-300 bg-emerald-400/10 border-emerald-300/15",
  }[accent];
  return (
    <div className="panel group p-5 transition hover:border-white/15">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{hint}</p>
        </div>
        <span className={`rounded-lg border p-2.5 ${colors}`}><Icon className="h-4 w-4" /></span>
      </div>
    </div>
  );
}