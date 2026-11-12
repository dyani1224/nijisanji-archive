// 소유자 토큰과 소유자 API 호출. 토큰은 /admin#k=<ADMIN_TOKEN> 의 # 뒤에서 한 번 읽어 이 탭(sessionStorage)에만
// 두고 주소에서는 지운다. 헤더에는 encodeURIComponent 로 싣는다 — 한글 비밀번호는 헤더 값에 그대로 못 넣고,
// Worker 의 bearerToken() 이 되돌린다(README 규칙 3). 직접 fetch 할 때도 ownerHeaders() 를 쓴다.
import { api } from "../lib/api";

const KEY = "owner.token";
const read = () => { try { return sessionStorage.getItem(KEY) ?? ""; } catch { return ""; } };

export function ownerToken(): string {
  const m = location.hash.match(/k=([^&]+)/);
  if (m) {
    setOwnerToken(decodeURIComponent(m[1]));
    history.replaceState(null, "", location.pathname + location.search);
  }
  return read();
}
export function setOwnerToken(token: string) { try { sessionStorage.setItem(KEY, token); } catch { /* 탭 저장소가 막혀도 이번 호출은 된다 */ } }
export function clearOwnerToken() { try { sessionStorage.removeItem(KEY); } catch { /* 없음 */ } }

export const ownerHeaders = (): Record<string, string> => ({ authorization: `Bearer ${encodeURIComponent(ownerToken())}` });

export const ownerApi = <T,>(path: string, init: RequestInit = {}) =>
  api<T>(path, { ...init, headers: { ...ownerHeaders(), ...(init.headers ?? {}) } });

/** 서버가 만든 CSV(worker/lib.ts 의 csv())를 내려받는다. 화면에 보이는 행만 받으려면 RecordList 의 CSV 버튼을 쓴다. */
export async function downloadCsv(path: string, filename: string) {
  const r = await fetch(path, { headers: ownerHeaders() });
  if (!r.ok) throw new Error("내려받지 못했어요");
  saveBlob(await r.blob(), filename);
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
