# Instructions for Codex

Read `HANDOFF.md` first (plan, decisions), then your brief:
- Friend B (design): `docs/friend-b-design.md`
- Friend C (matcher, trades, Stripe): `docs/friend-c-trades.md`

## Rules
- Only edit files your brief says you own. Need something changed elsewhere? Ask that person.
- Never commit `.env.local` or paste keys into code. Read keys from `process.env`.
- Work on your own branch. Run `npm run build` before pushing; it must pass.
- Desktop-first website (judges see it on a laptop, ~1280px wide). Must still work on a phone (390px): stack columns, no sideways scrolling.
- Database: `supabase/migrations/0001_init.sql` is the source of truth. Don't change the schema without asking Luke.
- Supabase clients: `supabaseBrowser()` in client components, `supabaseServer()` in server code, `supabaseAdmin()` only in server routes that must bypass RLS. All in `src/lib/supabase/`.
- No new npm packages without asking.
