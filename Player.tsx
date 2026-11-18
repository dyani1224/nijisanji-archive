import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

export type PlayerHandle = { seek: (sec: number) => void; time: () => number };

let apiReady: Promise<void> | null = null;
function loadApi() {
  if (!apiReady) {
    apiReady = new Promise(resolve => {
      const w = window as any;
      if (w.YT?.Player) return resolve();
      const prev = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    });
  }
  return apiReady;
}

export default function Player({ videoId, handle }: { videoId: string; handle: Ref<PlayerHandle> }) {
  const box = useRef<HTMLDivElement>(null);
  const player = useRef<any>(null);
  useImperativeHandle(handle, () => ({
    seek: sec => { player.current?.seekTo?.(sec, true); player.current?.playVideo?.(); },
    time: () => player.current?.getCurrentTime?.() ?? 0,
  }), []);
  useEffect(() => {
    let dead = false;
    loadApi().then(() => {
      if (dead || !box.current) return;
      const el = document.createElement("div");
      box.current.replaceChildren(el);
      player.current = new (window as any).YT.Player(el, { videoId, width: "100%", height: "100%", playerVars: { playsinline: 1, rel: 0 } });
    });
    return () => { dead = true; player.current?.destroy?.(); player.current = null; };
  }, [videoId]);
  return <div ref={box} className="aspect-video w-full overflow-hidden bg-black [&>iframe]:h-full [&>iframe]:w-full" />;
}
