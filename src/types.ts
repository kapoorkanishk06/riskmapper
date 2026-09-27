export type RiskLevel = "critical" | "medium" | "low";

export interface ContributorShare {
  name: string;
  email?: string | null;
  percentage: number;
}

export interface FileResult {
  id: number;
  filename: string;
  primary_owner: string;
  primary_owner_email?: string | null;
  concentration_score: number;
  days_since_last_commit: number;
  criticality_score: number;
  final_risk_score: number;
  commit_count: number;
  lines_changed: number;
  zombie_ownership: boolean;
  contributors: ContributorShare[];
}

export interface FileDetail extends FileResult {
  imports: string[];
  plain_english_summary?: string | null;
  impact_narrative?: string | null;
  explainer_doc_draft?: string | null;
  pairing_suggestion?: string | null;
}

export interface ResultsResponse {
  job_id: string;
  total: number;
  page: number;
  page_size: number;
  files: FileResult[];
}

export interface SummaryResponse {
  job_id: string;
  total_files_analyzed: number;
  critical_risk_files: number;
  knowledge_risk_score: number;
  riskiest_file: FileResult | null;
}

export interface JobStatus {
  job_id: string;
  repo_url: string;
  months: number;
  status: string;
  progress: number;
  message?: string | null;
  error?: string | null;
  created_at?: string;
  completed_at?: string | null;
}

export interface AnalyzeResponse {
  job_id: string;
  status: string;
  message: string;
}

export interface AffectedFile {
  id: number;
  filename: string;
  risk_score: number;
  criticality_score: number;
  impact_narrative?: string | null;
}

export interface SimulationResponse {
  job_id: string;
  contributor: string;
  affected_files: AffectedFile[];
  orphaned_file_count: number;
  criticality_weighted_impact_score: number;
  summary: string;
}

export interface HealthResponse {
  status: string;
  service: string;
  ai_enabled: boolean;
}

export function riskLevel(score: number): RiskLevel {
  if (score > 70) return "critical";
  if (score >= 40) return "medium";
  return "low";
}

export function riskLabel(score: number): string {
  const level = riskLevel(score);
  return level === "critical" ? "Critical risk" : level === "medium" ? "Watch closely" : "Low risk";
}