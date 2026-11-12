import { Heart } from "lucide-react";
import { Link } from "react-router";
import { ago, clock } from "../lib/format";
import { CATEGORY_LABEL, type Category, type VideoItem } from "../lib/client";

const BADGE: Record<Category, string> = {
  cover: "bg-indigo-50 text-indigo-800",
  karaoke: "bg-emerald-50 text-emerald-800",
  live: "bg-sky-50 text-sky-800",
  other: "bg-ground-2 text-ink-2",
};

export const CategoryBadge = ({ value }: { value: Category }) => (
  <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${BADGE[value]}`}>{CATEGORY_LABEL[value]}</span>
);

export const thumbUrl = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

export function Avatar({ src, name, size = 32 }: { src: string; name: string; size?: number }) {
  return src ? (
    <img src={src} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" className="shrink-0 rounded-full bg-ground-2 object-cover" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full bg-ground-2 text-xs font-semibold text-ink-2" style={{ width: size, height: size }}>{name.slice(0, 1)}</span>
  );
}

export function HeartButton({ on, onClick, size = 20 }: { on: boolean; onClick: () => void; size?: number }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={on ? "즐겨찾기 해제" : "즐겨찾기에 추가"} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-ground-2">
      <Heart size={size} className={on ? "fill-rose-500 text-rose-500" : ""} />
    </button>
  );
}

export function Chips<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {options.map(([k, label]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}
          className={`h-9 rounded-full border px-3.5 text-sm ${value === k ? "border-accent bg-accent text-on-accent" : "border-line text-ink-2 hover:bg-ground-2"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function VideoRow({ v, showLiver = true, onFavorite }: { v: VideoItem; showLiver?: boolean; onFavorite: (v: VideoItem) => void }) {
  const status = v.live_status === "live" ? "라이브 중" : v.live_status === "upcoming" ? "예정" : "";
  return (
    <li className="flex gap-3 py-3">
      <Link to={`/video/${v.id}`} className="relative block w-[42%] max-w-[180px] shrink-0 self-start">
        <img src={thumbUrl(v.youtube_id)} alt="" loading="lazy" className="aspect-video w-full rounded-media bg-ground-2 object-cover" />
        {v.duration > 0 && <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[11px] text-white">{clock(v.duration)}</span>}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link to={`/video/${v.id}`} className="line-clamp-2 text-[15px] font-medium leading-snug text-ink [word-break:keep-all]">{v.title}</Link>
        {showLiver && (
          <Link to={`/livers/${v.liver_id}`} className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-2">
            <Avatar src={v.liver_avatar} name={v.liver_name} size={18} />
            <span className="truncate">{v.liver_name}</span>
          </Link>
        )}
        <div className="mt-auto flex items-center gap-2 pt-1.5 text-xs text-ink-3">
          <CategoryBadge value={v.category} />
          {status && <span className="font-medium text-rose-600">{status}</span>}
          <span>{ago(v.published_at)}</span>
          {(v.ts_count > 0 || v.has_memo > 0) && (
            <span className="truncate">{[v.ts_count > 0 && `타임스탬프 ${v.ts_count}`, v.has_memo > 0 && "메모"].filter(Boolean).join(" ")}</span>
          )}
          <span className="ml-auto -mr-2 -mb-2"><HeartButton on={!!v.favorite} onClick={() => onFavorite(v)} size={18} /></span>
        </div>
      </div>
    </li>
  );
}

export function VideoList({ rows, more, loading, error, showLiver, onFavorite, onMore, empty }: {
  rows: VideoItem[]; more: boolean; loading: boolean; error: string; showLiver?: boolean;
  onFavorite: (v: VideoItem) => void; onMore: () => void; empty: React.ReactNode;
}) {
  return (
    <div>
      {error && <p role="alert" className="py-3 text-sm text-danger">{error}</p>}
      {!loading && !error && rows.length === 0 && <div className="py-12 text-center text-sm text-ink-2">{empty}</div>}
      <ul className="divide-y divide-line lg:grid lg:grid-cols-2 lg:gap-x-8 lg:divide-y-0">
        {rows.map(v => <VideoRow key={v.id} v={v} showLiver={showLiver} onFavorite={onFavorite} />)}
      </ul>
      {loading && <p className="py-6 text-center text-sm text-ink-3">불러오는 중</p>}
      {more && !loading && <button type="button" onClick={onMore} className="mx-auto mt-2 block h-11 rounded-control border border-line px-6 text-sm hover:bg-ground-2">더 보기</button>}
    </div>
  );
}

export function PageHead({ title, children, back }: { title: React.ReactNode; children?: React.ReactNode; back?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex min-h-14 items-center gap-2 border-b border-line bg-ground/95 px-4 backdrop-blur md:px-8">
      {back}
      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
      {children}
    </header>
  );
}
