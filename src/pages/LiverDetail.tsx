import {
  BookOpen,
  ChevronLeft,
  ExternalLink,
  ListVideo,
  Palette,
  Pencil,
  RefreshCw,
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
import { Avatar, PageHead, VideoList } from "../components/ui";
import {
  deleteLiver,
  errText,
  type Category,
  type Filter,
  getLiver,
  refreshLivers,
  updateLiverProfile,
  useFetch,
  useVideos,
} from "../lib/client";

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

export default function LiverDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { data: liver, error, reload } = useFetch(() => getLiver(Number(id)), [id]);
  const [editing, setEditing] = useState(false);
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
    const label = liver?.name_ja || liver?.name || "";
    if (!liver || !confirm(`${label}과(와) 이 라이버의 영상, 즐겨찾기, 메모, 타임스탬프를 모두 삭제할까요?`)) return;
    try {
      await deleteLiver(liver.id);
      nav("/livers");
    } catch (e) {
      setStatus(errText(e));
    }
  };

  const toggleMembership = async () => {
    if (!liver) return;
    try {
      await updateLiverProfile(liver.id, { membership: !liver.membership });
      reload();
    } catch (e) {
      setStatus(errText(e));
    }
  };

  const toggleThemeColor = async () => {
    if (!liver) return;
    try {
      await updateLiverProfile(liver.id, { use_theme_color: !liver.use_theme_color });
      reload();
    } catch (e) {
      setStatus(errText(e));
    }
  };

  const switchTab = (t: YtTab) => {
    setTab(t);
    setSub("all");
  };

  const officialHex = normalizeHexColor(liver?.official_color || "");
  const themeHex = liver?.use_theme_color && officialHex ? officialHex : "";

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
              setKey(k => k + 1);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      </>
    );
  }

  const nameJa = liver?.name_ja || liver?.name || "";
  const nameKo = liver?.name_ko || "";
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
              onClick={refresh}
              disabled={busy}
              aria-label="새로고침"
              className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-ground-2 disabled:opacity-50"
            >
              <RefreshCw size={18} className={busy ? "animate-spin" : ""} />
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

      {/* 라이버 프로필 카드 */}
      {liver && (
        <section
          className="border-b border-line px-4 py-5 md:px-8"
          style={
            themeHex
              ? { background: `linear-gradient(180deg, ${themeHex}14 0%, transparent 100%)` }
              : undefined
          }
        >
          {/* 상단: 프로필 사진 + 일본 이름 / 한국 이름 */}
          <div className="flex items-center gap-4">
            <span
              className="rounded-full p-0.5"
              style={themeHex ? { boxShadow: `0 0 0 2px ${themeHex}` } : undefined}
            >
              <Avatar src={liver.avatar} name={nameJa} size={74} isLive={liver.is_live} />
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

          {/* 4개의 칸: 생일 / 데뷔일 / 입덕일 / 멤버십 */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-ground px-2 py-2.5 text-center">
              <span className="text-[11px] text-ink-3">생일</span>
              <span className="mt-0.5 text-sm font-semibold text-ink tabular-nums">
                {formatBirthday(liver.birthday)}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-ground px-2 py-2.5 text-center">
              <span className="text-[11px] text-ink-3">데뷔일</span>
              <span className="mt-0.5 text-xs font-semibold text-ink tabular-nums">
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
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-ground px-2 py-2.5 text-center">
              <span className="text-[11px] text-ink-3">입덕일</span>
              <span className="mt-0.5 text-xs font-semibold text-ink tabular-nums">
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
            </div>

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
              className={`flex items-center justify-center rounded-xl border bg-ground px-2 py-2.5 text-sm font-semibold transition ${
                liver.membership ? "border-accent text-ink" : "border-line text-ink-3 hover:bg-ground-2"
              }`}
            >
              멤버십
            </button>
          </div>

          {/* 오시마크 / 팬네임 / 공식색 + 테마 설정 */}
          <div className="mt-3.5 space-y-1.5 rounded-xl border border-line bg-ground/80 px-3.5 py-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-3">오시마크</span>
              <span className="font-medium text-ink">{liver.oshi_mark || "-"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-3">팬네임</span>
              <span className="font-medium text-ink">{liver.fan_name || "-"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-3">공식색</span>
              <div className="flex items-center gap-2">
                {officialHex ? (
                  <>
                    <span className="flex items-center gap-1.5 font-medium text-ink">
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full border border-black/15"
                        style={{ backgroundColor: officialHex }}
                      />
                      {officialHex}
                    </span>
                    <button
                      type="button"
                      onClick={toggleThemeColor}
                      style={
                        liver.use_theme_color
                          ? { backgroundColor: officialHex, borderColor: officialHex, color: "#fff" }
                          : undefined
                      }
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                        liver.use_theme_color
                          ? "border-accent bg-accent text-white"
                          : "border-line text-ink-2 hover:bg-ground-2"
                      }`}
                    >
                      <Palette size={12} />
                      {liver.use_theme_color ? "테마 적용 중" : "테마 적용"}
                    </button>
                  </>
                ) : (
                  <span className="text-ink-3">-</span>
                )}
              </div>
            </div>
          </div>

          {/* 외부 링크 버튼: 유튜브 / 트위터(복수) / 니지위키 */}
          <div className="mt-3 space-y-2">
            {/* 유튜브 연동 링크 */}
            <a
              href={`https://www.youtube.com/channel/${liver.channel_id}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center justify-between rounded-xl border border-line bg-ground px-3.5 text-sm font-medium text-ink hover:bg-ground-2"
            >
              <span className="flex items-center gap-2.5 truncate">
                <Youtube size={18} className="shrink-0 text-rose-600" />
                <span className="truncate">유튜브 채널 홈 열기</span>
              </span>
              <ExternalLink size={15} className="shrink-0 text-ink-3" />
            </a>

            {/* 트위터 연동 링크 (여러 계정 지원) */}
            {twitters.map((url, idx) => {
              const href = normalizeTwitterUrl(url);
              return (
                <a
                  key={url}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center justify-between rounded-xl border border-line bg-ground px-3.5 text-sm font-medium text-ink hover:bg-ground-2"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-black text-xs font-bold text-white">
                      𝕏
                    </span>
                    <span className="truncate">
                      {twitters.length > 1 ? `트위터 (${idx === 0 ? "본계정" : `계정 ${idx + 1}`}) · ` : "트위터 · "}
                      {extractTwitterHandle(href)}
                    </span>
                  </span>
                  <ExternalLink size={15} className="shrink-0 text-ink-3" />
                </a>
              );
            })}

            {/* 니지위키 링크 */}
            {liver.nijiwiki_url && (
              <a
                href={normalizeWikiUrl(liver.nijiwiki_url)}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 items-center justify-between rounded-xl border border-line bg-ground px-3.5 text-sm font-medium text-ink hover:bg-ground-2"
              >
                <span className="flex items-center gap-2.5 truncate">
                  <BookOpen size={17} className="shrink-0 text-sky-600" />
                  <span className="truncate">니지위키 (にじさんじ Wiki)</span>
                </span>
                <ExternalLink size={15} className="shrink-0 text-ink-3" />
              </a>
            )}
          </div>
        </section>
      )}

      {/* 유튜브 채널 탭: 동영상 / Shorts / 라이브 / 재생목록 */}
      <div
        className="flex overflow-x-auto border-b border-line px-4 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        {TABS.map(([k, label]) => {
          const active = tab === k;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchTab(k)}
              style={
                active && themeHex
                  ? { borderColor: themeHex, color: themeHex }
                  : undefined
              }
              className={`h-12 shrink-0 flex-1 border-b-2 px-4 text-sm font-medium md:flex-none md:px-7 ${
                active ? "border-accent text-accent" : "border-transparent text-ink-3"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="px-4 pt-3 md:px-8">
        {status && (
          <p role="status" className="mb-3 text-sm text-ink-2">
            {status}
          </p>
        )}

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
                          <img
                            src={pl.thumbnail}
                            alt=""
                            loading="lazy"
                            className="aspect-video w-full rounded-media bg-ground-2 object-cover"
                          />
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
                        <p className="line-clamp-2 text-[15px] font-medium leading-snug text-ink [word-break:keep-all]">
                          {pl.title}
                        </p>
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
              <div className="mb-1 flex flex-wrap gap-2" role="group">
                {SUB_CHIPS.map(([k, label]) => {
                  const active = sub === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSub(k)}
                      style={
                        active && themeHex
                          ? { backgroundColor: themeHex, borderColor: themeHex, color: "#fff" }
                          : undefined
                      }
                      className={`h-9 rounded-full border px-3.5 text-sm ${
                        active
                          ? "border-accent bg-accent text-on-accent"
                          : "border-line text-ink-2 hover:bg-ground-2"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
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
    </div>
  );
}
