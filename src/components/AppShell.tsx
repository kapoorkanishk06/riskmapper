import { Activity, ArrowLeft, GitBranch, Plus, Radar, UsersRound } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { jobId } = useParams();
  const isDashboard = location.pathname.includes("/dashboard/");

  return (
    <div className="min-h-screen overflow-x-hidden bg-ink-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_80%_-10%,rgba(59,130,246,.12),transparent_35%),radial-gradient(circle_at_10%_30%,rgba(239,68,68,.06),transparent_30%)]" />
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 lg:px-8">
          <Link to="/" className="group flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-300/20 bg-blue-400/10 text-blue-300 transition group-hover:border-blue-300/40">
              <Radar className="h-4 w-4" />
            </span>
            <span className="font-mono text-sm font-semibold tracking-tight text-slate-100">
              knowledge<span className="text-blue-300">/</span>risk
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {isDashboard && jobId && (
              <>
                <Link to={`/dashboard/${jobId}/simulate`} className="hidden items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100 sm:flex">
                  <UsersRound className="h-3.5 w-3.5" />
                  Simulate departure
                </Link>
                <Link to="/" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white">
                  <Plus className="h-3.5 w-3.5" />
                  New analysis
                </Link>
              </>
            )}
            {!isDashboard && location.pathname !== "/" && (
              <Link to="/" className="inline-flex items-center gap-2 text-xs text-slate-400 transition hover:text-white">
                <ArrowLeft className="h-3.5 w-3.5" />
                New analysis
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="relative mx-auto max-w-[1440px] px-5 py-8 lg:px-8 lg:py-10">{children}</main>
      <footer className="relative mx-auto flex max-w-[1440px] items-center gap-2 px-5 pb-8 pt-2 text-xs text-slate-600 lg:px-8">
        <GitBranch className="h-3.5 w-3.5" />
        <span>Knowledge Risk Mapper</span>
        <span className="text-slate-700">•</span>
        <span>Repository intelligence for teams that ship</span>
        <Activity className="ml-auto h-3.5 w-3.5 text-emerald-400/60" />
      </footer>
    </div>
  );
}