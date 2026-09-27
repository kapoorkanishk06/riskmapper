import { ArrowLeft, Check, Clipboard, FileText, Link2, UserRound, UsersRound, WandSparkles } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Link, useParams } from "react-router-dom";
import { LoadingState } from "../components/LoadingState";
import { RiskBadge } from "../components/RiskBadge";
import { ScoreRing } from "../components/ScoreRing";
import { StatusMessage } from "../components/StatusMessage";
import { getFileDetail } from "../lib/api";
import type { FileDetail } from "../types";

export function FileDetailPage() {
  const { jobId = "", fileId = "" } = useParams();
  const [file, setFile] = useState<FileDetail | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getFileDetail(jobId, Number(fileId))
      .then(setFile)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load file details."));
  }, [jobId, fileId]);

  async function copyDraft() {
    if (!file?.explainer_doc_draft) return;
    await navigator.clipboard.writeText(file.explainer_doc_draft);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (error) return <div className="mx-auto max-w-3xl py-20"><StatusMessage message={error} error /></div>;
  if (!file) return <LoadingState label="Loading file intelligence..." />;

  const bars = [
    { label: "Ownership concentration", value: file.concentration_score, tone: "bg-red-400", hint: "how concentrated the recent changes are" },
    { label: "Recency decay", value: Math.min(100, file.days_since_last_commit / 180 * 100), tone: "bg-amber-300", hint: `${file.days_since_last_commit} days since the last change` },
    { label: "Criticality", value: file.criticality_score, tone: "bg-blue-400", hint: `${file.imports.length} analyzed dependents` },
  ];

  return (
    <div className="space-y-8">
      <Link to={`/dashboard/${jobId}`} className="inline-flex items-center gap-2 text-xs text-slate-500 transition hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to risk map
      </Link>
      <section className="panel overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
          <div>
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500"><FileText className="h-4 w-4" /> File intelligence</div>
            <h1 className="max-w-3xl break-all font-mono text-2xl font-semibold text-white sm:text-3xl">{file.filename}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <RiskBadge score={file.final_risk_score} />
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><UserRound className="h-3.5 w-3.5" /> Primary owner: <span className="text-slate-300">{file.primary_owner}</span></span>
              {file.zombie_ownership && <span className="rounded-full border border-red-300/20 bg-red-300/10 px-2.5 py-1 text-xs text-red-200">Zombie ownership</span>}
            </div>
          </div>
          <ScoreRing score={file.final_risk_score} />
        </div>
        <div className="mt-10 grid gap-5 border-t border-white/[0.07] pt-7 md:grid-cols-3">
          {bars.map((bar) => (
            <div key={bar.label}>
              <div className="flex justify-between gap-4 text-xs">
                <span className="text-slate-400">{bar.label}</span><span className="font-mono text-slate-300">{Math.round(bar.value)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]"><div className={`h-full rounded-full ${bar.tone}`} style={{ width: `${Math.min(bar.value, 100)}%` }} /></div>
              <p className="mt-2 text-[11px] text-slate-600">{bar.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-6">
          <section className="panel p-6">
            <div className="mb-4 flex items-center gap-2"><WandSparkles className="h-4 w-4 text-blue-300" /><h2 className="text-sm font-semibold text-white">Plain-English summary</h2></div>
            <p className="text-sm leading-7 text-slate-300">{file.plain_english_summary || "No AI summary was generated for this file."}</p>
          </section>
          <section className="relative overflow-hidden rounded-xl border border-red-300/20 bg-red-400/[0.07] p-6">
            <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-red-400/10 blur-2xl" />
            <div className="relative">
              <div className="mb-4 flex items-center gap-2 text-red-200"><UsersRound className="h-4 w-4" /><h2 className="text-sm font-semibold">If {file.primary_owner} left tomorrow</h2></div>
              <p className="text-sm leading-7 text-red-100/80">{file.impact_narrative || "An impact narrative was not generated for this file."}</p>
            </div>
          </section>
          <section className="panel p-6">
            <div className="mb-4 flex items-center gap-2"><Link2 className="h-4 w-4 text-blue-300" /><h2 className="text-sm font-semibold text-white">Known dependents</h2><span className="ml-auto font-mono text-xs text-slate-500">{file.imports.length}</span></div>
            {file.imports.length ? <div className="flex flex-wrap gap-2">{file.imports.map((item) => <span key={item} className="rounded-md border border-white/10 bg-white/[0.035] px-2.5 py-1.5 font-mono text-xs text-slate-400">{item}</span>)}</div> : <p className="text-sm text-slate-600">No import references were detected by the static scan.</p>}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-blue-300/20 bg-blue-300/[0.06] p-6">
            <div className="mb-4 flex items-center gap-2 text-blue-200"><UsersRound className="h-4 w-4" /><h2 className="text-sm font-semibold">Recommended pairing</h2></div>
            <p className="text-sm leading-7 text-slate-300">{file.pairing_suggestion || "No pairing suggestion was generated."}</p>
          </section>
          <section className="panel p-6">
            <div className="mb-5 flex items-center justify-between gap-4"><div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-slate-500" /><h2 className="text-sm font-semibold text-white">Knowledge contributors</h2></div><span className="font-mono text-xs text-slate-600">{file.commit_count} commits</span></div>
            <div className="space-y-4">
              {file.contributors.map((contributor) => (
                <div key={`${contributor.name}-${contributor.email || ""}`}>
                  <div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="truncate text-slate-400">{contributor.name}</span><span className="font-mono text-slate-500">{contributor.percentage.toFixed(1)}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-300" style={{ width: `${contributor.percentage}%` }} /></div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
          <div className="flex items-center gap-2"><Clipboard className="h-4 w-4 text-emerald-300" /><h2 className="text-sm font-semibold text-white">Onboarding document draft</h2></div>
          <button onClick={copyDraft} className="inline-flex items-center gap-2 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-slate-400 transition hover:bg-white/[0.06] hover:text-white">{copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Clipboard className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}</button>
        </div>
        <div className="prose prose-invert max-w-none px-6 py-6 prose-headings:font-mono prose-headings:text-slate-200 prose-p:text-sm prose-p:leading-7 prose-p:text-slate-400 prose-strong:text-slate-200 prose-code:text-blue-200">
          <ReactMarkdown>{file.explainer_doc_draft || "No onboarding draft was generated for this file."}</ReactMarkdown>
        </div>
      </section>
    </div>
  );
}