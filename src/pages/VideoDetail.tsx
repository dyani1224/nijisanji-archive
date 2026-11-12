import { ChevronLeft, ExternalLink, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import Player, { type PlayerHandle } from "../components/Player";
import { Avatar, HeartButton, PageHead } from "../components/ui";
import { createStamp, CATEGORY_LABEL, deleteStamp, errText, getVideo, updateStamp, updateVideo, useFetch, type Category, type Stamp } from "../lib/client";
import { clock, dateKo, parseClock } from "../lib/format";

export default function VideoDetail() {
  const { id = "" } = useParams();
  const { data, error } = useFetch(() => getVideo(Number(id)), [id]);
  const player = useRef<PlayerHandle>(null);
  const [category, setCategory] = useState<Category>("other");
  const [fav, setFav] = useState(false);
  const [memo, setMemo] = useState("");
  const [memoState, setMemoState] = useState("");
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!data) return;
    setCategory(data.row.category); setFav(!!data.row.favorite); setMemo(data.row.memo); setStamps(data.timestamps);
  }, [data]);

  if (error) return <p role="alert" className="p-6 text-sm text-danger">{error}</p>;
  if (!data) return <p className="p-6 text-sm text-ink-3">불러오는 중</p>;
  const v = data.row;

  const changeCategory = async (c: Category) => {
    const prev = category; setCategory(c);
    try { await updateVideo(v.id, { category: c }); } catch (e) { setCategory(prev); setMsg(errText(e)); }
  };
  const toggleFav = async () => {
    const next = !fav; setFav(next);
    try { await updateVideo(v.id, { favorite: next }); } catch (e) { setFav(!next); setMsg(errText(e)); }
  };
  const saveMemo = async () => {
    if (memo === v.memo) { setMemoState("저장했어요"); return; }
    setMemoState("저장 중");
    try { await updateVideo(v.id, { memo }); v.memo = memo; setMemoState("저장했어요"); } catch (e) { setMemoState(errText(e)); }
  };
  const addStamp = async (e: React.FormEvent) => {
    e.preventDefault();
    const sec = parseClock(time);
    if (sec === null) { setMsg("시간은 12:34 또는 1:02:03 형식으로 적어 주세요"); return; }
    try {
      const row = await createStamp(v.id, sec, note);
      setStamps(s => [...s, row].sort((a, b) => a.seconds - b.seconds || a.id - b.id));
      setTime(""); setNote(""); setMsg("");
    } catch (err) { setMsg(errText(err)); }
  };
  const editNote = async (s: Stamp, text: string) => {
    if (text === s.note) return;
    try { await updateStamp(s.id, text); setStamps(list => list.map(x => (x.id === s.id ? { ...x, note: text } : x))); }
    catch (e) { setMsg(errText(e)); }
  };
  const removeStamp = async (s: Stamp) => {
    try { await deleteStamp(s.id); setStamps(list => list.filter(x => x.id !== s.id)); } catch (e) { setMsg(errText(e)); }
  };

  return (
    <>
      <PageHead
        back={<Link to={`/livers/${v.liver_id}`} aria-label="라이버 페이지" className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-ground-2"><ChevronLeft size={24} /></Link>}
        title={v.liver_name} />
      <div className="md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-8 md:px-8 md:pt-4">
        <div>
          <Player videoId={v.youtube_id} handle={player} />
          <div className="px-4 pt-3 md:px-0">
            <h2 className="text-base font-semibold leading-snug [word-break:keep-all]">{v.title}</h2>
            <div className="mt-2 flex items-center gap-2 text-sm text-ink-2">
              <Avatar src={v.liver_avatar} name={v.liver_name} size={20} />
              <span className="min-w-0 flex-1 truncate">{v.liver_name}, {dateKo(v.published_at)}</span>
              <a href={`https://www.youtube.com/watch?v=${v.youtube_id}`} target="_blank" rel="noreferrer" aria-label="유튜브에서 열기" className="grid h-10 w-10 place-items-center rounded-full hover:bg-ground-2"><ExternalLink size={18} /></a>
              <HeartButton on={fav} onClick={toggleFav} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label="분류">
              {(Object.keys(CATEGORY_LABEL) as Category[]).map(c => (
                <button key={c} type="button" aria-pressed={category === c} onClick={() => changeCategory(c)}
                  className={`h-9 rounded-full border px-3.5 text-sm ${category === c ? "border-accent bg-accent text-on-accent" : "border-line text-ink-2 hover:bg-ground-2"}`}>{CATEGORY_LABEL[c]}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 pt-6 md:px-0 md:pt-0">
          <h3 className="text-sm font-semibold">타임스탬프</h3>
          <form onSubmit={addStamp} className="mt-2 flex flex-wrap gap-2">
            <input value={time} onChange={e => setTime(e.target.value)} aria-label="시간" placeholder="12:34" inputMode="numeric"
              className="h-control w-24 rounded-control border border-line-strong bg-field px-3 tabular-nums" />
            <button type="button" onClick={() => setTime(clock(player.current?.time() ?? 0))} className="h-control rounded-control border border-line px-3 text-sm hover:bg-ground-2">현재 위치</button>
            <input value={note} onChange={e => setNote(e.target.value)} aria-label="메모" placeholder="메모" maxLength={500}
              className="h-control min-w-0 flex-1 basis-40 rounded-control border border-line-strong bg-field px-3" />
            <button type="submit" disabled={!time.trim()} className="h-control rounded-control bg-accent px-4 font-medium text-on-accent disabled:opacity-40">추가</button>
          </form>
          {msg && <p role="alert" className="mt-2 text-sm text-danger">{msg}</p>}
          {stamps.length === 0 && <p className="mt-3 text-sm text-ink-3">기록한 타임스탬프가 없어요.</p>}
          <ul className="mt-1 divide-y divide-line">
            {stamps.map(s => (
              <li key={s.id} className="flex items-center gap-2 py-1.5">
                <button type="button" onClick={() => player.current?.seek(s.seconds)} className="h-10 w-16 shrink-0 rounded-control text-left font-medium tabular-nums text-accent hover:underline">{clock(s.seconds)}</button>
                <input defaultValue={s.note} aria-label={`${clock(s.seconds)} 메모`} maxLength={500} onBlur={e => editNote(s, e.target.value.trim())}
                  className="h-10 min-w-0 flex-1 rounded-control border border-transparent bg-transparent px-2 hover:border-line focus:border-line-strong" />
                <button type="button" onClick={() => removeStamp(s)} aria-label="삭제" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-ground-2"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>

          <h3 className="mt-6 text-sm font-semibold">감상 메모</h3>
          <textarea value={memo} onChange={e => { setMemo(e.target.value); setMemoState(""); }} onBlur={saveMemo} rows={6} aria-label="감상 메모"
            className="mt-2 w-full rounded-control border border-line-strong bg-field p-3 leading-relaxed" />
          <div className="mt-2 flex items-center gap-3">
            <button type="button" onClick={saveMemo} className="h-control rounded-control border border-line px-4 text-sm hover:bg-ground-2">저장</button>
            <span role="status" className="text-sm text-ink-2">{memoState}</span>
          </div>
        </div>
      </div>
    </>
  );
}
