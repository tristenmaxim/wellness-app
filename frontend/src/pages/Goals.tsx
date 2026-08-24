import { useEffect, useState } from "react";
import { api } from "../api";
import type { Goal } from "../api";
import BottomNav from "../components/BottomNav";

const PRESETS: { key: string; label: string; goal: Goal }[] = [
  { key: "lose", label: "Похудение", goal: { daily_kcal: 1700, protein_g: 110, fat_g: 55, carbs_g: 160 } },
  { key: "maintain", label: "Поддержание", goal: { daily_kcal: 2100, protein_g: 100, fat_g: 70, carbs_g: 230 } },
  { key: "gain", label: "Набор", goal: { daily_kcal: 2600, protein_g: 130, fat_g: 80, carbs_g: 300 } },
];

const DEFAULT_GOAL: Goal = PRESETS[1].goal;

function Stepper({ value, onChange, step, suffix }: { value: number; onChange: (v: number) => void; step: number; suffix: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div onClick={() => onChange(Math.max(value - step, 0))} style={stepBtn}>−</div>
      <div className="num" style={{ fontSize: 16, fontWeight: 700, minWidth: 36, textAlign: "center" }}>
        {Math.round(value)}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>{suffix}</div>
      <div onClick={() => onChange(value + step)} style={stepBtn}>+</div>
    </div>
  );
}

export default function Goals() {
  const [goal, setGoalState] = useState<Goal>(DEFAULT_GOAL);
  const [activePreset, setActivePreset] = useState<string | null>("maintain");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getGoal().then((g) => {
      if (g) {
        setGoalState(g);
        setActivePreset(null);
      }
    }).catch(() => {});
  }, []);

  function applyPreset(key: string) {
    const preset = PRESETS.find((p) => p.key === key)!;
    setGoalState(preset.goal);
    setActivePreset(key);
  }

  function update(field: keyof Goal, value: number) {
    setGoalState((g) => ({ ...g, [field]: value }));
    setActivePreset(null);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await api.setGoal(goal);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="screen">
      <div style={{ padding: "28px 20px 200px 20px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Цели</div>
        <div style={{ fontSize: 13.5, color: "var(--text-3)", marginBottom: 22 }}>Настройте дневную норму под себя</div>

        <div style={{ display: "flex", gap: 10, marginBottom: 26 }}>
          {PRESETS.map((p) => (
            <div
              key={p.key}
              onClick={() => applyPreset(p.key)}
              style={{
                flexGrow: 1,
                textAlign: "center",
                padding: "14px 8px",
                borderRadius: 18,
                background: activePreset === p.key ? "var(--text)" : "var(--surface)",
                border: `1px solid ${activePreset === p.key ? "var(--text)" : "var(--border)"}`,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: activePreset === p.key ? 700 : 600, color: activePreset === p.key ? "var(--bg)" : "var(--text-2)" }}>
                {p.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 24, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 600 }}>Дневная норма</div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div onClick={() => update("daily_kcal", Math.max(goal.daily_kcal - 50, 0))} style={{ ...stepBtn, width: 40, height: 40, fontSize: 20 }}>−</div>
            <div className="num" style={{ fontSize: 40, fontWeight: 800 }}>{Math.round(goal.daily_kcal)}</div>
            <div onClick={() => update("daily_kcal", goal.daily_kcal + 50)} style={{ ...stepBtn, width: 40, height: 40, fontSize: 20 }}>+</div>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 600 }}>ккал в день</div>
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Баланс БЖУ</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={rowStyle}>
            <div style={{ ...iconWrap, background: "var(--mint-tint)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mint-deep)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M6 6l6-4 6 4M6 18l6 4 6-4" />
              </svg>
            </div>
            <div style={{ flexGrow: 1, fontSize: 14, fontWeight: 600 }}>Белки</div>
            <Stepper value={goal.protein_g} onChange={(v) => update("protein_g", v)} step={5} suffix="г" />
          </div>
          <div style={rowStyle}>
            <div style={{ ...iconWrap, background: "var(--coral-tint)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--coral-deep)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 8v8M8 12h8" />
              </svg>
            </div>
            <div style={{ flexGrow: 1, fontSize: 14, fontWeight: 600 }}>Жиры</div>
            <Stepper value={goal.fat_g} onChange={(v) => update("fat_g", v)} step={5} suffix="г" />
          </div>
          <div style={rowStyle}>
            <div style={{ ...iconWrap, background: "var(--lav-tint)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--lav-deep)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 3v18M19 3v18M5 8h4M5 13h4" />
              </svg>
            </div>
            <div style={{ flexGrow: 1, fontSize: 14, fontWeight: 600 }}>Углеводы</div>
            <Stepper value={goal.carbs_g} onChange={(v) => update("carbs_g", v)} step={10} suffix="г" />
          </div>
        </div>
      </div>

      <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 96, width: "calc(100% - 40px)", maxWidth: 440 }}>
        <button
          onClick={save}
          disabled={saving}
          style={{ width: "100%", height: 56, borderRadius: 100, border: "none", background: "var(--mint-deep)", color: "white", fontSize: 15.5, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}
        >
          {saved ? "Сохранено ✓" : saving ? "Сохраняем…" : "Сохранить цель"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

const stepBtn: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: "50%",
  border: "1px solid var(--border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  color: "var(--text-2)",
  cursor: "pointer",
  userSelect: "none",
  background: "var(--bg)",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 20,
  padding: 16,
};

const iconWrap: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
