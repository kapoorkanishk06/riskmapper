import { LoaderCircle } from "lucide-react";

export function LoadingState({ label = "Loading analysis data..." }: { label?: string }) {
  return (
    <div className="panel flex min-h-[300px] flex-col items-center justify-center gap-4">
      <LoaderCircle className="h-7 w-7 animate-spin text-blue-300" />
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}