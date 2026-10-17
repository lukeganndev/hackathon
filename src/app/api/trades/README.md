# Trade API — checkpoint 2

API implementation is on `codex/trades`. Stripe is intentionally deferred to its checkpoint.

## Database migration

Luke reviewed and installed `supabase/migrations/0002_trade_action.sql`.
It adds `loop_trade_action(uuid, text, jsonb)` and `loop_code_attempts`. Both are
restricted to the service role. The function uses a single transaction and row
locks so reserving listings, creating legs, and advancing state commit together.
Original tables and `0001_init.sql` are unchanged.

The redundant SQL draft has been removed. New environments must apply both
`0001_init.sql` and `0002_trade_action.sql` before using trade mutations.

**Agreed behavior:** cancellation is allowed before any handoff is confirmed.
Once someone has handed over an item, cancellation returns 409 to avoid putting
that item back on sale. This narrows the brief's "cancel any time before done" rule.
Cash sales may be proposed, but cannot schedule/complete handoffs before Stripe
support is added. Sale proposals auto-accept only the creator's received leg,
matching the brief; no separate seller-consent field exists in the current schema.

## Routes and response shapes

All routes require a verified Supabase session cookie, or a valid
`Authorization: Bearer <student access token>`. The actor is never read from JSON.
All responses use `Cache-Control: no-store`.

| Route | Request | Response |
|---|---|---|
| `GET /api/trades` | — | `{ userId, trades }`, newest 100 |
| `POST /api/trades/find` | — | `{ loops: [{ legs }], moreAvailable? }` |
| `GET /api/trades/[id]` | — | `{ userId, trade, legs, listings, profiles, schools, codes }` |
| `POST /api/trades` | `{ legs: Edge[] }` | 201 `{ trade }` |
| `POST /api/trades/[id]/accept` | — | `{ trade }` |
| `POST /api/trades/[id]/meetup` | `{ spot, at }`, ISO timestamp with timezone | `{ trade }` |
| `POST /api/trades/[id]/legs/[legId]/confirm` | `{ code: "0042" }` | `{ trade }` |
| `POST /api/trades/[id]/cancel` | — | `{ trade }` |

`Edge` uses `{ from, to, listingId, cashCents }`. Find results also include
`title`, `giverName`, and `receiverName`. Find returns up to 50 loops from a pool
of at most 1,000 concrete wants; larger pools return 422 instead of silently
omitting edges. Fuzzy wants are ignored. Loop legs must be pure swaps; a one-leg
sale must match the actual current listing price.

Only participants can read a trade. `codes` contains only the requesting
receiver's codes during `meetup_set`. Codes never appear in mutation responses.
Five failed confirmations per leg in 15 minutes trigger 429, including attempts
across server restarts. Accept, same-meetup, confirm, and cancel retries are
idempotent; repeated create requests return a conflict while the proposal is active.
Services/rides remain active after completion; seat/schedule capacity is deferred.

## Local checks

From the repository directory:

```powershell
node src/lib/matcher.test.mjs
node --test src/app/api/trades/_tests/http.test.mjs
node --test src/app/api/trades/_tests/database.test.mjs
npm.cmd run build
```

The database test runs both actual migrations against
an in-memory PostgreSQL instance with minimal Supabase platform scaffolding.
It uses the separately approved PGlite installation in
`../.trade-db-tests/node_modules/@electric-sql/pglite/dist/index.js`, or an absolute
module path in `LOOP_PGLITE_MODULE`. No live credentials or production data are used.
PGlite serializes queries; these tests do not simulate concurrent database sessions.

## Live check after Luke installs the migration

1. Use three verified student accounts and create listings/wants forming a loop.
2. Search and propose it. All item listings should become `pending` together.
3. Each receiver accepts; status remains `proposed` until everyone accepts.
4. Select an approved campus spot and future time; status becomes `meetup_set`.
5. Check each account sees only its own receiver code. Wrong-role/outsider requests
   must fail. Enter a wrong code and check the handoff remains unconfirmed.
6. Each giver enters the receiver's code. Only the last confirmation sets `done`.
   Item listings become `traded`, matching wants deactivate, services/rides stay active.
7. On a separate proposal, cancel before handoff; items should return to `active`.
8. Verify simultaneous proposals for an overlapping item from separate sessions:
   one succeeds and the other conflicts, with no orphan rows.

The desktop trade screens are at `/trades` and `/trades/[id]`. They subscribe to
trade and leg updates and reconcile every 15 seconds while visible. Shared
`LoopRing` is not on main yet, so the detail screen uses an ordered handoff list.
Cash handoffs remain disabled until the Stripe checkpoint.
