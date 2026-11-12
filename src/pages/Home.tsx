import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Chips, PageHead, VideoList } from "../components/ui";
import { errText, listLivers, refreshLivers, useVideos } from "../lib/client";

const TABS: ["all" | "song" | "live", string][] = [["all", "전체"], ["song", "노래"], ["live", "라이브"]];

export default function Home() {
  const [tab, setTab] = useState<"all" | "song" | "live">("all");
  const [key, setKey] = useState(0);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useVideos(tab === "all" ? {} : { tab }, key);

  const refresh = async () => {
    setBusy(true);
    setStatus("");
    try {
      const rows = await listLivers();
      if (!rows.length) { setStatus("등록된 라이버가 없어요"); return; }
      const r = await refreshLivers(rows, (d, t) => setStatus(`새로고침 중 ${d}/${t}`));
      setStatus(`새 영상 ${r.added}개${r.failed.length ? `, 실패: ${r.failed.join(", ")}` : ""}`);
      setKey(k => k + 1);
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
      <div className="px-4 pt-3 md:px-8">
        <Chips value={tab} options={TABS} onChange={setTab} />
        {status && <p role="status" className="mt-3 text-sm text-ink-2">{status}</p>}
        <VideoList {...list} onFavorite={list.toggleFavorite} onMore={list.loadMore}
          empty={<>아직 영상이 없어요. <Link to="/livers" className="text-accent underline">라이버 탭</Link>에서 채널을 등록해 주세요.</>} />
      </div>
    </>
  );
}
