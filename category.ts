export type Category = "song" | "live" | "shorts" | "kirinuki" | "none";
export type YtVideoType = "video" | "shorts" | "live";

const KIRINUKI_WORDS = /り抜き|키리누키/i;
const SONG_WORDS = /歌|唄|うたみた|ウタミタ|うたってみた|うたわく|カラオケ|カバー|弾き語り|楽曲|音楽|ソング|オリ曲|\b(?:cover(?:ed)?|karaoke|sing(?:ing)?|song|music|music video|mv)\b|노래|노래방|가라오케|커버|불러보았다|우타미타|우타와쿠|신곡|뮤직비디오/i;

export function classify(title: string, isLive: boolean, isShorts = false): Category {
  if (KIRINUKI_WORDS.test(title)) return "kirinuki";
  if (SONG_WORDS.test(title)) return "song";
  if (isShorts) return "shorts";
  if (isLive) return "live";
  return "none";
}
