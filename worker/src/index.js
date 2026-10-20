// Cloudflare Worker: stores the daily log with server-side timestamps.
// - Anyone can READ the log (GET /api/days).
// - Only someone with the edit PIN can WRITE, and only for "today" (Bangkok time, server clock).
// - Past days can never be changed. One-time backfill is stored with source "backfill".

const START = "2026-08-26";
const TZ = "Asia/Bangkok";

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function addDays(key, n) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export default {
  async fetch(req, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Headers": "Content-Type, X-Edit-Pin",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...cors } });

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const url = new URL(req.url);
    const authed = () => env.EDIT_PIN && safeEqual(req.headers.get("X-Edit-Pin") || "", env.EDIT_PIN);

    if (req.method === "GET" && url.pathname === "/api/days") {
      const list = await env.TRACKER.list({ prefix: "day:" });
      const days = {};
      await Promise.all(list.keys.map(async (k) => {
        days[k.name.slice(4)] = JSON.parse(await env.TRACKER.get(k.name));
      }));
      const backfillDone = !!(await env.TRACKER.get("meta:backfill"));
      return json({ today: todayKey(), start: START, backfillDone, days });
    }

    if (req.method === "POST" && url.pathname === "/api/today") {
      if (!authed()) return json({ error: "Wrong or missing PIN" }, 401);
      let body;
      try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
      const key = todayKey();
      const entry = { study: !!body.study, work: !!body.work, loggedAt: new Date().toISOString(), source: "live" };
      await env.TRACKER.put("day:" + key, JSON.stringify(entry));
      return json({ date: key, entry });
    }

    if (req.method === "POST" && url.pathname === "/api/backfill") {
      if (!authed()) return json({ error: "Wrong or missing PIN" }, 401);
      if (await env.TRACKER.get("meta:backfill")) return json({ error: "Backfill was already done" }, 409);
      const now = new Date().toISOString();
      const end = addDays(todayKey(), -1);
      let count = 0;
      for (let k = START; k <= end; k = addDays(k, 1)) {
        if (await env.TRACKER.get("day:" + k)) continue;
        await env.TRACKER.put("day:" + k, JSON.stringify({ study: true, work: true, loggedAt: now, source: "backfill" }));
        count++;
      }
      await env.TRACKER.put("meta:backfill", now);
      return json({ backfilled: count, through: end });
    }

    return json({ error: "Not found" }, 404);
  },
};
