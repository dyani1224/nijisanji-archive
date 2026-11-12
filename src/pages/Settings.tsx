import { Download, HardDrive, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageHead } from "../components/ui";
import { errText } from "../lib/client";
import { exportArchive, importArchive, readArchive } from "../lib/localArchive";

type Counts = { livers: number; videos: number; timestamps: number };

export default function Settings() {
  const input = useRef<HTMLInputElement>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const data = await readArchive();
    setCounts({ livers: data.livers.length, videos: data.videos.length, timestamps: data.timestamps.length });
  };

  useEffect(() => { refresh().catch(e => setError(errText(e))); }, []);

  const download = async () => {
    setMessage(""); setError(""); setBusy(true);
    try {
      const json = await exportArchive();
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `nijisanji-archive-${new Date().toLocaleDateString("sv-SE")}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMessage("백업 파일 다운로드를 시작했어요. 안전한 곳에 보관해 주세요.");
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  };

  const readFile = async (file: File) => {
    setMessage(""); setError("");
    if (file.size > 25 * 1024 * 1024) {
      setError("파일 크기는 25MB 이하여야 해요.");
      return;
    }
    if (!window.confirm("이 백업 파일을 읽으면 현재 이 브라우저에 저장된 기록이 전부 교체돼요. 계속할까요?")) return;
    setBusy(true);
    try {
      const stats = await importArchive(await file.text());
      await refresh();
      setMessage(`복원 완료! 라이버 ${stats.livers}명 · 영상 ${stats.videos}개 · 타임스탬프 ${stats.timestamps}개를 불러왔어요.`);
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  };

  return (
    <>
      <PageHead title="환경설정" />
      <div className="space-y-6 px-4 py-5 md:px-8">
        <section className="rounded-control border border-line p-4">
          <h2 className="flex items-center gap-2 text-base font-semibold"><HardDrive size={19} aria-hidden /> 이 기기의 저장 기록</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            로그인 없이 이용할 수 있어요. 라이버, 영상 분류, 즐겨찾기, 메모와 타임스탬프는
            현재 사용 중인 브라우저의 기기 저장소(IndexedDB)에 자동 저장돼요.
          </p>
          {counts && <p className="mt-3 text-sm font-medium">라이버 {counts.livers}명 · 영상 {counts.videos}개 · 타임스탬프 {counts.timestamps}개</p>}
          <p className="mt-3 text-xs leading-relaxed text-ink-3">
            다른 기기나 브라우저와 자동으로 동기화되지는 않아요. 시크릿 모드나 사이트 데이터 삭제 시 기록이 사라질 수 있으니 주기적으로 백업해 주세요.
          </p>
        </section>

        <section className="rounded-control border border-line p-4">
          <h2 className="text-base font-semibold">데이터 내보내기</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">현재 기기의 모든 덕질 기록을 JSON 파일로 저장해요. 다른 기기에서 이 파일을 읽으면 기록을 옮길 수 있어요.</p>
          <button type="button" disabled={busy} onClick={download}
            className="mt-4 flex h-control w-full items-center justify-center gap-2 rounded-control bg-accent px-4 font-medium text-on-accent disabled:opacity-40 sm:w-auto">
            <Download size={18} aria-hidden /> 내보내기 (백업 다운로드)
          </button>
        </section>

        <section className="rounded-control border border-line p-4">
          <h2 className="text-base font-semibold">데이터 읽기</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">이전에 내보낸 JSON 파일을 선택해서 기록을 복원해요.</p>
          <p className="mt-2 text-sm text-danger">주의: 현재 브라우저의 기록은 백업 파일 내용으로 교체돼요. 기존 기록이 필요하면 먼저 내보내기를 해 주세요.</p>
          <input ref={input} type="file" accept=".json,application/json" className="hidden"
            aria-label="백업 JSON 파일 선택" onChange={e => {
              const file = e.target.files?.[0];
              e.currentTarget.value = "";
              if (file) void readFile(file);
            }} />
          <button type="button" disabled={busy} onClick={() => input.current?.click()}
            className="mt-4 flex h-control w-full items-center justify-center gap-2 rounded-control border border-line-strong px-4 font-medium hover:bg-ground-2 disabled:opacity-40 sm:w-auto">
            <Upload size={18} aria-hidden /> 읽기 (백업 불러오기)
          </button>
        </section>
        {message && <p role="status" className="text-sm text-ink-2">{message}</p>}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <p className="text-xs leading-relaxed text-ink-3">기존 Supabase 계정에 저장된 데이터는 자동으로 옮겨지지 않아요. 이 백업 기능은 변경 이후 기기에 저장한 기록을 대상으로 해요.</p>
      </div>
    </>
  );
}
