-- Every campus from the design: colors, slogan, email domain. Auburn is left out for the live 'add a school' demo.
alter table schools add column slogan text, add column logo_url text;
update schools set slogan = 'Roll Tide', colors = '{"primary":"#9E1B32","secondary":"#828A8F"}' where slug = 'alabama';
insert into schools (slug, name, email_domains, colors, slogan, meetup_spots) values
  ('gatech', 'Georgia Tech', '{gatech.edu}', '{"primary": "#003057", "secondary": "#B3A369"}', 'Ramblin’ Wreck', '[{"name":"Student union"}]'),
  ('mit', 'MIT', '{mit.edu}', '{"primary": "#A31F34", "secondary": "#8A8B8C"}', 'Mens et Manus', '[{"name":"Student union"}]'),
  ('stanford', 'Stanford University', '{stanford.edu}', '{"primary": "#8C1515", "secondary": "#2E2D29"}', 'Go Cardinal', '[{"name":"Student union"}]'),
  ('vt', 'Virginia Tech', '{vt.edu}', '{"primary": "#861F41", "secondary": "#E5751F"}', 'Go Hokies', '[{"name":"Student union"}]'),
  ('baylor', 'Baylor University', '{baylor.edu}', '{"primary": "#154734", "secondary": "#FFB81C"}', 'Sic ’Em Bears', '[{"name":"Student union"}]'),
  ('virginia', 'University of Virginia', '{virginia.edu}', '{"primary": "#232D4B", "secondary": "#E57200"}', 'Wahoowa', '[{"name":"Student union"}]'),
  ('unc', 'UNC Chapel Hill', '{unc.edu}', '{"primary": "#4B9CD3", "secondary": "#13294B"}', 'Go Heels', '[{"name":"Student union"}]'),
  ('duke', 'Duke University', '{duke.edu}', '{"primary": "#003087", "secondary": "#CCCCCC"}', 'Go Blue Devils', '[{"name":"Student union"}]'),
  ('ncsu', 'NC State', '{ncsu.edu}', '{"primary": "#CC0000", "secondary": "#1a1a1a"}', 'Go Pack', '[{"name":"Student union"}]'),
  ('clemson', 'Clemson University', '{clemson.edu}', '{"primary": "#F56600", "secondary": "#522D80"}', 'Go Tigers', '[{"name":"Student union"}]'),
  ('sc', 'South Carolina', '{sc.edu}', '{"primary": "#73000A", "secondary": "#1a1a1a"}', 'Go Cocks', '[{"name":"Student union"}]'),
  ('uga', 'University of Georgia', '{uga.edu}', '{"primary": "#BA0C2F", "secondary": "#1a1a1a"}', 'Go Dawgs', '[{"name":"Student union"}]'),
  ('ufl', 'University of Florida', '{ufl.edu}', '{"primary": "#0021A5", "secondary": "#FA4616"}', 'Go Gators', '[{"name":"Student union"}]'),
  ('fsu', 'Florida State', '{fsu.edu}', '{"primary": "#782F40", "secondary": "#CEB888"}', 'Go Noles', '[{"name":"Student union"}]'),
  ('miami', 'University of Miami', '{miami.edu}', '{"primary": "#005030", "secondary": "#F47321"}', 'It’s a Canes Thing', '[{"name":"Student union"}]'),
  ('lsu', 'LSU', '{lsu.edu}', '{"primary": "#461D7C", "secondary": "#FDD023"}', 'Geaux Tigers', '[{"name":"Student union"}]'),
  ('olemiss', 'Ole Miss', '{olemiss.edu}', '{"primary": "#14213D", "secondary": "#CE1126"}', 'Hotty Toddy', '[{"name":"Student union"}]'),
  ('msstate', 'Mississippi State', '{msstate.edu}', '{"primary": "#5D1725", "secondary": "#8D817B"}', 'Hail State', '[{"name":"Student union"}]'),
  ('vanderbilt', 'Vanderbilt', '{vanderbilt.edu}', '{"primary": "#866D4B", "secondary": "#000000"}', 'Anchor Down', '[{"name":"Student union"}]'),
  ('utk', 'Tennessee', '{utk.edu}', '{"primary": "#FF8200", "secondary": "#58595B"}', 'Go Vols', '[{"name":"Student union"}]'),
  ('uky', 'Kentucky', '{uky.edu}', '{"primary": "#0033A0", "secondary": "#B0B7BC"}', 'Go Cats', '[{"name":"Student union"}]'),
  ('tamu', 'Texas A&M', '{tamu.edu}', '{"primary": "#500000", "secondary": "#5C6670"}', 'Gig ’Em', '[{"name":"Student union"}]'),
  ('utexas', 'UT Austin', '{utexas.edu}', '{"primary": "#BF5700", "secondary": "#333F48"}', 'Hook ’Em', '[{"name":"Student union"}]'),
  ('ttu', 'Texas Tech', '{ttu.edu}', '{"primary": "#CC0000", "secondary": "#1a1a1a"}', 'Wreck ’Em', '[{"name":"Student union"}]'),
  ('tcu', 'TCU', '{tcu.edu}', '{"primary": "#4D1979", "secondary": "#A3A9AC"}', 'Go Frogs', '[{"name":"Student union"}]'),
  ('smu', 'SMU', '{smu.edu}', '{"primary": "#354CA1", "secondary": "#CC0035"}', 'Pony Up', '[{"name":"Student union"}]'),
  ('ou', 'Oklahoma', '{ou.edu}', '{"primary": "#841617", "secondary": "#B8B8B8"}', 'Boomer Sooner', '[{"name":"Student union"}]'),
  ('okstate', 'Oklahoma State', '{okstate.edu}', '{"primary": "#FF7300", "secondary": "#000000"}', 'Go Pokes', '[{"name":"Student union"}]'),
  ('uark', 'Arkansas', '{uark.edu}', '{"primary": "#9D2235", "secondary": "#1a1a1a"}', 'Woo Pig', '[{"name":"Student union"}]'),
  ('ku', 'Kansas', '{ku.edu}', '{"primary": "#0051BA", "secondary": "#E8000D"}', 'Rock Chalk', '[{"name":"Student union"}]'),
  ('k-state', 'Kansas State', '{k-state.edu}', '{"primary": "#512888", "secondary": "#A7A9AC"}', 'Go Cats', '[{"name":"Student union"}]'),
  ('iastate', 'Iowa State', '{iastate.edu}', '{"primary": "#C8102E", "secondary": "#F1BE48"}', 'Go Cyclones', '[{"name":"Student union"}]'),
  ('uiowa', 'Iowa', '{uiowa.edu}', '{"primary": "#FFCD00", "secondary": "#000000"}', 'Go Hawks', '[{"name":"Student union"}]'),
  ('umich', 'Michigan', '{umich.edu}', '{"primary": "#00274C", "secondary": "#FFCB05"}', 'Go Blue', '[{"name":"Student union"}]'),
  ('msu', 'Michigan State', '{msu.edu}', '{"primary": "#18453B", "secondary": "#8A8D8F"}', 'Go Green', '[{"name":"Student union"}]'),
  ('osu', 'Ohio State', '{osu.edu}', '{"primary": "#BB0000", "secondary": "#666666"}', 'O-H-I-O', '[{"name":"Student union"}]'),
  ('psu', 'Penn State', '{psu.edu}', '{"primary": "#041E42", "secondary": "#96BEE6"}', 'We Are', '[{"name":"Student union"}]'),
  ('wisc', 'Wisconsin', '{wisc.edu}', '{"primary": "#C5050C", "secondary": "#282728"}', 'On Wisconsin', '[{"name":"Student union"}]'),
  ('umn', 'Minnesota', '{umn.edu}', '{"primary": "#7A0019", "secondary": "#FFCC33"}', 'Ski-U-Mah', '[{"name":"Student union"}]'),
  ('illinois', 'Illinois', '{illinois.edu}', '{"primary": "#13294B", "secondary": "#E84A27"}', 'I-L-L', '[{"name":"Student union"}]'),
  ('purdue', 'Purdue', '{purdue.edu}', '{"primary": "#CFB991", "secondary": "#000000"}', 'Boiler Up', '[{"name":"Student union"}]'),
  ('indiana', 'Indiana', '{indiana.edu}', '{"primary": "#990000", "secondary": "#8A8A8A"}', 'Hoosier Nation', '[{"name":"Student union"}]'),
  ('northwestern', 'Northwestern', '{northwestern.edu}', '{"primary": "#4E2A84", "secondary": "#B6ACD1"}', 'Go ’Cats', '[{"name":"Student union"}]'),
  ('unl', 'Nebraska', '{unl.edu}', '{"primary": "#E41C38", "secondary": "#8A8A8A"}', 'Go Big Red', '[{"name":"Student union"}]'),
  ('nd', 'Notre Dame', '{nd.edu}', '{"primary": "#0C2340", "secondary": "#C99700"}', 'Go Irish', '[{"name":"Student union"}]'),
  ('rutgers', 'Rutgers', '{rutgers.edu}', '{"primary": "#CC0033", "secondary": "#5F6A72"}', 'Scarlet Knights', '[{"name":"Student union"}]'),
  ('umd', 'Maryland', '{umd.edu}', '{"primary": "#E21833", "secondary": "#FFD200"}', 'Fear the Turtle', '[{"name":"Student union"}]'),
  ('syr', 'Syracuse', '{syr.edu}', '{"primary": "#F76900", "secondary": "#000E54"}', 'Go Orange', '[{"name":"Student union"}]'),
  ('bc', 'Boston College', '{bc.edu}', '{"primary": "#8A100B", "secondary": "#B29D6C"}', 'On to Victory', '[{"name":"Student union"}]'),
  ('bu', 'Boston University', '{bu.edu}', '{"primary": "#CC0000", "secondary": "#1a1a1a"}', 'Go Terriers', '[{"name":"Student union"}]'),
  ('harvard', 'Harvard', '{harvard.edu}', '{"primary": "#A51C30", "secondary": "#1E1E1E"}', 'Go Crimson', '[{"name":"Student union"}]'),
  ('yale', 'Yale', '{yale.edu}', '{"primary": "#00356B", "secondary": "#286DC0"}', 'Boola Boola', '[{"name":"Student union"}]'),
  ('upenn', 'Penn', '{upenn.edu}', '{"primary": "#011F5B", "secondary": "#990000"}', 'Go Quakers', '[{"name":"Student union"}]'),
  ('princeton', 'Princeton', '{princeton.edu}', '{"primary": "#E77500", "secondary": "#000000"}', 'Go Tigers', '[{"name":"Student union"}]'),
  ('cornell', 'Cornell', '{cornell.edu}', '{"primary": "#B31B1B", "secondary": "#222222"}', 'Go Big Red', '[{"name":"Student union"}]'),
  ('columbia', 'Columbia', '{columbia.edu}', '{"primary": "#1D4F91", "secondary": "#B9D9EB"}', 'Roar Lions', '[{"name":"Student union"}]'),
  ('brown', 'Brown', '{brown.edu}', '{"primary": "#4E3629", "secondary": "#C00404"}', 'Go Bears', '[{"name":"Student union"}]'),
  ('dartmouth', 'Dartmouth', '{dartmouth.edu}', '{"primary": "#00693E", "secondary": "#12312B"}', 'Go Big Green', '[{"name":"Student union"}]'),
  ('georgetown', 'Georgetown', '{georgetown.edu}', '{"primary": "#041E42", "secondary": "#8D817B"}', 'Hoya Saxa', '[{"name":"Student union"}]'),
  ('villanova', 'Villanova', '{villanova.edu}', '{"primary": "#00205B", "secondary": "#13B5EA"}', 'Go ’Nova', '[{"name":"Student union"}]'),
  ('nyu', 'NYU', '{nyu.edu}', '{"primary": "#57068C", "secondary": "#B69CC8"}', 'Go Violets', '[{"name":"Student union"}]'),
  ('usc', 'USC', '{usc.edu}', '{"primary": "#990000", "secondary": "#FFC72C"}', 'Fight On', '[{"name":"Student union"}]'),
  ('ucla', 'UCLA', '{ucla.edu}', '{"primary": "#2774AE", "secondary": "#FFD100"}', 'Go Bruins', '[{"name":"Student union"}]'),
  ('berkeley', 'UC Berkeley', '{berkeley.edu}', '{"primary": "#003262", "secondary": "#FDB515"}', 'Go Bears', '[{"name":"Student union"}]'),
  ('uw', 'Washington', '{uw.edu}', '{"primary": "#4B2E83", "secondary": "#B7A57A"}', 'Go Dawgs', '[{"name":"Student union"}]'),
  ('wsu', 'Washington State', '{wsu.edu}', '{"primary": "#981E32", "secondary": "#5E6A71"}', 'Go Cougs', '[{"name":"Student union"}]'),
  ('uoregon', 'Oregon', '{uoregon.edu}', '{"primary": "#154733", "secondary": "#FEE123"}', 'Go Ducks', '[{"name":"Student union"}]'),
  ('oregonstate', 'Oregon State', '{oregonstate.edu}', '{"primary": "#DC4405", "secondary": "#000000"}', 'Go Beavs', '[{"name":"Student union"}]'),
  ('colorado', 'Colorado', '{colorado.edu}', '{"primary": "#CFB87C", "secondary": "#000000"}', 'Sko Buffs', '[{"name":"Student union"}]'),
  ('utah', 'Utah', '{utah.edu}', '{"primary": "#CC0000", "secondary": "#808080"}', 'Go Utes', '[{"name":"Student union"}]'),
  ('asu', 'Arizona State', '{asu.edu}', '{"primary": "#8C1D40", "secondary": "#FFC627"}', 'Forks Up', '[{"name":"Student union"}]'),
  ('arizona', 'Arizona', '{arizona.edu}', '{"primary": "#AB0520", "secondary": "#0C234B"}', 'Bear Down', '[{"name":"Student union"}]'),
  ('gonzaga', 'Gonzaga', '{gonzaga.edu}', '{"primary": "#041E42", "secondary": "#C8102E"}', 'Go Zags', '[{"name":"Student union"}]')
on conflict (slug) do nothing;

-- Accept school subdomains too (mail.umich.edu, g.harvard.edu, crimson.ua.edu).
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  dom text := lower(split_part(new.email, '@', 2));
  sid uuid;
begin
  select s.id into sid from schools s, unnest(s.email_domains) d
   where dom = d or dom like '%.' || d
   order by length(d) desc
   limit 1;
  if sid is null then
    raise exception 'Email domain not recognized as a supported school';
  end if;
  insert into profiles (id, school_id, email, display_name)
  values (new.id, sid, new.email, split_part(new.email, '@', 1));
  return new;
end $$;
