// 템플릿 공통 Worker 도구. 템플릿마다 그대로 복사해 쓴다(템플릿은 서로 import 하지 않는다).
import type { Context, MiddlewareHandler } from "hono";

export type Bindings = { DB: D1Database; ASSETS: Fetcher; ADMIN_TOKEN?: string };

/** 문자열만 받고, 앞뒤 공백을 자르고, 길이를 제한한다. 문자열이 아니면 "". */
export const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** 1..max 사이 정수. 숫자가 아니면 fallback. */
export const intIn = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export const bad = (c: Context, message: string, status: 400 | 403 | 404 | 409 | 429 = 400) => c.json({ error: message }, status);

/**
 * 서버 오류를 로그 한 덩어리로: 메시지와 stack, 그리고 cause 를 다섯 단계까지. 미리보기의
 * 500 은 이 줄로 원인을 찾는다(에이전트는 serve-bg 로그를 본다).
 */
export function describeError(err: unknown): string {
  const parts: string[] = [];
  let current: unknown = err;
  for (let depth = 0; depth < 5 && current != null; depth++) {
    if (!(current instanceof Error)) {
      parts.push(String(current));
      break;
    }
    parts.push((depth ? "caused by: " : "") + (current.stack ?? `${current.name}: ${current.message}`));
    current = (current as Error & { cause?: unknown }).cause;
  }
  return parts.join("\n").slice(0, 8000);
}

/** 길이가 같을 때 시간 차이 없이 비교한다. */
export function sameToken(a: string, b: string) {
  if (!a || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/**
 * Authorization 헤더의 Bearer 값. 화면은 토큰을 encodeURIComponent 로 싣는다(한글 비밀번호는 헤더 값에
 * 그대로 들어가지 못해 fetch 가 요청 전에 실패한다) — 여기서 되돌린다. 그대로 보낸 ASCII 토큰도 통한다.
 */
export function bearerToken(header: string | undefined) {
  const raw = (header ?? "").replace(/^Bearer\s+/i, "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * 소유자 전용 API. 화면은 /admin#k=<ADMIN_TOKEN> 에서 열리고, 토큰은 Authorization 헤더로만 온다
 * (URL 해시는 서버 로그에 남지 않는다). ADMIN_TOKEN 이 없거나 틀리면 404 로 존재 자체를 숨긴다.
 */
export const ownerOnly: MiddlewareHandler<{ Bindings: Bindings }> = async (c, next) => {
  const got = bearerToken(c.req.header("authorization"));
  if (!c.env.ADMIN_TOKEN || !sameToken(got, c.env.ADMIN_TOKEN)) return c.json({ error: "not found" }, 404);
  await next();
};

/** 엑셀에서 바로 열리는 CSV(BOM). =,+,-,@ 로 시작하는 칸은 수식으로 실행되지 않게 ' 를 붙인다. */
export function csv(c: Context, filename: string, head: string[], rows: unknown[][]) {
  const cell = (v: unknown) => {
    const s = String(v ?? "");
    return `"${(/^[=+\-@\t\r]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
  };
  const body = "﻿" + [head, ...rows].map(r => r.map(cell).join(",")).join("\r\n");
  return c.body(body, 200, {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "cache-control": "no-store",
  });
}

export async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

/** 4자리 비밀번호 같은 짧은 비밀을 소금과 함께 저장한다. */
export async function hashSecret(secret: string) {
  const salt = crypto.randomUUID();
  return `${salt}:${await sha256(salt + secret)}`;
}
export async function checkSecret(stored: string, secret: string) {
  const [salt, hash] = stored.split(":");
  return sameToken(await sha256(salt + secret), hash);
}

/**
 * 보존 기한: 기준 시각 + days 가 지났으면 tables 를 비운다. 크론 대신 읽고 쓸 때마다 부른다
 * (BAZE 관리형 배포는 크론을 싣지 않는다). 지웠으면 true.
 */
export async function purgeAfter(db: D1Database, anchorIso: string | undefined, days: number, tables: string[]) {
  if (!anchorIso) return false;
  const anchor = Date.parse(anchorIso);
  if (!Number.isFinite(anchor) || Date.now() < anchor + days * 864e5) return false;
  await db.batch(tables.map(t => db.prepare(`DELETE FROM ${t}`)));
  return true;
}

/** 같은 IP 가 window 초 안에 limit 번 넘게 쓰면 막는다. 테이블 rate_limit 이 schema.sql 에 있어야 한다. */
export async function rateLimited(c: Context<{ Bindings: Bindings }>, bucket: string, limit: number, windowSec: number) {
  const ip = c.req.header("cf-connecting-ip") ?? "local";
  const key = `${bucket}:${await sha256(ip)}`;
  const now = Math.floor(Date.now() / 1000);
  const row = await c.env.DB.prepare("SELECT count, window_start FROM rate_limit WHERE key = ?").bind(key).first<{ count: number; window_start: number }>();
  if (!row || now - row.window_start >= windowSec) {
    await c.env.DB.prepare("INSERT INTO rate_limit (key, count, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start").bind(key, now).run();
    return false;
  }
  if (row.count >= limit) return true;
  await c.env.DB.prepare("UPDATE rate_limit SET count = count + 1 WHERE key = ?").bind(key).run();
  return false;
}

/** 행마다 보존 기한: created_at(datetime('now') 형식)이 days 일보다 오래된 행을 지운다. */
export async function purgeOlderThan(db: D1Database, table: string, days: number) {
  await db.prepare(`DELETE FROM ${table} WHERE created_at < datetime('now', ?)`).bind(`-${Math.floor(days)} days`).run();
}
