import { Heart, House, Settings, Users } from "lucide-react";
import { NavLink, Outlet, ScrollRestoration } from "react-router";
import { ContinueDialog } from "./components/ContinueDialog";

const NAV = [
  { to: "/", label: "홈", icon: House, end: true },
  { to: "/livers", label: "라이버", icon: Users, end: false },
  { to: "/favorites", label: "즐겨찾기", icon: Heart, end: false },
  { to: "/settings", label: "환경설정", icon: Settings, end: false },
];

/** 로그인 없이 접근 가능. 모든 덕질 기록은 브라우저 IndexedDB에 저장한다. */
export default function App() {
  return (
    <div className="min-h-dvh md:pl-56">
      <aside className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ground pb-[env(safe-area-inset-bottom)] md:inset-y-0 md:right-auto md:w-56 md:border-r md:border-t-0 md:pb-0">
        <p className="hidden px-5 py-5 text-base font-semibold md:block">니지산지 아카이브</p>
        <nav className="grid grid-cols-4 md:block md:px-3" aria-label="주 메뉴">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex h-14 flex-col items-center justify-center gap-0.5 text-xs md:h-11 md:flex-row md:justify-start md:gap-3 md:rounded-control md:px-3 md:text-sm ${isActive ? "font-semibold text-accent md:bg-ground-2" : "text-ink-3 hover:text-ink md:hover:bg-ground-2"}`}>
              <Icon size={22} aria-hidden /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="pb-24 md:pb-10"><div className="mx-auto max-w-5xl"><Outlet /></div></main>
      <ContinueDialog />
      <ScrollRestoration />
    </div>
  );
}
