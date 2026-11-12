// 화면에서 /api 를 부르는 한 곳. /api 가 없는 곳(정적 데모, 갤러리 미리보기)에서는 demo=true 인
// 오류를 던지고, 각 기능은 이를 받아 브라우저 저장소로 대신한다(새로고침 전까지 유지되는 데모).

export class ApiError extends Error {
  constructor(message: string, public status: number, public demo = false) { super(message); }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let r: Response;
  try {
    r = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
  } catch {
    throw new ApiError("네트워크에 연결할 수 없어요", 0, true);
  }
  const isJson = (r.headers.get("content-type") ?? "").includes("json");
  if (!isJson) throw new ApiError("서버가 없는 미리보기예요", r.status, true);
  const body = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new ApiError(body.error ?? `요청이 실패했어요 (${r.status})`, r.status);
  return body;
}

export const isDemo = (e: unknown) => e instanceof ApiError && e.demo;

/** 데모 모드 저장소. localStorage 가 막힌 브라우저에서도 메모리로 동작한다. */
const memory = new Map<string, string>();
export const demoStore = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(`demo.${key}`) ?? memory.get(key);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch { return fallback; }
  },
  set(key: string, value: unknown) {
    const v = JSON.stringify(value);
    memory.set(key, v);
    try { localStorage.setItem(`demo.${key}`, v); } catch { /* 저장소가 막혀 있으면 메모리만 */ }
  },
};
