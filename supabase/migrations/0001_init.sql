-- Loop: initial schema. Paste into Supabase SQL editor, or `npx supabase db push`.
-- Tenancy: school_id on every user-owned row. New school = insert into schools.

-- ---------- schools ----------
create table schools (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                    -- URL path: /alabama
  name text not null,
  email_domains text[] not null,                -- {crimson.ua.edu, ua.edu}
  colors jsonb not null default '{}',           -- {"primary":"#9E1B32","secondary":"#FFFFFF"}
  meetup_spots jsonb not null default '[]',     -- [{"name":"Ferguson Center","lat":..,"lng":..}]
  -- per ticket type: transfer_only (trade only, no cash) | face_value_cap | open
  ticket_policies jsonb not null default '{}',  -- {"football_general":"face_value_cap"}
  created_at timestamptz not null default now()
);

-- ---------- profiles (1:1 with auth.users) ----------
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  school_id uuid not null references schools,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

-- Signup gate: email domain must belong to a school, which auto-assigns school_id.
-- Non-school emails fail signup (that's the .edu verification).
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  sid uuid;
begin
  select id into sid from schools
   where lower(split_part(new.email, '@', 2)) = any(email_domains)
   limit 1;
  if sid is null then
    raise exception 'Email domain not recognized as a supported school';
  end if;
  insert into profiles (id, school_id, email, display_name)
  values (new.id, sid, new.email, split_part(new.email, '@', 1));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create function my_school_id() returns uuid
language sql stable security definer set search_path = public as $$
  select school_id from profiles where id = auth.uid()
$$;

-- ---------- listings (the "haves") ----------
create table listings (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools,
  owner_id uuid not null references profiles on delete cascade,
  title text not null,
  description text,
  category text,                                -- textbooks, clothing, tickets, furniture, electronics, other
  price_cents int check (price_cents >= 0),     -- null = trade only
  photo_url text,
  ticket_type text,                             -- null = not a ticket; else key into schools.ticket_policies
  face_value_cents int,
  status text not null default 'active'
    check (status in ('active', 'pending', 'traded', 'sold', 'removed')),
  created_at timestamptz not null default now()
);
create index on listings (school_id, status);

-- Ticket policy enforced in the DB so no client can skip it.
create function enforce_ticket_policy() returns trigger
language plpgsql as $$
declare
  policy text;
begin
  if new.ticket_type is null then return new; end if;
  select coalesce(ticket_policies ->> new.ticket_type, 'transfer_only') into policy
    from schools where id = new.school_id;
  if policy = 'transfer_only' and coalesce(new.price_cents, 0) > 0 then
    raise exception 'This ticket type can only be traded, not sold';
  elsif policy = 'face_value_cap' and new.price_cents > coalesce(new.face_value_cents, 0) then
    raise exception 'Ticket price cannot exceed face value';
  end if;
  return new;
end $$;

create trigger listings_ticket_policy
  before insert or update on listings
  for each row execute function enforce_ticket_policy();

-- ---------- wants ----------
-- Chat agent writes these. listing_id set = concrete edge for the matcher;
-- null = fuzzy want (text/category) for the AI to resolve to listings later.
create table wants (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools,
  user_id uuid not null references profiles on delete cascade,
  text text not null,                           -- "Norton Anthology", "size 10 running shoes"
  category text,
  listing_id uuid references listings on delete cascade,
  max_cash_cents int not null default 0,        -- willing to top up this much
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on wants (listing_id) where active;

-- ---------- trades (a loop: 1 sale = 1 leg, 3-way loop = 3 legs) ----------
-- Cross-campus trades span schools, so no school_id here; legs reach it via listings.
-- Writes go through server routes (service role); clients only read.
create table trades (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'meetup_set', 'done', 'cancelled')),
  meetup_spot text,
  meetup_at timestamptz,
  created_at timestamptz not null default now()
);

create table trade_legs (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades on delete cascade,
  listing_id uuid not null references listings,
  giver_id uuid not null references profiles,
  receiver_id uuid not null references profiles,
  cash_cents int not null default 0,            -- receiver pays giver (sale or top-up)
  stripe_payment_intent_id text,                -- manual-capture hold
  accepted_at timestamptz,                      -- set when receiver accepts the loop
  confirmed_at timestamptz,                     -- set when giver enters the receiver's code
  created_at timestamptz not null default now()
);
create index on trade_legs (trade_id);

-- Handoff code lives apart so only the receiver can read it (giver must type it in).
create table trade_leg_codes (
  leg_id uuid primary key references trade_legs on delete cascade,
  code char(4) not null
);

create function is_trade_participant(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from trade_legs
                  where trade_id = t and auth.uid() in (giver_id, receiver_id))
$$;

-- ---------- RLS ----------
alter table schools enable row level security;
alter table profiles enable row level security;
alter table listings enable row level security;
alter table wants enable row level security;
alter table trades enable row level security;
alter table trade_legs enable row level security;
alter table trade_leg_codes enable row level security;

create policy "schools public" on schools for select using (true);

create policy "profiles readable" on profiles for select to authenticated using (true);
create policy "profiles own update" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and school_id = my_school_id());

-- Cross-campus browsing: any signed-in student sees all active listings.
create policy "listings readable" on listings for select to authenticated
  using (status <> 'removed' or owner_id = auth.uid());
create policy "listings own insert" on listings for insert to authenticated
  with check (owner_id = auth.uid() and school_id = my_school_id());
create policy "listings own update" on listings for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid() and school_id = my_school_id());

create policy "wants readable" on wants for select to authenticated using (true);
create policy "wants own insert" on wants for insert to authenticated
  with check (user_id = auth.uid() and school_id = my_school_id());
create policy "wants own update" on wants for update to authenticated using (user_id = auth.uid());
create policy "wants own delete" on wants for delete to authenticated using (user_id = auth.uid());

create policy "trades participant" on trades for select to authenticated
  using (is_trade_participant(id));
create policy "legs participant" on trade_legs for select to authenticated
  using (is_trade_participant(trade_id));
create policy "codes receiver only" on trade_leg_codes for select to authenticated
  using (exists (select 1 from trade_legs l where l.id = leg_id and l.receiver_id = auth.uid()));

-- Realtime so trade screens update live as legs get accepted/confirmed.
alter publication supabase_realtime add table trades, trade_legs;

-- ---------- storage: listing photos ----------
insert into storage.buckets (id, name, public) values ('listing-photos', 'listing-photos', true);
-- Upload path must start with the user's id: <uid>/<file>.jpg
create policy "photo upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
