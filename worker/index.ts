// /api 는 여기서, 나머지 화면은 정적 파일(ASSETS)이 처리한다.
import { Hono } from "hono";
import { inquiryStatus, settings } from "../src/content";
import { canMove } from "../src/lib/status";
import { type Bindings, bad, clean, describeError, ownerOnly, rateLimited } from "./lib";
import { mountSettings } from "./settings";

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

app.use("*", async (c, next) => {
  await next();
  c.header("cache-control", "no-store");
  c.header("x-robots-tag", "noindex");
});

app.get("/health", c => c.json({ ok: true }));

app.get("/admin/summary", ownerOnly, c => c.json({ ok: true }));

mountSettings(app, settings);

// --- _base 견본: 문의 하나 → 소유자 목록 → 상태·담당자 변경. 새 템플릿은 자기 표로 바꾼다. ---
const code6 = () => [...crypto.getRandomValues(new Uint8Array(6))].map(b => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[b % 31]).join("");

app.post("/inquiries", async c => {
  const b = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const name = clean(b.name, 40), contact = clean(b.contact, 80), message = clean(b.message, 1000);
  if (!name || !contact || !message) return bad(c, "이름·연락처·내용을 모두 적어 주세요");
  if (await rateLimited(c, "inquiry", 10, 600)) return bad(c, "잠시 뒤 다시 보내 주세요", 429);
  const code = code6();
  await c.env.DB.prepare("INSERT INTO inquiry (code, name, contact, message) VALUES (?, ?, ?, ?)").bind(code, name, contact, message).run();
  return c.json({ code }, 201);
});

app.get("/admin/inquiries", ownerOnly, async c => {
  const { results } = await c.env.DB.prepare("SELECT * FROM inquiry ORDER BY id DESC LIMIT 1000").all();
  return c.json({ rows: results });
});

app.patch("/admin/inquiries/:id", ownerOnly, async c => {
  const id = Number(c.req.param("id"));
  const row = await c.env.DB.prepare("SELECT * FROM inquiry WHERE id = ?").bind(id).first<{ status: string; assignee: string }>();
  if (!row) return bad(c, "없는 문의예요", 404);
  const b = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const status = b.status === undefined ? row.status : String(b.status);
  if (status !== row.status && !canMove(inquiryStatus, row.status, status)) return bad(c, "지금 상태에서는 바꿀 수 없어요", 409);
  const assignee = b.assignee === undefined ? row.assignee : clean(b.assignee, 40);
  await c.env.DB.prepare("UPDATE inquiry SET status = ?, assignee = ? WHERE id = ?").bind(status, assignee, id).run();
  return c.json({ row: await c.env.DB.prepare("SELECT * FROM inquiry WHERE id = ?").bind(id).first() });
});

app.notFound(c => c.json({ error: "not found" }, 404));
app.onError((err, c) => {
  console.error(`[api] ${c.req.method} ${c.req.path} 500\n${describeError(err)}`);
  return c.json({ error: "잠시 뒤 다시 시도해 주세요" }, 500);
});

export default app;
