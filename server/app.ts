import { type Context, Hono } from "hono";
import { fetchVideos, resolveChannel } from "./youtube";

const app = new Hono().basePath("/api");

app.use("*", async (c, next) => {
  c.header("cache-control", "no-store");
  c.header("x-robots-tag", "noindex");
  await next();
});

const body = async (c: Context) =>
  ((await c.req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;

// 유튜브 공개 채널 정보만 조회하며, 사용자의 덕질 기록은 서버에서 다루지 않는다.
app.post("/resolve", async c => {
  const b = await body(c);
  const url = typeof b.url === "string" ? b.url.trim().slice(0, 300) : "";
  if (!url) return c.json({ error: "채널 링크를 붙여 넣어 주세요" }, 400);
  try {
    return c.json(await resolveChannel(url, process.env.YOUTUBE_API_KEY || undefined));
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "채널을 찾지 못했어요" }, 400);
  }
});

// 채널의 영상 메타데이터만 응답한다. 분류·즐겨찾기·메모·타임스탬프는 브라우저에 저장한다.
app.post("/sync", async c => {
  const b = await body(c);
  const channelId = typeof b.channelId === "string" ? b.channelId : "";
  if (!/^UC[\w-]{22}$/.test(channelId)) {
    return c.json({ error: "올바른 유튜브 채널이 아니에요" }, 400);
  }
  const pages = typeof b.pages === "number" && b.pages > 0 ? Math.min(b.pages, 100) : 0;
  try {
    const videos = await fetchVideos(channelId, process.env.YOUTUBE_API_KEY || undefined, pages);
    return c.json({ videos });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "영상 목록을 가져오지 못했어요" }, 502);
  }
});

export default app;
