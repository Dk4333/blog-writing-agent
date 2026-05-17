/* Generate page — enter topic, generate blog, review/approve/publish */
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import StatusBadge from "../components/StatusBadge";
import {
  generateBlog,
  updateRun,
  rewriteRun,
  publishRun,
  type GenerateResponse,
} from "../api/client";

export default function Generate() {
  const [topic, setTopic] = useState("");
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [status, setStatus] = useState("draft");
  const [tab, setTab] = useState<"preview" | "plan" | "evidence">("preview");

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editMd, setEditMd] = useState("");

  // Rewrite state
  const [rewriting, setRewriting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [rewriteLoading, setRewriteLoading] = useState(false);

  // Publish state
  const [publishing, setPublishing] = useState(false);
  const [publishUrl, setPublishUrl] = useState("");

  async function handleGenerate() {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setStatus("draft");
    setPublishUrl("");
    try {
      const res = await generateBlog(topic.trim(), asOf);
      setResult(res);
      setStatus("draft");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!result?.run_id) return;
    try {
      await updateRun(result.run_id, { status: "approved" });
      setStatus("approved");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleSaveEdit() {
    if (!result?.run_id) return;
    try {
      await updateRun(result.run_id, { final_md: editMd, status: "draft" });
      setResult({ ...result, final_md: editMd });
      setStatus("draft");
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleRewrite() {
    if (!result?.run_id || !feedback.trim()) return;
    setRewriteLoading(true);
    try {
      const updated = await rewriteRun(result.run_id, feedback.trim());
      setResult({ ...result, final_md: updated.final_md || "" });
      setStatus("draft");
      setRewriting(false);
      setFeedback("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRewriteLoading(false);
    }
  }

  async function handlePublish() {
    if (!result?.run_id) return;
    setPublishing(true);
    try {
      const res = await publishRun(result.run_id);
      setPublishUrl(res.html_url);
      setStatus("published");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div style={styles.container}>
      {/* ---- Input section ---- */}
      <div style={styles.inputSection}>
        <h2 style={{ margin: 0 }}>Generate a Blog</h2>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter your blog topic..."
          rows={4}
          style={styles.textarea}
        />
        <div style={styles.row}>
          <label style={styles.label}>
            As-of date:
            <input
              type="date"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              style={styles.dateInput}
            />
          </label>
          <button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            style={{
              ...styles.primaryBtn,
              opacity: loading || !topic.trim() ? 0.6 : 1,
            }}
          >
            {loading ? "⏳ Generating..." : "🚀 Generate Blog"}
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* ---- Result section ---- */}
      {result && (
        <div style={styles.resultSection}>
          {/* Header */}
          <div style={styles.resultHeader}>
            <div>
              <h2 style={{ margin: 0 }}>{result.blog_title || "Blog"}</h2>
              <p style={styles.meta}>
                {result.mode} · {result.blog_kind}
              </p>
            </div>
            <StatusBadge status={status} />
          </div>

          {/* Tabs */}
          <div style={styles.tabs}>
            {(["preview", "plan", "evidence"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  ...styles.tab,
                  borderBottom:
                    tab === t
                      ? "2px solid #3b82f6"
                      : "2px solid transparent",
                  color: tab === t ? "#3b82f6" : "#666",
                }}
              >
                {t === "preview"
                  ? "📝 Preview"
                  : t === "plan"
                  ? "🧩 Plan"
                  : "🔎 Evidence"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={styles.tabContent}>
            {tab === "preview" && (
              <>
                {editing ? (
                  <div>
                    <textarea
                      value={editMd}
                      onChange={(e) => setEditMd(e.target.value)}
                      rows={25}
                      style={{ ...styles.textarea, fontFamily: "monospace" }}
                    />
                    <div style={{ ...styles.row, marginTop: 8 }}>
                      <button onClick={handleSaveEdit} style={styles.primaryBtn}>
                        💾 Save
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        style={styles.secondaryBtn}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : rewriting ? (
                  <div>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="What should be changed?"
                      rows={5}
                      style={styles.textarea}
                    />
                    <div style={{ ...styles.row, marginTop: 8 }}>
                      <button
                        onClick={handleRewrite}
                        disabled={rewriteLoading || !feedback.trim()}
                        style={{
                          ...styles.primaryBtn,
                          opacity:
                            rewriteLoading || !feedback.trim() ? 0.6 : 1,
                        }}
                      >
                        {rewriteLoading
                          ? "⏳ Rewriting..."
                          : "🔄 Submit Feedback"}
                      </button>
                      <button
                        onClick={() => setRewriting(false)}
                        style={styles.secondaryBtn}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={styles.markdownBody}>
                    <ReactMarkdown>{result.final_md}</ReactMarkdown>
                  </div>
                )}

                {/* Action buttons */}
                {!editing && !rewriting && status !== "published" && (
                  <div style={{ ...styles.row, marginTop: 16, gap: 8 }}>
                    <button
                      onClick={handleApprove}
                      disabled={status === "approved"}
                      style={{
                        ...styles.primaryBtn,
                        backgroundColor:
                          status === "approved" ? "#86efac" : "#22c55e",
                      }}
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => {
                        setEditing(true);
                        setEditMd(result.final_md);
                        setRewriting(false);
                      }}
                      style={styles.secondaryBtn}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => {
                        setRewriting(true);
                        setEditing(false);
                      }}
                      style={styles.secondaryBtn}
                    >
                      🔄 Rewrite
                    </button>
                  </div>
                )}

                {/* Publish */}
                {status === "approved" && (
                  <div style={{ ...styles.row, marginTop: 12 }}>
                    <button
                      onClick={handlePublish}
                      disabled={publishing}
                      style={{
                        ...styles.primaryBtn,
                        backgroundColor: "#3b82f6",
                      }}
                    >
                      {publishing ? "⏳ Pushing..." : "🚀 Push to GitHub"}
                    </button>
                  </div>
                )}

                {publishUrl && (
                  <div style={styles.success}>
                    Published!{" "}
                    <a
                      href={publishUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on GitHub →
                    </a>
                  </div>
                )}

                {/* Download */}
                {result.final_md && (
                  <div style={{ ...styles.row, marginTop: 12 }}>
                    <a
                      href={`data:text/markdown;charset=utf-8,${encodeURIComponent(result.final_md)}`}
                      download={`${result.blog_title || "blog"}.md`}
                      style={styles.downloadLink}
                    >
                      ⬇️ Download Markdown
                    </a>
                  </div>
                )}
              </>
            )}

            {tab === "plan" && (
              <pre style={styles.pre}>
                {result.plan
                  ? JSON.stringify(result.plan, null, 2)
                  : "No plan data"}
              </pre>
            )}

            {tab === "evidence" && (
              <pre style={styles.pre}>
                {result.evidence && result.evidence.length > 0
                  ? JSON.stringify(result.evidence, null, 2)
                  : "No evidence (closed_book mode or no Tavily results)"}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 900, margin: "0 auto", padding: "24px 16px" },
  inputSection: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 24,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    backgroundColor: "#fafafa",
  },
  textarea: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14,
    resize: "vertical",
    boxSizing: "border-box",
  },
  row: { display: "flex", alignItems: "center", gap: 12 },
  label: { fontSize: 14, color: "#555", display: "flex", alignItems: "center", gap: 8 },
  dateInput: { padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db" },
  primaryBtn: {
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    backgroundColor: "#3b82f6",
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "10px 20px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    backgroundColor: "#fff",
    color: "#333",
    fontWeight: 500,
    fontSize: 14,
    cursor: "pointer",
  },
  error: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fecaca",
  },
  success: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f0fdf4",
    color: "#16a34a",
    border: "1px solid #bbf7d0",
  },
  resultSection: {
    marginTop: 24,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    overflow: "hidden",
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    backgroundColor: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
  },
  meta: { margin: "4px 0 0", fontSize: 13, color: "#888" },
  tabs: {
    display: "flex",
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#fff",
  },
  tab: {
    padding: "10px 20px",
    border: "none",
    backgroundColor: "transparent",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
  },
  tabContent: { padding: 24 },
  markdownBody: { lineHeight: 1.7, fontSize: 15 },
  pre: {
    backgroundColor: "#f3f4f6",
    padding: 16,
    borderRadius: 8,
    overflow: "auto",
    fontSize: 13,
    lineHeight: 1.5,
  },
  downloadLink: {
    display: "inline-block",
    padding: "8px 16px",
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    color: "#333",
    textDecoration: "none",
    fontSize: 14,
  },
};
