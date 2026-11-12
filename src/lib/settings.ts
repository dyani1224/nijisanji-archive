// 소유자가 직접 바꾸는 값(영업시간·가격·품절·공지·계좌 …)의 모양. 화면과 Worker 가 같이 import 한다 —
// 그래서 DOM 도 React 도 쓰지 않는다. 선언은 src/content.ts 의 `settings` 에 있다(src/owner/OWNER.md).

export type TimeRange = { from: string; to: string };

type Base<T> = { label: string; help?: string; public?: boolean; default: T };
export type SettingSpec =
  | (Base<string> & { type: "text"; max?: number; multiline?: boolean; placeholder?: string })
  | (Base<number> & { type: "number"; min?: number; max?: number; step?: number; unit?: string })
  | (Base<number> & { type: "money"; min?: number; max?: number })
  | (Base<TimeRange> & { type: "timeRange"; overnight?: boolean })
  | (Base<number[]> & { type: "weekdays" })
  | (Base<boolean> & { type: "toggle"; on?: string; off?: string })
  | (Base<string> & { type: "select"; options: { value: string; label: string }[] });

export type SettingsSpec = Record<string, SettingSpec>;
export type SettingsValues<S extends SettingsSpec> = { [K in keyof S]: S[K]["default"] };

/** content.ts 에서 타입을 지키며 선언하게 해 주는 껍데기. */
export const defineSettings = <S extends SettingsSpec>(spec: S) => spec;

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;

/** 값 하나를 선언한 모양으로 검사한다. 맞으면 { value }(정리된 값), 아니면 { error }(화면에 그대로 보일 문장). */
export function checkSetting(spec: SettingSpec, v: unknown): { value: unknown } | { error: string } {
  const no = (why: string) => ({ error: `${spec.label}: ${why}` });
  switch (spec.type) {
    case "text": {
      if (typeof v !== "string") return no("글자로 적어 주세요");
      const s = v.trim();
      if (s.length > (spec.max ?? 500)) return no(`${spec.max ?? 500}자 안으로 적어 주세요`);
      return { value: s };
    }
    case "number":
    case "money": {
      const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v.replace(/,/g, "")) : NaN;
      if (!Number.isFinite(n)) return no("숫자로 적어 주세요");
      if (spec.type === "money" && !Number.isInteger(n)) return no("원 단위 정수로 적어 주세요");
      const min = spec.min ?? 0, max = spec.max ?? (spec.type === "money" ? 100_000_000 : 1_000_000);
      if (n < min || n > max) return no(`${min.toLocaleString("ko-KR")}–${max.toLocaleString("ko-KR")} 사이로 적어 주세요`);
      return { value: n };
    }
    case "timeRange": {
      const r = v as Partial<TimeRange> | null;
      if (!r || typeof r.from !== "string" || typeof r.to !== "string" || !HHMM.test(r.from) || !HHMM.test(r.to)) return no("시각을 00:00 형식으로 골라 주세요");
      if (r.from === r.to || (!spec.overnight && r.from > r.to)) return no("끝나는 시각이 시작보다 늦어야 해요");
      return { value: { from: r.from, to: r.to } };
    }
    case "weekdays": {
      if (!Array.isArray(v) || v.some(d => !Number.isInteger(d) || d < 0 || d > 6)) return no("요일을 골라 주세요");
      return { value: [...new Set(v as number[])].sort() };
    }
    case "toggle":
      return typeof v === "boolean" ? { value: v } : no("켜기·끄기 중 하나를 골라 주세요");
    case "select":
      return spec.options.some(o => o.value === v) ? { value: v } : no("목록에서 골라 주세요");
  }
}

/**
 * 바꾸려는 값 묶음 전체를 검사한다. 선언하지 않은 키는 거절한다. 하나라도 틀리면 아무것도 저장하지 않는다.
 * 견본 모드(src/lib/data.ts)와 Worker(PUT /api/admin/settings)가 이 함수 하나를 같이 쓴다.
 */
export function checkSettings(spec: SettingsSpec, patch: unknown): { values: Record<string, unknown> } | { error: string; field?: string } {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return { error: "바꿀 값을 보내 주세요" };
  const values: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(patch)) {
    const s = spec[key];
    if (!s) return { error: `모르는 설정이에요: ${key}`, field: key };
    const r = checkSetting(s, v);
    if ("error" in r) return { error: r.error, field: key };
    values[key] = r.value;
  }
  return { values };
}

/** 저장된 값(D1 의 JSON 문자열)을 기본값 위에 얹는다. 모양이 맞지 않는 옛 값은 버리고 기본값을 쓴다. */
export function mergeSettings<S extends SettingsSpec>(spec: S, stored: Record<string, unknown>, onlyPublic = false): Partial<SettingsValues<S>> {
  const out: Record<string, unknown> = {};
  for (const [key, s] of Object.entries(spec)) {
    if (onlyPublic && !s.public) continue;
    const r = key in stored ? checkSetting(s, stored[key]) : null;
    out[key] = r && "value" in r ? r.value : s.default;
  }
  return out as Partial<SettingsValues<S>>;
}

export const defaultsOf = <S extends SettingsSpec>(spec: S) => mergeSettings(spec, {}) as SettingsValues<S>;
export const publicDefaultsOf = <S extends SettingsSpec>(spec: S) => mergeSettings(spec, {}, true);

/** 화면용 짧은 문장: 「화·수 휴무」, 「10:00–20:00」, 「15,000원」. */
export function describeSetting(spec: SettingSpec, v: unknown): string {
  switch (spec.type) {
    case "money": return `${Number(v).toLocaleString("ko-KR")}원`;
    case "number": return `${Number(v).toLocaleString("ko-KR")}${spec.unit ?? ""}`;
    case "timeRange": { const r = v as TimeRange; return `${r.from}–${r.to}`; }
    case "weekdays": { const d = v as number[]; return d.length ? d.map(i => WEEKDAYS[i]).join("·") : "없음"; }
    case "toggle": return v ? spec.on ?? "켜짐" : spec.off ?? "꺼짐";
    case "select": return spec.options.find(o => o.value === v)?.label ?? String(v);
    default: return String(v ?? "");
  }
}
