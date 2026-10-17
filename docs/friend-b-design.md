# Friend B: Design, landing page, look and feel

Paste this whole file into Codex and say: "I'm Friend B. Work through this file top to bottom. Stop after each checkbox section so I can look at it."

---

## What we're building
**Loop** is a campus marketplace for University of Alabama students (more schools later). You post stuff you have, say what you want, and the app finds **trade loops**: Alex gives Bri a textbook, Bri gives Cam shoes, Cam gives Alex a ticket. Everyone gets what they want, even though no two people want each other's stuff. You can also just buy and sell.
- Desktop-first website. Judges will see it on a laptop screen (~1280px wide). It must still work on a phone.
- Pitch line: **"Trade in loops, not pairs."**
- Hackathon: feature freeze 3:30pm, demo at 5pm.

## Your job
You own **how the app looks**. No database or API work. Others build the features and use your components, so your work shows up everywhere.

**Your files (only edit these):**
- `src/app/page.tsx` (landing page)
- `src/app/globals.css` (theme)
- `src/app/layout.tsx` (fonts, page frame)
- `src/components/ui/` (shared components, new folder)
- `public/` (images and icons)

**Not yours:** `src/app/[school]/`, `src/app/listings/`, `src/app/chat/`, `src/app/trades/`, `src/app/api/`, `src/lib/`, `supabase/`. Need something changed there? Ask Luke.

## Setup (once)
1. Install Node.js 20+ from nodejs.org and Git from git-scm.com.
2. `git -c core.longpaths=true clone https://github.com/lukeganndev/hackathon.git`, then `cd hackathon`. Luke has to add you on GitHub first.
3. `npm install`
4. Put the `.env.local` file Luke DMs you into the `hackathon` folder. **Never commit it or post it anywhere.**
5. `git checkout -b design`
6. `npm run dev`, then open http://localhost:3000 in a normal browser window. To check phones too: F12, then Ctrl+Shift+M, pick iPhone 12.

## Saving your work (do this every 20-30 min)
```
git add -A
git commit -m "what you did"
git push -u origin design
```
On GitHub, open a Pull Request from `design` into `main` and tell Luke. Vercel posts a preview link on the PR so you can see it live. Before pushing, `npm run build` must pass.

## Rules
- Tailwind CSS classes only (it's already installed). **No new npm packages.**
- No school logos or trademarked art. School colors only. Alabama: crimson `#9E1B32` and white.
- Each school page sets a CSS variable `--school` to that school's color. Use `var(--school)` for accent colors so Auburn's pages turn orange/navy automatically.
- Design for desktop first (1280px wide): a top nav bar, wide layouts, multi-column grids. Then make sure it doesn't break on a phone (390px): columns stack, nothing scrolls sideways. Use Tailwind breakpoints (`md:`, `lg:`).
- Readable contrast. Every image needs `alt` text. Buttons are real `<button>` elements.

---

## Tasks, in order

### 1. Theme (about 20 min)
- [ ] In `globals.css`: pick one font (Google Font via `next/font` in `layout.tsx`, e.g. Inter or Plus Jakarta Sans), a clean background, text colors, and rounded corners. Keep dark mode working or remove it; don't leave it half done.
- [ ] In `layout.tsx`: a top nav bar (Loop wordmark left; links right: Browse, Sell, Trades, Sign in) and a page container (`max-w-6xl mx-auto px-6`). Keep `<html lang="en">` and the viewport export.

### 2. Shared components in `src/components/ui/` (about 45 min)
Others will import these, so **keep these exact names and props**:
- [ ] `Button.tsx`: `export function Button({ variant = "primary", ...props }: { variant?: "primary" | "secondary" | "ghost" } & React.ButtonHTMLAttributes<HTMLButtonElement>)`. Primary uses `var(--school, #111)` as background.
- [ ] `Card.tsx`: `export function Card({ children, className })`: white rounded box with soft shadow.
- [ ] `Badge.tsx`: `export function Badge({ children, tone = "neutral" }: { tone?: "neutral" | "success" | "warning" })`: small pill label ("Trade only", "Ticket", "Ride").
- [ ] `ListingCard.tsx`: `export function ListingCard({ title, priceCents, photoUrl, kind, href }: { title: string; priceCents: number | null; photoUrl?: string | null; kind?: "item" | "service" | "ride"; href?: string })`. Photo on top (square, `object-cover`, gray placeholder if none), title, price as `$12.00`, or the badge "Trade only" when `priceCents` is null. Small badge for service/ride.
- [ ] `src/app/ui-preview/page.tsx`: a throwaway page that shows every component with fake data so you can see them. (This one file is fine for you to create.)

### 3. Loop animation, the star of the demo (about 45 min)
- [ ] `src/components/ui/LoopRing.tsx`: `export function LoopRing({ people }: { people: { name: string; item: string }[] })`
  - 2 to 4 circles evenly spaced on a ring, each showing a name and the item they're giving.
  - Arrows between them going clockwise (person 1 -> 2 -> 3 -> back to 1).
  - A dot or glow that travels around the ring on repeat. **SVG + CSS animation only**, no libraries.
  - Respect reduced motion: wrap the animation in `@media (prefers-reduced-motion: no-preference)`.
- [ ] Show it on `ui-preview` with 3 fake people: Alex (Norton Anthology), Bri (Nike shoes), Cam (Iron Bowl ticket).

Friend C will use `LoopRing` on the trade screen, so tell them when it's pushed.

### 4. Landing page `src/app/page.tsx` (about 45 min)
The current file loads the list of schools from the database. **Keep the `supabaseServer()` query and the school links.** Just restyle and add around them.
- [ ] Hero: "Loop" wordmark, headline "Trade in loops, not pairs.", one line under it: "Post what you have. Say what you want. We find the loop."
- [ ] `LoopRing` with the 3 fake people as the hero graphic.
- [ ] "How it works": 3 short steps with simple icons (inline SVG or emoji): 1. Snap a photo, AI writes the listing. 2. Tell the chat what you want. 3. Meet at a safe campus spot, swap codes, done.
- [ ] Trust strip: ".edu verified", "Safe meetup spots", "Payment held until handoff".
- [ ] "Pick your school" buttons (existing links, styled with each school's `colors.primary`), plus a "Sign in" link to `/login`.

### 5. Polish other pages, only after 1-4 are merged (Tier 1, before 3:15pm)
Ask Luke first, since these files belong to others:
- [ ] Restyle `/login` with your Button and theme.
- [ ] Empty states: friendly text + icon when there are no listings or trades.
- [ ] App icon: `src/app/icon.svg`, a simple loop symbol (circle with arrow) in crimson.

### 6. Pitch support (3:30-4:00pm)
- [ ] 4-5 pitch slides in Google Slides with the same colors and font: problem, the loop idea, live demo, why it scales to every campus, roadmap.
- [ ] Help record the backup demo video (screen recording of the site in a browser).

## Done means
- `npm run build` passes, PR merged into `main`.
- The landing page looks good on a laptop screen and doesn't break on a phone.
- `Button`, `Card`, `Badge`, `ListingCard`, `LoopRing` exist with the exact props above.
