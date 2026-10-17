-- Hard floor for banned content, enforced in the database so no client can skip it.
-- The app also runs AI moderation (src/lib/moderate.ts) for anything a word list can't catch.
-- Word-boundary matches only, and no ambiguous words ("pot", "gun" alone) to avoid false positives.
create function banned_reason(t text) returns text
language sql immutable as $$
  select case
    when t ~* '\m(cocaine|crack rock|meth|heroin|fentanyl|xanax|adderall|oxy(contin|codone)?|percocet|mdma|molly|lsd|acid tabs|shrooms|weed(?!\s*(eater|whacker|wacker|killer|trimmer))|marijuana|thc|edibles|dab pen|vape carts?|nicotine pouch(es)?)\M'
      then 'Drugs and controlled substances aren''t allowed on Loop.'
    when t ~* '\m(handgun|firearms?|pistols?|rifles?|shotguns?|ammo|ammunition|glock|ar-?15|switchblade|brass knuckles|taser|pepper spray)\M'
      then 'Weapons aren''t allowed on Loop.'
    when t ~* '\m(fake ids?|fake licen[cs]e|counterfeit|replica (jordans|yeezys|rolex))\M'
      then 'Fake IDs and counterfeit goods aren''t allowed on Loop.'
    when t ~* '\m(test banks?|exam answers|answer keys?|write (your|my) (essay|paper)|take (your|my) (exam|test|quiz)|do (your|my) homework)\M'
      then 'Cheating services break the honor code and aren''t allowed on Loop.'
    when t ~* '\m(vodka|whiske?y|tequila|liquor|everclear|kegs?)\M'
      then 'Alcohol sales aren''t allowed on Loop.'
  end
$$;

create function enforce_content_filter() returns trigger
language plpgsql as $$
declare
  j jsonb := to_jsonb(new); -- works for any of the three tables
  reason text := banned_reason(concat_ws(' ', j->>'title', j->>'description', j->>'text', j->>'comment'));
begin
  if reason is not null then
    raise exception '%', reason using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger listings_content_filter before insert or update of title, description on listings
  for each row execute function enforce_content_filter();
create trigger wants_content_filter before insert or update of text on wants
  for each row execute function enforce_content_filter();
create trigger ratings_content_filter before insert on ratings
  for each row execute function enforce_content_filter();

-- Student email domains that differ from the school's web domain.
update schools set email_domains = email_domains || '{ksu.edu}' where slug = 'k-state';
update schools set email_domains = email_domains || '{iu.edu}' where slug = 'indiana';
update schools set email_domains = email_domains || '{washington.edu}' where slug = 'uw';
update schools set email_domains = email_domains || '{tennessee.edu}' where slug = 'utk';
