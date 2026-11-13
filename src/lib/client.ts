import { useCallback, useEffect, useState } from "react";
import { modifyArchive, readArchive } from "./localArchive";
import type { Category, Liver, LiveStatus, StampRecord, VideoRecord } from "./localArchive";

export type { Category, Liver } from "./localArchive";
export type Stamp = { id: number; seconds: number; note: string };
export type VideoItem = {
  id: number; youtube_id: string; liver_id: number; title: string; published_at: string; duration: number;
  live_status: LiveStatus; category: Category; favorite: number;
  liver_name: string; liver_avatar: string; ts_count: number; has_memo: number;
};
export type Filter = { liver?: number; favorite?: boolean; tab?: "song" | "live"; category?: string };

export const CATEGORY_LABEL: Record<Category, string> = { song: "노래", live: "라이브", other: "기타" };
export const errText = (e: unknown) => e instanceof Error ? e.message : "잠시 뒤 다시 시도해 주세요";

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

export async function listLivers(): Promise<Liver[]> {
  const data = await readArchive();
  const counts = new Map<number, number>();
  for (const video of data.videos) counts.set(video.liver_id, (counts.get(video.liver_id) ?? 0) + 1);
  return data.livers.map(l => ({ ...l, video_count: counts.get(l.id) ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export async function getLiver(id: number): Promise<Liver> {
  const data = await readArchive();
  const liver = data.livers.find(l => l.id === id);
  if (!liver) throw new Error("없는 라이버예요");
  return { ...liver };
}

export async function addLiver(url: string) {
  const info = await serverPost<{ channelId: string; name: string; avatar: string }>("/resolve", { url });
  const row = await modifyArchive<Liver>(archive => {
    if (archive.livers.some(l => l.channel_id === info.channelId)) throw new Error("이미 등록된 라이버예요");
    const next: Liver = {
      id: archive.nextId.liver++, channel_id: info.channelId, name: info.name,
      avatar: info.avatar, last_fetched: null,
    };
    archive.livers.push(next);
    return next;
  });
  let added = 0;
  let warning = "";
  try {
    added = (await refreshOne(row, 0));
  } catch (e) {
    warning = errText(e);
  }
  return { row, added, warning };
}

export async function deleteLiver(id: number) {
  await modifyArchive(archive => {
    const target = new Set(archive.videos.filter(v => v.liver_id === id).map(v => v.id));
    archive.livers = archive.livers.filter(l => l.id !== id);
    archive.videos = archive.videos.filter(v => v.liver_id !== id);
    archive.timestamps = archive.timestamps.filter(s => !target.has(s.video_id));
  });
}

type FetchedVideo = {
  youtubeId: string; title: string; publishedAt: string; duration: number;
  liveStatus: LiveStatus; category: Category;
};

async function refreshOne(liver: Liver, pages = 0): Promise<number> {
  const result = await serverPost<{ videos: FetchedVideo[] }>("/sync", { channelId: liver.channel_id, pages });
  if (!Array.isArray(result.videos)) throw new Error("영상 목록 응답이 올바르지 않아요.");
  return modifyArchive(archive => {
    const stored = archive.livers.find(l => l.id === liver.id);
    if (!stored) return 0;
    const known = new Map(archive.videos.filter(v => v.liver_id === liver.id).map(v => [v.youtube_id, v]));
    let added = 0;
    for (const item of result.videos) {
      if (!item.youtubeId || !item.title || Number.isNaN(Date.parse(item.publishedAt))) continue;
      const old = known.get(item.youtubeId);
      if (old) {
        old.title = item.title;
        old.published_at = item.publishedAt;
        old.duration = item.duration;
        old.live_status = item.liveStatus;
        if (!old.category_manual) old.category = item.category;
      } else {
        const fresh: VideoRecord = {
          id: archive.nextId.video++, youtube_id: item.youtubeId, liver_id: liver.id,
          title: item.title, published_at: item.publishedAt, duration: item.duration,
          live_status: item.liveStatus, category: item.category, category_manual: false,
          favorite: false, memo: "",
        };
        archive.videos.push(fresh);
        known.set(item.youtubeId, fresh);
        added++;
      }
    }
    stored.last_fetched = new Date().toISOString();
    return added;
  });
}

export async function refreshLivers(livers: Liver[], onProgress?: (done: number, total: number) => void) {
  let added = 0;
  const failed: string[] = [];
  for (let i = 0; i < livers.length; i++) {
    try { added += await refreshOne(livers[i], 0); }
    catch { failed.push(livers[i].name); }
    onProgress?.(i + 1, livers.length);
  }
  return { added, failed };
}

export async function listVideos(f: Filter, offset = 0, limit = 20): Promise<{ rows: VideoItem[]; more: boolean }> {
  const archive = await readArchive();
  const livers = new Map(archive.livers.map(l => [l.id, l]));
  const stampCounts = new Map<number, number>();
  for (const s of archive.timestamps) stampCounts.set(s.video_id, (stampCounts.get(s.video_id) ?? 0) + 1);
  const filtered = archive.videos.filter(v => {
    if (f.liver && v.liver_id !== f.liver) return false;
    if (f.favorite && !v.favorite) return false;
    if (f.category && v.category !== f.category) return false;
    if (!f.category && f.tab === "song" && v.category !== "song") return false;
    if (!f.category && f.tab === "live" && !["live", "other"].includes(v.category)) return false;
    return true;
  }).sort((a, b) => b.published_at.localeCompare(a.published_at) || b.id - a.id);
  const subset = filtered.slice(offset, offset + limit);
  const rows = subset.map(v => {
    const liver = livers.get(v.liver_id);
    return {
      id: v.id, youtube_id: v.youtube_id, liver_id: v.liver_id, title: v.title,
      published_at: v.published_at, duration: v.duration, live_status: v.live_status,
      category: v.category, favorite: v.favorite ? 1 : 0,
      liver_name: liver?.name ?? "", liver_avatar: liver?.avatar ?? "",
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
      liver_name: liver?.name ?? "", liver_avatar: liver?.avatar ?? "",
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
