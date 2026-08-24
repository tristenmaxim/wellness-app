import { useEffect, useState } from "react";
import { api } from "../api";
import type { MeResponse } from "../api";
import { clearToken } from "../api";
import BottomNav from "../components/BottomNav";

export default function Profile() {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
  }, []);

  const initials = me?.first_name?.slice(0, 2).toUpperCase() ?? "";

  return (
    <div className="screen">
      <div style={{ padding: "36px 20px 120px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        {me?.photo_url ? (
          <img src={me.photo_url} alt="" style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 88, height: 88, borderRadius: "50%", background: "var(--mint-tint)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Sora, sans-serif", fontWeight: 800, color: "var(--mint-deep)", fontSize: 30 }}>
            {initials}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ fontSize: 19, fontWeight: 700 }}>{me?.first_name ?? "..."}</div>
          {me?.username && <div style={{ fontSize: 13.5, color: "var(--text-3)", fontWeight: 500 }}>@{me.username}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--mint-tint)", color: "var(--mint-deep)", padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 700 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.5 4.5L2.7 11.9c-1.2.5-1.2 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.4.8.9.8s.7-.2 1-.5l2.4-2.3 4.9 3.6c.9.5 1.5.3 1.8-.8l3.2-15c.3-1.3-.4-1.8-1.8-1.8z" />
          </svg>
          Вход через Telegram
        </div>

        <div style={{ width: "100%", maxWidth: 350, display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          <div style={rowStyle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
            <div style={{ flexGrow: 1, fontSize: 14.5, fontWeight: 600 }}>Единицы измерения</div>
            <div style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 600 }}>граммы, ккал</div>
          </div>
          <div style={rowStyle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 16v-5M12 8h.01" />
            </svg>
            <div style={{ flexGrow: 1, fontSize: 14.5, fontWeight: 600 }}>О приложении</div>
          </div>
          <div onClick={() => { clearToken(); location.reload(); }} style={{ ...rowStyle, cursor: "pointer" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--coral-deep)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
            <div style={{ flexGrow: 1, fontSize: 14.5, fontWeight: 600, color: "var(--coral-deep)" }}>Выйти</div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 18,
  padding: 16,
};
