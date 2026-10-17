-- Report a listing. 3 reports from different students hide it until someone reviews it.
create table reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings on delete cascade,
  reporter_id uuid not null references profiles on delete cascade,
  reason text not null check (reason in ('scam', 'prohibited', 'ticket_resale', 'offensive', 'other')),
  created_at timestamptz not null default now(),
  unique (listing_id, reporter_id)
);
alter table reports enable row level security;
-- Students can file reports but not read anyone's (including who reported them).
create policy "reports own insert" on reports for insert to authenticated
  with check (reporter_id = auth.uid());

create function hide_reported_listing() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from reports where listing_id = new.listing_id) >= 3 then
    update listings set status = 'removed' where id = new.listing_id and status = 'active';
  end if;
  return new;
end $$;

create trigger reports_hide_listing
  after insert on reports
  for each row execute function hide_reported_listing();
