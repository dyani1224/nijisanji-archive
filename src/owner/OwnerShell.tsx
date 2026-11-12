// 소유자 화면의 틀: 900px 이상은 왼쪽 레일, 아래는 위 제목줄 + 아래 탭. 견본 모드면 맨 위에 늘 표시한다.
import type { LucideIcon } from "lucide-react";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useOwner } from "./OwnerGate";

export type OwnerTab = { id: string; label: string; icon: LucideIcon; badge?: number };

export function OwnerShell({ title, tabs, active, onTab, actions, children }: {
  title: string; tabs: OwnerTab[]; active: string; onTab: (id: string) => void; actions?: ReactNode; children: ReactNode;
}) {
  const { data, leave } = useOwner();
  const current = tabs.find(t => t.id === active);
  const tabButton = (t: OwnerTab, rail: boolean) => (
    <button
      key={t.id}
      type="button"
      onClick={() => onTab(t.id)}
      aria-current={t.id === active ? "page" : undefined}
      className={rail
        ? "flex h-control-sm w-full items-center gap-2.5 rounded-control px-3 text-left text-ink-2 hover:bg-ground-2 hover:text-ink aria-[current=page]:bg-ground-2 aria-[current=page]:font-semibold aria-[current=page]:text-ink"
        : "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-ink-3 aria-[current=page]:font-semibold aria-[current=page]:text-ink"}
    >
      <t.icon size={rail ? 17 : 20} strokeWidth={1.75} aria-hidden />
      <span>{t.label}</span>
      {!!t.badge && <span className={`tnum rounded-full bg-accent px-1.5 text-[11px] leading-5 text-on-accent ${rail ? "ml-auto" : "sr-only"}`}>{t.badge}<span className="sr-only">건</span></span>}
    </button>
  );
  return (
    <div className="min-h-dvh bg-ground-2 text-ink">
      {data.mode === "sample" && (
        <p className="sticky top-0 z-30 border-b border-warn/40 bg-warn/15 px-gutter py-1.5 text-center text-step--1 font-medium text-ink" role="note">
          견본 데이터예요. 바꾼 내용은 이 브라우저에만 남아요.
        </p>
      )}
      <div className="min-[900px]:grid min-[900px]:grid-cols-[232px_minmax(0,1fr)]">
        <div className="hidden border-r border-line bg-surface min-[900px]:block">
        <aside className="sticky top-0 flex h-dvh flex-col p-4">
          <p className="px-3 pb-4 pt-1 font-display text-step-1 font-semibold leading-heading">{title}</p>
          <nav aria-label="관리 메뉴" className="grid gap-1">{tabs.map(t => tabButton(t, true))}</nav>
          <button type="button" onClick={leave} className="mt-auto flex h-control-sm items-center gap-2 rounded-control px-3 text-step--1 text-ink-3 hover:text-ink">
            <LogOut size={15} aria-hidden /> 나가기
          </button>
        </aside>
        </div>
        <div className="min-w-0 pb-24 min-[900px]:pb-10">
          <header className="flex min-h-14 items-center gap-3 border-b border-line bg-surface px-gutter min-[900px]:border-0 min-[900px]:bg-transparent min-[900px]:pt-6">
            <h1 className="min-w-0 flex-1 truncate text-step-2 font-semibold leading-heading tracking-heading">
              <span className="min-[900px]:hidden">{title} · </span>{current?.label}
            </h1>
            {actions}
            <button type="button" onClick={leave} className="grid size-10 place-items-center rounded-control text-ink-3 hover:text-ink min-[900px]:hidden" aria-label="나가기"><LogOut size={18} aria-hidden /></button>
          </header>
          <main className="px-gutter pt-4">{children}</main>
        </div>
      </div>
      <nav aria-label="관리 메뉴" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] min-[900px]:hidden">
        {tabs.map(t => tabButton(t, false))}
      </nav>
    </div>
  );
}
