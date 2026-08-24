import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { DaySummary, Goal, MeResponse } from "../api";
import BottomNav from "../components/BottomNav";

const MEAL_LABEL: Record<string, string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  dinner: "Ужин",
  snack: "Перекус",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 80, fontSize: 13, color: "var(--text-2)", fontWeight: 600 }}>{label}</div>
      <div style={{ flexGrow: 1, height: 10, borderRadius: 100, background: "var(--border)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 100 }} />
      </div>
      <div className="num" style={{ width: 72, textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--text-2)" }}>
        {Math.round(value)}/{Math.round(target)}г
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [day, setDay] = useState<DaySummary | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
    api.day(todayISO()).then(setDay).catch(() => {});
    api.getGoal().then(setGoal).catch(() => {});
  }, []);

  const kcalTarget = goal?.daily_kcal ?? 0;
  const kcalEaten = day?.total_kcal ?? 0;
  const remaining = Math.max(kcalTarget - kcalEaten, 0);
  const progress = kcalTarget > 0 ? Math.min(kcalEaten / kcalTarget, 1) : 0;
  const circumference = 540.4;
  const dashoffset = circumference * (1 - progress);
  const initials = me?.first_name?.slice(0, 2).toUpperCase() ?? "";

  return (
    <div className="screen">
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: "28px 20px 120px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>Сегодня</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Привет, {me?.first_name ?? "..."}</div>
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--mint-tint)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Sora, sans-serif",
              fontWeight: 700,
              color: "var(--mint-deep)",
              fontSize: 16,
            }}
          >
            {initials}
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 28,
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div style={{ position: "relative", width: 200, height: 200 }}>
            <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="100" cy="100" r="86" fill="none" stroke="var(--border)" strokeWidth="16" />
              <circle
                cx="100"
                cy="100"
                r="86"
                fill="none"
                stroke="var(--mint)"
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashoffset}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
              }}
            >
              <div className="num" style={{ fontSize: 44, fontWeight: 800, lineHeight: 1 }}>
                {Math.round(kcalEaten)}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>
                из {kcalTarget ? Math.round(kcalTarget) : "—"} ккал
              </div>
            </div>
          </div>
          {kcalTarget > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "var(--mint-tint)",
                color: "var(--mint-deep)",
                padding: "6px 12px",
                borderRadius: 100,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {Math.round(remaining)} осталось
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
          <MacroBar label="Белки" value={day?.total_protein ?? 0} target={goal?.protein_g ?? 0} color="var(--mint)" />
          <MacroBar label="Жиры" value={day?.total_fat ?? 0} target={goal?.fat_g ?? 0} color="var(--coral)" />
          <MacroBar label="Углеводы" value={day?.total_carbs ?? 0} target={goal?.carbs_g ?? 0} color="var(--lav)" />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 28, marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Сегодня съедено</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {day?.meals.length === 0 && (
            <div style={{ fontSize: 13.5, color: "var(--text-3)", textAlign: "center", padding: "24px 0" }}>
              Пока ничего не занесено
            </div>
          )}
          {day?.meals.map((meal) => (
            <div
              key={meal.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                padding: 14,
              }}
            >
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>
                  {meal.items.map((i) => i.name).join(", ")}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 2 }}>
                  {MEAL_LABEL[meal.meal_type] ?? meal.meal_type} ·{" "}
                  {new Date(meal.eaten_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div className="num" style={{ fontSize: 15, fontWeight: 700 }}>
                {Math.round(meal.total_kcal)}
                <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}> ккал</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 96,
          width: "calc(100% - 40px)",
          maxWidth: 440,
        }}
      >
        <button
          onClick={() => navigate("/add")}
          style={{
            width: "100%",
            height: 56,
            borderRadius: 100,
            border: "none",
            background: "var(--text)",
            color: "var(--bg)",
            fontSize: 15.5,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            cursor: "pointer",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Добавить приём пищи
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
