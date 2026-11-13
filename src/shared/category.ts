export type Category = "song" | "live" | "other";

// 제목에 노래 관련 단어가 있으면 라이브 방송이어도 노래로 묶는다.
const SONG_WORDS = /歌|唄|うたみた|ウタミタ|うたってみた|うたわく|カラオケ|カバー|弾き語り|楽曲|音楽|ソング|オリ曲|\b(?:cover(?:ed)?|karaoke|sing(?:ing)?|song|music|music video|mv)\b|노래|노래방|가라오케|커버|불러보았다|우타미타|우타와쿠|신곡|뮤직비디오/i;
const LIVE_WORDS = /配信|生放送|雑談|同時視聴|ゲーム|live|stream|枠|archive|アーカイブ|#\d+|part\s*\d+/i;

export function classify(title: string, isLive: boolean, hasLiveInfo: boolean): Category {
  if (SONG_WORDS.test(title)) return "song";
  if (isLive) return "live";
  if (!hasLiveInfo && LIVE_WORDS.test(title)) return "live";
  return "other";
}
