const TOKEN_KEY = "wellness_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const resp = await fetch(`/api${path}`, { ...options, headers });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`${resp.status}: ${detail}`);
  }
  if (resp.status === 204) return undefined as T;
  return resp.json();
}

export interface MeResponse {
  id: string;
  first_name: string;
  username: string | null;
  photo_url: string | null;
}

export interface MealItem {
  id: string;
  name: string;
  weight_g: number;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  source: string;
}

export interface Meal {
  id: string;
  meal_type: string;
  eaten_at: string;
  total_kcal: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
  has_photo: boolean;
  items: MealItem[];
}

export interface DaySummary {
  date: string;
  total_kcal: number;
  total_protein: number;
  total_fat: number;
  total_carbs: number;
  meals: Meal[];
}

export interface Goal {
  daily_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

export interface AnalyzeResult {
  items: MealItem[];
  photo_token: string | null;
}

export const api = {
  authTelegramInit: (initData: string) =>
    request<{ token: string }>("/auth/telegram-init", {
      method: "POST",
      body: JSON.stringify({ init_data: initData }),
    }),

  authTelegramWidget: (data: Record<string, unknown>) =>
    request<{ token: string }>("/auth/telegram-widget", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: () => request<MeResponse>("/me"),

  analyzeMeal: (input: { text?: string; photo?: File }) => {
    const form = new FormData();
    if (input.text) form.set("text", input.text);
    if (input.photo) form.set("photo", input.photo);
    return request<AnalyzeResult>("/meals/analyze", { method: "POST", body: form });
  },

  createMeal: (body: {
    meal_type: string;
    eaten_at: string;
    raw_text?: string;
    photo_token?: string | null;
    items: Omit<MealItem, "id">[];
  }) => request<Meal>("/meals", { method: "POST", body: JSON.stringify(body) }),

  day: (date: string) => request<DaySummary>(`/meals/day?date=${date}`),

  deleteMeal: (id: string) => request<void>(`/meals/${id}`, { method: "DELETE" }),

  getGoal: () => request<Goal | null>("/goals"),

  setGoal: (goal: Goal) =>
    request<Goal>("/goals", { method: "PUT", body: JSON.stringify(goal) }),
};
