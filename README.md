# Charm School – Daily Routine Tracker

Tracks a daily routine: 15 minutes of study + 15 minutes of workout, every day since 26 August 2026.

## How it works

- `index.html` is the website (host it with GitHub Pages).
- `worker/` is a small Cloudflare Worker that stores the log.
- The **server** decides what "today" is (Bangkok time) and only accepts changes for today. Past days are locked for everyone.
- Anyone can view the log. Only someone with the edit PIN can tick today.
- Days from 26 Aug up to the day of setup can be imported once as **backfilled (self-reported)**. They are labelled that way on the page. Every day after that is logged live with a server timestamp.

## Deploy (about 10 minutes)

You need a free Cloudflare account and Node.js.

```bash
cd worker
npx wrangler login
npx wrangler kv namespace create TRACKER
```

1. Copy the `id` it prints into `worker/wrangler.toml` (replace `PASTE_KV_NAMESPACE_ID_HERE`).
2. Set your edit PIN (pick something long, only you know it):
   ```bash
   npx wrangler secret put EDIT_PIN
   ```
3. Deploy:
   ```bash
   npx wrangler deploy
   ```
4. Copy the Worker URL it prints (looks like `https://charm-school-tracker.<you>.workers.dev`) and paste it into `WORKER_URL` near the bottom of `index.html`. Commit and push.
5. Turn on GitHub Pages (Settings → Pages → Deploy from branch → `main` / root). Site: https://iwantfreecode.github.io/Charm-school/
6. Open the site, press **Unlock editing**, enter your PIN, then press **Import 26 Aug onward (one time)** if you want the earlier days included.

From then on, open the site each day, unlock, and tick today.
