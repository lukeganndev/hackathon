# Handoff

_Last updated: 2026-10-17 ~11:15_

## Goal
Hackathon (deadline 5pm, aim done 4pm). Prompt: multi-tenant campus marketplace, start with Alabama (UA), .edu verified, per-school customization, cross-campus browsing, innovation weighted most.
Team: 3 beginners using Codex + Claude.

## Idea: AI multi-way trade loops
- Photo -> AI fills listing (name, category, price). Standard feature, not the pitch.
- Chat agent: "trade my shoes for Norton Anthology or sell for $25" -> structured haves/wants.
- Matcher: cycle detection on haves->wants graph (kidney-exchange style). Finds A->B->C->A trades. THE innovation.
- Cross-campus = bigger graph = more loops.

## Decisions
- Stack: Next.js + Supabase (email OTP auth, Postgres, RLS, storage) + Claude API + Vercel.
- Tenancy: one DB, `school_id` on every row. `schools` row = slug, email domains[], colors, safe meetup spots, ticket policy. New school = insert a row (live demo: add Auburn).
- Email domain auto-assigns school (Alabama: crimson.ua.edu, ua.edu). Path URLs `/alabama`, not subdomains. Colors only, no trademarked logos.
- Payments: Stripe test mode, manual capture (hold, charge on handoff). Seller payouts (Connect) = roadmap.
- Handoff: receiver shows giver a 4-digit code; giver enters it -> confirms handoff / captures payment.
- Trade states: proposed -> all accepted -> meetup set -> each leg confirmed -> done. Loop is all-or-nothing.
- Tickets: transfer via official account only; payment held until buyer confirms or event start (auto-refund). Ticket policy per ticket type: transfer_only | face_value_cap | open. UA general tickets allow resale but ban brokers -> face_value_cap + broker-flag (many ticket listings). Student ticket rules: still unchecked.
- Trust: .edu identity, ratings only after code-confirmed deal, AI moderation of listings, safe meetup spots per school, report/block.

## Scope (app name: Loop, desktop-first website (still usable on phones), live demo + backup video, 3-5 min pitch)
- Core (must): auth/schools, photo->listing, chat agent, loop matcher, trade steps w/ codes, Stripe hold, ticket policy check.
- Tier 1 (2:00pm): loop animation, cash top-ups, impact counter, rivalry mode (Auburn row + cross-campus banner).
- Tier 2 (only if core green at 2pm): wants that wait (in-app only), move-out bulk photos, course-aware textbooks. Cut in reverse order.
- Pitch-only (roadmap): Stripe Connect payouts, ticketing API, broker flag, AI negotiation, licensed logos.

## Timeline
10:45 accounts + schema + scaffold | 11:15-1:30 core in parallel | 1:30-2:00 integrate + deploy | 2:00-3:15 tier 1 | 3:15-3:30 tier 2 if green | 3:30 FEATURE FREEZE | 3:30-4:00 seed demo data, record backup video | 4-5 review + pitch practice

## Team split (own your folders only, so merges never conflict)
| Who | Owns | Builds |
|---|---|---|
| Luke (Claude) | `src/app/[school]/`, `src/app/listings/`, `src/app/api/ai/`, `src/app/chat/` | Feed, listing pages, create form + photo upload, photo->listing AI, chat agent -> `wants` |
| Friend C (Codex) | `src/lib/matcher.ts`, `src/app/api/trades/`, `src/app/trades/` | Loop finder, trade steps + 4-digit codes, Stripe hold |
| Friend B (Codex, design) | `src/app/page.tsx` (landing), `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/`, `public/` | Landing page, look and feel, shared UI components, loop animation, pitch slides |
- Briefs to paste into Codex: `docs/friend-b-design.md`, `docs/friend-c-trades.md`. Branch per person, PR into `main`.
- Others use Friend B's components from `src/components/ui/`; ask before editing them.

## Built (11:00)
- Next.js 15 + Tailwind at repo root; `npm run build` and lint pass. Setup steps in `README.md`.
- Schema `supabase/migrations/0001_init.sql` (checked against in-memory Postgres): schools, profiles, listings (haves), wants, trades, trade_legs, trade_leg_codes. RLS on all.
  - Signup trigger: email domain -> school_id; unknown domain = signup fails (.edu gate).
  - Ticket policy enforced by DB trigger: transfer_only = no cash, face_value_cap = price <= face.
  - Trades/legs/codes: clients read only; writes via `supabaseAdmin()` in server routes. Code table readable by receiver only.
  - `wants.listing_id` = concrete matcher edge; null = fuzzy want for AI to resolve.
  - `listings.kind` = item | service | ride; `details` jsonb holds per-kind fields (ride: from/to/depart_at/seats; service: unit, course). Services (tutoring, haircut, nails, moving_help) and rides stay active after a deal, so the matcher must not mark them traded. Services/rides can be loop legs ("tutoring for a ride").
  - Storage bucket `listing-photos`, upload path `<uid>/file`.
- `src/lib/supabase/{client,server}.ts`, `src/middleware.ts`, pages `/`, `/[school]`, `/login` (6-digit email code).
- Supabase project `mfjizvmectbqgyfqqvoq` (ca-central-1): migration + seed applied 11:15, 7 tables + bucket verified. `.env.local` has URL prefilled (gitignored).

## Next steps
1. Fill keys in `.env.local` (Supabase anon + service_role, Anthropic, Stripe test); share privately with team.
2. Vercel: import page for lukeganndev/hackathon is open; add the 6 env vars, then Deploy.
3. Custom SMTP (blocker for login): Supabase built-in email only reaches org members and templates are locked without it. Then set Magic Link + Confirm signup templates to `{{ .Token }}`.
4. Check Alabama student ticket transfer policy (seed assumes `football_student: transfer_only`).

## Gotchas
- On Windows, clone with `git -c core.longpaths=true clone ...` if the path is long.
