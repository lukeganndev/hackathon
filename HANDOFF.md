# Handoff

_Last updated: 2026-10-17 ~2:25pm CT. Demo at 5pm._

## What Loop is
Campus marketplace (UA first, 74 schools seeded) where an AI finds **multi-way trade loops** (A→B→C→A). .edu login picks your school and rethemes the site. Stack: Next.js 15 + Supabase (Postgres/RLS/storage, email OTP) + Claude (claude-opus-5-5) + Stripe test mode.

## State: everything built and verified locally
- **Live site is STALE**: https://hackathon-cszx.vercel.app is stuck at the ~2pm build. Luke's Vercel hit the free limit (100 deploys/24h). Plan: a friend deploys from their own Vercel account (`docs/vercel-deploy.md`). Then push in batches only.
- **Latest version runs locally**: `npm run dev` → http://localhost:3000 (Claude preview config "loop-dev" in `.claude/launch.json`). Don't run `next build` while dev is running (breaks `.next`); use `npx tsc --noEmit` + `npx eslint src`.
- **Database is shared and live** (Supabase `mfjizvmectbqgyfqqvoq`), migrations 0001–0009 all installed.

## Features (where to look)
- Sign-in gate with live school preview + welcome splash: `src/app/login/LoginGate.tsx`. Signup trigger matches email domain incl. subdomains.
- Campus page `src/app/[school]/page.tsx`: band with logo + slogan, Ask Loop box (`AskLoop.tsx`), loop banner, impact stats (count-up), My campus / All campuses, search, cards (`src/app/ListingCard.tsx`).
- Ask Loop full screen `/chat` (`src/app/chat/page.tsx`) + shared logic `src/app/chat/ChatParts.tsx` (saved chats in localStorage `loop-chats`, typing effect, listing/loop cards). Agent `src/app/api/ai/chat/route.ts`, tools: search_listings, my_listings{show}, create_listing, update_listing, add_want, find_loops, propose_loop (auto-starts found loops). History must stay append-only (Opus 5.5 rejects edited history).
- Photo → AI listing (types into form): `src/app/listings/new/page.tsx`, `/api/ai/listing`. Posts go through `POST /api/listings` (AI moderation `src/lib/moderate.ts`) + DB blocklist (0008).
- Trades (Friend C, restyled by Luke): `/trades`, `/trades/[id]`, RPC `loop_trade_action` (0002/0004), Stripe holds `src/lib/stripeHolds.ts`, confetti on close.
- Reviews: popup after a trade closes (`trades/_components/ReviewPopup.tsx`, reuses `listings/mine/RateForm.tsx`). Profile `/u/[id]`: listing cards, completed trades with their reviews (legs read via admin client), clickable stars open all reviews (`u/Reviews.tsx`). My stuff `/listings/mine`: have/want as cards. Popups are native `<dialog className="modal">`.
- Header chip = account menu (`AccountMenu` in `src/app/HeaderClient.tsx`): profile, My stuff, loops, post, chats, all campuses, `/settings` (display name, filtered by 0009; clear chats; sign out).
- Also: wants that wait (`src/lib/matchWants.ts`), ratings (0005), reports (0003), Buy button, mobile tab bar.
- Branding: logo.dev icons for all 75 schools in bucket `logos/icon-<slug>.png` (`schools.logo_url`), shown near-square. **No banner photos** (Luke said no). Design tokens in `src/app/globals.css`.

## Demo
- Accounts: lrgann (Luke), hlpenick, egbarber (all UA). Reset before every run: `node --env-file=.env.local supabase/demo_seed.mjs lrgann hlpenick egbarber` (23 listings, 3-way loop lrgann→hlpenick→egbarber; keeps completed trades/reviews).
- Script: `docs/pitch.md`. Moments: type `@vt.edu` on sign-in (retheme) → Ask Loop "Can I see listings for mini fridges?" (cards) → "Get me a mini fridge for my Norton Anthology" (auto loop) → others accept, meetup, codes, confetti → run `supabase/demo_add_auburn.sql` live (new school).
- Any practice trade reserves items; reset after.

## Next steps
1. Friend deploys via `docs/vercel-deploy.md`; check every page on the new URL.
2. Full dress rehearsal on the latest version (3 laptops), then reset demo.
3. Pitch deck (Luke asked for slides with demo flow), backup screen recording.

## Gotchas
- Vercel limit: every push = a deploy. Batch.
- Anthropic credit: ~$4.79 prepaid, no auto-reload (hard cap).
- Never `select *` on profiles (email column hidden by grants).
- On Windows, clone with `git -c core.longpaths=true clone ...` if the path is long.
