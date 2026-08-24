import { NavLink } from "react-router-dom";

const items = [
  {
    to: "/",
    label: "Главная",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l9-7 9 7" />
        <path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    to: "/diary",
    label: "Дневник",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    to: "/goals",
    label: "Цели",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    to: "/profile",
    label: "Профиль",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: 20,
        width: "calc(100% - 40px)",
        maxWidth: 440,
        height: 64,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        boxShadow: "0 8px 24px oklch(0% 0 0 / 0.06)",
      }}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          style={({ isActive }) => ({
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            color: isActive ? "var(--mint-deep)" : "var(--text-3)",
            textDecoration: "none",
          })}
        >
          {({ isActive }) => (
            <>
              <span style={{ display: "flex" }}>{item.icon}</span>
              <span style={{ fontSize: 10.5, fontWeight: isActive ? 700 : 600 }}>
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}
