// 소유자 화면이 데이터를 읽고 쓰는 한 인터페이스, 두 공급자.
//   live   — /api/admin/<collection> (D1). 실제 소유자 모드.
//   sample — 견본. content.ts 의 ownerSample 을 이 브라우저(localStorage)에만 두고 고친다. 화면에 「견본」이 늘 보인다.
// 방문자 폼(문의·예약·주문)은 이 파일을 쓰지 않고 언제나 api() 로 서버에 보낸다 — 서버가 저장을 확인한 뒤에만
// 접수 완료를 보여 준다(README 규칙 2). 정렬·필터는 공급자와 상관없이 RecordList 의 filterRows 하나로 한다.
import { useEffect, useState } from "react";
import { ApiError, api, demoStore } from "./api";
import { checkSettings, mergeSettings, publicDefaultsOf, type SettingsSpec } from "./settings";
import { canMove, type StatusConfig } from "./status";
import { ownerApi } from "../owner/ownerApi";

export type Row = { id: string | number } & Record<string, unknown>;
export type SettingsState = { values: Record<string, unknown>; updated: string | null };

export interface OwnerData {
  mode: "live" | "sample";
  /** GET /api/admin/<collection> → { rows } */
  list<T extends Row>(collection: string): Promise<T[]>;
  /** POST /api/admin/<collection> → { row } (전화 예약 직접 입력, 새 거래 …) */
  create<T extends Row>(collection: string, row: Partial<T>): Promise<T>;
  /** PATCH /api/admin/<collection>/<id> → { row }. 상태를 바꿀 때는 { status } 를 보낸다. */
  update<T extends Row>(collection: string, id: Row["id"], patch: Partial<T>): Promise<T>;
  /** GET /api/admin/settings */
  settings(): Promise<SettingsState>;
  /** PUT /api/admin/settings { values } — 바꾼 키만 */
  saveSettings(values: Record<string, unknown>): Promise<SettingsState>;
}

export const live: OwnerData = {
  mode: "live",
  list: async c => (await ownerApi<{ rows: never[] }>(`/api/admin/${c}`)).rows,
  create: async (c, row) => (await ownerApi<{ row: never }>(`/api/admin/${c}`, { method: "POST", body: JSON.stringify(row) })).row,
  update: async (c, id, patch) => (await ownerApi<{ row: never }>(`/api/admin/${c}/${id}`, { method: "PATCH", body: JSON.stringify(patch) })).row,
  settings: () => ownerApi<SettingsState>("/api/admin/settings"),
  saveSettings: values => ownerApi<SettingsState>("/api/admin/settings", { method: "PUT", body: JSON.stringify({ values }) }),
};

/**
 * 견본 공급자. seed 는 { collection: rows }. statuses 를 주면 Worker 와 같은 canMove 규칙으로 상태 변경을 막는다
 * (상태 필드 이름은 status). 설정은 Worker 와 같은 checkSettings 로 검사한다.
 */
export function sample(seed: Record<string, Row[]>, spec: SettingsSpec, statuses: Record<string, StatusConfig> = {}): OwnerData {
  const key = (c: string) => `owner.sample.${c}`;
  const rows = (c: string) => demoStore.get<Row[]>(key(c), seed[c] ?? []);
  const wait = <T,>(v: T) => new Promise<T>(r => setTimeout(() => r(structuredClone(v)), 120));
  const readSettings = () => wait({ values: mergeSettings(spec, demoStore.get("owner.sample.settings", {})), updated: demoStore.get<string | null>("owner.sample.settings.at", null) });
  return {
    mode: "sample",
    list: c => wait(rows(c)) as never,
    async create(c, row) {
      const all = rows(c);
      const next = { ...row, id: Math.max(0, ...all.map(r => Number(r.id) || 0)) + 1, created_at: new Date().toISOString() } as Row;
      demoStore.set(key(c), [next, ...all]);
      return wait(next) as never;
    },
    async update(c, id, patch) {
      const all = rows(c);
      const i = all.findIndex(r => r.id === id);
      if (i < 0) throw new ApiError("없는 항목이에요", 404);
      const from = String(all[i].status ?? ""), to = (patch as Row).status;
      if (statuses[c] && to !== undefined && to !== from && !canMove(statuses[c], from, String(to))) throw new ApiError("지금 상태에서는 바꿀 수 없어요", 409);
      all[i] = { ...all[i], ...patch, id };
      demoStore.set(key(c), all);
      return wait(all[i]) as never;
    },
    settings: readSettings,
    async saveSettings(values) {
      const r = checkSettings(spec, values);
      if ("error" in r) throw new ApiError(r.error, 400);
      const at = new Date().toISOString();
      demoStore.set("owner.sample.settings", { ...demoStore.get("owner.sample.settings", {}), ...r.values });
      demoStore.set("owner.sample.settings.at", at);
      return readSettings();
    },
  };
}

/** 방문자 화면용: GET /api/settings 를 기본값 위에 얹는다. 서버가 없거나 실패하면 content.ts 의 기본값 그대로. */
export function usePublicSettings<S extends SettingsSpec>(spec: S) {
  const [values, setValues] = useState(() => publicDefaultsOf(spec) as Record<string, unknown>);
  useEffect(() => {
    let live = true;
    api<{ values: Record<string, unknown> }>("/api/settings")
      .then(r => { if (live) setValues(v => ({ ...v, ...r.values })); })
      .catch(() => { /* 기본값을 보여 준다 */ });
    return () => { live = false; };
  }, [spec]);
  return values as { [K in keyof S]: S[K]["default"] };
}
