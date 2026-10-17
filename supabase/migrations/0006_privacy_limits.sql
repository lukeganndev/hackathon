-- Students can see each other's name and school, not email addresses.
revoke select on profiles from anon, authenticated;
grant select (id, school_id, display_name, created_at) on profiles to authenticated;

-- Listing photos: images only, 5 MB max (the app shrinks photos to ~300 KB first).
update storage.buckets
  set file_size_limit = 5242880, allowed_mime_types = '{image/jpeg,image/png,image/webp}'
  where id = 'listing-photos';
