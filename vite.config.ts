import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// 미리보기는 샌드박스 밖에서 열린다: 0.0.0.0 에 붙고 모든 호스트를 받는다.
// /api 는 같은 샌드박스의 wrangler dev(8787)로 넘긴다. 배포 뒤에는 같은 Worker 가 받는다.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: "0.0.0.0", port: 5173, allowedHosts: true, proxy: { "/api": "http://127.0.0.1:8787" } },
});
