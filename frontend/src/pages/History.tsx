/* History page — list all past runs, click to view details */
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import StatusBadge from "../components/StatusBadge";
import { listRuns, getRun, type RunSummary, type RunDetail } from "../api/client";

export default function History() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<RunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadRuns();
  }, []);

  async function loadRuns() {
    setLoading(true);
    setError("");
    try {
      const data = await listRuns();
      setRuns(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(id: number) {
    setDetailLoading(true);
    try {
      const detail = await getRun(id);
      setSelected(detail);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>Blog History</h2>
        <button onClick={loadRuns} style={styles.refreshBtn}>
          🔄 Refresh
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <p style={styles.muted}>Loading...</p>
      ) : runs.length === 0 ? (
        <p style={styles.muted}>No blogs generated yet.</p>
      ) : (
        <div style={styles.layout}>
          {/* Runs list */}
          <div style={styles.listPanel}>
            {runs.map((run) => (
              <div
                key={run.id}
                onClick={() => handleSelect(run.id)}
                style={{
                  ...styles.runCard,
                  borderColor:
                    selected?.id === run.id ? "#3b82f6" : "#e5e7eb",
                }}
              >
                <div style={styles.runTitle}>
                  {run.blog_title || run.topic}
                </div>
                <div style={styles.runMeta}>
                  {run.created_at?.slice(0, 16)} · {run.mode} ·{" "}
                  {run.blog_kind}
                </div>
                <div style={{ marginTop: 4 }}>
                  <StatusBadge status={run.status} />
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <div style={styles.detailPanel}>
            {detailLoading ? (
              <p style={styles.muted}>Loading blog...</p>
            ) : selected ? (
              <div>
                <h3 style={{ margin: 0 }}>
                  {selected.blog_title || selected.topic}
                </h3>
                <div style={{ margin: "8px 0" }}>
                  <StatusBadge status={selected.status} />
                  {selected.github_url && (
                    <a
                      href={selected.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.ghLink}
                    >
                      View on GitHub →
                    </a>
                  )}
                </div>
                <div style={styles.markdownBody}>
                  <ReactMarkdown>
                    {selected.final_md || "*No content*"}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <p style={styles.muted}>Select a blog to view.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 1200, margin: "0 auto", padding: "24px 16px" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  refreshBtn: {
    padding: "6px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    backgroundColor: "#fff",
    cursor: "pointer",
    fontSize: 13,
  },
  error: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    color: "#dc2626",
    border: "1px solid #fecaca",
    marginBottom: 12,
  },
  muted: { color: "#999", fontSize: 14 },
  layout: { display: "flex", gap: 20, alignItems: "flex-start" },
  listPanel: {
    width: 340,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: "80vh",
    overflowY: "auto",
  },
  runCard: {
    padding: 12,
    borderRadius: 8,
    border: "2px solid #e5e7eb",
    cursor: "pointer",
    backgroundColor: "#fff",
    transition: "border-color 0.15s",
  },
  runTitle: { fontWeight: 600, fontSize: 14 },
  runMeta: { fontSize: 12, color: "#888", marginTop: 2 },
  detailPanel: {
    flex: 1,
    padding: 24,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    backgroundColor: "#fff",
    minHeight: 400,
    maxHeight: "80vh",
    overflowY: "auto",
  },
  ghLink: {
    marginLeft: 12,
    fontSize: 13,
    color: "#3b82f6",
  },
  markdownBody: { marginTop: 16, lineHeight: 1.7, fontSize: 15 },
};
