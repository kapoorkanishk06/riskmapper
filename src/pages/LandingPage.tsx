import { ArrowRight, BrainCircuit, GitCommitHorizontal, GitFork, ShieldCheck, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { startAnalysis } from "../lib/api";
import { StatusMessage } from "../components/StatusMessage";

const examples = [
  { label: "FastAPI", url: "https://github.com/fastapi/fastapi" },
  { label: "Requests", url: "https://github.com/psf/requests" },
  { label: "React", url: "https://github.com/facebook/react" },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!repoUrl.trim()) {
      setError("Paste a public GitHub repository URL to begin.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const response = await startAnalysis(repoUrl.trim());
      navigate(`/analyze/${response.job_id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to start the analysis.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl py-8 lg:py-20">
      <section className="relative text-center">
        <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-blue-300/15 bg-blue-300/[0.07] px-3 py-1.5 text-xs text-blue-200">
          <Sparkles className="h-3.5 w-3.5" />
          Repository intelligence for resilient teams
        </div>
        <h1 className="relative mx-auto max-w-4xl text-5xl font-semibold tracking-[-0.055em] text-white sm:text-7xl">
          Find out who really holds your codebase together.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
          Map knowledge risk before a key contributor leaves. Mine Git history, surface hidden ownership, and turn the riskiest files into a transfer plan.
        </p>

        <form onSubmit={handleSubmit} className="panel relative mx-auto mt-10 flex max-w-3xl flex-col gap-3 p-3 shadow-glow-blue sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center rounded-lg border border-white/10 bg-black/20 px-4">
            <GitFork className="mr-3 h-4 w-4 shrink-0 text-slate-600" />
            <input
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              placeholder="https://github.com/owner/repository"
              aria-label="Public GitHub repository URL"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-600"
            />
          </div>
          <button disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-300 disabled:cursor-wait disabled:opacity-60">
            {submitting ? "Starting..." : "Analyze repository"}
            {!submitting && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
        {error && <div className="mx-auto mt-4 max-w-3xl text-left"><StatusMessage message={error} error /></div>}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600">
          <span>Try an example:</span>
          {examples.map((example) => (
            <button key={example.label} onClick={() => setRepoUrl(example.url)} className="rounded-md border border-white/[0.08] px-2 py-1 text-slate-400 transition hover:border-blue-300/30 hover:text-blue-200">
              {example.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-24 grid gap-4 sm:grid-cols-3">
        {[
          { icon: GitCommitHorizontal, title: "Mine history", text: "See who has changed which files, how recently, and with what concentration." },
          { icon: ShieldCheck, title: "Score exposure", text: "Combine ownership, recency, and code criticality into one clear risk signal." },
          { icon: BrainCircuit, title: "Transfer context", text: "Get plain-English impact narratives and pairing suggestions for the top risks." },
        ].map(({ icon: Icon, title, text }, index) => (
          <div key={title} className="panel p-5">
            <div className={`mb-5 flex h-9 w-9 items-center justify-center rounded-lg border ${index === 0 ? "border-blue-300/20 bg-blue-300/10 text-blue-300" : index === 1 ? "border-amber-300/20 bg-amber-300/10 text-amber-200" : "border-emerald-300/20 bg-emerald-300/10 text-emerald-300"}`}>
              <Icon className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}