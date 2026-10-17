-- Direct messages between students, usually about a listing (offers). Only the two people can read them.
create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles on delete cascade default auth.uid(),
  recipient_id uuid not null references profiles on delete cascade,
  listing_id uuid references listings on delete set null,
  body text not null check (char_length(body) between 1 and 1000),
  offer_cents int check (offer_cents between 0 and 1000000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index on messages (recipient_id, created_at desc);
create index on messages (sender_id, created_at desc);
alter table messages enable row level security;

create policy "messages participants read" on messages for select to authenticated
  using (auth.uid() in (sender_id, recipient_id));
create policy "messages send as self" on messages for insert to authenticated
  with check (sender_id = auth.uid());
-- Recipients can only mark messages read.
revoke update on messages from authenticated;
grant update (read_at) on messages to authenticated;
create policy "messages recipient marks read" on messages for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- Same blocklist as everything else (adds the body column).
create or replace function enforce_content_filter() returns trigger
language plpgsql as $$
declare
  j jsonb := to_jsonb(new);
  reason text := banned_reason(concat_ws(' ', j->>'title', j->>'description', j->>'text', j->>'comment', j->>'display_name', j->>'body'));
begin
  if reason is not null then
    raise exception '%', reason using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger messages_content_filter before insert on messages
  for each row execute function enforce_content_filter();

alter publication supabase_realtime add table messages;
