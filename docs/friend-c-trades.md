# Friend C: Loop matcher, trades, Stripe

Paste this whole file into Codex and say: "I'm Friend C. Work through this file top to bottom. Stop after each checkbox section so I can test it."

---

## What we're building
**Loop** is a campus marketplace for University of Alabama students (more schools later). People post what they have and say what they want. The app finds **trade loops**: Alex gives Bri a textbook, Bri gives Cam shoes, Cam gives Alex a ticket. Everyone gets what they want even though no two people want each other's stuff (like kidney-exchange matching). Plain buy/sell works too.

**Your part is the core innovation the judges score most:** finding loops and walking everyone through a safe handoff.
- Desktop-first website (still usable on phones): Next.js 15 (App Router) + Supabase (Postgres) + Stripe in **test mode**.
- Hackathon: core working by 1:30pm, feature freeze 3:30pm, demo at 5pm.

## Your files (only edit these)
- `src/lib/matcher.ts` and `src/lib/matcher.test.mjs`
- `src/lib/stripe.ts`
- `src/app/api/trades/` (API routes)
- `src/app/trades/` (trade screens)

**Not yours:** `src/app/page.tsx`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/` (Friend B, design), `src/app/[school]/`, `src/app/listings/`, `src/app/chat/`, `src/app/api/ai/` (Luke), `src/lib/supabase/`, `supabase/`. Need a change there? Ask. **Don't change the database schema without asking Luke.**

## Setup (once)
1. Install Node.js 20+ (nodejs.org) and Git (git-scm.com).
2. `git -c core.longpaths=true clone https://github.com/lukeganndev/hackathon.git`, then `cd hackathon`. Luke has to add you on GitHub first.
3. `npm install`
4. Put the `.env.local` file Luke DMs you into the `hackathon` folder. **Never commit it, paste it into code, or post it.** Code reads keys from `process.env`.
5. `git checkout -b trades`
6. `npm run dev`, then open http://localhost:3000

## Saving your work (every 20-30 min)
```
git add -A
git commit -m "what you did"
git push -u origin trades
```
Open a Pull Request from `trades` into `main` on GitHub and tell Luke. `npm run build` must pass before pushing. Vercel posts a preview link on the PR.

---

## Database you work with
Source of truth: `supabase/migrations/0001_init.sql`. Read it first.
- `profiles`: one per user (`id` = auth user id, `school_id`, `display_name`).
- `schools`: `meetup_spots` jsonb, a list of `{ name, lat, lng }` safe places to meet.
- `listings` (what people **have**): `owner_id`, `title`, `price_cents` (null = trade only), `kind`, `status` (`active | pending | traded | sold | removed`).
  - `kind = 'item'` leaves the pool after a deal (-> `traded`/`sold`).
  - `kind = 'service'` or `'ride'` is reusable: **never** mark it traded; it stays `active`.
- `wants` (what people **want**): `user_id`, `listing_id` (the exact listing they want), `max_cash_cents` (cash they'd add on top), `active`.
  - `listing_id` null = a fuzzy want ("any calc textbook"). Luke's AI turns those into `listing_id`s. **Ignore fuzzy wants.**
- `trades`: one loop. `status`: `proposed | accepted | meetup_set | done | cancelled`. `meetup_spot`, `meetup_at`.
- `trade_legs`: one handoff inside a loop. `giver_id` gives `listing_id` to `receiver_id`; receiver pays `cash_cents` (0 for a pure swap). `accepted_at`, `confirmed_at`, `stripe_payment_intent_id`.
- `trade_leg_codes`: `leg_id`, 4-digit `code`. **Only the receiver can read it.** The receiver shows it to the giver at the meetup; the giver types it in. That proves the handoff happened.

### Security model (important)
- Row Level Security is on. Logged-in users can **read** trades/legs they're in, and receivers can read their codes. **Nobody can write these from the browser.**
- So all writes go through your API routes:
  ```ts
  import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  if (!user) return Response.json({ error: "Sign in" }, { status: 401 });
  const db = supabaseAdmin(); // bypasses RLS, so YOU must check the user is in this trade
  ```
- Every route: check the user is signed in, check they're a participant (and the right role: receiver accepts, giver confirms), check the trade is in the right status. Return 400/403 otherwise.

---

## Tasks, in order

### 1. Matcher `src/lib/matcher.ts` (about 45 min), do this first
Pure TypeScript, **no imports**, no `enum` (so Node can run it directly).
```ts
export type Edge = { from: string; to: string; listingId: string; cashCents: number }; // from = giver, to = receiver
export type Loop = Edge[];
export function findLoops(edges: Edge[], startUserId: string, maxLen = 4): Loop[]
```
- [ ] Graph: users are nodes; an edge goes giver -> receiver for every active want with a `listing_id` whose listing is active (giver = listing owner, receiver = the want's user, cashCents = 0). Loops are pure swaps for now; cash top-ups (using `wants.max_cash_cents`) are a later extra.
- [ ] Find cycles that pass through `startUserId`, length 2 to `maxLen`, using depth-limited DFS. A user appears at most once per loop.
- [ ] Remove duplicates: the same set of legs found from a different starting point counts once.
- [ ] Sort: shorter loops first, then lower total cash.
- [ ] Test `src/lib/matcher.test.mjs` with `node:assert`, importing `./matcher.ts`. Cases: 2-way swap, 3-way loop, no loop, a 5-person loop ignored at `maxLen = 4`, and a user who only buys (no loop). Run with `node src/lib/matcher.test.mjs`. It must print ok.
- [ ] A plain sale is not a loop: it's a 1-leg trade (buyer wants a listing that has a price). Support it in the create route below.

### 2. Trade API, no Stripe yet (about 1 hour)
State machine (all-or-nothing loop): `proposed` -> `accepted` (every receiver accepted) -> `meetup_set` -> `done` (every leg confirmed). `cancelled` from any state before `done`.
- [ ] `POST /api/trades/find`: loads active wants (with `listing_id`) + their listings, builds edges, returns `findLoops(edges, user.id)` with listing titles and user names attached.
- [ ] `POST /api/trades` `{ legs: Edge[] }`: re-check every listing is still `active` (someone may have traded it), create the trade + legs, set item listings to `pending`. The creator's own leg is auto-accepted.
- [ ] `POST /api/trades/[id]/accept`: set `accepted_at` on legs where I'm the receiver. If all legs accepted -> status `accepted`.
- [ ] `POST /api/trades/[id]/meetup` `{ spot, at }`: only when `accepted`; spot must be one of the school's `meetup_spots`. Set status `meetup_set`, create a random 4-digit code per leg in `trade_leg_codes` (`String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, "0")`).
- [ ] `POST /api/trades/[id]/legs/[legId]/confirm` `{ code }`: only the leg's **giver**, only in `meetup_set`. Wrong code -> 400 (allow retries). Right code -> `confirmed_at = now()`. All legs confirmed -> trade `done`, item listings -> `traded` (or `sold` if it was a 1-leg cash sale), mark the matching wants `active = false`.
- [ ] `POST /api/trades/[id]/cancel`: any participant, before `done`. Status `cancelled`, item listings back to `active`.

### 3. Trade screens `src/app/trades/` (about 1 hour)
- [ ] `/trades`: my trades, newest first, with a status badge. Button "Find loops" calls `/api/trades/find` and shows results; each result has "Propose".
- [ ] `/trades/[id]`: the loop as a ring. Use Friend B's `LoopRing` from `@/components/ui/LoopRing` once it's pushed (props: `people: { name, item }[]`); until then, a simple list. Below it, by status:
  - `proposed`: who has accepted; Accept button if it's my turn.
  - `accepted`: pick a meetup spot (dropdown from the school's `meetup_spots`) and time.
  - `meetup_set`: for legs where I'm the **receiver**, my code in huge digits ("Show this to Bri"). For legs where I'm the **giver**, a 4-digit input + Confirm.
  - `done`: celebration state ("Loop closed! 3 people traded").
- [ ] Live updates: in a client component, subscribe with `supabaseBrowser().channel(...).on("postgres_changes", { event: "*", schema: "public", table: "trade_legs", filter: \`trade_id=eq.${id}\` }, () => router.refresh())`, and the same for `trades` filtered by `id`. Unsubscribe on unmount.

### 4. Stripe payment hold: SKIP, Luke is doing it
- Luke owns `src/lib/stripeHolds.ts` (holdTrade / captureLeg / releaseTrade) and migration `0004_stripe_cash_legs.sql` (installed: cash legs need a hold before meetup instead of being blocked).
- After your `trades` PR merges, Luke adds the 3 calls in `_lib/server.ts`. Don't add Stripe code yourself.

### 5. Demo data (already done by Luke)
- `supabase/demo_seed.mjs` creates a guaranteed 3-way loop between the team's real accounts: lrgann gives the Norton Anthology to hlpenick, hlpenick gives the On Cloud shoes to egbarber, egbarber gives the Iron Bowl ticket to lrgann. Plus filler listings.
- Run it any time to reset the demo: `node --env-file=.env.local supabase/demo_seed.mjs lrgann hlpenick egbarber`. It deletes and recreates only demo rows.
- Use it to test the matcher: `findLoops` for lrgann must return that 3-leg loop.

## Done means
- `node src/lib/matcher.test.mjs` prints ok.
- With 3 accounts: find loop -> propose -> all accept -> pick meetup -> each giver enters the code -> trade `done`, listings `traded`, Stripe hold captured.
- `npm run build` passes, PR merged into `main`.

## Not today (pitch roadmap only)
Real card entry (Stripe Elements), seller payouts (Stripe Connect), ratings, AI negotiation.
