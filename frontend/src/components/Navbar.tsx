/* Navbar — top navigation bar */
import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/", label: "Generate" },
  { to: "/history", label: "History" },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.brand}>
        ✍️ Blog Writing Agent
      </Link>
      <div style={styles.links}>
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            style={{
              ...styles.link,
              fontWeight: pathname === l.to ? 700 : 400,
              borderBottom:
                pathname === l.to ? "2px solid #3b82f6" : "2px solid transparent",
            }}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  brand: {
    fontSize: 18,
    fontWeight: 700,
    textDecoration: "none",
    color: "#111",
  },
  links: {
    display: "flex",
    gap: 20,
  },
  link: {
    textDecoration: "none",
    color: "#333",
    fontSize: 14,
    paddingBottom: 4,
  },
};
