import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { MealItem } from "../api";

const MEAL_TYPES: { value: string; label: string }[] = [
  { value: "breakfast", label: "Завтрак" },
  { value: "lunch", label: "Обед" },
  { value: "snack", label: "Перекус" },
  { value: "dinner", label: "Ужин" },
];

function guessMealType(): string {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 19) return "snack";
  return "dinner";
}

async function compressPhoto(file: File, maxDim = 1600, maxBytes = 1_000_000): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);

  let quality = 0.85;
  let blob: Blob | null = null;
  for (let i = 0; i < 6; i++) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size <= maxBytes || quality <= 0.4) break;
    quality -= 0.15;
  }
  if (!blob) return file;
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

export default function AddMeal() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"photo" | "text">("photo");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MealItem[] | null>(null);
  const [photoToken, setPhotoToken] = useState<string | null>(null);
  const [mealType, setMealType] = useState(guessMealType());
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function runAnalyze(input: { text?: string; photo?: File }) {
    setLoading(true);
    setError(null);
    setItems(null);
    try {
      const result = await api.analyzeMeal(input);
      if (result.items.length === 0) {
        setError("Не удалось распознать еду. Попробуйте другое фото или опишите текстом.");
      }
      setItems(result.items);
      setPhotoToken(result.photo_token);
    } catch {
      setError("Ошибка распознавания. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  async function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    let toUpload = file;
    try {
      toUpload = await compressPhoto(file);
    } catch {
      // browser couldn't decode/compress — send the original and let the backend try
    }
    runAnalyze({ photo: toUpload });
  }

  function adjustWeight(itemId: string, deltaG: number) {
    setItems((prev) =>
      prev
        ? prev.map((it) => {
            if (it.id !== itemId) return it;
            const newWeight = Math.max(it.weight_g + deltaG, 0);
            const ratio = it.weight_g > 0 ? newWeight / it.weight_g : 0;
            return {
              ...it,
              weight_g: newWeight,
              kcal: Math.round(it.kcal * ratio * 10) / 10,
              protein_g: Math.round(it.protein_g * ratio * 10) / 10,
              fat_g: Math.round(it.fat_g * ratio * 10) / 10,
              carbs_g: Math.round(it.carbs_g * ratio * 10) / 10,
            };
          })
        : prev
    );
  }

  const total = items?.reduce((sum, it) => sum + it.kcal, 0) ?? 0;

  async function save() {
    if (!items || items.length === 0) return;
    setSaving(true);
    try {
      await api.createMeal({
        meal_type: mealType,
        eaten_at: new Date().toISOString(),
        raw_text: tab === "text" ? text : undefined,
        photo_token: photoToken,
        items: items.map(({ id: _id, ...rest }) => rest),
      });
      navigate("/");
    } catch {
      setError("Не удалось сохранить приём пищи.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="screen">
      <div style={{ padding: "28px 20px 160px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div style={{ fontSize: 19, fontWeight: 700 }}>Новый приём пищи</div>
        </div>

        <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 100, padding: 4, marginBottom: 20 }}>
          {(["photo", "text"] as const).map((t) => (
            <div
              key={t}
              onClick={() => setTab(t)}
              style={{
                flexGrow: 1,
                textAlign: "center",
                padding: "10px 0",
                borderRadius: 100,
                background: tab === t ? "var(--text)" : "transparent",
                color: tab === t ? "var(--bg)" : "var(--text-3)",
                fontSize: 14,
                fontWeight: tab === t ? 700 : 600,
                cursor: "pointer",
              }}
            >
              {t === "photo" ? "Фото" : "Текст"}
            </div>
          ))}
        </div>

        {tab === "photo" ? (
          <div
            style={{
              border: "2px dashed var(--border)",
              borderRadius: 24,
              padding: "32px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 18,
              background: "var(--surface)",
            }}
          >
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhotoSelected} />
            <div style={{ fontSize: 14.5, fontWeight: 600, textAlign: "center", color: "var(--text-2)" }}>
              Сфотографируйте еду или загрузите фото
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "100%",
                height: 56,
                borderRadius: 100,
                border: "none",
                background: "var(--mint-deep)",
                color: "white",
                fontSize: 15.5,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="6" width="18" height="14" rx="2" />
                <circle cx="12" cy="13" r="3.5" />
                <path d="M9 6l1-2h4l1 2" />
              </svg>
              Сделать фото
            </button>
            <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>JPG, PNG до 10 МБ</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Опишите приём пищи, например: омлет из 2 яиц с сыром"
              rows={4}
              style={{
                width: "100%",
                borderRadius: 20,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                padding: 16,
                fontSize: 14.5,
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
            <button
              onClick={() => runAnalyze({ text })}
              disabled={!text.trim() || loading}
              style={{
                height: 48,
                borderRadius: 100,
                border: "none",
                background: "var(--mint-deep)",
                color: "white",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer",
                opacity: !text.trim() || loading ? 0.5 : 1,
              }}
            >
              Распознать
            </button>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "28px 0", color: "var(--text-3)", fontSize: 14, fontWeight: 600 }}>
            Распознаём блюдо…
          </div>
        )}

        {error && (
          <div style={{ marginTop: 16, fontSize: 13.5, color: "var(--coral-deep)", background: "var(--coral-tint)", padding: 14, borderRadius: 16 }}>
            {error}
          </div>
        )}

        {items && items.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0 16px 0" }}>
              <div style={{ flexGrow: 1, height: 1, background: "var(--border)" }} />
              <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>РЕЗУЛЬТАТ РАСПОЗНАВАНИЯ</div>
              <div style={{ flexGrow: 1, height: 1, background: "var(--border)" }} />
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {MEAL_TYPES.map((mt) => (
                <div
                  key={mt.value}
                  onClick={() => setMealType(mt.value)}
                  style={{
                    flexGrow: 1,
                    textAlign: "center",
                    padding: "8px 4px",
                    borderRadius: 100,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: mealType === mt.value ? "var(--mint-tint)" : "var(--surface)",
                    color: mealType === mt.value ? "var(--mint-deep)" : "var(--text-3)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {mt.label}
                </div>
              ))}
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 24, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {items.map((it, idx) => (
                <div key={it.id}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700 }}>{it.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
                        {Math.round(it.kcal)} ккал · Б {Math.round(it.protein_g)} Ж {Math.round(it.fat_g)} У {Math.round(it.carbs_g)}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg)", borderRadius: 100, padding: "6px 10px" }}>
                      <div onClick={() => adjustWeight(it.id, -10)} style={stepperBtn}>−</div>
                      <div className="num" style={{ fontSize: 13, fontWeight: 700, width: 48, textAlign: "center" }}>
                        {Math.round(it.weight_g)} г
                      </div>
                      <div onClick={() => adjustWeight(it.id, 10)} style={stepperBtn}>+</div>
                    </div>
                  </div>
                  {idx < items.length - 1 && <div style={{ height: 1, background: "var(--border)", marginTop: 16 }} />}
                </div>
              ))}

              <div style={{ height: 1, background: "var(--border)" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-2)" }}>Итого</div>
                <div className="num" style={{ fontSize: 24, fontWeight: 800 }}>
                  {Math.round(total)} <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-3)" }}>ккал</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {items && items.length > 0 && (
        <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 0, width: "100%", maxWidth: 480, padding: "16px 20px 24px 20px", background: "linear-gradient(to top, var(--bg) 65%, transparent)" }}>
          <button
            onClick={save}
            disabled={saving}
            style={{ width: "100%", height: 56, borderRadius: 100, border: "none", background: "var(--mint-deep)", color: "white", fontSize: 15.5, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Сохраняем…" : "Сохранить приём пищи"}
          </button>
        </div>
      )}
    </div>
  );
}

const stepperBtn: React.CSSProperties = {
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
};
