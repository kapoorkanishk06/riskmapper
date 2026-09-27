import { ArrowLeft, ArrowRight, HeartPulse, Search, ShieldAlert, Sparkles, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LoadingState } from "../components/LoadingState";
import { RiskBadge } from "../components/RiskBadge";
import { StatusMessage } from "../components/StatusMessage";
import { getResults, simulateContributor } from "../lib/api";
import type { FileResult, ResultsResponse, SimulationResponse } from "../types";

export function SimulatorPage() {
  const { jobId = "" } = useParams();
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getResults(jobId).then(setResults).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load contributors."));
  }, [jobId]);

  const contributors = useMemo(() => {
    const map = new Map<string, { name: string; email?: string | null; files: number; risk: number }>();
    (results?.files || []).forEach((file: FileResult) => {
      const current = map.get(file.primary_owner) || { name: file.primary_owner, email: file.primary_owner_email, files: 0, risk: 0 };
      current.files += 1;
      current.risk += file.final_risk_score;
      map.set(file.primary_owner, current);
    });
    return [...map.values()].sort((a, b) => b.risk - a.risk);
  }, [results]);

  const filteredContributors = contributors.filter((person) => !query || person.name.toLowerCase().includes(query.toLowerCase()));

  async function handleSimulate() {
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      setSimulation(await simulateContributor(jobId, selected));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not run simulation.");
    } finally {
      setLoading(false);
    }
  }

  if (error && !results) return <div className="mx-auto max-w-3xl py-20"><StatusMessage message={error} error /></div>;
  if (!results) return <LoadingState label="Loading contributor map..." />;

  return (
    <div className="space-y-8">
      <Link to={`/dashboard/${jobId}`} className="inline-flex items-center gap-2 text-xs text-slate-500 transition hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Back to risk map</Link>
      <section className="mx-auto max-w-4xl text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-300/20 bg-red-300/10 text-red-200"><HeartPulse className="h-5 w-5" /></div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-red-200/70">Departure simulator</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">What if they left?</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-500">Choose a primary owner to see which files lose their strongest source of context — and how much risk travels with them.</p>
      </section>

      <section className="panel mx-auto max-w-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3">
            <Search className="h-4 w-4 text-slate-600" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a contributor" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-600" />
          </label>
          <button disabled={!selected || loading} onClick={handleSimulate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-40">
            {loading ? "Running..." : "Simulate departure"} {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {filteredContributors.map((person) => (
            <button key={person.name} onClick={() => setSelected(person.name)} className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition ${selected === person.name ? "border-red-300/40 bg-red-300/10" : "border-white/[0.07] bg-white/[0.025] hover:border-white/20"}`}>
              <span className="flex min-w-0 items-center gap-3"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${selected === person.name ? "bg-red-300/20 text-red-100" : "bg-white/[0.06] text-slate-400"}`}>{person.name.slice(0, 1).toUpperCase()}</span><span className="truncate text-sm text-slate-300">{person.name}</span></span>
              <span className="ml-3 shrink-0 text-xs text-slate-600">{person.files} files</span>
            </button>
          ))}
        </div>
        {filteredContributors.length === 0 && <p className="py-8 text-center text-sm text-slate-600">No matching primary owners.</p>}
      </section>

      {error && <div className="mx-auto max-w-3xl"><StatusMessage message={error} error /></div>}

      {simulation && (
        <section className="mx-auto max-w-5xl space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-red-300/25 bg-gradient-to-br from-red-500/[0.16] via-ink-800 to-ink-800 p-6 shadow-glow sm:p-8">
            <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-red-400/10 blur-3xl" />
            <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-red-200/75"><ShieldAlert className="h-4 w-4" /> Knowledge exposure report</div>
                <h2 className="text-2xl font-semibold text-white">If {simulation.contributor} disappeared tomorrow</h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-red-100/75">{simulation.summary}</p>
              </div>
              <div className="flex gap-8">
                <div><p className="font-mono text-4xl font-semibold text-white">{simulation.orphaned_file_count}</p><p className="mt-1 text-xs text-red-100/50">orphaned files</p></div>
                <div><p className="font-mono text-4xl font-semibold text-white">{Math.round(simulation.criticality_weighted_impact_score)}</p><p className="mt-1 text-xs text-red-100/50">impact score</p></div>
              </div>
            </div>
          </div>
          <div className="panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/[0.07] px-5 py-4"><Sparkles className="h-4 w-4 text-amber-200" /><h3 className="text-sm font-semibold text-white">Affected files</h3></div>
            <div className="divide-y divide-white/[0.055]">
              {simulation.affected_files.map((file) => (
                <div key={file.id} className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center">
                  <div><p className="font-mono text-sm text-slate-300">{file.filename}</p><p className="mt-1 text-xs text-slate-600">{file.impact_narrative || "No individual impact narrative available."}</p></div>
                  <RiskBadge score={file.risk_score} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}