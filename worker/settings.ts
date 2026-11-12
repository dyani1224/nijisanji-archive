// 소유자 설정 API. 모양은 src/content.ts 의 settings 선언 하나에서 나온다.
//   GET /api/settings         → { values }  public: true 인 키만, D1 값을 기본값 위에 얹어서
//   GET /api/admin/settings   → { values, updated }  전부 (소유자)
//   PUT /api/admin/settings   { values: { key: value } } → 선언대로 검사, 하나라도 틀리면 400 { error, field }
import type { Hono } from "hono";
import { checkSettings, mergeSettings, type SettingsSpec } from "../src/lib/settings";
import { type Bindings, ownerOnly } from "./lib";

/** D1 에서 읽은 값 전부(JSON 해석). 서버 안에서 비공개 값(계좌 등)이 필요할 때도 이걸 쓴다. */
export async function readSettings(db: D1Database, spec: SettingsSpec) {
  const { results } = await db.prepare("SELECT key, value, updated_at FROM settings").all<{ key: string; value: string; updated_at: string | null }>();
  const stored: Record<string, unknown> = {};
  let updated: string | null = null;
  for (const r of results) {
    try { stored[r.key] = JSON.parse(r.value); } catch { /* 깨진 값은 기본값으로 */ }
    if (r.updated_at && (!updated || r.updated_at > updated)) updated = r.updated_at;
  }
  return { values: mergeSettings(spec, stored) as Record<string, unknown>, publicValues: mergeSettings(spec, stored, true), updated };
}

export function mountSettings(app: Hono<{ Bindings: Bindings }>, spec: SettingsSpec) {
  app.get("/settings", async c => c.json({ values: (await readSettings(c.env.DB, spec)).publicValues }));

  app.get("/admin/settings", ownerOnly, async c => {
    const { values, updated } = await readSettings(c.env.DB, spec);
    return c.json({ values, updated });
  });

  app.put("/admin/settings", ownerOnly, async c => {
    const body = await c.req.json().catch(() => null) as { values?: unknown } | null;
    const r = checkSettings(spec, body?.values);
    if ("error" in r) return c.json(r, 400);
    const now = new Date().toISOString();
    const entries = Object.entries(r.values);
    if (entries.length) {
      if (JSON.stringify(r.values).length > 16_000) return c.json({ error: "값이 너무 길어요" }, 400);
      await c.env.DB.batch(entries.map(([k, v]) => c.env.DB
        .prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
        .bind(k, JSON.stringify(v), now)));
    }
    const { values, updated } = await readSettings(c.env.DB, spec);
    return c.json({ values, updated });
  });
}
