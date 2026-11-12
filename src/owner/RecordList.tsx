// 접수 목록 하나: 상태 칩(개수), 검색, 기간, 담당자, 정렬, 빈 화면, CSV(지금 보이는 행).
// 보드 화면처럼 목록 밖에서 같은 필터를 쓰려면 RecordFilters + filterRows 를 따로 쓴다 — 거르는 규칙은 한 곳이다.
import { Download, Search } from "lucide-react";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { Row } from "../lib/data";
import { dayKey } from "../lib/format";
import type { StatusConfig } from "../lib/status";
import { saveBlob } from "./ownerApi";

export type Column<T> = {
  key: string; label: string;
  /** 칸에 그릴 것. 없으면 row[key] */
  render?: (row: T) => ReactNode;
  /** CSV 에 넣을 글자. 없으면 row[key] */
  csv?: (row: T) => unknown;
  /** 데스크톱 grid 폭, 기본 minmax(0,1fr) */
  width?: string;
  hideOnPhone?: boolean;
  align?: "end";
};
export type RecordFilter = { status: string; q: string; period: Period; from: string; to: string; assignee: string };
type Period = "all" | "today" | "past7" | "next7" | "month" | "custom";
export type FilterOptions<T> = {
  statusKey?: string; dateKey?: string; assigneeKey?: string;
  searchText?: (row: T) => string;
};

export const emptyFilter: RecordFilter = { status: "all", q: "", period: "all", from: "", to: "", assignee: "all" };
const PERIODS: [Period, string][] = [["all", "전체 기간"], ["today", "오늘"], ["past7", "최근 7일"], ["next7", "앞으로 7일"], ["month", "이번 달"], ["custom", "직접 고르기"]];

function range(f: RecordFilter): [string, string] | null {
  const today = dayKey(new Date()), shift = (n: number) => dayKey(new Date(Date.now() + n * 864e5));
  switch (f.period) {
    case "today": return [today, today];
    case "past7": return [shift(-6), today];
    case "next7": return [today, shift(6)];
    case "month": return [today.slice(0, 8) + "01", today.slice(0, 8) + "31"];
    case "custom": return f.from || f.to ? [f.from || "0000-00-00", f.to || "9999-99-99"] : null;
    default: return null;
  }
}

/** 상태를 뺀 모든 조건으로 거른다. 상태는 칩 개수를 세야 해서 따로. */
function base<T extends Row>(rows: T[], f: RecordFilter, o: FilterOptions<T>) {
  const r = o.dateKey ? range(f) : null;
  const q = f.q.trim().toLowerCase();
  return rows.filter(row => {
    if (r) { const d = row[o.dateKey!]; if (!d) return false; const k = dayKey(String(d)); if (k < r[0] || k > r[1]) return false; }
    if (o.assigneeKey && f.assignee !== "all" && String(row[o.assigneeKey] ?? "") !== f.assignee) return false;
    if (q && !(o.searchText ? o.searchText(row) : Object.values(row).join(" ")).toLowerCase().includes(q)) return false;
    return true;
  });
}

export function filterRows<T extends Row>(rows: T[], f: RecordFilter, o: FilterOptions<T>) {
  const b = base(rows, f, o);
  return o.statusKey && f.status !== "all" ? b.filter(r => String(r[o.statusKey!]) === f.status) : b;
}

/** 엑셀에서 바로 열리는 CSV(BOM). =,+,-,@ 로 시작하는 칸은 수식으로 실행되지 않게 ' 를 붙인다(README 규칙 7). */
export function toCsv<T extends Row>(columns: Column<T>[], rows: T[]) {
  const cell = (v: unknown) => { const s = String(v ?? ""); return `"${(/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`; };
  return "﻿" + [columns.map(c => c.label), ...rows.map(r => columns.map(c => (c.csv ? c.csv(r) : r[c.key])))].map(l => l.map(cell).join(",")).join("\r\n");
}

const control = "h-control-sm rounded-control px-2.5 text-step--1";

export function RecordFilters<T extends Row>({ rows, filter, onChange, statuses, assignees, label, ...o }: FilterOptions<T> & {
  rows: T[]; filter: RecordFilter; onChange: (f: RecordFilter) => void; statuses?: StatusConfig; assignees?: string[]; label: string;
}) {
  const set = (p: Partial<RecordFilter>) => onChange({ ...filter, ...p });
  const b = useMemo(() => base(rows, filter, o), [rows, filter, o.dateKey, o.assigneeKey, o.searchText]);
  const count = (s: string) => (s === "all" ? b.length : b.filter(r => String(r[o.statusKey!]) === s).length);
  return (
    <div className="grid gap-3">
      {statuses && o.statusKey && (
        <div className="-mx-gutter flex gap-1.5 overflow-x-auto px-gutter pb-0.5 [scrollbar-width:none]" role="group" aria-label="상태">
          {["all", ...Object.keys(statuses)].map(s => (
            <button key={s} type="button" aria-pressed={filter.status === s} onClick={() => set({ status: s })}
              className="h-control-sm shrink-0 whitespace-nowrap rounded-full border border-line bg-surface px-3 text-step--1 text-ink-2 hover:border-line-strong aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-on-accent">
              {s === "all" ? "전체" : statuses[s].label} <span className="tnum opacity-70">{count(s)}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <label className="relative min-w-0 flex-[1_1_14rem]">
          <span className="sr-only">{label} 검색</span>
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
          <input type="search" value={filter.q} onChange={e => set({ q: e.target.value })} placeholder="이름·연락처·내용 검색" className={`${control} w-full pl-8`} />
        </label>
        {o.dateKey && (
          <label className="flex-[1_1_8rem] min-[900px]:flex-[0_1_10rem]">
            <span className="sr-only">기간</span>
            <select value={filter.period} onChange={e => set({ period: e.target.value as Period })} className={`${control} w-full`}>
              {PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        )}
        {o.dateKey && filter.period === "custom" && (
          <>
            <label className="grid gap-0.5 text-[12px] text-ink-3">부터<input type="date" value={filter.from} onChange={e => set({ from: e.target.value })} className={control} /></label>
            <label className="grid gap-0.5 text-[12px] text-ink-3">까지<input type="date" value={filter.to} onChange={e => set({ to: e.target.value })} className={control} /></label>
          </>
        )}
        {o.assigneeKey && assignees && (
          <label className="flex-[1_1_8rem] min-[900px]:flex-[0_1_10rem]">
            <span className="sr-only">담당자</span>
            <select value={filter.assignee} onChange={e => set({ assignee: e.target.value })} className={`${control} w-full`}>
              <option value="all">담당자 전체</option>
              <option value="">담당자 없음</option>
              {assignees.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}

export function RecordList<T extends Row>(props: FilterOptions<T> & {
  rows: T[]; columns: Column<T>[]; label: string;
  statuses?: StatusConfig; assignees?: string[];
  sorts?: { id: string; label: string; compare: (a: T, b: T) => number }[];
  onOpen?: (row: T) => void; selectedId?: Row["id"];
  csvName?: string;
  empty?: { title: string; body?: string; action?: ReactNode };
  filter?: RecordFilter; onFilterChange?: (f: RecordFilter) => void;
  loading?: boolean;
}) {
  const { rows, columns, label, sorts = [], onOpen, selectedId, csvName, empty, loading } = props;
  const [own, setOwn] = useState(emptyFilter);
  const filter = props.filter ?? own, setFilter = props.onFilterChange ?? setOwn;
  const [sortId, setSortId] = useState(sorts[0]?.id);
  const [limit, setLimit] = useState(50);
  const shown = useMemo(() => {
    const r = filterRows(rows, filter, props);
    const s = sorts.find(x => x.id === sortId);
    return s ? [...r].sort(s.compare) : r;
  }, [rows, filter, sortId]);
  const grid = { "--cols": columns.map(c => c.width ?? "minmax(0,1fr)").join(" ") } as CSSProperties;
  const filtered = JSON.stringify(filter) !== JSON.stringify(emptyFilter);

  return (
    <section className="grid gap-3" aria-label={label}>
      <RecordFilters {...props} filter={filter} onChange={f => { setFilter(f); setLimit(50); }} />
      <div className="flex items-center gap-2 text-step--1 text-ink-3">
        <span className="tnum" role="status">{loading ? "불러오는 중…" : `${shown.length.toLocaleString("ko-KR")}건`}</span>
        {sorts.length > 1 && (
          <label className="ml-auto"><span className="sr-only">정렬</span>
            <select value={sortId} onChange={e => setSortId(e.target.value)} className={control}>{sorts.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
          </label>
        )}
        {csvName && (
          <button type="button" disabled={!shown.length} onClick={() => saveBlob(new Blob([toCsv(columns, shown)], { type: "text/csv;charset=utf-8" }), csvName)}
            className={`${control} ${sorts.length > 1 ? "" : "ml-auto"} inline-flex items-center gap-1.5 border border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink disabled:opacity-50`}>
            <Download size={14} aria-hidden /> CSV
          </button>
        )}
      </div>
      {!loading && !shown.length ? (
        <div className="rounded-card border border-dashed border-line-strong bg-surface px-5 py-10 text-center">
          <p className="font-medium">{filtered ? "조건에 맞는 항목이 없어요" : empty?.title ?? "아직 없어요"}</p>
          {filtered
            ? <button type="button" onClick={() => setFilter(emptyFilter)} className="mt-3 text-step--1 text-ink-2 underline underline-offset-4 hover:text-ink">조건 지우기</button>
            : <>{empty?.body && <p className="mx-auto mt-1 max-w-sm text-step--1 text-ink-2">{empty.body}</p>}{empty?.action && <div className="mt-4">{empty.action}</div>}</>}
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-surface" style={grid}>
          <div className="hidden border-b border-line px-4 py-2 text-[12px] font-medium text-ink-3 min-[900px]:grid min-[900px]:gap-4 min-[900px]:[grid-template-columns:var(--cols)]" aria-hidden>
            {columns.map(c => <span key={c.key} className={c.align === "end" ? "text-right" : ""}>{c.label}</span>)}
          </div>
          <ul className="m-0 list-none divide-y divide-line p-0">
            {shown.slice(0, limit).map(row => (
              <li key={row.id}>
                <button type="button" onClick={() => onOpen?.(row)} aria-current={row.id === selectedId || undefined}
                  className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-ground-2 aria-[current=true]:bg-ground-2 min-[900px]:grid min-[900px]:gap-4 min-[900px]:[grid-template-columns:var(--cols)]">
                  {columns.map((c, i) => (
                    <span key={c.key} className={`min-w-0 ${i === 0 ? "basis-full font-medium min-[900px]:basis-auto" : "text-step--1 text-ink-2 min-[900px]:text-step-0"} ${c.hideOnPhone ? "hidden min-[900px]:block" : ""} ${c.align === "end" ? "min-[900px]:text-right tnum" : ""} truncate`}>
                      {c.render ? c.render(row) : String(row[c.key] ?? "")}
                    </span>
                  ))}
                </button>
              </li>
            ))}
          </ul>
          {shown.length > limit && (
            <button type="button" onClick={() => setLimit(l => l + 50)} className="h-control w-full border-t border-line text-step--1 text-ink-2 hover:bg-ground-2">
              {(shown.length - limit).toLocaleString("ko-KR")}건 더 보기
            </button>
          )}
        </div>
      )}
    </section>
  );
}
