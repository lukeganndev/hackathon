-- Live demo: onboarding a new school is one insert.
insert into schools (slug, name, email_domains, colors, slogan, meetup_spots) values (
  'auburn',
  'Auburn University',
  '{auburn.edu}',
  '{"primary":"#03244D","secondary":"#DD550C"}',
  'War Eagle',
  '[{"name":"Melton Student Center","lat":32.6036,"lng":-85.4876},
    {"name":"Ralph Brown Draughon Library","lat":32.6029,"lng":-85.4867}]'
);
