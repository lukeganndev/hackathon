-- Live demo: onboarding a new school is one insert.
insert into schools (slug, name, email_domains, colors, meetup_spots, ticket_policies) values (
  'auburn',
  'Auburn University',
  '{auburn.edu}',
  '{"primary":"#0C2340","secondary":"#E87722"}',
  '[{"name":"Melton Student Center","lat":32.6036,"lng":-85.4876},
    {"name":"Ralph Brown Draughon Library","lat":32.6029,"lng":-85.4867}]',
  '{"football_general":"face_value_cap","football_student":"transfer_only","other":"face_value_cap"}'
);
