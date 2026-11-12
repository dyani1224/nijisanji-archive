import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { type Context, Hono } from "hono";
import { fetchVideos, resolveChannel, type FetchedVideo } from "./youtube";

type Vars = { sb: SupabaseClient };
const env = (k: string) => process.env[k] ?? "";

const app = new Hono<{ Variables: Vars }>().basePath("/api");

app.use("*", async (c, next) => {
  c.header("cache-control", "no-store");
  c.header("x-robots-tag", "noindex");
  const token = (c.req.header("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token || !env("SUPABASE_URL") || !env("SUPABASE_ANON_KEY")) return c.json({ error: "로그인이 필요해요" }, 401);
  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return c.json({ error: "로그인이 필요해요" }, 401);
  c.set("sb", sb);
  await next();
});

const body = async (c: Context) =>
  ((await c.req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;

app.post("/resolve", async c => {
  const b = await body(c);
  const url = typeof b.url === "string" ? b.url.trim().slice(0, 300) : "";
  if (!url) return c.json({ error: "채널 링크를 붙여 넣어 주세요" }, 400);
  try {
    return c.json(await resolveChannel(url, env("YOUTUBE_API_KEY") || undefined));
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "채널을 찾지 못했어요" }, 400);
  }
});

// 라이버 한 명의 영상 목록을 가져와 저장한다. 분류를 직접 바꾼 영상은 분류를 유지한다.
app.post("/sync", async c => {
  const sb = c.get("sb");
  const b = await body(c);
  const liverId = Number(b.liverId);
  const pages = b.pages === 2 ? 2 : 1;
  if (!Number.isInteger(liverId)) return c.json({ error: "라이버를 찾지 못했어요" }, 400);
  const { data: liver } = await sb.from("livers").select("id, channel_id").eq("id", liverId).maybeSingle();
  if (!liver) return c.json({ error: "없는 라이버예요" }, 404);

  let list: FetchedVideo[];
  try {
    list = await fetchVideos(liver.channel_id, env("YOUTUBE_API_KEY") || undefined, pages);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "영상 목록을 가져오지 못했어요" }, 502);
  }

  const { data: existing } = await sb.from("videos").select("youtube_id, category_manual").eq("liver_id", liverId);
  const known = new Map((existing ?? []).map(r => [r.youtube_id, r.category_manual as boolean]));
  const fresh = list.filter(v => !known.has(v.youtubeId));
  for (let i = 0; i < fresh.length; i += 50) {
    const { error } = await sb.from("videos").insert(
      fresh.slice(i, i + 50).map(v => ({
        liver_id: liverId, youtube_id: v.youtubeId, title: v.title, published_at: v.publishedAt,
        duration: v.duration, live_status: v.liveStatus, category: v.category,
      })),
    );
    if (error) return c.json({ error: "영상을 저장하지 못했어요" }, 500);
  }
  const seen = list.filter(v => known.has(v.youtubeId));
  for (let i = 0; i < seen.length; i += 10) {
    await Promise.all(seen.slice(i, i + 10).map(v => {
      const patch: Record<string, unknown> = {
        title: v.title, published_at: v.publishedAt, duration: v.duration, live_status: v.liveStatus,
      };
      if (!known.get(v.youtubeId)) patch.category = v.category;
      return sb.from("videos").update(patch).eq("liver_id", liverId).eq("youtube_id", v.youtubeId);
    }));
  }
  await sb.from("livers").update({ last_fetched: new Date().toISOString() }).eq("id", liverId);
  return c.json({ added: fresh.length });
});

export default app;
