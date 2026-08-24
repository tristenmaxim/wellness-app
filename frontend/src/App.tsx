import { useEffect, useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { api, getToken, setToken } from "./api";
import { getTelegramWebApp, isInTelegram } from "./telegram";
import Login from "./pages/Login";
import Home from "./pages/Home";
import AddMeal from "./pages/AddMeal";
import Diary from "./pages/Diary";
import Goals from "./pages/Goals";
import Profile from "./pages/Profile";

type AuthState = "checking" | "authed" | "guest";

function App() {
  const [auth, setAuth] = useState<AuthState>("checking");

  useEffect(() => {
    const wa = getTelegramWebApp();
    wa?.ready();
    wa?.expand();

    async function init() {
      if (isInTelegram()) {
        try {
          const { token } = await api.authTelegramInit(wa!.initData);
          setToken(token);
          setAuth("authed");
          return;
        } catch {
          setAuth("guest");
          return;
        }
      }

      if (getToken()) {
        try {
          await api.me();
          setAuth("authed");
          return;
        } catch {
          setAuth("guest");
          return;
        }
      }

      setAuth("guest");
    }

    init();
  }, []);

  if (auth === "checking") {
    return <div className="screen" />;
  }

  if (auth === "guest") {
    return <Login onLoggedIn={() => setAuth("authed")} />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/add" element={<AddMeal />} />
        <Route path="/diary" element={<Diary />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
