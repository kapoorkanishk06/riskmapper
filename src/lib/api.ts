import type {
  AnalyzeResponse,
  FileDetail,
  HealthResponse,
  JobStatus,
  ResultsResponse,
  SimulationResponse,
  SummaryResponse,
} from "../types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      ...options,
    });
  } catch {
    throw new Error(`Could not reach the backend at ${API_BASE_URL}. Is the API running?`);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof payload?.detail === "string" ? payload.detail : `Request failed with status ${response.status}.`;
    throw new Error(detail);
  }
  return payload as T;
}

export function startAnalysis(repoUrl: string): Promise<AnalyzeResponse> {
  return request<AnalyzeResponse>("/api/analyze", {
    method: "POST",
    body: JSON.stringify({ repo_url: repoUrl }),
  });
}

export function getJobStatus(jobId: string): Promise<JobStatus> {
  return request<JobStatus>(`/api/status/${encodeURIComponent(jobId)}`);
}

export function getResults(jobId: string, pageSize = 100): Promise<ResultsResponse> {
  return request<ResultsResponse>(`/api/results/${encodeURIComponent(jobId)}?page=1&page_size=${pageSize}`);
}

export function getSummary(jobId: string): Promise<SummaryResponse> {
  return request<SummaryResponse>(`/api/results/${encodeURIComponent(jobId)}/summary`);
}

export function getFileDetail(jobId: string, fileId: number): Promise<FileDetail> {
  return request<FileDetail>(
    `/api/results/${encodeURIComponent(jobId)}/file/${encodeURIComponent(fileId)}`,
  );
}

export function simulateContributor(jobId: string, contributor: string): Promise<SimulationResponse> {
  return request<SimulationResponse>("/api/simulate", {
    method: "POST",
    body: JSON.stringify({ job_id: jobId, contributor }),
  });
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health");
}