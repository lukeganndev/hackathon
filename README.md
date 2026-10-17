# Loop

Campus marketplace with AI multi-way trade loops. Next.js + Supabase + Claude + Stripe (test mode).

## Setup (once per project)
1. Create a Supabase project. SQL editor: run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`.
2. Supabase > Authentication > Email Templates > Magic Link: put `{{ .Token }}` in the body so users get a 6-digit code.
3. `cp .env.example .env.local` and fill in keys.

## Run
```
npm install
npm run dev
```

## Layout
- `supabase/` schema, seed, `demo_add_auburn.sql` (live demo: add a school)
- `src/lib/supabase/` `supabaseBrowser` (client), `supabaseServer` (server, RLS), `supabaseAdmin` (server, bypasses RLS)
- `src/app/` `/` school picker, `/[school]` campus page, `/login` email code sign-in
