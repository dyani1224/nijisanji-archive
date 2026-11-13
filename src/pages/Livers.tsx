import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Avatar, PageHead } from "../components/ui";
import { addLiver, errText, listLivers, useFetch } from "../lib/client";
import { ago } from "../lib/format";

export default function Livers() {
  const { data, error, loading, reload } = useFetch(listLivers, []);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [fail, setFail] = useState("");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setFail("");
    try {
      const r = await addLiver(url);
      setUrl("");
      setMsg(`${r.row.name} 등록 완료. 영상 ${r.added}개를 가져왔어요.${r.warning ? ` (${r.warning})` : ""}`);
      reload();
    } catch (err) { setFail(errText(err)); }
    setBusy(false);
  };

  return (
    <>
      <PageHead
        back={<Link to="/" aria-label="홈으로" className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-ground-2"><ChevronLeft size={24} /></Link>}
        title="전체 라이버"
      />
      <div className="px-4 pt-4 md:px-8">
        <form onSubmit={add}>
          <label htmlFor="url" className="text-sm text-ink-2">유튜브 채널 링크</label>
          <div className="mt-1.5 flex gap-2">
            <input id="url" value={url} onChange={e => setUrl(e.target.value)} inputMode="url" placeholder="https://www.youtube.com/@..."
              className="h-control min-w-0 flex-1 rounded-control border border-line-strong bg-field px-3" />
            <button type="submit" disabled={!url.trim() || busy} className="h-control shrink-0 rounded-control bg-accent px-4 font-medium text-on-accent disabled:opacity-40">{busy ? "가져오는 중" : "등록"}</button>
          </div>
          {fail && <p role="alert" className="mt-2 text-sm text-danger">{fail}</p>}
          {msg && <p role="status" className="mt-2 text-sm text-ink-2">{msg}</p>}
        </form>
        {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
        {loading && !data && <p className="py-6 text-sm text-ink-3">불러오는 중</p>}
        {data && data.length === 0 && <p className="py-12 text-center text-sm text-ink-2">등록된 라이버가 없어요. 채널 링크를 붙여 넣어 주세요.</p>}
        <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
          {data?.map(l => (
            <li key={l.id} className="border-b border-line">
              <Link to={`/livers/${l.id}`} className="flex items-center gap-3 py-3">
                <Avatar src={l.avatar} name={l.name} size={48} isLive={l.is_live} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{l.name}</span>
                    {l.is_live && (
                      <span className="shrink-0 rounded bg-rose-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                        라이브 중
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-ink-3">영상 {l.video_count ?? 0}개{l.last_fetched ? `, 갱신 ${ago(l.last_fetched)}` : ""}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
