import { useState } from "react";
import { Chips, PageHead, VideoList } from "../components/ui";
import { useVideos } from "../lib/client";

const TABS: ["all" | "song" | "live", string][] = [["all", "전체"], ["song", "노래"], ["live", "라이브"]];

export default function Favorites() {
  const [tab, setTab] = useState<"all" | "song" | "live">("all");
  const list = useVideos(tab === "all" ? { favorite: true } : { favorite: true, tab });
  return (
    <>
      <PageHead title="즐겨찾기" />
      <div className="px-4 pt-3 md:px-8">
        <Chips value={tab} options={TABS} onChange={setTab} />
        <VideoList {...list} onFavorite={async v => { await list.toggleFavorite(v); }} onMore={list.loadMore} empty="하트를 누른 영상이 여기에 모여요." />
      </div>
    </>
  );
}
