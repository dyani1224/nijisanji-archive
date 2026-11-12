// wrangler.jsonc 를 읽는다(주석 허용). dev·db-init·check 가 같이 쓴다.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function readWranglerConfig(dir = ".") {
  const raw = readFileSync(join(dir, "wrangler.jsonc"), "utf8");
  const noComments = raw.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m, str) => str ?? "");
  return JSON.parse(noComments.replace(/,\s*([}\]])/g, "$1"));
}
