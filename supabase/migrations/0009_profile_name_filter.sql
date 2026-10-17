-- Display names (editable in Settings) go through the same blocklist as listings, wants and ratings.
create or replace function enforce_content_filter() returns trigger
language plpgsql as $$
declare
  j jsonb := to_jsonb(new);
  reason text := banned_reason(concat_ws(' ', j->>'title', j->>'description', j->>'text', j->>'comment', j->>'display_name'));
begin
  if reason is not null then
    raise exception '%', reason using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger profiles_content_filter before update of display_name on profiles
  for each row execute function enforce_content_filter();
alter table profiles add constraint display_name_length check (char_length(display_name) between 1 and 40) not valid;
