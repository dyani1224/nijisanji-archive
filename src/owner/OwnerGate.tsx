// 소유자 화면의 문. /admin#k=<ADMIN_TOKEN> 으로 열면 바로 들어가고, 아니면 비밀번호를 묻는다.
// 비밀번호가 틀리면 틀렸다고 말한다 — 견본으로 몰래 넘어가지 않는다. 견본은 사람이 직접 고를 때만.
import { createContext, useCallback, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ApiError, isDemo } from "../lib/api";
import { live, type OwnerData } from "../lib/data";
import { clearOwnerToken, ownerToken, setOwnerToken } from "./ownerApi";

type Owner = { data: OwnerData; leave: () => void };
const Ctx = createContext<Owner | null>(null);

/** OwnerGate 안에서 지금 공급자(live / sample)와 나가기. */
export function useOwner(): Owner {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOwner 는 <OwnerGate> 안에서만 써요");
  return v;
}

const MODE = "owner.mode";
const getMode = () => { try { return sessionStorage.getItem(MODE); } catch { return null; } };
const putMode = (m: string | null) => { try { if (m) sessionStorage.setItem(MODE, m); else sessionStorage.removeItem(MODE); } catch { /* 없음 */ } };

type State = { kind: "checking" } | { kind: "ask"; error?: string; noServer?: boolean } | { kind: "in"; data: OwnerData };

export function OwnerGate({ title, sample, children }: { title: string; sample?: OwnerData; children: ReactNode }) {
  const [state, setState] = useState<State>({ kind: "checking" });

  const tryLive = useCallback(async () => {
    if (!ownerToken()) return setState({ kind: "ask" });
    setState({ kind: "checking" });
    try {
      await live.settings();
      putMode("live");
      setState({ kind: "in", data: live });
    } catch (e) {
      if (isDemo(e)) return setState({ kind: "ask", noServer: true });
      clearOwnerToken();
      setState({ kind: "ask", error: e instanceof ApiError && e.status === 404 ? "비밀번호가 맞지 않아요" : (e as Error).message });
    }
  }, []);

  useEffect(() => {
    const hashSample = location.hash === "#sample";
    if (sample && (hashSample || (getMode() === "sample" && !location.hash.includes("k=")))) {
      putMode("sample");
      setState({ kind: "in", data: sample });
    } else void tryLive();
  }, [sample, tryLive]);

  const leave = useCallback(() => { clearOwnerToken(); putMode(null); history.replaceState(null, "", location.pathname); setState({ kind: "ask" }); }, []);

  if (state.kind === "in") return <Ctx.Provider value={{ data: state.data, leave }}>{children}</Ctx.Provider>;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = String(new FormData(e.currentTarget).get("token") ?? "");
    if (!v) return setState({ kind: "ask", error: "비밀번호를 적어 주세요" });
    setOwnerToken(v);
    void tryLive();
  };
  const err = state.kind === "ask" ? state.error : undefined;
  return (
    <main className="min-h-dvh grid place-items-center bg-ground-2 px-gutter py-12">
      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 elev-2">
        <h1 className="font-display text-step-2 font-semibold leading-heading tracking-heading">{title}</h1>
        {state.kind === "checking" ? (
          <p className="mt-4 text-ink-2" role="status">확인하고 있어요…</p>
        ) : (
          <>
            <form onSubmit={submit} className="mt-5 grid gap-2" noValidate>
              <label htmlFor="owner-token" className="text-step--1 font-medium">관리자 비밀번호</label>
              <input id="owner-token" name="token" type="password" autoComplete="current-password" className="px-3" aria-invalid={!!err} aria-describedby={err ? "owner-token-err" : undefined} />
              {err && <p id="owner-token-err" className="text-step--1 text-danger" role="alert">{err}</p>}
              {state.noServer && <p className="text-step--1 text-ink-2" role="status">이 미리보기에는 서버가 없어요. 견본으로 둘러볼 수 있어요.</p>}
              <button className="mt-2 h-control rounded-control bg-accent px-4 font-medium text-on-accent hover:opacity-90">열기</button>
            </form>
            {sample && (
              <button type="button" onClick={() => { putMode("sample"); setState({ kind: "in", data: sample }); }} className="mt-3 h-control w-full rounded-control border border-line px-4 text-ink-2 hover:border-line-strong hover:text-ink">
                견본 데이터로 둘러보기
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}
