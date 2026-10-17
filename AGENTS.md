# Instructions for Codex

Read `HANDOFF.md` first: the plan, decisions, and who owns which folders.

## Rules
- Only edit files in the folders your person owns (see "Team split" in `HANDOFF.md`). Need something changed elsewhere? Ask that person.
- Never commit `.env.local` or paste keys into code. Read keys from `process.env`.
- Work on your own branch. Run `npm run build` before pushing; it must pass.
- Phone-first: design for a 375px-wide screen.
- Database: `supabase/migrations/0001_init.sql` is the source of truth. Don't change the schema without asking Luke.
- Supabase clients: `supabaseBrowser()` in client components, `supabaseServer()` in server code, `supabaseAdmin()` only in server routes that must bypass RLS. All in `src/lib/supabase/`.

## Friend B: design brief
You own the look of the app, not the data. No database or API work needed.
- Landing page `src/app/page.tsx`: big headline, one-line pitch ("Trade in loops, not pairs"), a simple 3-person loop graphic (A -> B -> C -> A), a "Pick your school" button list (already wired, keep the `schools` query).
- Theme in `src/app/globals.css`: fonts, spacing, colors. Each school's `colors.primary` is set as the CSS variable `--school` on its pages; use it for accents.
- Shared components in `src/components/ui/`: `Button`, `Card`, `ListingCard` (photo, title, price), `Badge`. Plain Tailwind, no new libraries.
- Loop animation component: 3-4 circles in a ring with arrows that animate around it (CSS or SVG only).
- No logos or trademarked art; school colors only.
- Check it with `npm run dev` at http://localhost:3000 in phone view (browser devtools, 375px).
