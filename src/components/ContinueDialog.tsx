import { useContinuePrompt } from "../lib/client";

export function ContinueDialog() {
  const prompt = useContinuePrompt();
  if (!prompt) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="continue-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-sm rounded-2xl border border-line bg-ground p-5 shadow-xl">
        <h3 id="continue-dialog-title" className="text-base font-semibold text-ink">
          이어서 불러오기
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">
          {prompt.isResumePrompt ? (
            <>
              <strong className="font-medium text-ink">{prompt.liverName}</strong>의 이전 영상 불러오기가 중단된 상태예요.
              (현재 총 {prompt.totalCount.toLocaleString()}개 저장됨)
              <br />
              중단된 위치부터 1,000개씩 이어서 불러올까요?
            </>
          ) : (
            <>
              <strong className="font-medium text-ink">{prompt.liverName}</strong>의 영상{" "}
              {prompt.addedInBatch.toLocaleString()}개를 추가로 저장했어요.
              (현재 총 {prompt.totalCount.toLocaleString()}개)
              <br />
              남은 이전 영상 1,000개를 이어서 불러올까요?
            </>
          )}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => prompt.resolve(false)}
            className="h-10 rounded-control border border-line px-4 text-sm font-medium text-ink-2 hover:bg-ground-2"
          >
            중단
          </button>
          <button
            type="button"
            onClick={() => prompt.resolve(true)}
            className="h-10 rounded-control bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
