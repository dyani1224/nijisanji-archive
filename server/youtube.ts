import { classify, type Category, type YtVideoType } from "../shared/category";

export type FetchedVideo = {
  youtubeId: string;
  title: string;
  publishedAt: string;
  duration: number;
  liveStatus: "none" | "live" | "upcoming";
  isLive: boolean;
  ytType: YtVideoType;
  category: Category;
};

export type PlaylistInfo = {
  id: string;
  title: string;
  thumbnail: string;
  itemCount: number;
};

export type FetchResult = {
  videos: FetchedVideo[];
  nextPageToken?: string;
  playlists?: PlaylistInfo[];
};

export type ChannelInfo = { channelId: string; name: string; avatar: string };

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

const pageHeaders = { "user-agent": UA, "accept-language": "ko,en;q=0.8", cookie: "CONSENT=YES+1; SOCS=CAI" };

const bigAvatar = (u: string) => u.replace(/=s\d+.*$/, "=s176-c-k-c0x00ffffff-no-rj");

const UC = /^UC[\w-]{22}$/;

export async function resolveChannel(input: string, key?: string): Promise<ChannelInfo> {
  const raw = input.trim();
  let channelId = "";
  let handle = "";
  let pageUrl = "";
  if (UC.test(raw)) channelId = raw;
  else {
    let url: URL;
    try { url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw.startsWith("@") ? "www.youtube.com/" : ""}${raw}`); }
    catch { throw new Error("유튜브 채널 링크가 아니에요"); }
    if (!/(^|\.)youtube\.com$/.test(url.hostname)) throw new Error("유튜브 채널 링크를 붙여 넣어 주세요");
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "channel" && UC.test(parts[1] ?? "")) channelId = parts[1];
    else if (parts[0]?.startsWith("@")) { handle = parts[0]; pageUrl = `https://www.youtube.com/${handle}`; }
    else if (["c", "user"].includes(parts[0]) && parts[1]) pageUrl = `https://www.youtube.com/${parts[0]}/${parts[1]}`;
    else throw new Error("채널 링크를 찾지 못했어요. @이름 또는 /channel/ 형태의 주소를 붙여 넣어 주세요");
  }

  if (key) {
    const q = channelId ? `id=${channelId}` : handle ? `forHandle=${encodeURIComponent(handle)}` : "";
    if (q) {
      const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&${q}&key=${key}`);
      if (r.ok) {
        const j = (await r.json()) as { items?: { id: string; snippet: { title: string; thumbnails: Record<string, { url: string }> } }[] };
        const it = j.items?.[0];
        if (it) return { channelId: it.id, name: it.snippet.title, avatar: it.snippet.thumbnails.high?.url ?? it.snippet.thumbnails.default?.url ?? "" };
      }
    }
  }

  let name = "";
  let avatar = "";
  const res = await fetch(pageUrl || `https://www.youtube.com/channel/${channelId}`, { headers: pageHeaders });
  if (res.ok) {
    const html = await res.text();
    if (!channelId) {
      channelId = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/)?.[1]
        ?? html.match(/"externalId":"(UC[\w-]{22})"/)?.[1]
        ?? html.match(/"channelId":"(UC[\w-]{22})"/)?.[1] ?? "";
    }
    name = decode(html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ?? "");
    avatar = decode(html.match(/<meta property="og:image" content="([^"]*)"/)?.[1] ?? "");
  }
  if (!channelId) throw new Error("채널을 찾지 못했어요. 링크를 다시 확인해 주세요");
  if (!name) {
    const feed = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    if (!feed.ok) throw new Error("채널을 찾지 못했어요. 링크를 다시 확인해 주세요");
    name = decode((await feed.text()).match(/<title>([^<]*)<\/title>/)?.[1] ?? "") || channelId;
  }
  return { channelId, name, avatar: avatar ? bigAvatar(avatar) : "" };
}

const isoDuration = (s: string) => {
  const m = s.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  return (Number(m[1] ?? 0) * 86400) + (Number(m[2] ?? 0) * 3600) + (Number(m[3] ?? 0) * 60) + Number(m[4] ?? 0);
};

async function viaRss(channelId: string): Promise<FetchResult> {
  const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
  if (!r.ok) throw new Error("유튜브에서 영상 목록을 가져오지 못했어요");
  const xml = await r.text();
  const out: FetchedVideo[] = [];
  for (const e of xml.split("<entry>").slice(1)) {
    const id = e.match(/<yt:videoId>([^<]+)</)?.[1];
    const title = decode(e.match(/<title>([^<]*)</)?.[1] ?? "");
    const pub = e.match(/<published>([^<]+)</)?.[1];
    if (!id || !pub) continue;
    const isShorts = /#shorts/i.test(title);
    out.push({
      youtubeId: id,
      title,
      publishedAt: new Date(pub).toISOString(),
      duration: 0,
      liveStatus: "none",
      isLive: false,
      ytType: isShorts ? "shorts" : "video",
      category: classify(title, false, isShorts),
    });
  }
  return { videos: out };
}

type VideoDetailResponse = {
  items?: {
    id: string;
    snippet: { title: string; publishedAt: string; liveBroadcastContent?: string };
    contentDetails: { duration: string };
    liveStreamingDetails?: { actualStartTime?: string; scheduledStartTime?: string };
  }[];
};

async function fetchShortsIds(channelId: string, key: string): Promise<Set<string>> {
  const shortsPlaylist = "UUSH" + channelId.slice(2);
  const ids = new Set<string>();
  let token = "";
  for (let i = 0; i < 10; i++) {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${shortsPlaylist}&key=${key}${token ? `&pageToken=${encodeURIComponent(token)}` : ""}`);
    if (!r.ok) break;
    const j = (await r.json()) as { items?: { contentDetails?: { videoId?: string } }[]; nextPageToken?: string };
    for (const x of j.items ?? []) {
      if (x.contentDetails?.videoId) ids.add(x.contentDetails.videoId);
    }
    if (!j.nextPageToken) break;
    token = j.nextPageToken;
  }
  return ids;
}

async function fetchChannelPlaylists(channelId: string, key: string): Promise<PlaylistInfo[]> {
  const playlists: PlaylistInfo[] = [];
  let token = "";
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=50&key=${key}${token ? `&pageToken=${encodeURIComponent(token)}` : ""}`);
    if (!r.ok) break;
    const j = (await r.json()) as {
      items?: {
        id: string;
        snippet: { title: string; thumbnails?: { medium?: { url: string }; default?: { url: string } } };
        contentDetails?: { itemCount?: number };
      }[];
      nextPageToken?: string;
    };
    for (const p of j.items ?? []) {
      playlists.push({
        id: p.id,
        title: p.snippet.title,
        thumbnail: p.snippet.thumbnails?.medium?.url ?? p.snippet.thumbnails?.default?.url ?? "",
        itemCount: p.contentDetails?.itemCount ?? 0,
      });
    }
    if (!j.nextPageToken) break;
    token = j.nextPageToken;
  }
  return playlists;
}

async function viaApi(channelId: string, key: string, pages: number, startToken = ""): Promise<FetchResult> {
  const playlist = "UU" + channelId.slice(2);
  const ids: string[] = [];
  let token = startToken;
  let nextPageToken: string | undefined;

  const sideTasks = !startToken
    ? Promise.all([fetchShortsIds(channelId, key), fetchChannelPlaylists(channelId, key)])
    : Promise.resolve([new Set<string>(), undefined] as const);

  const maxLoop = Math.min(Math.max(pages, 1), 10);
  for (let i = 0; i < maxLoop; i++) {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${playlist}&key=${key}${token ? `&pageToken=${encodeURIComponent(token)}` : ""}`);
    if (!r.ok) throw new Error("YouTube API 키가 올바르지 않거나 사용 한도를 넘었어요");
    const j = (await r.json()) as { items?: { contentDetails?: { videoId?: string } }[]; nextPageToken?: string };
    for (const x of j.items ?? []) {
      if (x.contentDetails?.videoId) ids.push(x.contentDetails.videoId);
    }
    nextPageToken = j.nextPageToken;
    if (!nextPageToken) break;
    token = nextPageToken;
  }

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 50) {
    chunks.push(ids.slice(i, i + 50));
  }

  const [detailResults, [shortsSet, playlists]] = await Promise.all([
    Promise.all(
      chunks.map(async chunk => {
        const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,liveStreamingDetails&id=${chunk.join(",")}&key=${key}`);
        if (!r.ok) throw new Error("YouTube API 키가 올바르지 않거나 사용 한도를 넘었어요");
        return (await r.json()) as VideoDetailResponse;
      })
    ),
    sideTasks,
  ]);

  const out: FetchedVideo[] = [];
  for (const j of detailResults) {
    for (const v of j.items ?? []) {
      const ld = v.liveStreamingDetails;
      const bc = v.snippet.liveBroadcastContent;
      const isLive = !!ld;
      const dur = isoDuration(v.contentDetails.duration);
      const isShorts = !isLive && (shortsSet.has(v.id) || (dur > 0 && dur <= 180 && /#shorts/i.test(v.snippet.title)));
      const ytType: YtVideoType = isLive ? "live" : isShorts ? "shorts" : "video";

      out.push({
        youtubeId: v.id,
        title: v.snippet.title,
        publishedAt: new Date(ld?.actualStartTime ?? ld?.scheduledStartTime ?? v.snippet.publishedAt).toISOString(),
        duration: dur,
        liveStatus: bc === "live" ? "live" : bc === "upcoming" ? "upcoming" : "none",
        isLive,
        ytType,
        category: classify(v.snippet.title, isLive, isShorts),
      });
    }
  }

  return { videos: out, nextPageToken, playlists };
}

export function fetchVideos(channelId: string, key: string | undefined, pages = 10, pageToken = "") {
  return key ? viaApi(channelId, key, pages, pageToken) : viaRss(channelId);
}
