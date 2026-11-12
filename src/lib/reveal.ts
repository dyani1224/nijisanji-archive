// Scroll-driven motion fallback. Zero dependencies.
//
// styles.css drives .reveal / .reveal-stagger / .scrub-* with CSS scroll-driven animations
// (`animation-timeline: view()` / `scroll()`). Browsers without them (Firefox, older Safari)
// need two small helpers:
//
//   installRevealFallback()   adds `.is-inview` once an element enters the viewport and marks
//                             <html data-reveal="observer"> so the CSS hides nothing until the
//                             observer is live. No-ops when the browser supports view() or the
//                             visitor prefers reduced motion. App.tsx calls it once.
//
//   trackScrollProgress(el)   writes `--progress` (0–1) on `el` as it travels through the
//                             viewport, for scrubbed sequences (turntables, pinned chapters,
//                             progress bars) inside `@supports not (animation-timeline: view())`.
//                             Also a no-op when the browser scrubs natively.
import { useEffect } from "react";

export const supportsScrollTimeline = () =>
  typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()");
export const prefersReducedMotion = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const SELECTOR = ".reveal, .reveal-stagger > *";

export function installRevealFallback(root: ParentNode = document): () => void {
  if (typeof window === "undefined" || supportsScrollTimeline() || prefersReducedMotion()) return () => {};
  const html = document.documentElement;
  html.dataset.reveal = "observer";
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-inview");
        io.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0 },
  );
  const observe = () => {
    for (const el of root.querySelectorAll(SELECTOR)) if (!el.classList.contains("is-inview")) io.observe(el);
  };
  observe();
  // Pages render after route changes; pick up new sections without a re-install.
  const mo = new MutationObserver(observe);
  mo.observe(root === document ? document.body : (root as Node), { childList: true, subtree: true });
  return () => {
    io.disconnect();
    mo.disconnect();
    delete html.dataset.reveal;
  };
}

export function useRevealFallback(): void {
  useEffect(() => installRevealFallback(), []);
}

export function trackScrollProgress(el: HTMLElement, onProgress?: (p: number) => void): () => void {
  if (typeof window === "undefined" || supportsScrollTimeline()) return () => {};
  let frame = 0;
  const update = () => {
    frame = 0;
    const rect = el.getBoundingClientRect();
    const total = rect.height + window.innerHeight;
    const p = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / total));
    el.style.setProperty("--progress", p.toFixed(4));
    onProgress?.(p);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  update();
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  return () => {
    removeEventListener("scroll", schedule);
    removeEventListener("resize", schedule);
    if (frame) cancelAnimationFrame(frame);
  };
}
