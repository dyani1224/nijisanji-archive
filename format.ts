export function clock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = String(m).padStart(2, "0"), rr = String(r).padStart(2, "0");
  return h ? `${h}:${mm}:${rr}` : `${m}:${rr}`;
}

/** "12:34", "1:02:03", "754" → 초. 알 수 없으면 null. */
export function parseClock(text: string) {
  const t = text.trim();
  if (!/^\d+(:\d{1,2}){0,2}$/.test(t)) return null;
  const parts = t.split(":").map(Number);
  if (parts.length > 1 && parts.slice(1).some(n => n > 59)) return null;
  return parts.reduce((a, n) => a * 60 + n, 0);
}

/** 줄바꿈·스페이스 등 공백만으로 나열한 mm:ss / h:mm:ss 목록을 초 단위로 변환한다. */
export function parseTimestampList(text: string) {
  // 모바일/웹에서 복사할 때 섞일 수 있는 zero-width 문자를 먼저 제거한다.
  const normalized = text.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  // 줄바꿈/스페이스만으로도 구분되며, 기존 쉼표 구분 입력도 선택적으로 허용한다.
  const tokens = normalized ? normalized.split(/[\s,;，；|/]+/).filter(Boolean) : [];
  const seconds: number[] = [];
  const invalid: string[] = [];

  for (const token of tokens) {
    if (!/^\d+:\d{1,2}(?::\d{1,2})?$/.test(token)) {
      invalid.push(token);
      continue;
    }
    const parsed = parseClock(token);
    if (parsed === null) invalid.push(token);
    else seconds.push(parsed);
  }

  return { seconds, invalid };
}

export function dateKo(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return dateKo(iso);
  const h = diff / 36e5;
  if (h < 1) return `${Math.max(1, Math.floor(diff / 6e4))}분 전`;
  if (h < 24) return `${Math.floor(h)}시간 전`;
  if (h < 24 * 7) return `${Math.floor(h / 24)}일 전`;
  return dateKo(iso);
}
