import { Outlet, ScrollRestoration } from "react-router";
import { useRevealFallback } from "./lib/reveal";

export default function App() {
  // IntersectionObserver fallback for .reveal when the browser has no scroll-driven animations.
  useRevealFallback();
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}
