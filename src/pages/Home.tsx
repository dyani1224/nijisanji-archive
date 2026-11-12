// _base 첫 화면 견본: 소유자 설정(공지·영업시간)을 읽어 보여 주고, 문의를 서버에 저장한다. 새 템플릿은 통째로 바꾼다.
import { useState, type FormEvent } from "react";
import { content, settings } from "../content";
import { api } from "../lib/api";
import { usePublicSettings } from "../lib/data";
import { describeSetting } from "../lib/settings";

export default function Home() {
  const s = usePublicSettings(settings);
  const [sent, setSent] = useState<{ code?: string; error?: string; busy?: boolean }>({});
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSent({ busy: true });
    try {
      const r = await api<{ code: string }>("/api/inquiries", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      form.reset();
      setSent({ code: r.code });
    } catch (err) { setSent({ error: (err as Error).message }); }
  }
  return (
    <main className="mx-auto grid max-w-xl gap-8 px-gutter py-12">
      {s.notice && <p className="rounded-control bg-ground-2 px-4 py-2 text-step--1" role="note">{s.notice}</p>}
      <header>
        <h1 className="font-display text-step-4 font-semibold leading-heading tracking-heading">{content.title}</h1>
        <p className="mt-2 text-ink-2">
          {describeSetting(settings.hours, s.hours)} · {describeSetting(settings.closed, s.closed)} 휴무
          {!s.open && " · 지금은 온라인 접수를 잠시 멈췄어요"}
        </p>
      </header>
      {sent.code ? (
        <p className="rounded-card border border-ok/30 bg-ok/10 p-5" role="status">문의를 보냈어요. 접수 번호 <b className="font-mono">{sent.code}</b></p>
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          <label className="grid gap-1.5"><span className="font-medium">이름</span><input name="name" required autoComplete="name" className="px-3" /></label>
          <label className="grid gap-1.5"><span className="font-medium">연락처</span><input name="contact" required placeholder="010-0000-0000" className="px-3" /></label>
          <label className="grid gap-1.5"><span className="font-medium">문의 내용</span><textarea name="message" required rows={4} className="px-3 py-2" /></label>
          {sent.error && <p className="text-step--1 text-danger" role="alert">{sent.error}</p>}
          <button disabled={sent.busy || !s.open} className="h-control rounded-control bg-accent font-medium text-on-accent hover:opacity-90 disabled:opacity-50">{sent.busy ? "보내는 중…" : "문의 보내기"}</button>
        </form>
      )}
    </main>
  );
}
