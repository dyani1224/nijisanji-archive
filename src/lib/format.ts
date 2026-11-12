// 한국어 표기 한 곳: 2026년 11월 21일 (토), 11월 21일 (토) 14:30, 15,000원.
import { WEEKDAYS } from "./settings";

const asDate = (v: string | Date) => (v instanceof Date ? v : /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : new Date(v));

export const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

export function dateKo(v: string | Date) {
  const d = asDate(v);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

export function dateTimeKo(v: string | Date) {
  const d = asDate(v);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${sameYear ? "" : `${d.getFullYear()}년 `}${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]}) ${hm}`;
}

/** 로컬 날짜 키 YYYY-MM-DD. 「YYYY-MM-DD」 문자열은 그대로, ISO 시각은 이 브라우저의 날짜로. */
export function dayKey(v: string | Date) {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = asDate(v);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
