import { Check, Circle, LoaderCircle, RotateCcw, ServerCrash } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getJobStatus } from "../lib/api";
import type { JobStatus } from "../types";
import { StatusMessage } from "../components/StatusMessage";

const stages = [
  { key: "cloning", label: "Connect to repository" },
  { key: "mining", label: "Mine Git history" },
  { key: "ai_analysis", label: "Generate AI insights" },
];

function normalizedProgress(status: string): number {
  if (status === "queued" || status === "pending") return 3;
  if (status === "cloning") return 15;
  if (status === "mining" || status === "running") return 55;
  if (status === "ai_analysis") return 85;
  if (status === "completed" || status === "complete") return 100;
  return 0;
}

export function ProgressPage() {
  const { jobId = "" } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobStatus | null>(null);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    async function poll() {
      try {
        const next = await getJobStatus(jobId);
        if (cancelled) return;
        setJob(next);
        const done = next.status === "completed" || next.status === "complete";
        if (done) {
          navigate(`/dashboard/${jobId}`, { replace: true });
          return;
        }
        if (next.status !== "failed") timer = window.setTimeout(poll, 2500);
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Could not read analysis status.");
          timer = window.setTimeout(poll, 3500);
        }
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [jobId, navigate, retryKey]);

  const progress = job?.progress || normalizedProgress(job?.status || "queued");
  const activeStage = useMemo(() => {
    if (!job) return 0;
    if (job.status === "cloning" || job.status === "queued") return 0;
    if (job.status === "mining") return 1;
    return 2;
  }, [job]);
  const failed = job?.status === "failed";

  return (
    <div className="mx-auto max-w-3xl py-10 lg:py-24">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-300/10 text-blue-300">
          {failed ? <ServerCrash className="h-5 w-5 text-red-300" /> : <LoaderCircle className="h-5 w-5 animate-spin" />}
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-blue-300/80">Analysis {jobId.slice(0, 8)}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{failed ? "Analysis stopped" : "Reading your codebase"}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
          {job?.message || "The mapper is preparing your repository for analysis. This usually takes a minute or two."}
        </p>
      </div>

      <div className="panel p-6 sm:p-8">
        {failed ? (
          <div className="space-y-5">
            <StatusMessage message={job?.error || "The repository could not be analyzed."} error />
            <div className="flex flex-wrap gap-3">
              <button onClick={() => { setJob(null); setError(""); setRetryKey((value) => value + 1); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-blue-300">
                <RotateCcw className="h-4 w-4" /> Retry status
              </button>
              <Link to="/" className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/[0.06]">Try another repository</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-4xl font-semibold text-white">{progress}%</p>
                <p className="mt-1 text-xs text-slate-500">overall progress</p>
              </div>
              <p className="max-w-[220px] text-right text-xs leading-5 text-slate-500">{job?.repo_url}</p>
            </div>
            <div className="mb-10 h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-300 transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <div className="space-y-5">
              {stages.map((stage, index) => {
                const complete = progress >= (index + 1) * 30 || job?.status === "completed";
                const active = !complete && index === activeStage;
                return (
                  <div key={stage.key} className="flex items-center gap-4">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${complete ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-300" : active ? "border-blue-300/30 bg-blue-300/10 text-blue-300" : "border-white/10 text-slate-700"}`}>
                      {complete ? <Check className="h-3.5 w-3.5" /> : active ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Circle className="h-2.5 w-2.5" />}
                    </span>
                    <span className={`text-sm ${complete || active ? "text-slate-200" : "text-slate-600"}`}>{stage.label}</span>
                    {active && <span className="ml-auto text-xs text-blue-300/70">in progress</span>}
                    {complete && <span className="ml-auto text-xs text-emerald-300/60">done</span>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      {error && <div className="mt-4"><StatusMessage message={error} error /></div>}
    </div>
  );
}