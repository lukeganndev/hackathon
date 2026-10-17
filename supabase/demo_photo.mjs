import { readFileSync } from "node:fs";

const photos = JSON.parse(readFileSync(new URL("./demo_photos.json", import.meta.url), "utf8"));
export const isPhotoTarget = (listing) => Boolean(listing.details?.demo || photos[listing.title]?.listing_id === listing.id);

// A title-specific photograph, also used when the demo is reset.
export function demoPhoto(title) {
  const photo = photos[title];
  if (!photo) return null;
  return {
    photo_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/${photo.path}`,
    details: { photo_credit: new URL(photo.source).hostname, photo_source_url: photo.source, photo_version: "realistic-v1" },
  };
}
