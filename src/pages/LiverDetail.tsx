import { ChevronLeft, ExternalLink, ListVideo, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Avatar, Chips, PageHead, VideoList } from "../components/ui";
import { deleteLiver, errText, type Category, type Filter, getLiver, refreshLivers, useFetch, useVideos } from "../lib/client";

type YtTab = "video" | "shorts" | "live" | "playlists";
type SubFilter = "all" | "song" | "kirinuki";

const TABS: [YtTab, string][] = [
  ["video", "동영상"],
  ["shorts", "Shorts"],
  ["live", "라이브"],
  ["playlists", "재생목록"],
];

const SUB_CHIPS: [SubFilter, string][] = [
  ["all", "전체"],
  ["song", "노래"],
  ["kirinuki", "키리누키"],
];

export default function LiverDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { data: liver, error, reload } = useFetch(() => getLiver(Number(id)), [id]);
  const [tab, setTab] = useState<YtTab>("video");
  const [sub, setSub] = useState<SubFilter>("all");
  const [key, setKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const params: Filter = { liver: Number(id) };
  if (tab !== "playlists") {
    params.ytType = tab;
    if (sub !== "all") params.category = sub as Category;
  }
  const list = useVideos(params, key);

  const refresh = async () => {
    if (!liver) return;
    setBusy(true);
    setStatus("");
    const r = await refreshLivers([liver]);
    setStatus(r.failed.length ? "가져오지 못했어요. 잠시 뒤 다시 눌러 주세요" : `새 영상 ${r.added}개`);
    setKey(k => k + 1);
    reload();
    setBusy(false);
  };

  const remove = async () => {
    if (!liver || !confirm(`${liver.name}과(와) 이 라이버의 영상, 즐겨찾기, 메모, 타임스탬프를 모두 삭제할까요?`)) return;
    try { await deleteLiver(liver.id); nav("/livers"); } catch (e) { setStatus(errText(e)); }
  };

  const switchTab = (t: YtTab) => {
    setTab(t);
    setSub("all");
  };

  return (
    <>
      <PageHead
        back={<Link to="/" aria-label="홈으로" className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-ground-2"><ChevronLeft size={24} /></Link>}
        title={<span className="flex items-center gap-2">{liver && <Avatar src={liver.avatar} name={liver.name} size={28} isLive={liver.is_live} />}<span className="truncate">{liver?.name ?? ""}</span></span>}>
        {liver && (
          <>
            <a href={`https://www.youtube.com/channel/${liver.channel_id}`} target="_blank" rel="noreferrer" aria-label="유튜브 채널 열기" className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-ground-2"><ExternalLink size={18} /></a>
            <button type="button" onClick={refresh} disabled={busy} aria-label="새로고침" className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-ground-2 disabled:opacity-50"><RefreshCw size={18} className={busy ? "animate-spin" : ""} /></button>
            <button type="button" onClick={remove} aria-label="라이버 삭제" className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-ground-2"><Trash2 size={18} /></button>
          </>
        )}
      </PageHead>
      {error && <p role="alert" className="px-4 pt-4 text-sm text-danger md:px-8">{error}</p>}

      {/* 유튜브 채널 탭: 동영상 / Shorts / 라이브 / 재생목록 */}
      <div className="flex overflow-x-auto border-b border-line px-4 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => switchTab(k)}
            className={`h-12 shrink-0 flex-1 border-b-2 px-4 text-sm font-medium md:flex-none md:px-7 ${tab === k ? "border-accent text-accent" : "border-transparent text-ink-3"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-3 md:px-8">
        {status && <p role="status" className="mb-3 text-sm text-ink-2">{status}</p>}

        {tab === "playlists" ? (
          <div>
            {!liver?.playlists || liver.playlists.length === 0 ? (
              <p className="py-12 text-center text-sm text-ink-2">
                불러온 재생목록이 없어요. 우측 상단 새로고침 버튼을 눌러 채널 재생목록을 가져와 보세요.
              </p>
            ) : (
              <ul className="divide-y divide-line lg:grid lg:grid-cols-2 lg:gap-x-8 lg:divide-y-0">
                {liver.playlists.map(pl => (
                  <li key={pl.id} className="py-3">
                    <a
                      href={`https://www.youtube.com/playlist?list=${pl.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex gap-3"
                    >
                      <div className="relative w-[42%] max-w-[180px] shrink-0">
                        {pl.thumbnail ? (
                          <img src={pl.thumbnail} alt="" loading="lazy" className="aspect-video w-full rounded-media bg-ground-2 object-cover" />
                        ) : (
                          <div className="grid aspect-video w-full place-items-center rounded-media bg-ground-2 text-ink-3">
                            <ListVideo size={24} />
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 text-[11px] text-white">
                          <ListVideo size={12} /> {pl.itemCount}개
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <p className="line-clamp-2 text-[15px] font-medium leading-snug text-ink [word-break:keep-all]">{pl.title}</p>
                        <span className="mt-1.5 text-xs text-ink-3">유튜브 재생목록 열기 ↗</span>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            {(tab === "video" || tab === "live") && (
              <div className="mb-1">
                <Chips value={sub} options={SUB_CHIPS} onChange={setSub} />
              </div>
            )}
            <VideoList
              {...list}
              showLiver={false}
              onFavorite={list.toggleFavorite}
              onMore={list.loadMore}
              empty="해당하는 영상이 없어요. 우측 상단 새로고침 버튼을 눌러 최신 목록을 불러와 보세요."
            />
          </>
        )}
      </div>
    </>
  );
}
