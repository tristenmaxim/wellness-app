interface TelegramWebApp {
  initData: string;
  ready: () => void;
  expand: () => void;
  colorScheme: "light" | "dark";
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function isInTelegram(): boolean {
  const wa = getTelegramWebApp();
  return Boolean(wa && wa.initData);
}

export const BOT_USERNAME = "tatidav_kkal_bot";
