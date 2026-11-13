import { ChevronLeft, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { LiverForm, normalizeHexColor } from "../components/LiverForm";
import { Avatar, PageHead } from "../components/ui";
import { listLivers, useFetch } from "../lib/client";

export default function Livers() {
  const { data, error, loading, reload } = useFetch(listLivers, []);
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdding = searchParams.get("add") === "1";
  const [msg, setMsg] = useState("");

  const openAdd = () => {
    setMsg("");
    setSearchParams({ add: "1" });
  };

  const closeAdd = () => {
    setSearchParams({});
  };

  if (isAdding) {
    return (
      <>
        <PageHead
          back={
            <button
              type="button"
              onClick={closeAdd}
              aria-label="목록으로"
              className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-ground-2"
            >
              <ChevronLeft size={24} />
            </button>
          }
          title="라이버 추가"
        />
        <div className="px-4 pt-4 md:px-8">
          <LiverForm
            onSaved={(_liver, message) => {
              setMsg(message);
              reload();
              closeAdd();
            }}
            onCancel={closeAdd}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHead title="라이버">
        <button
          type="button"
          onClick={openAdd}
          className="flex h-8 items-center gap-1 rounded-full bg-accent px-3 text-xs font-medium text-on-accent hover:opacity-90"
        >
          <Plus size={14} />
          <span>추가</span>
        </button>
      </PageHead>

      <div className="px-4 pt-3 md:px-8">
        {msg && (
          <p role="status" className="mb-3 rounded-control bg-ground-2 px-3 py-2 text-sm text-ink-2">
            {msg}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}
        {loading && !data && <p className="py-6 text-sm text-ink-3">불러오는 중</p>}
        {data && data.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-ink-2">등록된 라이버가 없어요.</p>
            <button
              type="button"
              onClick={openAdd}
              className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-medium text-on-accent"
            >
              <Plus size={16} /> 라이버 추가하기
            </button>
          </div>
        )}

        <ul className="divide-y divide-line sm:grid sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0">
          {data?.map(l => {
            const ja = l.name_ja || l.name;
            const ko = l.name_ko || "";
            const hex = normalizeHexColor(l.official_color || "");

            return (
              <li key={l.id} className="sm:border-b sm:border-line">
                <Link to={`/livers/${l.id}`} className="flex items-center gap-3.5 py-3.5">
                  <Avatar src={l.avatar} name={ja} size={52} isLive={l.is_live} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-base font-bold text-ink">{ja}</span>
                      {l.oshi_mark && <span className="shrink-0 text-sm">{l.oshi_mark}</span>}
                      {hex && (
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/15"
                          style={{ backgroundColor: hex }}
                        />
                      )}
                    </span>
                    {ko && <span className="mt-0.5 block truncate text-xs text-ink-2">{ko}</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
