// content.ts 의 settings 선언을 그대로 폼으로 그린다: 글자, 숫자, 금액, 시간 범위, 요일, 켜기/끄기, 고르기.
// 저장 전에 Worker 와 같은 checkSetting 으로 검사하고, 바꾼 키만 보낸다. 서버가 거절하면 그 칸 아래에 이유를 보여 준다.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ApiError } from "../lib/api";
import { dateTimeKo } from "../lib/format";
import { WEEKDAYS, checkSetting, type SettingSpec, type SettingsSpec, type TimeRange } from "../lib/settings";

type Values = Record<string, unknown>;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function SettingsForm({ spec, values, updated, onSave, groups }: {
  spec: SettingsSpec; values: Values; updated?: string | null;
  onSave: (patch: Values) => Promise<{ values: Values; updated: string | null }>;
  /** 칸 묶음: [["영업", ["hours","closed"]], …]. 없으면 선언 순서대로 한 묶음. */
  groups?: [string, string[]][];
}) {
  const [draft, setDraft] = useState<Values>(values);
  const [saved, setSaved] = useState({ values, updated });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<{ busy?: boolean; msg?: string; error?: string }>({});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { setDraft(values); setSaved({ values, updated }); }, [values, updated]);

  const changed = Object.keys(spec).filter(k => !same(draft[k], saved.values[k]));
  const set = (k: string, v: unknown) => { setDraft(d => ({ ...d, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); setState({}); };

  async function save() {
    const patch: Values = {}, errs: Record<string, string> = {};
    for (const k of changed) {
      const r = checkSetting(spec[k], draft[k]);
      if ("error" in r) errs[k] = r.error; else patch[k] = r.value;
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      setState({ error: "고칠 칸이 있어요" });
      return requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
    }
    setState({ busy: true });
    try {
      const r = await onSave(patch);
      setSaved(r); setDraft(r.values);
      setState({ msg: "저장했어요" });
    } catch (e) {
      const field = e instanceof ApiError ? Object.keys(spec).find(k => e.message.startsWith(spec[k].label + ":")) : undefined;
      if (field) setErrors({ [field]: e instanceof Error ? e.message : "" });
      setState({ error: e instanceof Error ? e.message : "저장하지 못했어요" });
    }
  }

  const sections = groups ?? [["", Object.keys(spec)]];
  return (
    <form ref={form} className="grid max-w-2xl gap-5" onSubmit={e => { e.preventDefault(); void save(); }} noValidate>
      {sections.map(([title, keys]) => (
        <section key={title || "all"} className="grid gap-2">
          {title && <h2 id={`settings-${title}`} className="px-1 text-step--1 font-semibold text-ink-2">{title}</h2>}
          <fieldset aria-labelledby={title ? `settings-${title}` : undefined} className="m-0 grid min-w-0 gap-5 rounded-card border border-line bg-surface p-5">
            {keys.filter(k => spec[k]).map(k => <SettingField key={k} spec={spec[k]} value={draft[k]} error={errors[k]} onChange={v => set(k, v)} />)}
          </fieldset>
        </section>
      ))}
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 -mx-gutter flex items-center gap-3 border-t border-line bg-ground-2 px-gutter py-3 min-[900px]:bottom-0">
        <p className="min-w-0 flex-1 text-step--1" role="status" aria-live="polite">
          {state.error ? <span className="text-danger">{state.error}</span>
            : state.msg ? <span className="text-ok">{state.msg}</span>
            : changed.length ? <span className="text-ink-2">바꾼 칸 {changed.length}개</span>
            : <span className="text-ink-3">{saved.updated ? `마지막 저장 ${dateTimeKo(saved.updated)}` : "아직 바꾼 적 없어요"}</span>}
        </p>
        {changed.length > 0 && <button type="button" onClick={() => { setDraft(saved.values); setErrors({}); setState({}); }} className="h-control rounded-control px-3 text-ink-2 hover:text-ink">되돌리기</button>}
        <button disabled={!changed.length || state.busy} className="h-control rounded-control bg-accent px-5 font-medium text-on-accent hover:opacity-90 disabled:opacity-40">
          {state.busy ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}

function Shell({ id, label, help, error, children, group }: { id: string; label: string; help?: string; error?: string; children: ReactNode; group?: boolean }) {
  const describe = [help && `${id}-help`, error && `${id}-err`].filter(Boolean).join(" ") || undefined;
  const Label = group ? "legend" : "label";
  const body = (
    <>
      <Label {...(group ? {} : { htmlFor: id })} className="mb-1.5 block p-0 font-medium">{label}</Label>
      {help && <p id={`${id}-help`} className="-mt-1 mb-2 text-step--1 text-ink-3">{help}</p>}
      {children}
      {error && <p id={`${id}-err`} className="mt-1.5 text-step--1 text-danger" role="alert">{error}</p>}
    </>
  );
  return group ? <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby={describe}>{body}</fieldset> : <div>{body}</div>;
}

const input = "w-full px-3";

function SettingField({ spec, value, error, onChange }: { spec: SettingSpec; value: unknown; error?: string; onChange: (v: unknown) => void }) {
  const id = useId();
  const aria = { "aria-invalid": !!error || undefined, "aria-describedby": [spec.help && `${id}-help`, error && `${id}-err`].filter(Boolean).join(" ") || undefined };
  switch (spec.type) {
    case "text":
      return (
        <Shell id={id} label={spec.label} help={spec.help} error={error}>
          {spec.multiline
            ? <textarea id={id} {...aria} rows={3} maxLength={spec.max} value={String(value ?? "")} placeholder={spec.placeholder} onChange={e => onChange(e.target.value)} className={`${input} py-2`} />
            : <input id={id} {...aria} maxLength={spec.max} value={String(value ?? "")} placeholder={spec.placeholder} onChange={e => onChange(e.target.value)} className={input} />}
        </Shell>
      );
    case "number":
    case "money": {
      const unit = spec.type === "money" ? "원" : spec.unit;
      const shown = typeof value === "number" ? (spec.type === "money" ? value.toLocaleString("ko-KR") : String(value)) : String(value ?? "");
      return (
        <Shell id={id} label={spec.label} help={spec.help} error={error}>
          <div className="relative max-w-56">
            <input id={id} {...aria} inputMode={spec.type === "money" ? "numeric" : "decimal"} value={shown}
              onChange={e => { const raw = e.target.value.replace(/[^\d.-]/g, ""); const n = Number(raw); onChange(raw !== "" && Number.isFinite(n) ? n : raw); }}
              className={`${input} tnum text-right ${unit ? (unit.length > 1 ? "pr-14" : "pr-9") : ""}`} />
            {unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden>{unit}</span>}
          </div>
        </Shell>
      );
    }
    case "timeRange": {
      const r = (value ?? spec.default) as TimeRange;
      return (
        <Shell id={id} label={spec.label} help={spec.help} error={error} group>
          <div className="flex flex-wrap items-center gap-2">
            <label className="grid gap-0.5 text-[12px] text-ink-3">시작<input type="time" step={600} value={r.from} {...aria} onChange={e => onChange({ ...r, from: e.target.value })} className="px-3 text-step-0 text-ink tnum" /></label>
            <span className="mt-4 text-ink-3" aria-hidden>–</span>
            <label className="grid gap-0.5 text-[12px] text-ink-3">끝<input type="time" step={600} value={r.to} {...aria} onChange={e => onChange({ ...r, to: e.target.value })} className="px-3 text-step-0 text-ink tnum" /></label>
          </div>
        </Shell>
      );
    }
    case "weekdays": {
      const days = (value ?? []) as number[];
      return (
        <Shell id={id} label={spec.label} help={spec.help} error={error} group>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 0].map(d => (
              <label key={d} className="relative">
                <input type="checkbox" className="peer sr-only" checked={days.includes(d)} onChange={e => onChange(e.target.checked ? [...days, d].sort() : days.filter(x => x !== d))} />
                <span className="grid size-10 cursor-pointer place-items-center rounded-control border border-line bg-field text-ink-2 peer-checked:border-accent peer-checked:bg-accent peer-checked:font-semibold peer-checked:text-on-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:border-line-strong">{WEEKDAYS[d]}</span>
              </label>
            ))}
          </div>
        </Shell>
      );
    }
    case "toggle": {
      const on = !!value;
      return (
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <span id={`${id}-label`} className="block font-medium">{spec.label}</span>
            {spec.help && <span id={`${id}-help`} className="block text-step--1 text-ink-3">{spec.help}</span>}
          </div>
          <span className="text-step--1 text-ink-2" aria-hidden>{on ? spec.on ?? "켜짐" : spec.off ?? "꺼짐"}</span>
          <button type="button" role="switch" aria-checked={on} aria-labelledby={`${id}-label`} aria-describedby={spec.help ? `${id}-help` : undefined} onClick={() => onChange(!on)}
            className="relative h-7 w-12 shrink-0 rounded-full border border-line bg-ground-2 transition-colors aria-checked:border-accent aria-checked:bg-accent">
            <span className={`absolute top-0.5 size-5.5 rounded-full bg-surface elev-1 transition-[left] ${on ? "left-[calc(100%-1.5rem)]" : "left-0.5"}`} aria-hidden />
          </button>
        </div>
      );
    }
    case "select":
      return (
        <Shell id={id} label={spec.label} help={spec.help} error={error}>
          <select id={id} {...aria} value={String(value ?? "")} onChange={e => onChange(e.target.value)} className={`${input} max-w-xs`}>
            {spec.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Shell>
      );
  }
}
