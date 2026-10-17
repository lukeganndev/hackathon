import { supabaseServer } from "@/lib/supabase/server";
import { matchWaitingWants } from "@/lib/matchWants";

// Called by the listing form right after posting.
export async function POST(req: Request) {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Sign in first" }, { status: 401 });
  const { listingId } = await req.json();
  // Only the owner can trigger matching for their listing.
  const { data: mine } = await db.from("listings").select("id").eq("id", listingId).eq("owner_id", user.id).maybeSingle();
  if (!mine) return Response.json({ error: "Not your listing" }, { status: 403 });
  try {
    return Response.json({ matched: await matchWaitingWants(listingId) });
  } catch (e) {
    console.error("ai/match", e);
    return Response.json({ matched: 0 });
  }
}
