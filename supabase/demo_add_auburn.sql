-- Live demo: onboarding a new school is one insert.
insert into schools (slug, name, email_domains, colors, slogan, logo_url, meetup_spots) values (
  'auburn',
  'Auburn University',
  '{auburn.edu}',
  '{"primary":"#03244D","secondary":"#DD550C","banner":"https://mfjizvmectbqgyfqqvoq.supabase.co/storage/v1/object/public/listing-photos/banners/auburn.jpg"}',
  'War Eagle',
  'https://mfjizvmectbqgyfqqvoq.supabase.co/storage/v1/object/public/listing-photos/logos/icon-auburn.png',
  '[{"name":"Melton Student Center","lat":32.6036,"lng":-85.4876},
    {"name":"Ralph Brown Draughon Library","lat":32.6029,"lng":-85.4867}]'
);
