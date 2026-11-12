import { useState } from "react";
import { errText, signIn } from "../lib/client";

const field = "mt-1.5 h-control w-full rounded-control border border-line-strong bg-field px-3";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try { await signIn(email.trim(), pw); }
    catch (err) { setError(errText(err)); }
    setBusy(false);
  };

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <form onSubmit={submit} className="w-full max-w-xs">
        <h1 className="text-xl font-semibold">니지산지 아카이브</h1>
        <label htmlFor="email" className="mt-6 block text-sm text-ink-2">이메일</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={field} />
        <label htmlFor="pw" className="mt-4 block text-sm text-ink-2">비밀번호</label>
        <input id="pw" type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} className={field} />
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        <button type="submit" disabled={!email || !pw || busy} className="mt-5 h-control w-full rounded-control bg-accent font-medium text-on-accent disabled:opacity-40">로그인</button>
      </form>
    </main>
  );
}
