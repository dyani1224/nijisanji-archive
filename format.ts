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
