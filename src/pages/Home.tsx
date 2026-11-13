import { RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Avatar, Chips, PageHead, VideoList } from "../components/ui";
import { errText, listLivers, refreshLivers, useFetch, useVideos, type Category, type Filter } from "../lib/client";

type FilterChip = "all" | Exclude<Category, "none">;

const CHIPS: [FilterChip, string][] = [
  ["all", "전체"],
  ["song", "노래"],
  ["live", "라이브"],
  ["shorts", "Shorts"],
  ["kirinuki", "키리누키"],
];

export default function Home() {
  const [chip, setChip] = useState<FilterChip>("all");
  const [selectedLiver, setSelectedLiver] = useState<number | null>(null);
  const [key, setKey] = useState(0);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: livers, reload: reloadLivers } = useFetch(listLivers, [key]);

  const filter: Filter = {};
  if (selectedLiver) filter.liver = selectedLiver;
  if (chip !== "all") filter.category = chip;

  const list = useVideos(filter, key);
  const activeLiver = livers?.find(l => l.id === selectedLiver);

  const refresh = async () => {
    setBusy(true);
    setStatus("");
    try {
      const rows = await listLivers();
      if (!rows.length) { setStatus("등록된 라이버가 없어요"); return; }
      const r = await refreshLivers(rows, (d, t) => setStatus(`새로고침 중 ${d}/${t}`));
      setStatus(`새 영상 ${r.added}개${r.failed.length ? `, 실패: ${r.failed.join(", ")}` : ""}`);
      setKey(k => k + 1);
      reloadLivers();
    } catch (e) { setStatus(errText(e)); }
    setBusy(false);
  };

  return (
    <>
      <PageHead title="최근 업데이트">
        <button type="button" onClick={refresh} disabled={busy} className="flex h-10 items-center gap-1.5 rounded-control border border-line px-3 text-sm hover:bg-ground-2 disabled:opacity-50">
          <RefreshCw size={16} className={busy ? "animate-spin" : ""} aria-hidden />새로고침
        </button>
      </PageHead>

      {/* 유튜브 구독 상단 라이버 가로 스크롤 + 전체 버튼 */}
      {livers && livers.length > 0 && (
        <div className="flex items-center border-b border-line bg-ground">
          <div className="flex flex-1 gap-3 overflow-x-auto px-4 py-3 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {livers.map(l => {
              const selected = selectedLiver === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSelectedLiver(selected ? null : l.id)}
                  className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center"
                >
                  <span className={`rounded-full p-0.5 transition ${selected ? "ring-2 ring-accent" : ""}`}>
                    <Avatar src={l.avatar} name={l.name} size={52} isLive={l.is_live} />
                  </span>
                  <span className={`w-full truncate text-xs ${selected ? "font-semibold text-accent" : "text-ink-2"}`}>
                    {l.name}
                  </span>
                </button>
              );
            })}
          </div>
          <Link
            to="/livers"
            className="shrink-0 self-stretch flex items-center border-l border-line/60 bg-ground px-4 text-sm font-medium text-accent hover:bg-ground-2"
          >
            전체
          </Link>
        </div>
      )}

      <div className="px-4 pt-3 md:px-8">
        {activeLiver && (
          <div className="mb-3 flex items-center justify-between rounded-control bg-ground-2 px-3 py-2 text-sm">
            <span className="truncate font-medium text-ink">
              {activeLiver.name} 기록만 보는 중
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <Link to={`/livers/${activeLiver.id}`} className="text-xs font-medium text-accent hover:underline">
                채널 홈 →
              </Link>
              <button
                type="button"
                onClick={() => setSelectedLiver(null)}
                aria-label="필터 해제"
                className="grid h-7 w-7 place-items-center rounded-full text-ink-2 hover:bg-ground"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        <Chips value={chip} options={CHIPS} onChange={setChip} />
        {status && <p role="status" className="mt-3 text-sm text-ink-2">{status}</p>}
        <VideoList
          {...list}
          showLiver={!selectedLiver}
          onFavorite={list.toggleFavorite}
          onMore={list.loadMore}
          empty={<>아직 영상이 없어요. <Link to="/livers" className="text-accent underline">라이버 탭</Link>에서 채널을 등록해 주세요.</>}
        />
      </div>
    </>
  );
}
