import { useCallback, useEffect, useState } from "react";
import { modifyArchive, readArchive } from "./localArchive";
import type { Category, ChannelPlaylist, Liver, LiveStatus, StampRecord, VideoRecord, YtVideoType } from "./localArchive";

export type { Category, ChannelPlaylist, Liver, YtVideoType } from "./localArchive";
export type Stamp = { id: number; seconds: number; note: string };
export type VideoItem = {
  id: number; youtube_id: string; liver_id: number; title: string; published_at: string; duration: number;
  live_status: LiveStatus; yt_type: YtVideoType; category: Category; favorite: number;
  liver_name: string; liver_avatar: string; ts_count: number; has_memo: number;
};
export type Filter = {
  liver?: number;
  favorite?: boolean;
  ytType?: YtVideoType;
  category?: Category;
};

export const ASSIGNABLE_CATEGORIES: Exclude<Category, "none">[] = ["song", "live", "shorts", "kirinuki"];

export const CATEGORY_LABEL: Record<Category, string> = {
  song: "노래",
  live: "라이브",
  shorts: "Shorts",
  kirinuki: "키리누키",
  none: "",
};

export const errText = (e: unknown) => e instanceof Error ? e.message : "잠시 뒤 다시 시도해 주세요";

const backfillDoneKey = (channelId: string) => `yt_backfill_done_${channelId}`;
const backfillTokenKey = (channelId: string) => `yt_backfill_token_${channelId}`;

/* --- 이어서 불러오기 모달 상태 관리 -------------------------------------- */

export type ContinuePromptState = {
  liverName: string;
  addedInBatch: number;
  totalCount: number;
  isResumePrompt: boolean;
  resolve: (keepGoing: boolean) => void;
};

let currentPrompt: ContinuePromptState | null = null;
const promptListeners = new Set<(state: ContinuePromptState | null) => void>();

function notifyPrompt(state: ContinuePromptState | null) {
  currentPrompt = state;
  for (const listener of promptListeners) listener(state);
}

function askContinue(info: Omit<ContinuePromptState, "resolve">): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    notifyPrompt({
      ...info,
      resolve: (keepGoing: boolean) => {
        notifyPrompt(null);
        resolve(keepGoing);
      },
    });
  });
}

export function useContinuePrompt() {
  const [state, setState] = useState<ContinuePromptState | null>(currentPrompt);
  useEffect(() => {
    promptListeners.add(setState);
    return () => { promptListeners.delete(setState); };
  }, []);
  return state;
}

/* --- API 통신 ------------------------------------------------------------ */

async function serverPost<T>(path: string, json: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(json),
    });
  } catch {
    throw new Error("서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.");
  }
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "영상 정보를 가져오지 못했어요.");
  return body;
}

export function extractYoutubeHandle(rawUrl: string): string {
  const s = rawUrl.trim();
  if (!s) return "";
  if (s.startsWith("@")) return s.split(/[/?#]/)[0];
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    const seg = u.pathname.split("/").filter(Boolean)[0] ?? "";
    if (seg.startsWith("@")) return decodeURIComponent(seg);
  } catch {
    // ignore
  }
  return "";
}

export async function resolveYoutubeChannel(url: string) {
  return serverPost<{ channelId: string; name: string; avatar: string }>("/resolve", { url });
}

export async function listLivers(): Promise<Liver[]> {
  const data = await readArchive();
  const counts = new Map<number, number>();
  const liveSet = new Set<number>();
  for (const video of data.videos) {
    counts.set(video.liver_id, (counts.get(video.liver_id) ?? 0) + 1);
    if (video.live_status === "live") liveSet.add(video.liver_id);
  }
  return data.livers
    .map(l => ({ ...l, video_count: counts.get(l.id) ?? 0, is_live: liveSet.has(l.id) }))
    .sort((a, b) => Number(!!b.is_live) - Number(!!a.is_live) || a.name.localeCompare(b.name, "ko"));
}

export async function getLiver(id: number): Promise<Liver> {
  const data = await readArchive();
  const liver = data.livers.find(l => l.id === id);
  if (!liver) throw new Error("없는 라이버예요");
  const isLive = data.videos.some(v => v.liver_id === id && v.live_status === "live");
  return { ...liver, is_live: isLive };
}

export type LiverProfileInput = {
  youtubeUrl: string;
  resolvedChannel?: { channelId: string; name: string; avatar: string };
  youtube_handle?: string;
  name_ja: string;
  name_ko: string;
  birthday: string;
  debut_date: string;
  oshi_date: string;
  membership: boolean;
  oshi_mark: string;
  fan_name: string;
  official_color: string;
  use_theme_color: boolean;
  twitter_urls: string[];
  nijiwiki_url: string;
};

export async function createLiverWithProfile(input: LiverProfileInput) {
  const info = input.resolvedChannel ?? (await resolveYoutubeChannel(input.youtubeUrl));
  const ja = input.name_ja.trim() || info.name;
  const ko = input.name_ko.trim();
  const ytHandle = input.youtube_handle?.trim() || extractYoutubeHandle(input.youtubeUrl) || info.name;

  const row = await modifyArchive<Liver>(archive => {
    if (archive.livers.some(l => l.channel_id === info.channelId)) throw new Error("이미 등록된 라이버예요");
    const next: Liver = {
      id: archive.nextId.liver++,
      channel_id: info.channelId,
      youtube_handle: ytHandle,
      name: ja,
      name_ja: ja,
      name_ko: ko,
      avatar: info.avatar,
      birthday: input.birthday.trim(),
      debut_date: input.debut_date.trim(),
      oshi_date: input.oshi_date.trim(),
      membership: input.membership,
      oshi_mark: input.oshi_mark.trim(),
      fan_name: input.fan_name.trim(),
      official_color: input.official_color.trim(),
      use_theme_color: input.use_theme_color,
      twitter_urls: input.twitter_urls.map(u => u.trim()).filter(Boolean),
      nijiwiki_url: input.nijiwiki_url.trim(),
      last_fetched: null,
    };
    archive.livers.push(next);
    return next;
  });

  let added = 0;
  let warning = "";
  try {
    added = await refreshOne(row);
  } catch (e) {
    warning = errText(e);
  }
  return { row, added, warning };
}

export async function updateLiverProfile(id: number, input: Partial<LiverProfileInput> & { membership?: boolean; use_theme_color?: boolean }) {
  let resolved = input.resolvedChannel;
  if (!resolved && input.youtubeUrl && input.youtubeUrl.trim()) {
    resolved = await resolveYoutubeChannel(input.youtubeUrl);
  }

  return modifyArchive<Liver>(archive => {
    const liver = archive.livers.find(l => l.id === id);
    if (!liver) throw new Error("없는 라이버예요");

    if (resolved) {
      if (archive.livers.some(l => l.id !== id && l.channel_id === resolved!.channelId)) {
        throw new Error("이미 다른 항목에 등록된 유튜브 채널이에요");
      }
      if (liver.channel_id !== resolved.channelId) {
        localStorage.removeItem(backfillDoneKey(liver.channel_id));
        localStorage.removeItem(backfillTokenKey(liver.channel_id));
      }
      liver.channel_id = resolved.channelId;
      liver.avatar = resolved.avatar;
      if (!input.name_ja?.trim() && !liver.name_ja) {
        liver.name_ja = resolved.name;
        liver.name = resolved.name;
      }
    }

    if (input.youtube_handle !== undefined && input.youtube_handle.trim()) {
      liver.youtube_handle = input.youtube_handle.trim();
    } else if (input.youtubeUrl) {
      const h = extractYoutubeHandle(input.youtubeUrl);
      if (h) liver.youtube_handle = h;
      else if (resolved && !liver.youtube_handle) liver.youtube_handle = resolved.name;
    }

    if (input.name_ja !== undefined) {
      const ja = input.name_ja.trim() || liver.name_ja || liver.name;
      liver.name_ja = ja;
      liver.name = ja;
    }
    if (input.name_ko !== undefined) liver.name_ko = input.name_ko.trim();
    if (input.birthday !== undefined) liver.birthday = input.birthday.trim();
    if (input.debut_date !== undefined) liver.debut_date = input.debut_date.trim();
    if (input.oshi_date !== undefined) liver.oshi_date = input.oshi_date.trim();
    if (input.membership !== undefined) liver.membership = input.membership;
    if (input.oshi_mark !== undefined) liver.oshi_mark = input.oshi_mark.trim();
    if (input.fan_name !== undefined) liver.fan_name = input.fan_name.trim();
    if (input.official_color !== undefined) liver.official_color = input.official_color.trim();
    if (input.use_theme_color !== undefined) liver.use_theme_color = input.use_theme_color;
    if (input.twitter_urls !== undefined) liver.twitter_urls = input.twitter_urls.map(u => u.trim()).filter(Boolean);
    if (input.nijiwiki_url !== undefined) liver.nijiwiki_url = input.nijiwiki_url.trim();

    return { ...liver };
  });
}

export async function addLiver(url: string) {
  return createLiverWithProfile({
    youtubeUrl: url,
    name_ja: "",
    name_ko: "",
    birthday: "",
    debut_date: "",
    oshi_date: "",
    membership: false,
    oshi_mark: "",
    fan_name: "",
    official_color: "",
    use_theme_color: false,
    twitter_urls: [],
    nijiwiki_url: "",
  });
}

export async function deleteLiver(id: number) {
  await modifyArchive(archive => {
    const liver = archive.livers.find(l => l.id === id);
    if (liver) {
      localStorage.removeItem(backfillDoneKey(liver.channel_id));
      localStorage.removeItem(backfillTokenKey(liver.channel_id));
    }
    const target = new Set(archive.videos.filter(v => v.liver_id === id).map(v => v.id));
    archive.livers = archive.livers.filter(l => l.id !== id);
    archive.videos = archive.videos.filter(v => v.liver_id !== id);
    archive.timestamps = archive.timestamps.filter(s => !target.has(s.video_id));
  });
}

type FetchedVideo = {
  youtubeId: string; title: string; publishedAt: string; duration: number;
  liveStatus: LiveStatus; ytType?: YtVideoType; category: Category;
};

async function upsertVideos(liverId: number, items: FetchedVideo[], playlists?: ChannelPlaylist[]) {
  let hitExisting = false;
  const stats = await modifyArchive(archive => {
    const stored = archive.livers.find(l => l.id === liverId);
    if (!stored) return { added: 0, totalCount: 0 };
    if (playlists) stored.playlists = playlists;

    const liverVideos = archive.videos.filter(v => v.liver_id === liverId);
    const known = new Map(liverVideos.map(v => [v.youtube_id, v]));
    let added = 0;
    for (const item of items) {
      if (!item.youtubeId || !item.title || Number.isNaN(Date.parse(item.publishedAt))) continue;
      const old = known.get(item.youtubeId);
      if (old) {
        hitExisting = true;
        old.title = item.title;
        old.published_at = item.publishedAt;
        old.duration = item.duration;
        old.live_status = item.liveStatus;
        if (item.ytType) old.yt_type = item.ytType;
        if (!old.category_manual) old.category = item.category;
      } else {
        const fresh: VideoRecord = {
          id: archive.nextId.video++, youtube_id: item.youtubeId, liver_id: liverId,
          title: item.title, published_at: item.publishedAt, duration: item.duration,
          live_status: item.liveStatus, yt_type: item.ytType ?? "video",
          category: item.category, category_manual: false,
          favorite: false, memo: "",
        };
        archive.videos.push(fresh);
        known.set(item.youtubeId, fresh);
        added++;
      }
    }
    stored.last_fetched = new Date().toISOString();
    return { added, totalCount: known.size };
  });
  return { ...stats, hitExisting };
}

async function refreshOne(liver: Liver): Promise<number> {
  const isBackfillDone = localStorage.getItem(backfillDoneKey(liver.channel_id)) === "1";
  const savedToken = localStorage.getItem(backfillTokenKey(liver.channel_id)) || "";
  let totalAdded = 0;

  if (isBackfillDone) {
    let pageToken = "";
    for (let i = 0; i < 10; i++) {
      const result = await serverPost<{ videos: FetchedVideo[]; nextPageToken?: string; playlists?: ChannelPlaylist[] }>("/sync", {
        channelId: liver.channel_id,
        pages: 2,
        pageToken,
      });
      if (!Array.isArray(result.videos)) throw new Error("영상 목록 응답이 올바르지 않아요.");
      const { added, hitExisting } = await upsertVideos(liver.id, result.videos, i === 0 ? result.playlists : undefined);
      totalAdded += added;
      if (hitExisting || !result.nextPageToken) break;
      pageToken = result.nextPageToken;
    }
    return totalAdded;
  }

  if (savedToken) {
    const latest = await serverPost<{ videos: FetchedVideo[]; nextPageToken?: string; playlists?: ChannelPlaylist[] }>("/sync", {
      channelId: liver.channel_id,
      pages: 2,
      pageToken: "",
    });
    let currentTotal = 0;
    if (Array.isArray(latest.videos)) {
      const { added, totalCount } = await upsertVideos(liver.id, latest.videos, latest.playlists);
      totalAdded += added;
      currentTotal = totalCount;
    } else {
      const archive = await readArchive();
      currentTotal = archive.videos.filter(v => v.liver_id === liver.id).length;
    }

    const shouldResume = await askContinue({
      liverName: liver.name_ja || liver.name,
      addedInBatch: totalAdded,
      totalCount: currentTotal,
      isResumePrompt: true,
    });
    if (!shouldResume) return totalAdded;
  }

  let pageToken = savedToken;
  let batchAdded = 0;

  for (let chunk = 0; chunk < 100; chunk++) {
    const result = await serverPost<{ videos: FetchedVideo[]; nextPageToken?: string; playlists?: ChannelPlaylist[] }>("/sync", {
      channelId: liver.channel_id,
      pages: 10,
      pageToken,
    });
    if (!Array.isArray(result.videos)) throw new Error("영상 목록 응답이 올바르지 않아요.");

    const { added, totalCount } = await upsertVideos(liver.id, result.videos, !pageToken ? result.playlists : undefined);
    totalAdded += added;
    batchAdded += added;

    if (!result.nextPageToken) {
      localStorage.removeItem(backfillTokenKey(liver.channel_id));
      localStorage.setItem(backfillDoneKey(liver.channel_id), "1");
      break;
    }

    pageToken = result.nextPageToken;
    localStorage.setItem(backfillTokenKey(liver.channel_id), pageToken);

    if (batchAdded >= 1000) {
      const keepGoing = await askContinue({
        liverName: liver.name_ja || liver.name,
        addedInBatch: batchAdded,
        totalCount,
        isResumePrompt: false,
      });
      if (!keepGoing) break;
      batchAdded = 0;
    }
  }

  return totalAdded;
}

export async function refreshLivers(livers: Liver[], onProgress?: (done: number, total: number) => void) {
  let added = 0;
  const failed: string[] = [];
  for (let i = 0; i < livers.length; i++) {
    try { added += await refreshOne(livers[i]); }
    catch { failed.push(livers[i].name_ja || livers[i].name); }
    onProgress?.(i + 1, livers.length);
  }
  return { added, failed };
}

export async function listVideos(f: Filter, offset = 0, limit = 50): Promise<{ rows: VideoItem[]; more: boolean }> {
  const archive = await readArchive();
  const livers = new Map(archive.livers.map(l => [l.id, l]));
  const stampCounts = new Map<number, number>();
  for (const s of archive.timestamps) stampCounts.set(s.video_id, (stampCounts.get(s.video_id) ?? 0) + 1);
  const filtered = archive.videos.filter(v => {
    if (f.liver && v.liver_id !== f.liver) return false;
    if (f.favorite && !v.favorite) return false;
    if (f.ytType) {
      const vt: YtVideoType = v.yt_type ?? (v.live_status !== "none" || v.category === "live" ? "live" : v.category === "shorts" ? "shorts" : "video");
      if (vt !== f.ytType) return false;
    }
    if (f.category && v.category !== f.category) return false;
    return true;
  }).sort((a, b) => Number(b.live_status === "live") - Number(a.live_status === "live") || b.published_at.localeCompare(a.published_at) || b.id - a.id);

  const subset = filtered.slice(offset, offset + limit);
  const rows = subset.map(v => {
    const liver = livers.get(v.liver_id);
    const vt: YtVideoType = v.yt_type ?? (v.live_status !== "none" || v.category === "live" ? "live" : v.category === "shorts" ? "shorts" : "video");
    return {
      id: v.id, youtube_id: v.youtube_id, liver_id: v.liver_id, title: v.title,
      published_at: v.published_at, duration: v.duration, live_status: v.live_status,
      yt_type: vt, category: v.category, favorite: v.favorite ? 1 : 0,
      liver_name: liver?.name_ja || liver?.name || "", liver_avatar: liver?.avatar ?? "",
      ts_count: stampCounts.get(v.id) ?? 0, has_memo: v.memo ? 1 : 0,
    };
  });
  return { rows, more: filtered.length > offset + limit };
}

export async function getVideo(id: number) {
  const data = await readArchive();
  const video = data.videos.find(v => v.id === id);
  if (!video) throw new Error("없는 영상이에요");
  const liver = data.livers.find(l => l.id === video.liver_id);
  const stamps: Stamp[] = data.timestamps.filter(s => s.video_id === id)
    .sort((a, b) => a.seconds - b.seconds || a.id - b.id)
    .map(s => ({ id: s.id, seconds: s.seconds, note: s.note }));
  return {
    row: {
      id: video.id, youtube_id: video.youtube_id, liver_id: video.liver_id,
      title: video.title, published_at: video.published_at, category: video.category,
      favorite: video.favorite ? 1 : 0, memo: video.memo,
      liver_name: liver?.name_ja || liver?.name || "", liver_avatar: liver?.avatar ?? "",
    },
    timestamps: stamps,
  };
}

export async function updateVideo(id: number, patch: { category?: Category; favorite?: boolean; memo?: string }) {
  await modifyArchive(archive => {
    const video = archive.videos.find(v => v.id === id);
    if (!video) throw new Error("없는 영상이에요");
    if (patch.category !== undefined) { video.category = patch.category; video.category_manual = true; }
    if (patch.favorite !== undefined) video.favorite = patch.favorite;
    if (patch.memo !== undefined) video.memo = patch.memo.slice(0, 20000);
  });
}

export async function createStamp(videoId: number, seconds: number, note: string): Promise<Stamp> {
  return modifyArchive(archive => {
    if (!archive.videos.some(v => v.id === videoId)) throw new Error("없는 영상이에요");
    const row: StampRecord = { id: archive.nextId.stamp++, video_id: videoId, seconds, note: note.slice(0, 500) };
    archive.timestamps.push(row);
    return { id: row.id, seconds: row.seconds, note: row.note };
  });
}

export async function updateStamp(id: number, note: string) {
  await modifyArchive(archive => {
    const stamp = archive.timestamps.find(s => s.id === id);
    if (!stamp) throw new Error("없는 타임스탬프예요");
    stamp.note = note.slice(0, 500);
  });
}

export async function deleteStamp(id: number) {
  await modifyArchive(archive => { archive.timestamps = archive.timestamps.filter(s => s.id !== id); });
}

export function useFetch<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    load()
      .then(d => { if (live) { setData(d); setError(""); } })
      .catch(e => { if (live) setError(errText(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick(t => t + 1), []);
  return { data, setData, error, loading, reload };
}

export function useVideos(f: Filter, reloadKey = 0) {
  const key = JSON.stringify(f);
  const [rows, setRows] = useState<VideoItem[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setLoading(true);
    listVideos(JSON.parse(key) as Filter)
      .then(d => { if (live) { setRows(d.rows); setMore(d.more); setError(""); } })
      .catch(e => { if (live) setError(errText(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [key, reloadKey]);
  const loadMore = async () => {
    setLoading(true);
    try {
      const d = await listVideos(f, rows.length);
      setRows(r => [...r, ...d.rows]);
      setMore(d.more);
    } catch (e) { setError(errText(e)); }
    setLoading(false);
  };
  const toggleFavorite = async (v: VideoItem) => {
    const next = !v.favorite;
    setRows(r => r.map(x => x.id === v.id ? { ...x, favorite: next ? 1 : 0 } : x));
    try { await updateVideo(v.id, { favorite: next }); }
    catch (e) { setRows(r => r.map(x => x.id === v.id ? { ...x, favorite: v.favorite } : x)); setError(errText(e)); }
  };
  return { rows, more, loading, error, loadMore, toggleFavorite };
}
