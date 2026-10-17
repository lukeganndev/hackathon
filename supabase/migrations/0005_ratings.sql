-- Ratings: only after a handoff confirmed with a code, only by the two people in that handoff,
-- once each. Enforced here so reviews can't be faked from the browser.
create table ratings (
  id uuid primary key default gen_random_uuid(),
  trade_leg_id uuid not null references trade_legs on delete cascade,
  rater_id uuid not null references profiles on delete cascade,
  ratee_id uuid not null references profiles on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (trade_leg_id, rater_id),
  check (rater_id <> ratee_id)
);
create index on ratings (ratee_id);
alter table ratings enable row level security;

create policy "ratings readable" on ratings for select to authenticated using (true);
create policy "ratings after confirmed handoff" on ratings for insert to authenticated
  with check (
    rater_id = auth.uid()
    and exists (
      select 1 from trade_legs l
      where l.id = trade_leg_id and l.confirmed_at is not null
        and ((l.giver_id = rater_id and l.receiver_id = ratee_id)
          or (l.receiver_id = rater_id and l.giver_id = ratee_id))
    )
  );

-- Average + count per student, for listing pages and profiles.
create view rating_summary with (security_invoker = true) as
  select ratee_id, round(avg(stars)::numeric, 1) as avg_stars, count(*)::int as review_count
  from ratings group by ratee_id;
