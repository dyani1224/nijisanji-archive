// 상태 표시와 상태별 버튼. 둘 다 src/lib/status.ts 의 선언(content.ts)에서 그린다. 색만으로 말하지 않게 글자가 늘 같이 있다.
import { useEffect, useState } from "react";
import type { StatusConfig, Tone } from "../lib/status";

const TONE: Record<Tone, string> = {
  neutral: "bg-ground-2 text-ink-2 border-line",
  info: "bg-info/12 text-info border-info/30",
  warn: "bg-warn/12 text-warn border-warn/30",
  ok: "bg-ok/12 text-ok border-ok/30",
  danger: "bg-danger/12 text-danger border-danger/30",
};

export function StatusPill({ status, config }: { status: string; config: StatusConfig }) {
  const s = config[status] ?? { label: status, tone: "neutral" as Tone };
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[12px] font-medium ${TONE[s.tone]}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {s.label}
    </span>
  );
}

/** 지금 상태에서 갈 수 있는 다음 상태 버튼들. danger 버튼은 한 번 더 눌러야 실행된다. */
export function StatusActions({ status, config, onMove, busy }: { status: string; config: StatusConfig; onMove: (to: string) => void; busy?: boolean }) {
  const [armed, setArmed] = useState<string | null>(null);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(null), 4000); return () => clearTimeout(t); }, [armed]);
  const next = config[status]?.next ?? [];
  if (!next.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {next.map((n, i) => {
        const confirm = n.danger && armed === n.to;
        return (
          <button
            key={n.to}
            type="button"
            disabled={busy}
            onClick={() => { if (n.danger && !confirm) return setArmed(n.to); setArmed(null); onMove(n.to); }}
            className={`h-control rounded-control px-4 font-medium disabled:opacity-50 ${
              n.danger ? (confirm ? "bg-danger text-on-state" : "border border-line text-danger hover:border-danger") :
              i === 0 ? "bg-accent text-on-accent hover:opacity-90" : "border border-line text-ink hover:border-line-strong"}`}
          >
            {confirm ? `${n.label} — 한 번 더 누르면 실행` : n.label}
          </button>
        );
      })}
    </div>
  );
}
