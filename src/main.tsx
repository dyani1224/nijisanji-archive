import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { routes } from "./routes";
import "./styles.css";

const router = createBrowserRouter(routes);
// The BAZE preview reads the app's pages from here. Keep this line; add pages in routes.tsx.
(window as any).__baze = { ...(window as any).__baze, routes: router.routes };

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
