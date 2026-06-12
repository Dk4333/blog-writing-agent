/* API client — all HTTP calls to FastAPI backend */

// When served from nginx (Docker), use relative paths so nginx proxies /api/.
// For local dev (Vite), set VITE_API_URL=http://localhost:8088.
const API_BASE = import.meta.env.VITE_API_URL || "";

/* ---------- types ---------- */
export interface RunSummary {
  id: number;
  topic: string;
  blog_title: string | null;
  created_at: string | null;
  mode: string | null;
  blog_kind: string | null;
  status: string | null;
  github_pushed: boolean | null;
  github_url: string | null;
}

export interface RunDetail extends RunSummary {
  final_md: string | null;
}

export interface GenerateResponse {
  run_id: number | null;
  blog_title: string;
  mode: string;
  blog_kind: string;
  final_md: string;
  plan: Record<string, unknown> | null;
  evidence: Record<string, unknown>[] | null;
  image_specs: Record<string, unknown>[] | null;
}

export interface PublishResponse {
  html_url: string;
  sha: string;
}

/* ---------- helpers ---------- */
async function json_or_throw(res: Response) {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}

/* ---------- API calls ---------- */

export async function healthCheck() {
  const res = await fetch(`${API_BASE}/api/health`);
  return json_or_throw(res);
}

export interface ReferenceFile {
  name: string;
  size: number;
  uploaded_at: string;
}

export async function generateBlog(
  topic: string,
  as_of?: string,
  use_rag?: boolean
): Promise<GenerateResponse> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, as_of: as_of || undefined, use_rag }),
  });
  return json_or_throw(res);
}

export async function uploadReferenceFile(file: File): Promise<{ message: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/rag/upload`, {
    method: "POST",
    body: formData,
  });
  return json_or_throw(res);
}

export async function listReferenceFiles(): Promise<ReferenceFile[]> {
  const res = await fetch(`${API_BASE}/api/rag/files`);
  return json_or_throw(res);
}

export async function deleteReferenceFile(filename: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/rag/files/${encodeURIComponent(filename)}`, {
    method: "DELETE",
  });
  return json_or_throw(res);
}

export async function listRuns(limit = 50): Promise<RunSummary[]> {
  const res = await fetch(`${API_BASE}/api/runs?limit=${limit}`);
  return json_or_throw(res);
}

export async function getRun(id: number): Promise<RunDetail> {
  const res = await fetch(`${API_BASE}/api/runs/${id}`);
  return json_or_throw(res);
}

export async function updateRun(
  id: number,
  fields: { status?: string; final_md?: string }
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/runs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  await json_or_throw(res);
}

export async function rewriteRun(
  id: number,
  feedback: string
): Promise<RunDetail> {
  const res = await fetch(`${API_BASE}/api/runs/${id}/rewrite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feedback }),
  });
  return json_or_throw(res);
}

export async function publishRun(
  id: number,
  opts?: { repo?: string; branch?: string; file_path?: string }
): Promise<PublishResponse> {
  const res = await fetch(`${API_BASE}/api/runs/${id}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts || {}),
  });
  return json_or_throw(res);
}
