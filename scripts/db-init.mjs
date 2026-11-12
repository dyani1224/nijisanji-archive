// 로컬 D1 에 schema.sql 을 적용하고, seed.sql 이 있으면 견본 행을 넣는다(미리보기 전용).
// 배포 때는 BAZE 가 schema.sql 만 적용한다. seed.sql 은 배포되지 않는다.
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { readWranglerConfig } from "./wrangler-config.mjs";

const cfg = readWranglerConfig();
const db = cfg.d1_databases?.[0]?.database_name;
if (!db) process.exit(0);
for (const file of ["schema.sql", "seed.sql"]) {
  if (!existsSync(file)) continue;
  const r = spawnSync("npx", ["wrangler", "d1", "execute", db, "--local", `--file=${file}`], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
