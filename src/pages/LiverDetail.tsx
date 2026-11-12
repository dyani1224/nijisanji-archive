import { ChevronLeft, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Avatar, Chips, PageHead, VideoList } from "../components/ui";
import { deleteLiver, errText, type Filter, getLiver, refreshLivers, useFetch, useVideos } from "../lib/client";

type Tab = "song" | "live";
const SONG: [string, string][] = [["", "전체"], ["cover", "커버"], ["karaoke", "가라오케"]];
const LIVE: [string, string][] = [["", "라이브"], ["other", "기타"]];

export default function LiverDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { data: liver, error, reload } = useFetch(() => getLiver(Number(id)), [id]);
  const [tab, setTab] = useState<Tab>("song");
  const [sub, setSub] = useState("");
  const [key, setKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const params: Filter = { liver: Number(id) };
  if (sub) params.category = sub;
  else if (tab === "song") params.tab = "song";
  else params.category = "live";
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
  const switchTab = (t: Tab) => { setTab(t); setSub(""); };

  return (
    <>
      <PageHead
        back={<Link to="/livers" aria-label="라이버 목록" className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-ground-2"><ChevronLeft size={24} /></Link>}
        title={<span className="flex items-center gap-2">{liver && <Avatar src={liver.avatar} name={liver.name} size={28} />}<span className="truncate">{liver?.name ?? ""}</span></span>}>
        {liver && (
          <>
            <a href={`https://www.youtube.com/channel/${liver.channel_id}`} target="_blank" rel="noreferrer" aria-label="유튜브 채널 열기" className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-ground-2"><ExternalLink size={18} /></a>
            <button type="button" onClick={refresh} disabled={busy} aria-label="새로고침" className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-ground-2 disabled:opacity-50"><RefreshCw size={18} className={busy ? "animate-spin" : ""} /></button>
            <button type="button" onClick={remove} aria-label="라이버 삭제" className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-ground-2"><Trash2 size={18} /></button>
          </>
        )}
      </PageHead>
      {error && <p role="alert" className="px-4 pt-4 text-sm text-danger md:px-8">{error}</p>}
      <div className="flex border-b border-line px-4 md:px-8" role="tablist">
        {([["song", "노래"], ["live", "라이브"]] as [Tab, string][]).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => switchTab(k)}
            className={`h-12 flex-1 border-b-2 text-sm font-medium md:flex-none md:px-8 ${tab === k ? "border-accent text-accent" : "border-transparent text-ink-3"}`}>{label}</button>
        ))}
      </div>
      <div className="px-4 pt-3 md:px-8">
        <Chips value={sub} options={tab === "song" ? SONG : LIVE} onChange={setSub} />
        {status && <p role="status" className="mt-3 text-sm text-ink-2">{status}</p>}
        <VideoList {...list} showLiver={false} onFavorite={list.toggleFavorite} onMore={list.loadMore}
          empty={tab === "song" ? "분류된 노래 영상이 없어요. 새로고침하거나 영상의 분류를 직접 바꿔 보세요." : "해당하는 영상이 없어요."} />
      </div>
    </>
  );
}
