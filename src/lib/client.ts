import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

export type Category = "cover" | "karaoke" | "live" | "other";
export type Liver = { id: number; channel_id: string; name: string; avatar: string; last_fetched: string | null; video_count?: number };
export type VideoItem = {
  id: number; youtube_id: string; liver_id: number; title: string; published_at: string; duration: number;
  live_status: "none" | "live" | "upcoming"; category: Category; favorite: number;
  liver_name: string; liver_avatar: string; ts_count: number; has_memo: number;
};
export type Stamp = { id: number; seconds: number; note: string };
export type Filter = { liver?: number; favorite?: boolean; tab?: "song" | "live"; category?: string };

export const CATEGORY_LABEL: Record<Category, string> = { cover: "커버", karaoke: "가라오케", live: "라이브", other: "기타" };

export const errText = (e: unknown) => (e instanceof Error ? e.message : "잠시 뒤 다시 시도해 주세요");

const saveFail = "저장하지 못했어요. 다시 시도해 주세요";

// 결과가 오류면 화면에는 한국어 문장만 보이고, 실제 내용은 콘솔에 남는다.
function check<T>(res: { data: T | null; error: { message: string } | null }, msg = saveFail): T {
  if (res.error) {
    console.error(res.error);
    throw new Error(msg);
  }
  return res.data as T;
}

async function serverPost<T>(path: string, json: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("로그인이 필요해요");
  let r: Response;
  try {
    r = await fetch(`/api${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(json),
    });
  } catch {
    throw new Error("네트워크에 연결할 수 없어요");
  }
  const body = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(body.error ?? "요청이 실패했어요");
  return body;
}

/* --- 계정 ---------------------------------------------------------------- */

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error("이메일 또는 비밀번호가 맞지 않아요");
}

export const signOut = () => supabase.auth.signOut();

/* --- 라이버 -------------------------------------------------------------- */

export async function listLivers(): Promise<Liver[]> {
  const rows = check(
    await supabase.from("livers").select("id, channel_id, name, avatar, last_fetched, videos(id)").order("name"),
    "라이버 목록을 불러오지 못했어요",
  ) as (Liver & { videos: { id: number }[] })[];
  return rows.map(({ videos, ...l }) => ({ ...l, video_count: videos.length }));
}

export async function getLiver(id: number): Promise<Liver> {
  const row = check(
    await supabase.from("livers").select("id, channel_id, name, avatar, last_fetched").eq("id", id).maybeSingle(),
    "라이버 정보를 불러오지 못했어요",
  );
  if (!row) throw new Error("없는 라이버예요");
  return row as Liver;
}

export async function addLiver(url: string) {
  const info = await serverPost<{ channelId: string; name: string; avatar: string }>("/resolve", { url });
  const dup = check(await supabase.from("livers").select("id").eq("channel_id", info.channelId).maybeSingle());
  if (dup) throw new Error("이미 등록된 라이버예요");
  const row = check(
    await supabase.from("livers").insert({ channel_id: info.channelId, name: info.name, avatar: info.avatar }).select("id, channel_id, name, avatar, last_fetched").single(),
    "등록하지 못했어요",
  ) as Liver;
  let added = 0;
  let warning = "";
  try {
    added = (await serverPost<{ added: number }>("/sync", { liverId: row.id, pages: 2 })).added;
  } catch (e) {
    warning = errText(e);
  }
  return { row, added, warning };
}

export async function deleteLiver(id: number) {
  check(await supabase.from("livers").delete().eq("id", id), "삭제하지 못했어요");
}

/** 라이버를 차례로 새로 고친다. 한 번에 하나씩 보내 서버 호출 한도를 넘지 않게 한다. */
export async function refreshLivers(livers: Liver[], onProgress?: (done: number, total: number) => void) {
  let added = 0;
  const failed: string[] = [];
  for (let i = 0; i < livers.length; i++) {
    try { added += (await serverPost<{ added: number }>("/sync", { liverId: livers[i].id, pages: 1 })).added; }
    catch { failed.push(livers[i].name); }
    onProgress?.(i + 1, livers.length);
  }
  return { added, failed };
}

/* --- 영상 ---------------------------------------------------------------- */

const LIST_SELECT = "id, youtube_id, liver_id, title, published_at, duration, live_status, category, favorite, memo, livers!inner(name, avatar), timestamps(id)";

export async function listVideos(f: Filter, offset = 0, limit = 40): Promise<{ rows: VideoItem[]; more: boolean }> {
  let q = supabase.from("videos").select(LIST_SELECT);
  if (f.liver) q = q.eq("liver_id", f.liver);
  if (f.favorite) q = q.eq("favorite", true);
  if (f.category) q = q.eq("category", f.category);
  else if (f.tab === "song") q = q.in("category", ["cover", "karaoke"]);
  else if (f.tab === "live") q = q.in("category", ["live", "other"]);
  const res = check(
    await q.order("published_at", { ascending: false }).order("id", { ascending: false }).range(offset, offset + limit),
    "영상 목록을 불러오지 못했어요",
  ) as unknown as Array<Record<string, any>>;
  const rows: VideoItem[] = res.slice(0, limit).map(r => ({
    id: r.id, youtube_id: r.youtube_id, liver_id: r.liver_id, title: r.title, published_at: r.published_at,
    duration: r.duration, live_status: r.live_status, category: r.category, favorite: r.favorite ? 1 : 0,
    liver_name: r.livers.name, liver_avatar: r.livers.avatar, ts_count: r.timestamps.length, has_memo: r.memo ? 1 : 0,
  }));
  return { rows, more: res.length > limit };
}

export async function getVideo(id: number) {
  const r = check(
    await supabase.from("videos").select("id, youtube_id, liver_id, title, published_at, category, favorite, memo, livers(name, avatar)").eq("id", id).maybeSingle(),
    "영상 정보를 불러오지 못했어요",
  ) as Record<string, any> | null;
  if (!r) throw new Error("없는 영상이에요");
  const stamps = check(await supabase.from("timestamps").select("id, seconds, note").eq("video_id", id).order("seconds").order("id")) as Stamp[];
  return {
    row: {
      id: r.id as number, youtube_id: r.youtube_id as string, liver_id: r.liver_id as number, title: r.title as string,
      published_at: r.published_at as string, category: r.category as Category, favorite: r.favorite ? 1 : 0,
      memo: r.memo as string, liver_name: r.livers.name as string, liver_avatar: r.livers.avatar as string,
    },
    timestamps: stamps,
  };
}

export async function updateVideo(id: number, patch: { category?: Category; favorite?: boolean; memo?: string }) {
  const body: Record<string, unknown> = {};
  if (patch.category) { body.category = patch.category; body.category_manual = true; }
  if (patch.favorite !== undefined) body.favorite = patch.favorite;
  if (patch.memo !== undefined) body.memo = patch.memo.slice(0, 20000);
  check(await supabase.from("videos").update(body).eq("id", id));
}

/* --- 타임스탬프 ---------------------------------------------------------- */

export async function createStamp(videoId: number, seconds: number, note: string): Promise<Stamp> {
  return check(
    await supabase.from("timestamps").insert({ video_id: videoId, seconds, note: note.slice(0, 500) }).select("id, seconds, note").single(),
  ) as Stamp;
}

export async function updateStamp(id: number, note: string) {
  check(await supabase.from("timestamps").update({ note: note.slice(0, 500) }).eq("id", id));
}

export async function deleteStamp(id: number) {
  check(await supabase.from("timestamps").delete().eq("id", id));
}

/* --- 화면용 훅 ----------------------------------------------------------- */

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
    setRows(r => r.map(x => (x.id === v.id ? { ...x, favorite: next ? 1 : 0 } : x)));
    try { await updateVideo(v.id, { favorite: next }); }
    catch (e) { setRows(r => r.map(x => (x.id === v.id ? { ...x, favorite: v.favorite } : x))); setError(errText(e)); }
  };
  return { rows, more, loading, error, loadMore, toggleFavorite };
}
