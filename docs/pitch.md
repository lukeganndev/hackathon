# Loop pitch (target 4 minutes)

Live site: https://hackathon-cszx.vercel.app
Before going on stage: run `node --env-file=.env.local supabase/demo_seed.mjs lrgann hlpenick egbarber`, sign all 3 laptops in (Luke = lrgann, Friend B = hlpenick, Friend C = egbarber), open each on the Alabama page. Backup video ready on a USB stick.

---

## 1. Hook (20s) — Luke
"Raise your hand if you've ever had something to trade, but the person who wanted it had nothing you wanted."

Every campus marketplace (Facebook groups, GroupMe, Marketplace) only matches **pairs**. Most trades never happen because two people rarely want each other's stuff.

## 2. The idea (30s) — Luke
**Loop finds trade loops, not pairs.** Alex has a textbook Bri wants. Bri has shoes Cam wants. Cam has the Iron Bowl ticket Alex wants. Nobody can trade one-on-one, but all three can trade in a circle.

It's the same math hospitals use for kidney exchange chains, applied to a college campus.

## 3. Live demo (2 min)

**a. Post with a photo (Luke, 25s)**
- Click "+ Sell or trade something", snap a photo of a real item.
- "AI writes the listing: title, category, a fair student price. Five seconds."

**b. Just say what you want (Luke, 30s)**
- Open "Tell Loop what you want". Type: *"I'm looking for a mini fridge, I'd pay up to $40"*.
- Point at the progress line: it searches every campus and saves a want.
- "Wants wait. If nobody has one today, the moment someone posts a fridge, Loop links it."

**c. The loop (Friend C, 50s)** — the moment that wins
- On lrgann's laptop: Trades → Find loops. The 3-way loop appears with the animation.
- Propose. Friend B and Friend C click Accept on their laptops: it updates live.
- Pick a safe meetup spot (only approved campus spots, like Ferguson Center).
- Each person gets a 4-digit code. The giver types the receiver's code to prove the handoff happened. Loop closes. The impact counter goes up.

**d. Multi-campus in one line (Friend B, 15s)**
- In Supabase, run `supabase/demo_add_auburn.sql` (one insert).
- Refresh: Auburn appears, the rivalry banner shows up, "All campuses" browsing works.
- "A new school is one database row: its email domain, colors, and meetup spots. No new code."

## 4. Why we can be trusted (25s) — Friend C
- Only .edu emails get in, and the email domain picks your school automatically.
- Handoffs at approved campus spots, confirmed with a code. No code, no completed trade.
- Tickets follow school rules, enforced by the database: student tickets trade-only, general tickets capped at face value.
- Anyone can report a listing; 3 reports hide it automatically.

## 5. Where it goes (20s) — Friend B
- Payments held by Stripe until the handoff code is entered (next step), then seller payouts.
- Move-out week: post your whole dorm room from one photo.
- Every SEC campus, with cross-campus loops on game weekends.

## 6. Close (10s) — Luke
"Pairs leave trades on the table. **Loop closes them.**"

---

## Likely judge questions
- **What if someone doesn't show up?** The trade can be cancelled before any handoff; everything goes back to active. Once one handoff is confirmed, cancellation needs manual review so nobody loses an item.
- **How does matching scale?** Depth-limited cycle search (max 4 people) from the user who's searching. Fast for a campus; kidney-exchange research shows 3-4 person cycles capture most of the value.
- **Why would students switch from GroupMe?** Their stuff actually moves, and the AI does the listing work.
- **Money?** Small fee on cash legs once Stripe payouts are on; free for pure swaps to grow the network.
