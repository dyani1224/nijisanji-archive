import {
  BookOpen,
  Check,
  ChevronLeft,
  ExternalLink,
  Palette,
  Pencil,
  Plus,
  Trash2,
  Youtube,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  extractTwitterHandle,
  LiverForm,
  normalizeHexColor,
  normalizeTwitterUrl,
  normalizeWikiUrl,
} from "../components/LiverForm";
import { Avatar, PageHead } from "../components/ui";
import {
  deleteLiver,
  errText,
  getLiver,
  updateLiverProfile,
  useFetch,
} from "../lib/client";

function formatDisplayDate(raw?: string): string {
  if (!raw) return "-";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
  }
  return raw.replace(/-/g, ".");
}

function formatBirthday(raw?: string): string {
  if (!raw) return "-";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 4) return `${digits.slice(0, 2)}.${digits.slice(2, 4)}`;
  if (digits.length === 8) return `${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
  return raw.replace(/-/g, ".");
}

function calcElapsedDays(raw?: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 8) return "";
  const y = Number(digits.slice(0, 4));
  const m = Number(digits.slice(4, 6)) - 1;
  const d = Number(digits.slice(6, 8));
  const start = new Date(y, m, d);
  if (Number.isNaN(start.getTime())) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.floor((today.getTime() - start.getTime()) / 86400000);
  if (diff >= 0) return `+${(diff + 1).toLocaleString()}일`;
  return `D${diff}`;
}

type InlineField =
  | null
  | "birthday"
  | "oshi_mark"
  | "fan_name"
  | "official_color"
  | "twitter_add"
  | "nijiwiki";

export default function LiverDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { data: liver, error, reload } = useFetch(() => getLiver(Number(id)), [id]);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("");

  /* 인라인 바로 입력 상태 */
  const [activeField, setActiveField] = useState<InlineField>(null);
  const [draft, setDraft] = useState("");

  const startInline = (field: Exclude<InlineField, null>, initialValue = "") => {
    setActiveField(field);
    setDraft(initialValue);
  };

  const cancelInline = () => {
    setActiveField(null);
    setDraft("");
  };

  const saveQuick = async (patch: Parameters<typeof updateLiverProfile>[1]) => {
    if (!liver) return;
    try {
      await updateLiverProfile(liver.id, patch);
      setActiveField(null);
      setDraft("");
      reload();
    } catch (e) {
      setStatus(errText(e));
    }
  };

  const remove = async () => {
    const label = liver?.name_ja || liver?.name || "";
    if (!liver || !confirm(`${label}과(와) 이 라이버의 영상, 즐겨찾기, 메모, 타임스탬프를 모두 삭제할까요?`)) return;
    try {
      await deleteLiver(liver.id);
      nav("/livers");
    } catch (e) {
      setStatus(errText(e));
    }
  };

  const toggleMembership = () => {
    if (!liver) return;
    saveQuick({ membership: !liver.membership });
  };

  const toggleThemeColor = () => {
    if (!liver) return;
    saveQuick({ use_theme_color: !liver.use_theme_color });
  };

  const officialHex = normalizeHexColor(liver?.official_color || "");
  const themeHex = liver?.use_theme_color && officialHex ? officialHex : "";

  /* 상단 연필 버튼 클릭 시 전체 수정 화면 */
  if (editing && liver) {
    return (
      <>
        <PageHead
          back={
            <button
              type="button"
              onClick={() => setEditing(false)}
              aria-label="수정 취소"
              className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-ground-2"
            >
              <ChevronLeft size={24} />
            </button>
          }
          title="라이버 정보 수정"
        />
        <div className="px-4 pt-4 md:px-8">
          <LiverForm
            initial={liver}
            onSaved={(_updated, message) => {
              setStatus(message);
              setEditing(false);
              reload();
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      </>
    );
  }

  const nameJa = liver?.name_ja || liver?.name || "";
  const nameKo = liver?.name_ko || "";
  const youtubeLabel = liver?.youtube_handle || nameJa;
  const youtubeHref = liver?.youtube_handle?.startsWith("@")
    ? `https://www.youtube.com/${liver.youtube_handle}`
    : `https://www.youtube.com/channel/${liver?.channel_id ?? ""}`;
  const debutDays = calcElapsedDays(liver?.debut_date);
  const oshiDays = calcElapsedDays(liver?.oshi_date);
  const twitters = liver?.twitter_urls ?? [];

  return (
    <div style={themeHex ? ({ "--liver-theme": themeHex } as React.CSSProperties) : undefined}>
      <PageHead
        back={
          <Link
            to="/livers"
            aria-label="라이버 목록"
            className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-ground-2"
          >
            <ChevronLeft size={24} />
          </Link>
        }
        title={<span className="truncate">{nameJa}</span>}
      >
        {liver && (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="라이버 정보 수정"
              className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-ground-2"
            >
              <Pencil size={18} />
            </button>
            <button
              type="button"
              onClick={remove}
              aria-label="라이버 삭제"
              className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-ground-2"
            >
              <Trash2 size={18} />
            </button>
          </>
        )}
      </PageHead>

      {error && (
        <p role="alert" className="px-4 pt-4 text-sm text-danger md:px-8">
          {error}
        </p>
      )}
      {status && (
        <p role="status" className="px-4 pt-3 text-sm text-ink-2 md:px-8">
          {status}
        </p>
      )}

      {liver && (
        <section
          className="px-4 py-5 pb-12 md:px-8"
          style={
            themeHex
              ? { background: `linear-gradient(180deg, ${themeHex}16 0%, transparent 100%)` }
              : undefined
          }
        >
          {/* 1. 상단 프로필 사진 + 일본 이름 / 한국 이름 */}
          <div className="flex items-center gap-4">
            <span
              className="inline-flex shrink-0 rounded-full p-0.5"
              style={themeHex ? { border: `2.5px solid ${themeHex}` } : undefined}
            >
              <Avatar src={liver.avatar} name={nameJa} size={76} isLive={liver.is_live} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-xl font-bold text-ink">{nameJa}</h2>
                {liver.is_live && (
                  <span className="shrink-0 rounded bg-rose-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                    라이브 중
                  </span>
                )}
              </div>
              {nameKo && <p className="mt-0.5 truncate text-sm text-ink-2">{nameKo}</p>}
            </div>
          </div>

          {/* 2. 생일 / 데뷔일 / 입덕일 / 멤버십 4칸 (클릭 시 바로 설정) */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {/* 생일 칸 */}
            {activeField === "birthday" ? (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-accent bg-ground px-2 py-2 text-center">
                <span className="text-[11px] text-ink-3">생일 (월.일)</span>
                <div className="mt-1 flex w-full items-center gap-1">
                  <input
                    autoFocus
                    type="text"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") saveQuick({ birthday: draft });
                      if (e.key === "Escape") cancelInline();
                    }}
                    placeholder="11.10"
                    maxLength={10}
                    className="h-7 min-w-0 flex-1 rounded border border-line bg-field px-1.5 text-center text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => saveQuick({ birthday: draft })}
                    aria-label="생일 저장"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded bg-accent text-on-accent"
                  >
                    <Check size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startInline("birthday", liver.birthday || "")}
                className="flex min-h-[74px] flex-col items-center justify-center rounded-xl border border-line bg-ground px-2 py-2.5 text-center transition hover:bg-ground-2/70"
              >
                <span className="text-[11px] text-ink-3">생일</span>
                <span className="mt-1 text-sm font-semibold text-ink tabular-nums">
                  {formatBirthday(liver.birthday)}
                </span>
              </button>
            )}

            {/* 데뷔일 칸 */}
            <label className="relative flex min-h-[74px] cursor-pointer flex-col items-center justify-center rounded-xl border border-line bg-ground px-2 py-2.5 text-center transition hover:bg-ground-2/70">
              <span className="text-[11px] text-ink-3">데뷔일</span>
              <span className="mt-1 text-xs font-semibold text-ink tabular-nums">
                {formatDisplayDate(liver.debut_date)}
              </span>
              {debutDays && (
                <span
                  className="mt-0.5 text-xs font-bold tabular-nums"
                  style={{ color: themeHex || "var(--color-accent, #2563eb)" }}
                >
                  {debutDays}
                </span>
              )}
              <input
                type="date"
                aria-label="데뷔일 선택"
                value={liver.debut_date || ""}
                onChange={e => saveQuick({ debut_date: e.target.value })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>

            {/* 입덕일 칸 */}
            <label className="relative flex min-h-[74px] cursor-pointer flex-col items-center justify-center rounded-xl border border-line bg-ground px-2 py-2.5 text-center transition hover:bg-ground-2/70">
              <span className="text-[11px] text-ink-3">입덕일</span>
              <span className="mt-1 text-xs font-semibold text-ink tabular-nums">
                {formatDisplayDate(liver.oshi_date)}
              </span>
              {oshiDays && (
                <span
                  className="mt-0.5 text-xs font-bold tabular-nums"
                  style={{ color: themeHex || "var(--color-accent, #2563eb)" }}
                >
                  {oshiDays}
                </span>
              )}
              <input
                type="date"
                aria-label="입덕일 선택"
                value={liver.oshi_date || ""}
                onChange={e => saveQuick({ oshi_date: e.target.value })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>

            {/* 멤버십 칸 */}
            <button
              type="button"
              onClick={toggleMembership}
              aria-pressed={!!liver.membership}
              style={
                liver.membership
                  ? {
                      borderColor: officialHex || "var(--color-accent, #2563eb)",
                      borderWidth: 2,
                      backgroundColor: officialHex ? `${officialHex}14` : undefined,
                    }
                  : undefined
              }
              className={`flex min-h-[74px] items-center justify-center rounded-xl border bg-ground px-2 py-2.5 text-sm font-semibold transition ${
                liver.membership ? "border-accent text-ink" : "border-line text-ink-3 hover:bg-ground-2/70"
              }`}
            >
              멤버십
            </button>
          </div>

          {/* 3. 오시마크 / 팬네임 / 공식색 (각각 칸 구분 + 클릭 시 바로 입력) */}
          <div className="mt-4 space-y-2">
            {/* 오시마크 칸 */}
            {activeField === "oshi_mark" ? (
              <div className="flex h-12 items-center gap-2 rounded-xl border-2 border-accent bg-ground px-3.5">
                <span className="shrink-0 text-sm text-ink-3">오시마크</span>
                <input
                  autoFocus
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") saveQuick({ oshi_mark: draft });
                    if (e.key === "Escape") cancelInline();
                  }}
                  placeholder="예: 🎲"
                  className="h-8 min-w-0 flex-1 bg-transparent text-right text-sm font-medium text-ink focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => saveQuick({ oshi_mark: draft })}
                  aria-label="오시마크 저장"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-on-accent"
                >
                  <Check size={15} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startInline("oshi_mark", liver.oshi_mark || "")}
                className="flex h-12 w-full items-center justify-between rounded-xl border border-line bg-ground px-3.5 text-sm transition hover:bg-ground-2/70"
              >
                <span className="text-ink-3">오시마크</span>
                <span className="font-medium text-ink">{liver.oshi_mark || "-"}</span>
              </button>
            )}

            {/* 팬네임 칸 */}
            {activeField === "fan_name" ? (
              <div className="flex h-12 items-center gap-2 rounded-xl border-2 border-accent bg-ground px-3.5">
                <span className="shrink-0 text-sm text-ink-3">팬네임</span>
                <input
                  autoFocus
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") saveQuick({ fan_name: draft });
                    if (e.key === "Escape") cancelInline();
                  }}
                  placeholder="팬네임 입력"
                  className="h-8 min-w-0 flex-1 bg-transparent text-right text-sm font-medium text-ink focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => saveQuick({ fan_name: draft })}
                  aria-label="팬네임 저장"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-on-accent"
                >
                  <Check size={15} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startInline("fan_name", liver.fan_name || "")}
                className="flex h-12 w-full items-center justify-between rounded-xl border border-line bg-ground px-3.5 text-sm transition hover:bg-ground-2/70"
              >
                <span className="text-ink-3">팬네임</span>
                <span className="font-medium text-ink">{liver.fan_name || "-"}</span>
              </button>
            )}

            {/* 공식색 칸 */}
            {activeField === "official_color" ? (
              <div className="flex h-12 items-center gap-2 rounded-xl border-2 border-accent bg-ground px-3.5">
                <span className="shrink-0 text-sm text-ink-3">공식색</span>
                <input
                  type="color"
                  aria-label="공식색 피커"
                  value={normalizeHexColor(draft) || "#6366F1"}
                  onChange={e => setDraft(e.target.value.toUpperCase())}
                  className="h-7 w-8 shrink-0 cursor-pointer rounded border border-line bg-transparent p-0.5"
                />
                <input
                  autoFocus
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      const hex = normalizeHexColor(draft);
                      saveQuick({
                        official_color: hex || draft.trim(),
                        use_theme_color: hex ? liver.use_theme_color : false,
                      });
                    }
                    if (e.key === "Escape") cancelInline();
                  }}
                  placeholder="#FF0000"
                  maxLength={10}
                  className="h-8 min-w-0 flex-1 bg-transparent text-right text-sm font-medium uppercase text-ink focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const hex = normalizeHexColor(draft);
                    saveQuick({
                      official_color: hex || draft.trim(),
                      use_theme_color: hex ? liver.use_theme_color : false,
                    });
                  }}
                  aria-label="공식색 저장"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-on-accent"
                >
                  <Check size={15} />
                </button>
              </div>
            ) : (
              <div className="flex h-12 items-center justify-between rounded-xl border border-line bg-ground px-3.5 text-sm">
                <button
                  type="button"
                  onClick={() => startInline("official_color", liver.official_color || "")}
                  className="flex h-full flex-1 items-center justify-between pr-2 text-left"
                >
                  <span className="text-ink-3">공식색</span>
                  {officialHex ? (
                    <span className="flex items-center gap-1.5 font-medium text-ink">
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full border border-black/15"
                        style={{ backgroundColor: officialHex }}
                      />
                      {officialHex}
                    </span>
                  ) : (
                    <span className="font-medium text-ink">-</span>
                  )}
                </button>

                {officialHex && (
                  <button
                    type="button"
                    onClick={toggleThemeColor}
                    style={
                      liver.use_theme_color
                        ? { backgroundColor: officialHex, borderColor: officialHex, color: "#fff" }
                        : undefined
                    }
                    className={`ml-2 flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      liver.use_theme_color
                        ? "border-accent bg-accent text-white"
                        : "border-line text-ink-2 hover:bg-ground-2"
                    }`}
                  >
                    <Palette size={12} />
                    {liver.use_theme_color ? "테마 적용 중" : "테마 적용"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 4. 외부 링크 칸: 유튜브 / 트위터 / 니지위키 */}
          <div className="mt-4 space-y-2.5">
            {/* 유튜브 */}
            <a
              href={youtubeHref}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 items-center justify-between rounded-xl border border-line bg-ground px-3.5 text-sm font-medium text-ink transition hover:bg-ground-2/70"
            >
              <span className="flex items-center gap-2.5 truncate">
                <Youtube size={18} className="shrink-0 text-rose-600" />
                <span className="truncate">유튜브 · {youtubeLabel}</span>
              </span>
              <ExternalLink size={15} className="shrink-0 text-ink-3" />
            </a>

            {/* 트위터 (등록된 계정 목록) */}
            {twitters.map((url, idx) => {
              const href = normalizeTwitterUrl(url);
              return (
                <a
                  key={url}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-12 items-center justify-between rounded-xl border border-line bg-ground px-3.5 text-sm font-medium text-ink transition hover:bg-ground-2/70"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-black text-xs font-bold text-white">
                      𝕏
                    </span>
                    <span className="truncate">
                      {twitters.length > 1
                        ? `트위터 (${idx === 0 ? "본계정" : `계정 ${idx + 1}`}) · `
                        : "트위터 · "}
                      {extractTwitterHandle(href)}
                    </span>
                  </span>
                  <ExternalLink size={15} className="shrink-0 text-ink-3" />
                </a>
              );
            })}

            {/* 트위터가 아직 하나도 등록되지 않았을 때만 등록 칸 표시 */}
            {twitters.length === 0 && (
              activeField === "twitter_add" ? (
                <div className="flex h-12 items-center gap-2 rounded-xl border-2 border-accent bg-ground px-3">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-black text-xs font-bold text-white">
                    𝕏
                  </span>
                  <input
                    autoFocus
                    type="text"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && draft.trim()) {
                        saveQuick({ twitter_urls: [normalizeTwitterUrl(draft)] });
                      }
                      if (e.key === "Escape") cancelInline();
                    }}
                    placeholder="https://x.com/... 또는 @아이디"
                    className="h-8 min-w-0 flex-1 bg-transparent text-sm text-ink focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!draft.trim()}
                    onClick={() => saveQuick({ twitter_urls: [normalizeTwitterUrl(draft)] })}
                    aria-label="트위터 저장"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-on-accent disabled:opacity-40"
                  >
                    <Check size={15} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startInline("twitter_add", "")}
                  className="flex h-12 w-full items-center justify-between rounded-xl border border-dashed border-line-strong bg-ground px-3.5 text-sm font-medium text-ink-2 transition hover:bg-ground-2/70"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-black/80 text-xs font-bold text-white">
                      𝕏
                    </span>
                    <span>트위터 링크 등록하기</span>
                  </span>
                  <Plus size={16} className="shrink-0 text-ink-3" />
                </button>
              )
            )}

            {/* 니지위키 */}
            {activeField === "nijiwiki" ? (
              <div className="flex h-12 items-center gap-2 rounded-xl border-2 border-accent bg-ground px-3">
                <BookOpen size={17} className="shrink-0 text-sky-600" />
                <input
                  autoFocus
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      saveQuick({ nijiwiki_url: draft.trim() ? normalizeWikiUrl(draft) : "" });
                    }
                    if (e.key === "Escape") cancelInline();
                  }}
                  placeholder="https://wikiwiki.jp/nijisanji/..."
                  className="h-8 min-w-0 flex-1 bg-transparent text-sm text-ink focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    saveQuick({ nijiwiki_url: draft.trim() ? normalizeWikiUrl(draft) : "" })
                  }
                  aria-label="니지위키 저장"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-on-accent"
                >
                  <Check size={15} />
                </button>
              </div>
            ) : liver.nijiwiki_url ? (
              <a
                href={normalizeWikiUrl(liver.nijiwiki_url)}
                target="_blank"
                rel="noreferrer"
                className="flex h-12 items-center justify-between rounded-xl border border-line bg-ground px-3.5 text-sm font-medium text-ink transition hover:bg-ground-2/70"
              >
                <span className="flex items-center gap-2.5 truncate">
                  <BookOpen size={17} className="shrink-0 text-sky-600" />
                  <span className="truncate">니지위키</span>
                </span>
                <ExternalLink size={15} className="shrink-0 text-ink-3" />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => startInline("nijiwiki", "")}
                className="flex h-12 w-full items-center justify-between rounded-xl border border-dashed border-line-strong bg-ground px-3.5 text-sm font-medium text-ink-2 transition hover:bg-ground-2/70"
              >
                <span className="flex items-center gap-2.5">
                  <BookOpen size={17} className="shrink-0 text-sky-600" />
                  <span>니지위키 링크 등록하기</span>
                </span>
                <Plus size={16} className="shrink-0 text-ink-3" />
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
