// 한 건의 자세한 내용. 900px 이상은 오른쪽 패널, 아래는 아래에서 올라오는 시트.
// 열리면 안으로 초점을 옮기고 Tab 이 밖으로 나가지 않으며, Esc·바깥 누르기로 닫히고, 닫히면 연 버튼으로 초점이 돌아간다.
import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function DetailDrawer({ open, onClose, title, subtitle, children, footer }: {
  open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const root = document.documentElement, overflow = root.style.overflow;
    root.style.overflow = "hidden";
    const el = panel.current!;
    (el.querySelector<HTMLElement>("[data-autofocus]") ?? el).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close.current(); return; }
      if (e.key !== "Tab") return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(n => n.offsetParent !== null);
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      root.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="owner-fade absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="owner-sheet absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-card bg-surface text-ink elev-3 outline-none
          min-[900px]:inset-y-0 min-[900px]:left-auto min-[900px]:right-0 min-[900px]:max-h-none min-[900px]:w-[min(480px,100%)] min-[900px]:rounded-none"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line min-[900px]:hidden" aria-hidden />
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-step-1 font-semibold leading-heading tracking-heading">{title}</h2>
            {subtitle && <div className="mt-1 text-step--1 text-ink-2">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} className="-mr-2 grid size-10 shrink-0 place-items-center rounded-control text-ink-3 hover:bg-ground-2 hover:text-ink" aria-label="닫기">
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && <footer className="border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</footer>}
      </div>
    </div>
  );
}

/** 드로어 안의 「라벨: 값」 줄. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 min-[480px]:grid-cols-[7rem_minmax(0,1fr)] min-[480px]:gap-3">
      <dt className="text-step--1 text-ink-3">{label}</dt>
      <dd className="m-0 min-w-0 break-words">{children}</dd>
    </div>
  );
}
