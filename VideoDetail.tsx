import { ChevronLeft, Clock3, ExternalLink, ListPlus, Play, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import Player, { type PlayerHandle } from "../components/Player";
import { Avatar, HeartButton, PageHead } from "../components/ui";
import { ASSIGNABLE_CATEGORIES, createStamps, CATEGORY_LABEL, deleteStamp, errText, getVideo, updateStamp, updateVideo, useFetch, type Category, type Stamp } from "../lib/client";
import { clock, dateKo, parseTimestampList } from "../lib/format";

export default function VideoDetail() {
  const { id = "" } = useParams();
  const { data, error } = useFetch(() => getVideo(Number(id)), [id]);
  const player = useRef<PlayerHandle>(null);
  const [category, setCategory] = useState<Category>("none");
  const [fav, setFav] = useState(false);
  const [memo, setMemo] = useState("");
  const [memoState, setMemoState] = useState("");
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [time, setTime] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!data) return;
    setCategory(data.row.category); setFav(!!data.row.favorite); setMemo(data.row.memo); setStamps(data.timestamps);
  }, [data]);

  const parsed = useMemo(() => parseTimestampList(time), [time]);
  const existingSeconds = useMemo(() => new Set(stamps.map(s => s.seconds)), [stamps]);
  const readySeconds = useMemo(
    () => [...new Set(parsed.seconds)].filter(seconds => !existingSeconds.has(seconds)),
    [parsed.seconds, existingSeconds],
  );

  if (error) return <p role="alert" className="p-6 text-sm text-danger">{error}</p>;
  if (!data) return <p className="p-6 text-sm text-ink-3">불러오는 중</p>;
  const v = data.row;

  const toggleCategory = async (c: Exclude<Category, "none">) => {
    const prev = category;
    const next: Category = category === c ? "none" : c;
    setCategory(next);
    try { await updateVideo(v.id, { category: next }); } catch (e) { setCategory(prev); setMsg(errText(e)); }
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
  const addStamps = async () => {
    if (!readySeconds.length || bulkSaving) return;
    const duplicateCount = parsed.seconds.length - readySeconds.length;
    setBulkSaving(true); setMsg(""); setNotice("");
    try {
      const rows = await createStamps(v.id, readySeconds);
      setStamps(current => [...current, ...rows].sort((a, b) => a.seconds - b.seconds || a.id - b.id));
      setTime("");
      const summary = [`${rows.length}개의 타임스탬프를 등록했어요.`];
      if (duplicateCount > 0) summary.push(`중복 ${duplicateCount}개는 건너뛰었어요.`);
      if (parsed.invalid.length > 0) summary.push(`시간으로 인식하지 못한 ${parsed.invalid.length}개 항목은 제외했어요.`);
      setNotice(summary.join(" "));
    } catch (err) { setMsg(errText(err)); }
    finally { setBulkSaving(false); }
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
              {ASSIGNABLE_CATEGORIES.map(c => (
                <button key={c} type="button" aria-pressed={category === c} onClick={() => toggleCategory(c)}
                  className={`h-9 rounded-full border px-3.5 text-sm ${category === c ? "border-accent bg-accent text-on-accent" : "border-line text-ink-2 hover:bg-ground-2"}`}>
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 pt-6 md:px-0 md:pt-0">
          <section aria-labelledby="timestamps-heading">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock3 size={18} className="text-accent" />
                <h3 id="timestamps-heading" className="text-sm font-semibold">타임스탬프</h3>
              </div>
              <span className="text-xs tabular-nums text-ink-3">{stamps.length}개 등록됨</span>
            </div>
            <div className="mt-2 space-y-2">
              <label htmlFor="timestamp-list" className="block text-xs font-medium text-ink-2">시간 입력 또는 여러 개 붙여넣기</label>
              <textarea id="timestamp-list" value={time}
                onChange={e => { setTime(e.target.value); setMsg(""); setNotice(""); }}
                rows={4} autoComplete="off" autoCapitalize="off" spellCheck={false}
                placeholder={'00:00\n03:25\n12:48\n1:02:35'}
                className="min-h-28 w-full resize-y rounded-control border border-line-strong bg-field p-3 font-mono text-sm leading-7 tabular-nums placeholder:text-ink-3" />
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
                <span>한 개만 입력하거나, 줄바꿈·띄어쓰기로 여러 개를 붙여넣으세요.</span>
                <span className="font-medium tabular-nums text-ink-2">{parsed.seconds.length}개 인식</span>
              </div>
              {time.trim() && (
                <div className="rounded-xl bg-ground-2 p-3">
                  <p className="text-xs font-semibold text-ink-2">등록 미리보기</p>
                  {readySeconds.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {readySeconds.slice(0, 20).map(seconds => (
                        <span key={seconds} className="rounded-lg border border-line bg-surface px-2.5 py-1 font-mono text-xs tabular-nums text-ink-2">{clock(seconds)}</span>
                      ))}
                      {readySeconds.length > 20 && <span className="px-1 py-1 text-xs text-ink-3">외 {readySeconds.length - 20}개</span>}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-ink-3">새로 등록할 시간이 없어요.</p>
                  )}
                  {parsed.invalid.length > 0 && <p className="mt-2 text-xs text-ink-3">인식하지 못한 항목 {parsed.invalid.length}개는 제외돼요.</p>}
                </div>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setTime(clock(player.current?.time() ?? 0)); setMsg(""); setNotice(""); }}
                  className="flex h-11 shrink-0 items-center gap-1.5 rounded-control border border-line px-3 text-xs font-medium text-ink-2 hover:bg-ground-2">
                  <Play size={14} /> 현재 위치
                </button>
                <button type="button" onClick={addStamps} disabled={!readySeconds.length || bulkSaving}
                  className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-control bg-accent px-4 text-sm font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-40">
                  <ListPlus size={17} /> {bulkSaving ? "등록 중…" : `${readySeconds.length}개 한꺼번에 등록`}
                </button>
              </div>
            </div>
            {msg && <p role="alert" className="mt-2 text-sm text-danger">{msg}</p>}
            {notice && <p role="status" className="mt-2 text-xs text-ok">{notice}</p>}
            {stamps.length === 0 && <p className="mt-3 text-sm text-ink-3">기록한 타임스탬프가 없어요.</p>}
            <ul className="mt-2 divide-y divide-line">
              {stamps.map(s => (
                <li key={s.id} className="flex items-center gap-2 py-1.5">
                  <button type="button" onClick={() => player.current?.seek(s.seconds)} className="h-10 w-20 shrink-0 rounded-control text-left font-medium tabular-nums text-accent hover:underline">{clock(s.seconds)}</button>
                  <input key={`${s.id}-${s.note}`} defaultValue={s.note} aria-label={`${clock(s.seconds)} 메모`} placeholder="메모 추가 (선택)" maxLength={500} onBlur={e => editNote(s, e.target.value.trim())}
                    className="h-10 min-w-0 flex-1 rounded-control border border-transparent bg-transparent px-2 hover:border-line focus:border-line-strong" />
                  <button type="button" onClick={() => removeStamp(s)} aria-label="삭제" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-ground-2"><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
          </section>

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
