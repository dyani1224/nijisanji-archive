// 미리보기: 화면(vite, 5173)을 바로 띄우고, 로컬 D1 준비 → wrangler dev(8787, /api)는 그 뒤에 병렬로.
// dist 가 없으면 wrangler 가 assets.directory 오류로 죽으므로 먼저 만든다. 한쪽이 죽어도 다른 쪽은 유지한다.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });
const procs = [];
const run = (cmd, args) => { const p = spawn(cmd, args, { stdio: "inherit" }); procs.push(p); return p; };
run(process.execPath, ["node_modules/vite/bin/vite.js", "--strictPort"]);
run(process.execPath, ["scripts/db-init.mjs"]).on("exit", code => {
  if (code) console.error(`db-init exited ${code}; starting the API anyway`);
  run(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "dev", "--ip", "0.0.0.0", "--port", "8787"]);
});
const stop = () => { for (const p of procs) p.kill("SIGTERM"); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
