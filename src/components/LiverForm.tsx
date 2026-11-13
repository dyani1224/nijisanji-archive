import { Check, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Avatar } from "./ui";
import {
  createLiverWithProfile,
  errText,
  extractYoutubeHandle,
  resolveYoutubeChannel,
  updateLiverProfile,
  type Liver,
} from "../lib/client";

export function normalizeHexColor(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  const withHash = s.startsWith("#") ? s : `#${s}`;
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return "";
}

export function normalizeTwitterUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  const handle = s.replace(/^@/, "");
  return `https://x.com/${handle}`;
}

export function extractTwitterHandle(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://x.com/${s.replace(/^@/, "")}`);
    const seg = u.pathname.split("/").filter(Boolean)[0];
    return seg ? `@${seg.replace(/^@/, "")}` : s;
  } catch {
    return s.startsWith("@") ? s : `@${s}`;
  }
}

export function normalizeWikiUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

export function LiverForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Liver;
  onSaved: (liver: Liver, message: string) => void;
  onCancel: () => void;
}) {
  const isEdit = !!initial;

  const [youtubeUrl, setYoutubeUrl] = useState(
    initial
      ? initial.youtube_handle?.startsWith("@")
        ? `https://www.youtube.com/${initial.youtube_handle}`
        : `https://www.youtube.com/channel/${initial.channel_id}`
      : ""
  );
  const [resolved, setResolved] = useState<{ channelId: string; name: string; avatar: string } | undefined>(
    initial ? { channelId: initial.channel_id, name: initial.name_ja || initial.name, avatar: initial.avatar } : undefined
  );
  const [resolving, setResolving] = useState(false);

  const [nameJa, setNameJa] = useState(initial?.name_ja || "");
  const [nameKo, setNameKo] = useState(initial?.name_ko || "");
  const [birthday, setBirthday] = useState(initial?.birthday || "");
  const [debutDate, setDebutDate] = useState(initial?.debut_date || "");
  const [oshiDate, setOshiDate] = useState(initial?.oshi_date || "");
  const [membership, setMembership] = useState(!!initial?.membership);
  const [oshiMark, setOshiMark] = useState(initial?.oshi_mark || "");
  const [fanName, setFanName] = useState(initial?.fan_name || "");
  const [officialColor, setOfficialColor] = useState(initial?.official_color || "");
  const [useThemeColor, setUseThemeColor] = useState(!!initial?.use_theme_color);

  const [twitterInput, setTwitterInput] = useState("");
  const [twitterUrls, setTwitterUrls] = useState<string[]>(initial?.twitter_urls ?? []);
  const [nijiwikiUrl, setNijiwikiUrl] = useState(initial?.nijiwiki_url || "");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const validHex = normalizeHexColor(officialColor);

  const handleResolveYoutube = async () => {
    if (!youtubeUrl.trim()) return;
    setResolving(true);
    setError("");
    try {
      const info = await resolveYoutubeChannel(youtubeUrl);
      setResolved(info);
    } catch (e) {
      setError(errText(e));
    }
    setResolving(false);
  };

  const addTwitterAccount = () => {
    const normalized = normalizeTwitterUrl(twitterInput);
    if (!normalized) return;
    if (!twitterUrls.includes(normalized)) {
      setTwitterUrls(prev => [...prev, normalized]);
    }
    setTwitterInput("");
  };

  const removeTwitterAccount = (idx: number) => {
    setTwitterUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const pendingTw = twitterInput.trim() ? normalizeTwitterUrl(twitterInput) : "";
    const finalTwitters = pendingTw && !twitterUrls.includes(pendingTw)
      ? [...twitterUrls, pendingTw]
      : twitterUrls;

    const extractedHandle = extractYoutubeHandle(youtubeUrl);

    const payload = {
      youtubeUrl: youtubeUrl.trim(),
      resolvedChannel: resolved,
      youtube_handle: extractedHandle || initial?.youtube_handle || resolved?.name || "",
      name_ja: nameJa,
      name_ko: nameKo,
      birthday,
      debut_date: debutDate,
      oshi_date: oshiDate,
      membership,
      oshi_mark: oshiMark,
      fan_name: fanName,
      official_color: validHex || officialColor.trim(),
      use_theme_color: useThemeColor,
      twitter_urls: finalTwitters,
      nijiwiki_url: nijiwikiUrl ? normalizeWikiUrl(nijiwikiUrl) : "",
    };

    setBusy(true);
    try {
      if (isEdit && initial) {
        const updated = await updateLiverProfile(initial.id, payload);
        onSaved(updated, "라이버 정보를 수정했어요.");
      } else {
        if (!youtubeUrl.trim() && !resolved) {
          throw new Error("유튜브 채널 링크를 입력해 주세요.");
        }
        const res = await createLiverWithProfile(payload);
        onSaved(
          res.row,
          `${res.row.name_ja || res.row.name} 등록 완료. 영상 ${res.added}개를 가져왔어요.${res.warning ? ` (${res.warning})` : ""}`
        );
      }
    } catch (e) {
      setError(errText(e));
    }
    setBusy(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-10">
      {/* 상단 프로필 미리보기 */}
      <div className="flex min-h-[100px] items-center gap-4 rounded-2xl border border-line bg-ground-2/60 p-4">
        <Avatar
          src={resolved?.avatar || ""}
          name={nameJa || nameKo || ""}
          size={68}
        />
        <div className="min-w-0 flex-1">
          {nameJa.trim() && (
            <p className="truncate text-lg font-bold text-ink">{nameJa.trim()}</p>
          )}
          {nameKo.trim() && (
            <p className="mt-0.5 truncate text-sm text-ink-2">{nameKo.trim()}</p>
          )}
          {resolved && (
            <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700">
              <Check size={13} /> 유튜브 채널 연동됨 ({extractYoutubeHandle(youtubeUrl) || resolved.name})
            </p>
          )}
        </div>
      </div>

      {/* 유튜브 채널 링크 연동 */}
      <div className="space-y-1.5">
        <label htmlFor="yt-link" className="block text-sm font-medium text-ink">
          유튜브 연동 링크 <span className="text-rose-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            id="yt-link"
            type="text"
            value={youtubeUrl}
            onChange={e => {
              setYoutubeUrl(e.target.value);
              if (!isEdit) setResolved(undefined);
            }}
            className="h-control min-w-0 flex-1 rounded-control border border-line-strong bg-field px-3 text-sm"
          />
          <button
            type="button"
            onClick={handleResolveYoutube}
            disabled={!youtubeUrl.trim() || resolving}
            className="h-control shrink-0 rounded-control border border-line bg-ground-2 px-3.5 text-sm font-medium text-ink hover:opacity-80 disabled:opacity-40"
          >
            {resolving ? "연동 중..." : "연동 확인"}
          </button>
        </div>
      </div>

      {/* 일본 이름 / 한국 이름 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="name-ja" className="block text-sm font-medium text-ink">
            일본 이름
          </label>
          <input
            id="name-ja"
            type="text"
            value={nameJa}
            onChange={e => setNameJa(e.target.value)}
            className="h-control w-full rounded-control border border-line-strong bg-field px-3 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="name-ko" className="block text-sm font-medium text-ink">
            한국 이름
          </label>
          <input
            id="name-ko"
            type="text"
            value={nameKo}
            onChange={e => setNameKo(e.target.value)}
            className="h-control w-full rounded-control border border-line-strong bg-field px-3 text-sm"
          />
        </div>
      </div>

      {/* 생일 / 데뷔일 / 입덕일 / 멤버십 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <label htmlFor="birthday" className="block text-xs font-medium text-ink-2">
            생일 (월.일)
          </label>
          <input
            id="birthday"
            type="text"
            value={birthday}
            onChange={e => setBirthday(e.target.value)}
            maxLength={10}
            className="h-control w-full rounded-control border border-line-strong bg-field px-3 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="debut-date" className="block text-xs font-medium text-ink-2">
            데뷔일 (년.월.일)
          </label>
          <input
            id="debut-date"
            type="date"
            value={debutDate}
            onChange={e => setDebutDate(e.target.value)}
            className="h-control w-full rounded-control border border-line-strong bg-field px-2.5 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="oshi-date" className="block text-xs font-medium text-ink-2">
            입덕일 (년.월.일)
          </label>
          <input
            id="oshi-date"
            type="date"
            value={oshiDate}
            onChange={e => setOshiDate(e.target.value)}
            className="h-control w-full rounded-control border border-line-strong bg-field px-2.5 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-ink-2">멤버십</span>
          <button
            type="button"
            onClick={() => setMembership(v => !v)}
            style={
              membership
                ? { borderColor: validHex || "var(--color-accent, #2563eb)", borderWidth: 2 }
                : undefined
            }
            className={`h-control w-full rounded-control border text-sm font-medium transition ${
              membership
                ? "border-accent text-ink"
                : "border-line-strong bg-field text-ink-3"
            }`}
          >
            멤버십
          </button>
        </div>
      </div>

      {/* 오시마크 / 팬네임 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="oshi-mark" className="block text-sm font-medium text-ink">
            오시마크
          </label>
          <input
            id="oshi-mark"
            type="text"
            value={oshiMark}
            onChange={e => setOshiMark(e.target.value)}
            className="h-control w-full rounded-control border border-line-strong bg-field px-3 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="fan-name" className="block text-sm font-medium text-ink">
            팬네임
          </label>
          <input
            id="fan-name"
            type="text"
            value={fanName}
            onChange={e => setFanName(e.target.value)}
            className="h-control w-full rounded-control border border-line-strong bg-field px-3 text-sm"
          />
        </div>
      </div>

      {/* 공식색 + 테마 설정 */}
      <div className="space-y-2.5 rounded-xl border border-line p-3.5">
        <div className="flex items-center justify-between">
          <label htmlFor="official-color" className="text-sm font-medium text-ink">
            공식색
          </label>
          {validHex && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
              <span
                className="inline-block h-4 w-4 rounded-full border border-black/15"
                style={{ backgroundColor: validHex }}
              />
              {validHex}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label="공식색 선택"
            value={validHex || "#6366F1"}
            onChange={e => setOfficialColor(e.target.value.toUpperCase())}
            className="h-10 w-12 shrink-0 cursor-pointer rounded-control border border-line bg-field p-1"
          />
          <input
            id="official-color"
            type="text"
            value={officialColor}
            onChange={e => setOfficialColor(e.target.value)}
            maxLength={10}
            className="h-control min-w-0 flex-1 rounded-control border border-line-strong bg-field px-3 text-sm uppercase"
          />
          {officialColor && (
            <button
              type="button"
              onClick={() => {
                setOfficialColor("");
                setUseThemeColor(false);
              }}
              className="h-control rounded-control border border-line px-3 text-xs text-ink-2 hover:bg-ground-2"
            >
              초기화
            </button>
          )}
        </div>

        <label className="flex cursor-pointer items-center justify-between pt-1 text-sm text-ink-2">
          <span>라이버 창에 공식색 테마 적용</span>
          <input
            type="checkbox"
            checked={useThemeColor}
            disabled={!validHex}
            onChange={e => setUseThemeColor(e.target.checked)}
            className="h-4 w-4 accent-accent disabled:opacity-40"
          />
        </label>
      </div>

      {/* 트위터 계정 추가하기 */}
      <div className="space-y-2">
        <label htmlFor="tw-link" className="block text-sm font-medium text-ink">
          트위터 계정 추가하기
        </label>
        <div className="flex gap-2">
          <input
            id="tw-link"
            type="text"
            value={twitterInput}
            onChange={e => setTwitterInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTwitterAccount();
              }
            }}
            className="h-control min-w-0 flex-1 rounded-control border border-line-strong bg-field px-3 text-sm"
          />
          <button
            type="button"
            onClick={addTwitterAccount}
            disabled={!twitterInput.trim()}
            className="flex h-control shrink-0 items-center gap-1 rounded-control border border-line bg-ground-2 px-3.5 text-sm font-medium text-ink disabled:opacity-40"
          >
            <Plus size={15} /> 추가
          </button>
        </div>

        {twitterUrls.length > 0 && (
          <ul className="space-y-1.5 pt-1">
            {twitterUrls.map((url, idx) => (
              <li
                key={url}
                className="flex items-center justify-between gap-2 rounded-control border border-line bg-ground-2/60 px-3 py-2 text-sm"
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-ink hover:underline"
                >
                  <span className="shrink-0 rounded bg-ground px-1.5 py-0.5 text-[11px] font-medium text-ink-2">
                    {idx === 0 ? "본계정" : `계정 ${idx + 1}`}
                  </span>
                  <span className="truncate font-medium">{extractTwitterHandle(url)}</span>
                  <ExternalLink size={13} className="shrink-0 text-ink-3" />
                </a>
                <button
                  type="button"
                  onClick={() => removeTwitterAccount(idx)}
                  aria-label="트위터 계정 삭제"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-ground hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 니지위키 링크 */}
      <div className="space-y-1.5">
        <label htmlFor="wiki-link" className="block text-sm font-medium text-ink">
          니지위키 링크
        </label>
        <input
          id="wiki-link"
          type="text"
          value={nijiwikiUrl}
          onChange={e => setNijiwikiUrl(e.target.value)}
          className="h-control w-full rounded-control border border-line-strong bg-field px-3 text-sm"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="h-control flex-1 rounded-control border border-line text-sm font-medium text-ink-2 hover:bg-ground-2"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={busy}
          className="h-control flex-1 rounded-control bg-accent text-sm font-medium text-on-accent disabled:opacity-40"
        >
          {busy ? "저장 중..." : isEdit ? "수정 완료" : "라이버 등록"}
        </button>
      </div>
    </form>
  );
}
