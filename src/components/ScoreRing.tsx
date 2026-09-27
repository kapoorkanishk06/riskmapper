import { riskLevel } from "../types";

interface ScoreRingProps {
  score: number;
  size?: "sm" | "lg";
}

export function ScoreRing({ score, size = "lg" }: ScoreRingProps) {
  const level = riskLevel(score);
  const color = {
    critical: "#f87171",
    medium: "#fbbf24",
    low: "#34d399",
  }[level];
  const dimension = size === "lg" ? 148 : 72;
  const stroke = size === "lg" ? 9 : 6;
  const radius = (dimension - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100) / 100;

  return (
    <div className="relative shrink-0" style={{ width: dimension, height: dimension }}>
      <svg className="-rotate-90" width={dimension} height={dimension} viewBox={`0 0 ${dimension} ${dimension}`}>
        <circle cx={dimension / 2} cy={dimension / 2} r={radius} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={stroke} />
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={`${circumference * progress} ${circumference}`}
          style={{ filter: `drop-shadow(0 0 7px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${size === "lg" ? "text-4xl" : "text-xl"} font-semibold tracking-tight text-white`}>
          {Math.round(score)}
        </span>
        {size === "lg" && <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">out of 100</span>}
      </div>
    </div>
  );
}