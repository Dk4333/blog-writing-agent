/* StatusBadge — shows draft / approved / published with color */

interface Props {
  status: string | null;
}

export default function StatusBadge({ status }: Props) {
  const s = status || "draft";
  const colors: Record<string, string> = {
    draft: "#eab308",
    approved: "#22c55e",
    published: "#3b82f6",
  };
  const icons: Record<string, string> = {
    draft: "🟡",
    approved: "🟢",
    published: "🚀",
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 20,
        fontSize: 13,
        fontWeight: 600,
        backgroundColor: `${colors[s] || "#999"}22`,
        color: colors[s] || "#999",
        border: `1px solid ${colors[s] || "#999"}44`,
      }}
    >
      {icons[s] || "⚪"} {s}
    </span>
  );
}
