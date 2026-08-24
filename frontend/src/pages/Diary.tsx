import { useEffect, useState } from "react";
import { api } from "../api";
import type { DaySummary, Goal } from "../api";
import BottomNav from "../components/BottomNav";

const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MEAL_LABEL: Record<string, string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  dinner: "Ужин",
  snack: "Перекус",
};
const MEAL_ORDER = ["breakfast", "lunch", "snack", "dinner"];

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function lastNDays(n: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  return days;
}

export default function Diary() {
  const days = lastNDays(7);
  const [selected, setSelected] = useState(toISO(new Date()));
  const [day, setDay] = useState<DaySummary | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);

  useEffect(() => {
    api.day(selected).then(setDay).catch(() => setDay(null));
  }, [selected]);

  useEffect(() => {
    api.getGoal().then(setGoal).catch(() => {});
  }, []);

  const grouped: Record<string, DaySummary["meals"]> = {};
  for (const type of MEAL_ORDER) grouped[type] = [];
  for (const meal of day?.meals ?? []) {
    (grouped[meal.meal_type] ??= []).push(meal);
  }

  return (
    <div className="screen">
      <div style={{ padding: "28px 20px 120px 20px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 18 }}>Дневник</div>

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginBottom: 20 }}>
          {days.map((d) => {
            const iso = toISO(d);
            const active = iso === selected;
            return (
              <div
                key={iso}
                onClick={() => setSelected(iso)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 0",
                  width: "13%",
                  borderRadius: 16,
                  background: active ? "var(--text)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: active ? 700 : 600, color: active ? "var(--bg)" : "var(--text-3)" }}>
                  {WEEKDAYS[d.getDay()]}
                </div>
                <div className="num" style={{ fontSize: 13, fontWeight: 700, color: active ? "var(--bg)" : "var(--text-3)" }}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 24, padding: 20, display: "flex", flexDirection: "column", gap: 16, marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600 }}>Итого за день</div>
            <div className="num" style={{ fontSize: 28, fontWeight: 800 }}>
              {Math.round(day?.total_kcal ?? 0)}{" "}
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-3)" }}>
                {goal ? `/ ${Math.round(goal.daily_kcal)} ккал` : "ккал"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { label: "Белки", value: day?.total_protein ?? 0, color: "var(--mint)" },
              { label: "Жиры", value: day?.total_fat ?? 0, color: "var(--coral)" },
              { label: "Углеводы", value: day?.total_carbs ?? 0, color: "var(--lav)" },
            ].map((m) => (
              <div key={m.label} style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ height: 8, borderRadius: 100, background: "var(--border)", overflow: "hidden" }}>
                  <div style={{ width: "60%", height: "100%", background: m.color }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600 }}>
                  {m.label} {Math.round(m.value)}г
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {MEAL_ORDER.map((type) => {
            const meals = grouped[type];
            if (!meals || meals.length === 0) return null;
            const totalKcal = meals.reduce((s, m) => s + m.total_kcal, 0);
            return (
              <div key={type}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{MEAL_LABEL[type]}</div>
                  <div className="num" style={{ fontSize: 13, fontWeight: 700, color: "var(--text-3)" }}>
                    {Math.round(totalKcal)} ккал
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {meals.map((meal) => (
                    <div key={meal.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{meal.items.map((i) => i.name).join(", ")}</div>
                      <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>
                        {new Date(meal.eaten_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {day && day.meals.length === 0 && (
            <div style={{ fontSize: 13.5, color: "var(--text-3)", textAlign: "center", padding: "24px 0" }}>
              В этот день ничего не занесено
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
