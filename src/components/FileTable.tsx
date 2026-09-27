import { ArrowDownUp, ChevronRight, Clock3, Code2, UserRound } from "lucide-react";
import type { FileResult } from "../types";
import { RiskBadge } from "./RiskBadge";

interface FileTableProps {
  files: FileResult[];
  sortBy: "risk" | "recency";
  onSortChange: (sort: "risk" | "recency") => void;
  onSelect: (file: FileResult) => void;
}

export function FileTable({ files, sortBy, onSortChange, onSelect }: FileTableProps) {
  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="border-b border-white/[0.07] bg-white/[0.025] text-[10px] uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-5 py-3.5 font-medium">File</th>
              <th className="px-5 py-3.5 font-medium">Primary owner</th>
              <th className="px-5 py-3.5 font-medium">
                <button onClick={() => onSortChange("risk")} className={`inline-flex items-center gap-1.5 transition hover:text-white ${sortBy === "risk" ? "text-slate-200" : ""}`}>
                  Risk score <ArrowDownUp className="h-3 w-3" />
                </button>
              </th>
              <th className="px-5 py-3.5 font-medium">
                <button onClick={() => onSortChange("recency")} className={`inline-flex items-center gap-1.5 transition hover:text-white ${sortBy === "recency" ? "text-slate-200" : ""}`}>
                  Last touched <ArrowDownUp className="h-3 w-3" />
                </button>
              </th>
              <th className="px-5 py-3.5 font-medium">Criticality</th>
              <th className="w-10 px-3 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.055]">
            {files.map((file) => (
              <tr key={file.id} onClick={() => onSelect(file)} className="cursor-pointer transition hover:bg-white/[0.035]">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Code2 className="h-4 w-4 shrink-0 text-slate-600" />
                    <div>
                      <p className="font-mono text-sm text-slate-200">{file.filename}</p>
                      {file.zombie_ownership && <p className="mt-1 text-[10px] uppercase tracking-wider text-red-300/80">Zombie ownership</p>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <UserRound className="h-3.5 w-3.5 text-slate-600" />
                    {file.primary_owner}
                  </div>
                </td>
                <td className="px-5 py-4"><RiskBadge score={file.final_risk_score} /></td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
                    <Clock3 className="h-3.5 w-3.5 text-slate-600" />
                    {file.days_since_last_commit > 9000 ? "Unknown" : `${file.days_since_last_commit}d ago`}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-blue-400" style={{ width: `${Math.min(file.criticality_score, 100)}%` }} />
                    </div>
                    <span className="font-mono text-xs text-slate-500">{Math.round(file.criticality_score)}</span>
                  </div>
                </td>
                <td className="px-3 py-4"><ChevronRight className="h-4 w-4 text-slate-600" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {files.length === 0 && <div className="px-5 py-14 text-center text-sm text-slate-500">No files match this filter.</div>}
    </div>
  );
}