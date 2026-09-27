import { AlertOctagon, ArrowUpRight, FileCode2, Search, SlidersHorizontal, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FileTable } from "../components/FileTable";
import { LoadingState } from "../components/LoadingState";
import { MetricCard } from "../components/MetricCard";
import { RiskBadge } from "../components/RiskBadge";
import { ScoreRing } from "../components/ScoreRing";
import { StatusMessage } from "../components/StatusMessage";
import { getResults, getSummary } from "../lib/api";
import type { FileResult, ResultsResponse, SummaryResponse } from "../types";

export function DashboardPage() {
  const { jobId = "" } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"risk" | "recency">("risk");
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getSummary(jobId), getResults(jobId)])
      .then(([nextSummary, nextResults]) => {
        setSummary(nextSummary);
        setResults(nextResults);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load dashboard data."));
  }, [jobId]);

  const filteredFiles = useMemo(() => {
    const files = results?.files || [];
    const query = search.toLowerCase().trim();
    return files
      .filter((file) => !query || file.filename.toLowerCase().includes(query) || file.primary_owner.toLowerCase().includes(query))
      .filter((file) => !criticalOnly || file.final_risk_score > 70)
      .sort((a, b) => sortBy === "risk" ? b.final_risk_score - a.final_risk_score : b.days_since_last_commit - a.days_since_last_commit);
  }, [results, search, criticalOnly, sortBy]);

  if (error) return <div className="mx-auto max-w-3xl py-20"><StatusMessage message={error} error /></div>;
  if (!summary || !results) return <LoadingState label="Assembling repository risk map..." />;

  const riskiest = summary.riskiest_file;
  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-blue-300/70">Repository risk map</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">The knowledge landscape</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">A ranked view of where your team’s context is concentrated — and where a departure would hurt most.</p>
        </div>
        <Link to={`/dashboard/${jobId}/simulate`} className="inline-flex w-fit items-center gap-2 rounded-lg border border-red-300/20 bg-red-300/[0.07] px-4 py-2.5 text-sm text-red-200 transition hover:border-red-300/40 hover:bg-red-300/10">
          <UsersRound className="h-4 w-4" /> What if they left?
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Files analyzed" value={summary.total_files_analyzed} hint="source files in scope" icon={FileCode2} accent="blue" />
        <MetricCard label="Critical risk" value={summary.critical_risk_files} hint="files scoring above 70" icon={AlertOctagon} accent="red" />
        <div className="panel flex items-center gap-4 p-5 sm:col-span-2 xl:col-span-1">
          <ScoreRing score={summary.knowledge_risk_score} size="sm" />
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Repo risk score</p>
            <p className="mt-2 text-sm text-slate-200">Overall knowledge concentration</p>
            <p className="mt-1 text-xs text-slate-500">Weighted average across analyzed files</p>
          </div>
        </div>
        <MetricCard label="Top 10" value="AI enriched" hint="actionable transfer plans" icon={ArrowUpRight} accent="green" />
      </section>

      {riskiest && (
        <section onClick={() => navigate(`/dashboard/${jobId}/file/${riskiest.id}`)} className="group relative cursor-pointer overflow-hidden rounded-2xl border border-red-300/20 bg-gradient-to-br from-red-500/[0.13] via-ink-800/80 to-ink-800 p-6 shadow-glow transition hover:border-red-300/40 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-red-400/10 blur-3xl transition group-hover:bg-red-400/20" />
          <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div>
              <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-red-200/80">
                <AlertOctagon className="h-4 w-4" /> Highest-risk finding
              </div>
              <h2 className="font-mono text-xl font-semibold text-white sm:text-2xl">{riskiest.filename}</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                {riskiest.primary_owner} holds the largest share of knowledge here. This file is the first place to start a transfer conversation.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <RiskBadge score={riskiest.final_risk_score} />
                <span className="text-xs text-slate-500">{riskiest.days_since_last_commit} days since last commit</span>
                <span className="text-xs text-slate-500">{riskiest.criticality_score.toFixed(0)} criticality</span>
              </div>
            </div>
            <ScoreRing score={riskiest.final_risk_score} />
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-white">Risk-ranked files</h2>
            <p className="mt-1 text-xs text-slate-500">{filteredFiles.length} of {results.total} files shown</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex min-w-[220px] items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm text-slate-400">
              <Search className="h-4 w-4 text-slate-600" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter files or owners" className="min-w-0 flex-1 bg-transparent py-2.5 outline-none placeholder:text-slate-600" />
            </label>
            <button onClick={() => setCriticalOnly((value) => !value)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs transition ${criticalOnly ? "border-red-300/30 bg-red-300/10 text-red-200" : "border-white/10 bg-white/[0.035] text-slate-400 hover:text-white"}`}>
              <SlidersHorizontal className="h-3.5 w-3.5" /> Critical only
            </button>
          </div>
        </div>
        <FileTable files={filteredFiles} sortBy={sortBy} onSortChange={setSortBy} onSelect={(file: FileResult) => navigate(`/dashboard/${jobId}/file/${file.id}`)} />
      </section>
    </div>
  );
}