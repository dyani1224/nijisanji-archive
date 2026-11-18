import { useState } from "react";
import { Chips, PageHead, VideoList } from "../components/ui";
import { useVideos, type Category, type Filter } from "../lib/client";

type FilterChip = "all" | Exclude<Category, "none">;

const CHIPS: [FilterChip, string][] = [
  ["all", "전체"],
  ["song", "노래"],
  ["live", "라이브"],
  ["shorts", "Shorts"],
  ["kirinuki", "키리누키"],
];

export default function Favorites() {
  const [chip, setChip] = useState<FilterChip>("all");
  const filter: Filter = chip === "all" ? { favorite: true } : { favorite: true, category: chip };
  const list = useVideos(filter);

  return (
    <>
      <PageHead title="즐겨찾기" />
      <div className="px-4 pt-3 md:px-8">
        <Chips value={chip} options={CHIPS} onChange={setChip} />
        <VideoList
          {...list}
          onFavorite={list.toggleFavorite}
          onMore={list.loadMore}
          empty="즐겨찾기한 영상이 없어요. 영상 옆의 하트를 눌러 모아 보세요."
        />
      </div>
    </>
  );
}
