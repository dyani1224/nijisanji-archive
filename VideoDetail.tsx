import { CheckCircle2, Clock3, ExternalLink, ListPlus, Play, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useParams } from "react-router";
import Player, { type PlayerHandle } from "../components/Player";
import { Avatar, BackButton, HeartButton, PageHead } from "../components/ui";
import { ASSIGNABLE_CATEGORIES, createStamp, createStamps, CATEGORY_LABEL, deleteStamp, errText, getVideo, updateStamp, updateVideo, useFetch, type Category, type Stamp } from "../lib/client";
import { clock, dateKo, parseClock, parseTimestampList } from "../lib/format";

type StampEntryMode = "single" | "bulk";

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
  const [note, setNote] = useState("");
  const [entryMode, setEntryMode] = useState<StampEntryMode>("single");
  const [bulkText, setBulkText] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!data) return;
    setCategory(data.row.category); setFav(!!data.row.favorite); setMemo(data.row.memo); setStamps(data.timestamps);
  }, [data]);

  const parsedBulk = useMemo(() => parseTimestampList(bulkText), [bulkText]);
  const existingSeconds = useMemo(() => new Set(stamps.map(s => s.seconds)), [stamps]);
  const readyBulkSeconds = useMemo(
    () => [...new Set(parsedBulk.seconds)].filter(seconds => !existingSeconds.has(seconds)),
    [parsedBulk.seconds, existingSeconds],
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
  const addStamp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const sec = parseClock(time);
    if (sec === null) { setMsg("시간은 12:34 또는 1:02:03 형식으로 적어 주세요"); return; }
    setMsg(""); setNotice("");
    try {
      const row = await createStamp(v.id, sec, note.trim());
      setStamps(s => [...s, row].sort((a, b) => a.seconds - b.seconds || a.id - b.id));
      setTime(""); setNote("");
      setNotice("타임스탬프를 등록했어요.");
    } catch (err) { setMsg(errText(err)); }
  };
  const addBulkStamps = async () => {
    if (!readyBulkSeconds.length || bulkSaving) return;
    const invalidCount = parsedBulk.invalid.length;
    const duplicateCount = parsedBulk.seconds.length - readyBulkSeconds.length;
    setBulkSaving(true); setMsg(""); setNotice("");
    try {
      const rows = await createStamps(v.id, readyBulkSeconds);
      setStamps(current => [...current, ...rows].sort((a, b) => a.seconds - b.seconds || a.id - b.id));
      setBulkText("");
      const summary = [`${rows.length}개의 타임스탬프를 등록했어요.`];
      if (duplicateCount > 0) summary.push(`중복 ${duplicateCount}개는 건너뛰었어요.`);
      if (invalidCount > 0) summary.push(`인식하지 못한 ${invalidCount}개 항목은 제외했어요.`);
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
    try { await deleteStamp(s.id); setStamps(list => list.filter(x => x.id !== s.id)); }
    catch (e) { setMsg(errText(e)); }
  };

  return (
    <>
      <PageHead
        back={<BackButton fallback={`/livers/${v.liver_id}`} label="이전 페이지" />}
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

        <div className="space-y-6 px-4 pt-6 md:px-0 md:pt-0">
          <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm md:p-5" aria-labelledby="timestamps-heading">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent"><Clock3 size={18} /></span>
                  <h3 id="timestamps-heading" className="text-base font-semibold">타임스탬프</h3>
                </div>
                <p className="mt-2 text-xs text-ink-3">기억하고 싶은 장면의 시간을 저장해 두세요.</p>
              </div>
              <span className="rounded-full bg-ground-2 px-3 py-1 text-xs font-semibold tabular-nums text-ink-2">{stamps.length}개</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-ground-2 p-1" role="group" aria-label="타임스탬프 등록 방식">
              <button type="button" aria-pressed={entryMode === "single"} onClick={() => { setEntryMode("single"); setMsg(""); setNotice(""); }}
                className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors ${entryMode === "single" ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink-2"}`}>
                <Clock3 size={15} /> 개별 등록
              </button>
              <button type="button" aria-pressed={entryMode === "bulk"} onClick={() => { setEntryMode("bulk"); setMsg(""); setNotice(""); }}
                className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors ${entryMode === "bulk" ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink-2"}`}>
                <ListPlus size={16} /> 여러 개 붙여넣기
              </button>
            </div>

            {entryMode === "single" ? (
              <form onSubmit={addStamp} className="mt-4 space-y-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                  <label className="block min-w-0">
                    <span className="mb-1.5 block text-xs font-medium text-ink-2">재생 시간</span>
                    <span className="relative block">
                      <Clock3 size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                      <input value={time} onChange={e => setTime(e.target.value.replace(/[^\d:]/g, ""))} aria-label="시간" placeholder="12:34" inputMode="text" maxLength={8} autoComplete="off"
                        className="h-12 w-full rounded-xl border border-line-strong bg-field pl-10 pr-3 font-mono text-sm tabular-nums" />
                    </span>
                  </label>
                  <button type="button" onClick={() => setTime(clock(player.current?.time() ?? 0))}
                    className="flex h-12 items-center gap-1.5 rounded-xl border border-line px-3 text-xs font-medium text-ink-2 hover:bg-ground-2">
                    <Play size={14} /> 현재 위치
                  </button>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-ink-2">메모 <span className="font-normal text-ink-3">· 선택</span></span>
                  <input value={note} onChange={e => setNote(e.target.value)} aria-label="메모" placeholder="예: 오프닝 시작, 좋아하는 장면" maxLength={500}
                    className="h-12 w-full rounded-xl border border-line-strong bg-field px-3 text-sm" />
                </label>
                <button type="submit" disabled={!time.trim()} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
                  <Plus size={17} /> 타임스탬프 추가
                </button>
              </form>
            ) : (
              <div className="mt-4">
                <label htmlFor="bulk-timestamps" className="mb-1.5 block text-xs font-medium text-ink-2">타임스탬프 목록</label>
                <textarea id="bulk-timestamps" value={bulkText} onChange={e => { setBulkText(e.target.value); setMsg(""); setNotice(""); }}
                  rows={5} spellCheck={false} placeholder={'00:00\n03:25\n12:48\n1:02:35'}
                  className="min-h-32 w-full resize-y rounded-xl border border-line-strong bg-field p-3 font-mono text-sm leading-7 tabular-nums placeholder:font-mono placeholder:text-ink-3" />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
                  <span>줄바꿈, 공백, 쉼표로 구분해 붙여넣을 수 있어요.</span>
                  <span className="font-medium tabular-nums text-ink-2">{parsedBulk.seconds.length}개 인식</span>
                </div>
                {bulkText.trim() && (
                  <div className="mt-3 rounded-xl bg-ground-2 p-3">
                    <p className="text-xs font-semibold text-ink-2">등록 미리보기</p>
                    {readyBulkSeconds.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {readyBulkSeconds.slice(0, 16).map(seconds => (
                          <span key={seconds} className="rounded-lg border border-line bg-surface px-2.5 py-1 font-mono text-xs tabular-nums text-ink-2">{clock(seconds)}</span>
                        ))}
                        {readyBulkSeconds.length > 16 && <span className="px-1 py-1 text-xs text-ink-3">외 {readyBulkSeconds.length - 16}개</span>}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-ink-3">새로 등록할 타임스탬프가 없어요.</p>
                    )}
                    {(parsedBulk.invalid.length > 0 || parsedBulk.seconds.length > readyBulkSeconds.length) && (
                      <p className="mt-2 text-xs text-ink-3">
                        {parsedBulk.seconds.length > readyBulkSeconds.length && `중복 ${parsedBulk.seconds.length - readyBulkSeconds.length}개는 건너뛰어요.`}
                        {parsedBulk.invalid.length > 0 && ` 인식하지 못한 ${parsedBulk.invalid.length}개 항목은 등록하지 않아요.`}
                      </p>
                    )}
                  </div>
                )}
                <button type="button" onClick={addBulkStamps} disabled={!readyBulkSeconds.length || bulkSaving}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
                  <ListPlus size={17} /> {bulkSaving ? "등록 중…" : `${readyBulkSeconds.length}개 한꺼번에 등록`}
                </button>
              </div>
            )}

            {msg && <p role="alert" className="mt-3 text-sm text-danger">{msg}</p>}
            {notice && <p role="status" className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-ok"><CheckCircle2 size={15} className="mt-0.5 shrink-0" />{notice}</p>}

            <div className="mt-5 border-t border-line pt-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">등록된 시간</h4>
                <span className="text-xs tabular-nums text-ink-3">{stamps.length}개</span>
              </div>
              {stamps.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-line-strong px-3 py-7 text-center">
                  <Clock3 size={20} className="mx-auto text-ink-3" />
                  <p className="mt-2 text-sm font-medium text-ink-2">아직 등록된 시간이 없어요.</p>
                  <p className="mt-1 text-xs text-ink-3">시간만 먼저 저장하고 메모는 나중에 추가해도 돼요.</p>
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {stamps.map(s => (
                    <li key={s.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-line bg-ground px-2 py-2">
                      <button type="button" onClick={() => player.current?.seek(s.seconds)} aria-label={`${clock(s.seconds)} 재생하기`}
                        className="flex h-10 min-w-[82px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-accent/10 px-2 font-mono text-sm font-semibold tabular-nums text-accent hover:bg-accent/15">
                        <Play size={12} fill="currentColor" /> {clock(s.seconds)}
                      </button>
                      <input key={`${s.id}-${s.note}`} defaultValue={s.note} aria-label={`${clock(s.seconds)} 메모`} placeholder="메모 추가 (선택)" maxLength={500}
                        onBlur={e => editNote(s, e.target.value.trim())}
                        className="h-10 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm placeholder:text-ink-3 hover:border-line focus:border-line-strong focus:bg-field" />
                      <button type="button" onClick={() => removeStamp(s)} aria-label={`${clock(s.seconds)} 삭제`}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-ground-2 hover:text-danger"><Trash2 size={16} /></button>
                    </li>
                  ))}
                </ul>
              )}
              {stamps.length > 0 && <p className="mt-2 text-[11px] text-ink-3">시간을 누르면 해당 장면으로 이동하고, 메모 칸은 언제든 수정할 수 있어요.</p>}
            </div>
          </section>

          <section aria-labelledby="memo-heading">
            <h3 id="memo-heading" className="text-sm font-semibold">감상 메모</h3>
            <textarea value={memo} onChange={e => { setMemo(e.target.value); setMemoState(""); }} onBlur={saveMemo} rows={6} aria-label="감상 메모"
              className="mt-2 w-full rounded-control border border-line-strong bg-field p-3 leading-relaxed" />
            <div className="mt-2 flex items-center gap-3">
              <button type="button" onClick={saveMemo} className="h-control rounded-control border border-line px-4 text-sm hover:bg-ground-2">저장</button>
              <span role="status" className="text-sm text-ink-2">{memoState}</span>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
