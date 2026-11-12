// _base 의 소유자 화면 견본: 문의함(상태·담당자) + 설정. 새 템플릿은 이 파일을 자기 도메인으로 바꾼다(src/owner/OWNER.md).
import { Inbox, Settings as Gear } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { content, inquiryStatus, ownerSample, settings } from "../content";
import { sample, type Row } from "../lib/data";
import { dateTimeKo } from "../lib/format";
import { DetailDrawer, Field } from "../owner/DetailDrawer";
import { OwnerGate, useOwner } from "../owner/OwnerGate";
import { OwnerShell } from "../owner/OwnerShell";
import { RecordList, type Column } from "../owner/RecordList";
import { SettingsForm } from "../owner/SettingsForm";
import { StatusActions, StatusPill } from "../owner/StatusPill";

type Inquiry = Row & { id: number; code: string; name: string; contact: string; message: string; status: string; assignee: string; created_at: string };

export default function Admin() {
  const demo = useMemo(() => sample(ownerSample, settings, { inquiries: inquiryStatus }), []);
  return (
    <OwnerGate title={content.owner.title} sample={demo}>
      <Screens />
    </OwnerGate>
  );
}

function Screens() {
  const { data } = useOwner();
  const [tab, setTab] = useState(() => new URLSearchParams(location.search).get("tab") ?? "inbox");
  const [rows, setRows] = useState<Inquiry[] | null>(null);
  const [open, setOpen] = useState<Inquiry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conf, setConf] = useState<{ values: Record<string, unknown>; updated: string | null } | null>(null);

  const load = useCallback(() => data.list<Inquiry>("inquiries").then(setRows, e => setError(e.message)), [data]);
  useEffect(() => { void load(); data.settings().then(setConf, e => setError(e.message)); }, [data, load]);
  const go = (id: string) => { setTab(id); history.replaceState(null, "", id === "inbox" ? location.pathname : `?tab=${id}`); };

  async function patch(p: Partial<Inquiry>) {
    if (!open) return;
    setBusy(true); setError("");
    try {
      const row = await data.update<Inquiry>("inquiries", open.id, p);
      setRows(rs => rs?.map(r => (r.id === row.id ? row : r)) ?? rs);
      setOpen(row);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  const columns: Column<Inquiry>[] = [
    { key: "name", label: "보낸 분", width: "minmax(0,0.8fr)" },
    { key: "message", label: "내용", width: "minmax(0,2fr)" },
    { key: "assignee", label: "담당", width: "6rem", render: r => r.assignee || "—", hideOnPhone: true },
    { key: "created_at", label: "받은 시각", width: "10rem", render: r => dateTimeKo(r.created_at), csv: r => r.created_at },
    { key: "status", label: "상태", width: "6rem", render: r => <StatusPill status={r.status} config={inquiryStatus} />, csv: r => inquiryStatus[r.status as keyof typeof inquiryStatus]?.label ?? r.status },
  ];
  const fresh = rows?.filter(r => r.status === "new").length ?? 0;

  return (
    <OwnerShell title={content.owner.title} active={tab} onTab={go} tabs={[{ id: "inbox", label: "문의", icon: Inbox, badge: fresh }, { id: "settings", label: "설정", icon: Gear }]}>
      {error && <p className="mb-3 rounded-control border border-danger/30 bg-danger/10 px-3 py-2 text-step--1 text-danger" role="alert">{error}</p>}
      {tab === "inbox" ? (
        <RecordList
          label="문의 목록" rows={rows ?? []} loading={!rows} columns={columns}
          statuses={inquiryStatus} statusKey="status" dateKey="created_at" assigneeKey="assignee" assignees={content.owner.members}
          searchText={r => `${r.name} ${r.contact} ${r.message} ${r.code}`}
          sorts={[{ id: "new", label: "최근 받은 순", compare: (a, b) => b.created_at.localeCompare(a.created_at) }, { id: "old", label: "오래된 순", compare: (a, b) => a.created_at.localeCompare(b.created_at) }]}
          onOpen={setOpen} selectedId={open?.id} csvName="문의.csv"
          empty={{ title: "아직 받은 문의가 없어요", body: "첫 화면의 문의 폼으로 들어온 내용이 여기에 쌓여요." }}
        />
      ) : conf ? (
        <SettingsForm spec={settings} values={conf.values} updated={conf.updated} onSave={async v => { const r = await data.saveSettings(v); setConf(r); return r; }}
          groups={[["영업", ["open", "hours", "closed", "leadDays"]], ["주문·안내", ["notice", "minOrder", "bank"]]]} />
      ) : <p className="text-ink-3" role="status">불러오는 중…</p>}

      <DetailDrawer open={!!open} onClose={() => setOpen(null)} title={open?.name} subtitle={open && <>{dateTimeKo(open.created_at)} · 접수 번호 <span className="font-mono">{open.code}</span></>}
        footer={open && <StatusActions status={open.status} config={inquiryStatus} busy={busy} onMove={to => void patch({ status: to })} />}>
        {open && (
          <dl className="m-0 divide-y divide-line">
            <Field label="상태"><StatusPill status={open.status} config={inquiryStatus} /></Field>
            <Field label="연락처">{open.contact}</Field>
            <Field label="내용"><p className="m-0 whitespace-pre-wrap">{open.message}</p></Field>
            <Field label="담당">
              <label className="sr-only" htmlFor="assignee">담당자</label>
              <select id="assignee" data-autofocus value={open.assignee} disabled={busy} onChange={e => void patch({ assignee: e.target.value })} className="h-control-sm px-2.5">
                <option value="">담당자 없음</option>
                {content.owner.members.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </dl>
        )}
      </DetailDrawer>
    </OwnerShell>
  );
}
