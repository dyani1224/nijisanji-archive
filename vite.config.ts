import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { getRequestListener } from "@hono/node-server";

// 개발 중에는 /api 를 server/app.ts 로 직접 처리한다(배포에서는 Vercel 함수 api/ 가 같은 코드를 쓴다).
// .env.local 의 SUPABASE_URL 등 서버 값은 process.env 로 올린다. 브라우저 번들에는 들어가지 않는다.
function apiInDev(): Plugin {
  return {
    name: "archive-api-dev",
    configureServer(server) {
      Object.assign(process.env, loadEnv("development", process.cwd(), "") , process.env);
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        const mod = await server.ssrLoadModule("/server/app.ts");
        return getRequestListener(mod.default.fetch)(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiInDev()],
  server: { host: "0.0.0.0", port: 5173, allowedHosts: true },
});
