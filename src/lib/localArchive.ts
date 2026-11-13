import { classify, type Category, type YtVideoType } from "../../shared/category";
export type { Category, YtVideoType } from "../../shared/category";
export type LiveStatus = "none" | "live" | "upcoming";

export type ChannelPlaylist = {
  id: string;
  title: string;
  thumbnail: string;
  itemCount: number;
};

export type Liver = {
  id: number;
  channel_id: string;
  name: string;
  name_ja?: string;
  name_ko?: string;
  avatar: string;
  birthday?: string;
  debut_date?: string;
  oshi_date?: string;
  membership?: boolean;
  oshi_mark?: string;
  fan_name?: string;
  official_color?: string;
  use_theme_color?: boolean;
  twitter_urls?: string[];
  nijiwiki_url?: string;
  last_fetched: string | null;
  video_count?: number;
  is_live?: boolean;
  playlists?: ChannelPlaylist[];
};

export type VideoRecord = {
  id: number;
  youtube_id: string;
  liver_id: number;
  title: string;
  published_at: string;
  duration: number;
  live_status: LiveStatus;
  yt_type?: YtVideoType;
  category: Category;
  category_manual: boolean;
  favorite: boolean;
  memo: string;
};

export type StampRecord = { id: number; video_id: number; seconds: number; note: string };

export type Archive = {
  livers: Liver[];
  videos: VideoRecord[];
  timestamps: StampRecord[];
  nextId: { liver: number; video: number; stamp: number };
};

const DATABASE_NAME = "nijisanji-archive-local";
const STORE_NAME = "archive";
const STORAGE_KEY = "current";
let pendingDB: Promise<IDBDatabase> | undefined;

const emptyArchive = (): Archive => ({
  livers: [], videos: [], timestamps: [],
  nextId: { liver: 1, video: 1, stamp: 1 },
});

function normalizeCategories(data: Archive): boolean {
  let changed = false;
  for (const video of data.videos) {
    const storedCategory = video.category as string;
    const isLive = video.live_status !== "none" || video.yt_type === "live" || storedCategory === "live";
    const isShorts = video.yt_type === "shorts" || storedCategory === "shorts" || (!isLive && video.duration > 0 && video.duration <= 180 && /#shorts/i.test(video.title));

    if (!video.yt_type) {
      video.yt_type = isLive ? "live" : isShorts ? "shorts" : "video";
      changed = true;
    }

    let next: Category;
    if (video.category_manual) {
      next = (storedCategory === "other" ? "none"
        : storedCategory === "cover" || storedCategory === "karaoke" ? "song"
        : storedCategory) as Category;
    } else {
      next = classify(video.title, isLive, isShorts);
    }

    if (next !== video.category) {
      video.category = next;
      changed = true;
    }
  }
  return changed;
}

function openDatabase(): Promise<IDBDatabase> {
  if (pendingDB) return pendingDB;
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("이 브라우저에서는 기기 저장소를 사용할 수 없어요."));
  }
  pendingDB = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DATABASE_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error ?? new Error("기기 저장소를 열 수 없어요."));
    req.onblocked = () => reject(new Error("열려 있는 다른 탭을 닫고 다시 시도해 주세요."));
  }).catch((e: unknown) => {
    pendingDB = undefined;
    throw e;
  });
  return pendingDB!;
}

export async function readArchive(): Promise<Archive> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const req = store.get(STORAGE_KEY);
    let data: Archive;
    req.onsuccess = () => {
      data = (req.result as Archive | undefined) ?? emptyArchive();
      if (normalizeCategories(data)) store.put(data, STORAGE_KEY);
    };
    req.onerror = () => reject(req.error ?? new Error("기록을 불러올 수 없어요."));
    transaction.oncomplete = () => resolve(data);
    transaction.onerror = () => reject(transaction.error ?? new Error("기록을 불러올 수 없어요."));
  });
}

export async function modifyArchive<T>(fn: (archive: Archive) => T): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    let result!: T;
    let failed = false;
    const req = store.get(STORAGE_KEY);
    req.onsuccess = () => {
      try {
        const data = (req.result as Archive | undefined) ?? emptyArchive();
        normalizeCategories(data);
        result = fn(data);
        store.put(data, STORAGE_KEY);
      } catch (e) {
        failed = true;
        reject(e);
        transaction.abort();
      }
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => { if (!failed) reject(transaction.error ?? new Error("기록을 저장할 수 없어요.")); };
    transaction.onabort = () => { if (!failed) reject(transaction.error ?? new Error("저장이 취소됐어요.")); };
  });
}

async function replaceArchive(next: Archive): Promise<void> {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(next, STORAGE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("백업 복원에 실패했어요."));
    tx.onabort = () => reject(tx.error ?? new Error("백업 복원이 취소됐어요."));
  });
}

const validObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const positiveInt = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0;
const textField = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
const validDate = (v: unknown) => textField(v, 80) && !Number.isNaN(Date.parse(v as string));
const categories = ["song", "cover", "karaoke", "live", "shorts", "kirinuki", "none", "other"];
const liveStatuses: LiveStatus[] = ["none", "live", "upcoming"];

export async function exportArchive(): Promise<string> {
  const data = await readArchive();
  return JSON.stringify({
    format: "nijisanji-archive",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { livers: data.livers, videos: data.videos, timestamps: data.timestamps },
  }, null, 2);
}

export async function importArchive(raw: string): Promise<{ livers: number; videos: number; timestamps: number }> {
  let input: unknown;
  try { input = JSON.parse(raw); } catch { throw new Error("올바른 JSON 백업 파일이 아니에요."); }
  if (!validObject(input) || input.format !== "nijisanji-archive" || input.version !== 1 || !validObject(input.data)) {
    throw new Error("니지산지 아카이브 백업 파일(.json) 버전 1만 읽을 수 있어요.");
  }
  const source = input.data;
  const livers = source.livers;
  const videos = source.videos;
  const stamps = source.timestamps;
  if (!Array.isArray(livers) || !Array.isArray(videos) || !Array.isArray(stamps) ||
      livers.length > 10000 || videos.length > 100000 || stamps.length > 200000) {
    throw new Error("백업 파일의 데이터 형식이나 크기가 올바르지 않아요.");
  }

  const lIds = new Set<number>();
  for (const x of livers) {
    if (!validObject(x) || !positiveInt(x.id) || lIds.has(x.id) ||
      !textField(x.channel_id, 100) || !textField(x.name, 500) || !textField(x.avatar, 4000) ||
      !(x.last_fetched === null || validDate(x.last_fetched))) {
      throw new Error("백업의 라이버 정보가 올바르지 않아요.");
    }
    lIds.add(x.id);
  }
  const vIds = new Set<number>();
  for (const x of videos) {
    if (!validObject(x) || !positiveInt(x.id) || vIds.has(x.id) ||
      !positiveInt(x.liver_id) || !lIds.has(x.liver_id) ||
      !textField(x.youtube_id, 100) || !textField(x.title, 2000) || !validDate(x.published_at) ||
      typeof x.duration !== "number" || !Number.isFinite(x.duration) || x.duration < 0 ||
      !liveStatuses.includes(x.live_status as LiveStatus) || !categories.includes(x.category as string) ||
      typeof x.category_manual !== "boolean" || typeof x.favorite !== "boolean" ||
      !textField(x.memo, 20000)) {
      throw new Error("백업의 영상 정보가 올바르지 않아요.");
    }
    vIds.add(x.id);
  }
  const tIds = new Set<number>();
  for (const x of stamps) {
    if (!validObject(x) || !positiveInt(x.id) || tIds.has(x.id) ||
      !positiveInt(x.video_id) || !vIds.has(x.video_id) ||
      typeof x.seconds !== "number" || !Number.isSafeInteger(x.seconds) || x.seconds < 0 ||
      !textField(x.note, 500)) {
      throw new Error("백업의 타임스탬프 정보가 올바르지 않아요.");
    }
    tIds.add(x.id);
  }

  const largest = (ids: Set<number>) => {
    let max = 0;
    for (const id of ids) if (id > max) max = id;
    return max;
  };
  const next: Archive = {
    livers: livers as Liver[],
    videos: videos as VideoRecord[],
    timestamps: stamps as StampRecord[],
    nextId: {
      liver: largest(lIds) + 1,
      video: largest(vIds) + 1,
      stamp: largest(tIds) + 1,
    },
  };
  normalizeCategories(next);
  await replaceArchive(next);
  return { livers: livers.length, videos: videos.length, timestamps: stamps.length };
}
