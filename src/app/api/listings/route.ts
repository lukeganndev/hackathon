import { supabaseServer } from "@/lib/supabase/server";
import { moderate } from "@/lib/moderate";

// Create a listing: AI moderation (text + photo) first, then insert as the student (RLS applies,
// and the DB blocklist and ticket-policy triggers still run).
const KINDS = ["item", "service", "ride"];

export async function POST(req: Request) {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: "Sign in first" }, { status: 401 });
  const { data: me } = await db.from("profiles").select("id, school_id").eq("id", user.id).single();
  if (!me) return Response.json({ error: "Sign in first" }, { status: 401 });

  const b = await req.json();
  const title = typeof b.title === "string" ? b.title.trim().slice(0, 120) : "";
  if (!title || !KINDS.includes(b.kind)) return Response.json({ error: "Add a title" }, { status: 400 });
  const description = typeof b.description === "string" ? b.description.trim().slice(0, 2000) : null;

  // Only photos from our own bucket.
  const bucket = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/`;
  const photo_url = typeof b.photo_url === "string" && b.photo_url.startsWith(bucket) ? b.photo_url : null;

  const verdict = await moderate({ title, description, photoUrl: photo_url });
  if (!verdict.allowed) return Response.json({ error: verdict.reason || "That can't be posted on Loop." }, { status: 422 });

  const { data, error } = await db.from("listings").insert({
    school_id: me.school_id, owner_id: me.id, kind: b.kind, details: b.details ?? {},
    title, description, category: b.category ?? null,
    price_cents: Number.isInteger(b.price_cents) && b.price_cents >= 0 ? b.price_cents : null,
    photo_url,
    ticket_type: b.ticket_type ?? null, face_value_cents: Number.isInteger(b.face_value_cents) ? b.face_value_cents : null,
  }).select("id").single();
  // DB errors here are our own friendly messages (blocklist, ticket policy).
  if (error) return Response.json({ error: error.message }, { status: 422 });
  return Response.json({ id: data.id });
}
