-- Auburn is already live. Re-running preserves its existing data and updates only the logo.
-- Original user-supplied logo is also saved at public/schools/auburn.jpg.
insert into schools (slug, name, email_domains, colors, slogan, logo_url, meetup_spots) values (
  'auburn',
  'Auburn University',
  '{auburn.edu}',
  '{"primary":"#03244D","secondary":"#DD550C"}',
  'War Eagle',
  'https://mfjizvmectbqgyfqqvoq.supabase.co/storage/v1/object/public/listing-photos/logos/auburn-user-e69e5931b121.jpg',
  '[{"name":"Melton Student Center","lat":32.6036,"lng":-85.4876},
    {"name":"Ralph Brown Draughon Library","lat":32.6029,"lng":-85.4867}]'
)
on conflict (slug) do update set logo_url = excluded.logo_url;
