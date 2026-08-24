import { useState } from "react";
import { api } from "../api";
import type { Goal } from "../api";

const PRESETS: { key: string; label: string; goal: Goal }[] = [
  { key: "lose", label: "Похудение", goal: { daily_kcal: 1700, protein_g: 110, fat_g: 55, carbs_g: 160 } },
  { key: "maintain", label: "Поддержание", goal: { daily_kcal: 2100, protein_g: 100, fat_g: 70, carbs_g: 230 } },
  { key: "gain", label: "Набор", goal: { daily_kcal: 2600, protein_g: 130, fat_g: 80, carbs_g: 300 } },
];

const primaryBtn: React.CSSProperties = {
  width: "100%",
  height: 56,
  borderRadius: 100,
  border: "none",
  background: "var(--mint-deep)",
  color: "white",
  fontSize: 15.5,
  fontWeight: 700,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  width: "100%",
  height: 44,
  borderRadius: 100,
  border: "none",
  background: "transparent",
  color: "var(--text-3)",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

export default function Onboarding({ onDone }: { onDone: (opts: { goToAdd: boolean }) => void }) {
  const [step, setStep] = useState(0);
  const [preset, setPreset] = useState("maintain");
  const [saving, setSaving] = useState(false);

  async function applyGoalAndContinue() {
    setSaving(true);
    try {
      const chosen = PRESETS.find((p) => p.key === preset)!.goal;
      await api.setGoal(chosen);
    } catch {
      // default goal already exists server-side — not fatal if this fails
    } finally {
      setSaving(false);
      setStep(2);
    }
  }

  return (
    <div className="screen" style={{ alignItems: "center", justifyContent: "center", padding: "20px 24px" }}>
      {step === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, textAlign: "center", maxWidth: 320 }}>
          <div style={{ width: 72, height: 72, borderRadius: 24, background: "var(--mint-tint)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--mint-deep)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="14" rx="2" />
              <circle cx="12" cy="13" r="3.5" />
              <path d="M9 6l1-2h4l1 2" />
            </svg>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>Фото → ккал за секунды</div>
          <div style={{ fontSize: 14.5, color: "var(--text-3)" }}>
            Сфотографируй еду или опиши её текстом — остальное сделает нейросеть.
          </div>
          <button style={primaryBtn} onClick={() => setStep(1)}>Дальше</button>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: 340 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Какая у тебя цель?</div>
            <div style={{ fontSize: 14, color: "var(--text-3)" }}>Можно поменять в любой момент во вкладке «Цели»</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {PRESETS.map((p) => (
              <div
                key={p.key}
                onClick={() => setPreset(p.key)}
                style={{
                  flexGrow: 1,
                  textAlign: "center",
                  padding: "14px 8px",
                  borderRadius: 18,
                  background: preset === p.key ? "var(--text)" : "var(--surface)",
                  border: `1px solid ${preset === p.key ? "var(--text)" : "var(--border)"}`,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: preset === p.key ? 700 : 600, color: preset === p.key ? "var(--bg)" : "var(--text-2)" }}>
                  {p.label}
                </div>
              </div>
            ))}
          </div>
          <button style={primaryBtn} onClick={applyGoalAndContinue} disabled={saving}>
            {saving ? "Сохраняем…" : "Дальше"}
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, textAlign: "center", maxWidth: 320 }}>
          <div style={{ width: 72, height: 72, borderRadius: 24, background: "var(--coral-tint)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--coral-deep)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Занеси первый приём пищи</div>
          <div style={{ fontSize: 14.5, color: "var(--text-3)" }}>
            Сфотографируй, что сейчас ешь — или опиши парой слов.
          </div>
          <button style={primaryBtn} onClick={() => onDone({ goToAdd: true })}>Сфотографировать еду</button>
          <button style={ghostBtn} onClick={() => onDone({ goToAdd: false })}>Позже</button>
        </div>
      )}
    </div>
  );
}
