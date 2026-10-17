import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { findLoops } from "@/lib/matcher";

// Tell students when they're part of a loop, without making them click "Find a loop".
// Same edges as the trades API: active concrete wants on active listings.
export async function LoopBanner({ userId }: { userId: string }) {
  const db = supabaseAdmin();
  const { data: wants } = await db.from("wants")
    .select("user_id, listing_id, listing:listings!inner(owner_id, title, status)")
    .eq("active", true).not("listing_id", "is", null).eq("listing.status", "active").limit(1000);
  if (!wants?.length) return null;

  type Row = { user_id: string; listing_id: string; listing: { owner_id: string; title: string } };
  const rows = wants as unknown as Row[];
  const edges = rows.map((w) => ({ from: w.listing.owner_id, to: w.user_id, listingId: w.listing_id, cashCents: 0 }));
  const loop = findLoops(edges, userId)[0];
  if (!loop) return null;

  const title = (id: string) => rows.find((w) => w.listing_id === id)!.listing.title;
  const give = loop.find((l) => l.from === userId)!;
  const get = loop.find((l) => l.to === userId)!;

  return (
    <Link href="/trades" className="panel flex flex-wrap items-center justify-between gap-2" style={{ borderColor: "var(--accent)", borderWidth: 2 }}>
      <span>
        <span className="font-bold">🔁 You&apos;re in a {loop.length}-person loop!</span>{" "}
        Give your <b>{title(give.listingId)}</b>, get <b>{title(get.listingId)}</b>.
      </span>
      <span className="font-semibold text-[var(--school)]">See the loop →</span>
    </Link>
  );
}
