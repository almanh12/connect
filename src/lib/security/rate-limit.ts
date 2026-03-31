/**
 * IP + user-based rate limiting for API routes (Edge-compatible).
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set;
 * otherwise falls back to in-memory sliding windows (single-instance only — use Upstash in production).
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

const WINDOW = "1 m";

/** Authenticated: per IP */
const AUTH_IP_MAX = 120;
/** Authenticated: per user id */
const USER_MAX = 300;
/** Unauthenticated: per IP only */
const ANON_IP_MAX = 60;

let redis: Redis | null = null;
let limitAuthIp: Ratelimit | null = null;
let limitUser: Ratelimit | null = null;
let limitAnonIp: Ratelimit | null = null;

function initUpstash(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;
  try {
    redis = new Redis({ url, token });
    limitAuthIp = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(AUTH_IP_MAX, WINDOW),
      prefix: "deca:rl:aip",
      analytics: false,
    });
    limitUser = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(USER_MAX, WINDOW),
      prefix: "deca:rl:usr",
      analytics: false,
    });
    limitAnonIp = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(ANON_IP_MAX, WINDOW),
      prefix: "deca:rl:anon",
      analytics: false,
    });
    return true;
  } catch (e) {
    console.error("[rate-limit] Upstash init failed:", e);
    return false;
  }
}

const upstashReady = initUpstash();

const memoryHits = new Map<string, number[]>();
const MEMORY_WINDOW_MS = 60_000;

function memoryAllow(key: string, max: number): { ok: boolean; reset: number } {
  const now = Date.now();
  const windowStart = now - MEMORY_WINDOW_MS;
  let arr = memoryHits.get(key) ?? [];
  arr = arr.filter((t) => t > windowStart);
  if (arr.length >= max) {
    const oldest = Math.min(...arr);
    return { ok: false, reset: oldest + MEMORY_WINDOW_MS };
  }
  arr.push(now);
  memoryHits.set(key, arr);
  return { ok: true, reset: now + MEMORY_WINDOW_MS };
}

function retrySecFromReset(resetMs: number): number {
  return Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
}

export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export type RateLimitOutcome =
  | { ok: true }
  | { ok: false; retryAfterSec: number; message: string };

export async function enforceApiRateLimit(
  request: NextRequest,
  userId: string | null
): Promise<RateLimitOutcome> {
  const ip = getClientIp(request);

  if (upstashReady && limitAuthIp && limitUser && limitAnonIp) {
    if (userId) {
      const [ipRes, userRes] = await Promise.all([
        limitAuthIp.limit(ip),
        limitUser.limit(userId),
      ]);
      if (!ipRes.success) {
        return {
          ok: false,
          retryAfterSec: retrySecFromReset(ipRes.reset ?? Date.now() + 60_000),
          message: "Too many requests from this network. Please wait and try again.",
        };
      }
      if (!userRes.success) {
        return {
          ok: false,
          retryAfterSec: retrySecFromReset(userRes.reset ?? Date.now() + 60_000),
          message: "Too many requests for this account. Please wait and try again.",
        };
      }
    } else {
      const ipRes = await limitAnonIp.limit(ip);
      if (!ipRes.success) {
        return {
          ok: false,
          retryAfterSec: retrySecFromReset(ipRes.reset ?? Date.now() + 60_000),
          message: "Too many requests. Please sign in or try again later.",
        };
      }
    }
    return { ok: true };
  }

  // In-memory fallback (dev / missing Redis)
  if (userId) {
    const m1 = memoryAllow(`aip:${ip}`, AUTH_IP_MAX);
    if (!m1.ok) {
      return {
        ok: false,
        retryAfterSec: retrySecFromReset(m1.reset),
        message: "Too many requests from this network. Please wait and try again.",
      };
    }
    const m2 = memoryAllow(`uid:${userId}`, USER_MAX);
    if (!m2.ok) {
      return {
        ok: false,
        retryAfterSec: retrySecFromReset(m2.reset),
        message: "Too many requests for this account. Please wait and try again.",
      };
    }
  } else {
    const m = memoryAllow(`anon:${ip}`, ANON_IP_MAX);
    if (!m.ok) {
      return {
        ok: false,
        retryAfterSec: retrySecFromReset(m.reset),
        message: "Too many requests. Please sign in or try again later.",
      };
    }
  }
  return { ok: true };
}
