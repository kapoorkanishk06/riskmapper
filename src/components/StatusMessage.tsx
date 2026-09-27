import { AlertTriangle, LoaderCircle } from "lucide-react";

interface StatusMessageProps {
  message: string;
  error?: boolean;
}

export function StatusMessage({ message, error = false }: StatusMessageProps) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${error
      ? "border-red-400/20 bg-red-400/10 text-red-200"
      : "border-white/10 bg-white/[0.04] text-slate-300"
      }`}>
      {error ? <AlertTriangle className="h-4 w-4 shrink-0 text-red-300" /> : <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-blue-300" />}
      <span>{message}</span>
    </div>
  );
}