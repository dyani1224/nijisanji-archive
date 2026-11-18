import type { RouteObject } from "react-router";
import App from "./App";
import Favorites from "./pages/Favorites";
import Home from "./pages/Home";
import LiverDetail from "./pages/LiverDetail";
import Livers from "./pages/Livers";
import Settings from "./pages/Settings";
import VideoDetail from "./pages/VideoDetail";

export const routes: RouteObject[] = [
  {
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "/livers", element: <Livers /> },
      { path: "/livers/:id", element: <LiverDetail /> },
      { path: "/favorites", element: <Favorites /> },
      { path: "/settings", element: <Settings /> },
      { path: "/video/:id", element: <VideoDetail /> },
      { path: "*", element: <Home /> },
    ],
  },
];
