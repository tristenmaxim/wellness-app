import { useEffect, useRef } from "react";
import { api, setToken } from "../api";
import { BOT_USERNAME } from "../telegram";

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, unknown>) => void;
  }
}

export default function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.onTelegramAuth = async (user) => {
      try {
        const { token } = await api.authTelegramWidget(user);
        setToken(token);
        onLoggedIn();
      } catch {
        alert("Не удалось войти. Попробуйте ещё раз.");
      }
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "100");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    containerRef.current?.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
    };
  }, [onLoggedIn]);

  return (
    <div className="screen" style={{ alignItems: "center", justifyContent: "center", gap: 24, padding: 20 }}>
      <div style={{ width: 72, height: 72, borderRadius: 24, background: "var(--mint-tint)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--mint-deep)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3c-3 0-5 2.5-5 6 0 3 1.6 5 3 6.5V21h4v-5.5c1.4-1.5 3-3.5 3-6.5 0-3.5-2-6-5-6z" />
        </svg>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, textAlign: "center" }}>Wellness</div>
      <div style={{ fontSize: 14, color: "var(--text-3)", textAlign: "center", maxWidth: 280 }}>
        Считайте калории по фото еды. Войдите через Telegram, чтобы начать.
      </div>
      <div ref={containerRef} />
    </div>
  );
}
