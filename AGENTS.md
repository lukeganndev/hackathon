# Instructions for Codex

Read `HANDOFF.md` first: the plan, decisions, and who owns which folders.

## Rules
- Only edit files in the folders your person owns (see "Team split" in `HANDOFF.md`). Need something changed elsewhere? Ask that person.
- Never commit `.env.local` or paste keys into code. Read keys from `process.env`.
- Work on your own branch. Run `npm run build` before pushing; it must pass.
- Phone-first: design for a 375px-wide screen.
- Database: `supabase/migrations/0001_init.sql` is the source of truth. Don't change the schema without asking Luke.
- Supabase clients: `supabaseBrowser()` in client components, `supabaseServer()` in server code, `supabaseAdmin()` only in server routes that must bypass RLS. All in `src/lib/supabase/`.

## Friend C: matcher + trades + Stripe brief
This is the core innovation: find multi-way trade loops (A gives B, B gives C, C gives A) and walk everyone through the handoff.

### Data you work with (see `supabase/migrations/0001_init.sql`)
- `listings` = what people have. `kind`: `item` leaves the pool after a deal; `service`/`ride` stay `active` (never mark them traded).
- `wants` = what people want. `listing_id` set = they want that exact listing. `max_cash_cents` = how much cash they'd add on top.
- `trades` = one loop. `trade_legs` = one handoff in it (`giver_id` gives `listing_id` to `receiver_id`, receiver pays `cash_cents`).
- `trade_leg_codes` = 4-digit code per leg. Only the receiver can read it; the giver types it in to confirm.
- Clients can only READ trades/legs/codes (RLS). All writes go through your API routes using `supabaseAdmin()`, after checking the signed-in user with `supabaseServer().auth.getUser()` and that they're in the trade.

### Goal 1: matcher (`src/lib/matcher.ts`), do this first
- Pure function, no imports: `findLoops(edges, startUserId, maxLen = 4)` returns loops that include `startUserId`.
- Edge = `{ from: giverId, to: receiverId, listingId, cashCents }`. Build edges from active `wants` with `listing_id` joined to active `listings` (giver = listing owner, receiver = want's user).
- Find cycles with depth-limited DFS (length 2 to 4). A cycle of length 1 doesn't exist; a plain sale is a 1-leg trade (buyer wants it, pays cash), handle that separately.
- Rank: shorter loops first, then less cash.
- Test: `src/lib/matcher.test.ts` with plain `assert`, run with `node src/lib/matcher.test.ts`. Cover a 2-way swap, a 3-way loop, no loop, and a loop longer than `maxLen` being ignored.
- Fuzzy wants (`listing_id` null) are Luke's AI's job; it fills `listing_id` in. Ignore them.

### Goal 2: trade API (`src/app/api/trades/`)
State machine: `proposed` -> `accepted` (every receiver accepted) -> `meetup_set` -> `done` (every leg confirmed). `cancelled` from any state before `done`. A loop is all-or-nothing.
- `POST /api/trades/find` -> loops for the signed-in user (calls `findLoops`).
- `POST /api/trades` `{ legs }` -> create trade + legs, item listings -> `pending`.
- `POST /api/trades/[id]/accept` -> set `accepted_at` on my legs (I'm receiver). All accepted -> `accepted`, create Stripe holds.
- `POST /api/trades/[id]/meetup` `{ spot, at }` -> `meetup_set`, generate a random 4-digit code per leg into `trade_leg_codes`. Spots come from `schools.meetup_spots`.
- `POST /api/trades/[id]/legs/[legId]/confirm` `{ code }` -> giver enters code; wrong code = 400. Right -> `confirmed_at`, capture that leg's payment. All confirmed -> `done`, item listings -> `traded` (or `sold` for a 1-leg cash sale).
- `POST /api/trades/[id]/cancel` -> cancel holds, listings back to `active`.

### Goal 3: Stripe hold (test mode only)
- On accept, for each leg with `cash_cents > 0`: `stripe.paymentIntents.create({ amount, currency: 'usd', capture_method: 'manual', payment_method: 'pm_card_visa', confirm: true, automatic_payment_methods: { enabled: true, allow_redirects: 'never' } })`. Save the id in `stripe_payment_intent_id`.
- Confirm leg -> `stripe.paymentIntents.capture(id)`. Cancel -> `stripe.paymentIntents.cancel(id)`.
- `pm_card_visa` skips a card form for the demo. Real card entry (Stripe Elements) and seller payouts are roadmap, not today.

### Goal 4: trade screens (`src/app/trades/`)
- `/trades`: my trades with status. `/trades/[id]`: the loop drawn as a ring (use Friend B's loop animation component when it exists), Accept button, meetup spot picker, then per leg: receiver sees their code big, giver gets a 4-digit input.
- Subscribe to Supabase Realtime on `trades` and `trade_legs` so the screen updates live when others accept or confirm.

### Order
matcher + test -> create/accept/confirm routes (no Stripe) -> trade screen -> Stripe -> realtime. Get a 3-person loop working end to end before polishing anything.

## Friend B: design brief
You own the look of the app, not the data. No database or API work needed.
- Landing page `src/app/page.tsx`: big headline, one-line pitch ("Trade in loops, not pairs"), a simple 3-person loop graphic (A -> B -> C -> A), a "Pick your school" button list (already wired, keep the `schools` query).
- Theme in `src/app/globals.css`: fonts, spacing, colors. Each school's `colors.primary` is set as the CSS variable `--school` on its pages; use it for accents.
- Shared components in `src/components/ui/`: `Button`, `Card`, `ListingCard` (photo, title, price), `Badge`. Plain Tailwind, no new libraries.
- Loop animation component: 3-4 circles in a ring with arrows that animate around it (CSS or SVG only).
- No logos or trademarked art; school colors only.
- Check it with `npm run dev` at http://localhost:3000 in phone view (browser devtools, 375px).
