import { useEffect, useState } from "react";
import { Heart, House, LogOut, Users } from "lucide-react";
import { NavLink, Outlet, ScrollRestoration } from "react-router";
import Login from "./pages/Login";
import { signOut } from "./lib/client";
import { configured, supabase } from "./lib/supabase";

const NAV = [
  { to: "/", label: "홈", icon: House, end: true },
  { to: "/livers", label: "라이버", icon: Users, end: false },
  { to: "/favorites", label: "즐겨찾기", icon: Heart, end: false },
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    if (!configured) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => { setAuthed(!!data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setAuthed(!!session));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!ready) return <p className="grid min-h-dvh place-items-center text-sm text-ink-3">불러오는 중</p>;
  if (!configured) return <p className="p-6 text-sm text-danger">Supabase 주소와 키(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)가 아직 없어요. .env.example 을 참고해 주세요.</p>;
  if (!authed) return <Login />;

  return (
    <div className="min-h-dvh md:pl-56">
      <aside className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ground pb-[env(safe-area-inset-bottom)] md:inset-y-0 md:right-auto md:w-56 md:border-r md:border-t-0 md:pb-0">
        <p className="hidden px-5 py-5 text-base font-semibold md:block">니지산지 아카이브</p>
        <nav className="grid grid-cols-3 md:block md:px-3" aria-label="주 메뉴">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex h-14 flex-col items-center justify-center gap-0.5 text-xs md:h-11 md:flex-row md:justify-start md:gap-3 md:rounded-control md:px-3 md:text-sm ${isActive ? "font-semibold text-accent md:bg-ground-2" : "text-ink-3 hover:text-ink md:hover:bg-ground-2"}`}>
              <Icon size={22} aria-hidden /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button type="button" onClick={() => signOut()} className="absolute bottom-4 left-3 hidden h-10 items-center gap-3 rounded-control px-3 text-sm text-ink-3 hover:bg-ground-2 md:flex">
          <LogOut size={18} aria-hidden />로그아웃
        </button>
      </aside>
      <main className="pb-24 md:pb-10"><div className="mx-auto max-w-5xl"><Outlet /></div></main>
      <ScrollRestoration />
    </div>
  );
}
