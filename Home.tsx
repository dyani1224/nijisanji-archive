import { ChevronLeft, RefreshCw } from "lucide-react";
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
  const [showAllLivers, setShowAllLivers] = useState(false);
  const [key, setKey] = useState(0);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: livers, reload: reloadLivers } = useFetch(listLivers, [key]);

  const filter: Filter = {};
  if (selectedLiver) filter.liver = selectedLiver;
  if (chip !== "all") filter.category = chip;

  const list = useVideos(filter, key);

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

  if (showAllLivers) {
    return (
      <>
        <PageHead
          back={
            <button
              type="button"
              onClick={() => setShowAllLivers(false)}
              aria-label="홈으로 돌아가기"
              className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-ground-2"
            >
              <ChevronLeft size={24} />
            </button>
          }
          title="구독 채널 전체"
        >
          {selectedLiver && (
            <button
              type="button"
              onClick={() => {
                setSelectedLiver(null);
                setShowAllLivers(false);
              }}
              className="h-8 rounded-full border border-line px-3 text-xs font-medium text-ink-2 hover:bg-ground-2"
            >
              전체 영상 보기
            </button>
          )}
        </PageHead>

        <div className="px-4 pt-2 md:px-8">
          {!livers || livers.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-2">
              등록된 라이버가 없어요. 하단 <Link to="/livers" className="text-accent underline">라이버 탭</Link>에서 추가해 주세요.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {livers.map(l => {
                const ja = l.name_ja || l.name;
                const ko = l.name_ko || "";
                const isSelected = selectedLiver === l.id;
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLiver(isSelected ? null : l.id);
                        setShowAllLivers(false);
                      }}
                      className="flex w-full items-center gap-3.5 py-3.5 text-left hover:bg-ground-2/60"
                    >
                      <Avatar src={l.avatar} name={ja} size={52} isLive={l.is_live} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={`truncate text-base font-bold ${isSelected ? "text-accent" : "text-ink"}`}>
                            {ja}
                          </span>
                          {l.is_live && (
                            <span className="shrink-0 rounded bg-rose-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                              라이브 중
                            </span>
                          )}
                        </span>
                        {ko && <span className="mt-0.5 block truncate text-xs text-ink-2">{ko}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead title="Archive">
        <button type="button" onClick={refresh} disabled={busy} className="flex h-10 items-center gap-1.5 rounded-control border border-line px-3 text-sm hover:bg-ground-2 disabled:opacity-50">
          <RefreshCw size={16} className={busy ? "animate-spin" : ""} aria-hidden />새로고침
        </button>
      </PageHead>

      {livers && livers.length > 0 && (
        <div className="flex items-center border-b border-line bg-ground">
          <div className="flex flex-1 gap-3 overflow-x-auto px-4 py-3 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {livers.map(l => {
              const selected = selectedLiver === l.id;
              const displayName = l.name_ja || l.name;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSelectedLiver(selected ? null : l.id)}
                  className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center"
                >
                  <span
                    className={`inline-flex shrink-0 items-center justify-center rounded-full p-0.5 transition ${
                      selected ? "ring-2 ring-accent" : ""
                    }`}
                  >
                    <Avatar src={l.avatar} name={displayName} size={52} isLive={l.is_live} />
                  </span>
                  <span className={`w-full truncate text-xs ${selected ? "font-semibold text-accent" : "text-ink-2"}`}>
                    {displayName}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setShowAllLivers(true)}
            className="shrink-0 self-stretch flex items-center border-l border-line/60 bg-ground px-4 text-sm font-medium text-accent hover:bg-ground-2"
          >
            전체
          </button>
        </div>
      )}

      <div className="px-4 pt-3 md:px-8">
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
