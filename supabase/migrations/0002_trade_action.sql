-- Trade state machine (Friend C). Reviewed and installed by Luke 2026-10-17.
-- Adds one service-only RPC and a private attempt counter, preserving existing tables.
-- Each RPC invocation is a transaction. Exceptions roll back all its writes.
begin;

create table public.loop_code_attempts (
  leg_id uuid primary key references public.trade_legs(id) on delete cascade,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  window_started timestamptz not null default now()
);
alter table public.loop_code_attempts enable row level security;
revoke all on public.loop_code_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.loop_code_attempts to service_role;

create function public.loop_trade_action(p_actor uuid, p_action text, p_payload jsonb)
returns jsonb
language plpgsql security invoker
set search_path = public
set lock_timeout = '5s'
as $$
declare
  v_id uuid;
  v_trade public.trades%rowtype;
  v_leg public.trade_legs%rowtype;
  v_listing public.listings%rowtype;
  v_edge record;
  v_count integer;
  v_ids uuid[];
  v_people uuid[];
  v_current uuid;
  v_next uuid;
  v_seen uuid[] := '{}';
  v_index integer;
  v_spot text;
  v_at timestamptz;
  v_code text;
  v_attempt public.loop_code_attempts%rowtype;
begin
  if p_actor is null or not exists (select 1 from public.profiles where id = p_actor) then
    raise exception 'TRADE:403:Student profile required';
  end if;
  if jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'TRADE:400:Expected an object';
  end if;

  if p_action = 'create' then
    if jsonb_typeof(p_payload->'legs') is distinct from 'array' then
      raise exception 'TRADE:400:Expected trade legs';
    end if;
    v_count := jsonb_array_length(p_payload->'legs');
    if v_count < 1 or v_count > 4 then raise exception 'TRADE:400:A trade needs 1 to 4 legs'; end if;

    select array_agg(e."listingId" order by e."listingId"), array_agg(e."from")
      into v_ids, v_people
      from jsonb_to_recordset(p_payload->'legs') as e("from" uuid, "to" uuid, "listingId" uuid, "cashCents" integer);
    if exists (
      select 1 from jsonb_to_recordset(p_payload->'legs') as e("from" uuid, "to" uuid, "listingId" uuid, "cashCents" integer)
      where e."from" is null or e."to" is null or e."listingId" is null or e."cashCents" is null
        or e."from" = e."to" or e."cashCents" < 0
    ) or (select count(distinct x) from unnest(v_ids) x) <> v_count then
      raise exception 'TRADE:400:Invalid or repeated trade legs';
    end if;
    if not exists (
      select 1 from jsonb_to_recordset(p_payload->'legs') as e("from" uuid, "to" uuid)
      where p_actor in (e."from", e."to")
    ) then raise exception 'TRADE:403:You must be in this trade'; end if;

    if v_count > 1 then
      if (select count(distinct x) from unnest(v_people) x) <> v_count or
        (select count(distinct e."to") from jsonb_to_recordset(p_payload->'legs') as e("to" uuid)) <> v_count then
        raise exception 'TRADE:400:Each person must give and receive once';
      end if;
      v_current := v_people[1];
      for v_index in 1..v_count loop
        if v_current = any(v_seen) then raise exception 'TRADE:400:Legs must form one connected loop'; end if;
        v_seen := array_append(v_seen, v_current);
        select e."to" into v_next from jsonb_to_recordset(p_payload->'legs') as e("from" uuid, "to" uuid)
          where e."from" = v_current;
        if v_next is null then raise exception 'TRADE:400:Legs must form one connected loop'; end if;
        v_current := v_next;
      end loop;
      if v_current <> v_people[1] then raise exception 'TRADE:400:Legs must form a closed loop'; end if;
    end if;

    -- Stable lock order serializes proposals sharing listings, including reusable ones.
    perform id from public.listings where id = any(v_ids) order by id for update;
    if (select count(*) from public.listings where id = any(v_ids) and status = 'active') <> v_count then
      raise exception 'TRADE:409:A listing is no longer available';
    end if;
    if exists (select 1 from public.trade_legs l join public.listings i on i.id = l.listing_id
      join public.trades t on t.id = l.trade_id where i.id = any(v_ids) and i.kind = 'item'
      and t.status in ('proposed', 'accepted', 'meetup_set')) then
      raise exception 'TRADE:409:An item is already reserved in another trade';
    end if;
    -- Lock concrete wants before validating them so deletion cannot race this check.
    perform w.id from public.wants w where w.listing_id = any(v_ids) order by w.id for update;
    for v_edge in select * from jsonb_to_recordset(p_payload->'legs') as e("from" uuid, "to" uuid, "listingId" uuid, "cashCents" integer) loop
      select * into v_listing from public.listings where id = v_edge."listingId";
      if v_listing.owner_id <> v_edge."from" or not exists (select 1 from public.profiles where id = v_edge."to") then
        raise exception 'TRADE:400:Listing owner or receiver is invalid';
      end if;
      if v_count = 1 then
        if v_listing.price_cents is null or v_listing.price_cents <> v_edge."cashCents" then
          raise exception 'TRADE:400:Sale price must match the current listing price';
        end if;
      elsif v_edge."cashCents" <> 0 or not exists (
        select 1 from public.wants where active and listing_id = v_edge."listingId" and user_id = v_edge."to"
      ) then raise exception 'TRADE:409:An active want is required for every pure-swap leg'; end if;
    end loop;

    -- Prevent duplicate active proposals for the exact same reusable service/ride loop.
    if exists (
      select 1 from public.trades t where t.status in ('proposed', 'accepted', 'meetup_set')
        and (select count(*) from public.trade_legs l where l.trade_id = t.id) = v_count
        and not exists (
          select 1 from jsonb_to_recordset(p_payload->'legs') as e("from" uuid, "to" uuid, "listingId" uuid, "cashCents" integer)
          where not exists (select 1 from public.trade_legs l where l.trade_id = t.id
            and l.listing_id = e."listingId" and l.giver_id = e."from" and l.receiver_id = e."to" and l.cash_cents = e."cashCents")
        )
    ) then raise exception 'TRADE:409:This trade has already been proposed'; end if;

    insert into public.trades default values returning * into v_trade;
    v_id := v_trade.id;
    insert into public.trade_legs (trade_id, listing_id, giver_id, receiver_id, cash_cents, accepted_at)
      select v_id, e."listingId", e."from", e."to", e."cashCents", case when e."to" = p_actor then now() end
      from jsonb_to_recordset(p_payload->'legs') as e("from" uuid, "to" uuid, "listingId" uuid, "cashCents" integer);
    update public.listings set status = 'pending' where id = any(v_ids) and kind = 'item';
    if not exists (select 1 from public.trade_legs where trade_id = v_id and accepted_at is null) then
      update public.trades set status = 'accepted' where id = v_id;
    end if;
  else
    v_id := (p_payload->>'id')::uuid;
    select * into v_trade from public.trades where id = v_id for update;
    if not found then raise exception 'TRADE:404:Trade not found'; end if;
    if not exists (select 1 from public.trade_legs where trade_id = v_id and p_actor in (giver_id, receiver_id)) then
      raise exception 'TRADE:403:You are not in this trade';
    end if;
    if p_action in ('accept', 'meetup', 'confirm') and v_trade.status not in ('done', 'cancelled') and exists (
      select 1 from public.trade_legs l join public.listings i on i.id = l.listing_id where l.trade_id = v_id
      and ((i.kind = 'item' and i.status <> 'pending') or (i.kind <> 'item' and i.status <> 'active'))
    ) then raise exception 'TRADE:409:A listing changed availability; cancel this trade and try again'; end if;

    if p_action = 'accept' then
      if not exists (select 1 from public.trade_legs where trade_id = v_id and receiver_id = p_actor) then
        raise exception 'TRADE:403:Only a receiver can accept';
      end if;
      if v_trade.status = 'accepted' then return jsonb_build_object('trade', to_jsonb(v_trade)); end if;
      if v_trade.status <> 'proposed' then raise exception 'TRADE:409:This trade cannot be accepted now'; end if;
      update public.trade_legs set accepted_at = coalesce(accepted_at, now()) where trade_id = v_id and receiver_id = p_actor;
      if not exists (select 1 from public.trade_legs where trade_id = v_id and accepted_at is null) then
        update public.trades set status = 'accepted' where id = v_id;
      end if;

    elsif p_action = 'meetup' then
      v_spot := p_payload->>'spot';
      v_at := (p_payload->>'at')::timestamptz;
      if v_trade.status = 'meetup_set' and v_trade.meetup_spot = v_spot and v_trade.meetup_at = v_at then
        return jsonb_build_object('trade', to_jsonb(v_trade));
      end if;
      if v_trade.status <> 'accepted' then raise exception 'TRADE:409:Everyone must accept before scheduling'; end if;
      if exists (select 1 from public.trade_legs where trade_id = v_id and cash_cents > 0) then
        raise exception 'TRADE:409:Cash handoffs are disabled until the Stripe checkpoint';
      end if;
      if v_at is null or v_at <= now() then raise exception 'TRADE:400:Choose a future meetup time'; end if;
      if v_spot is null or not exists (
        select 1 from public.trade_legs l join public.listings i on i.id = l.listing_id
          join public.schools s on s.id = i.school_id
          cross join lateral jsonb_array_elements(s.meetup_spots) spot
        where l.trade_id = v_id and spot->>'name' = v_spot
      ) then raise exception 'TRADE:400:Choose an approved campus meetup spot'; end if;
      insert into public.trade_leg_codes (leg_id, code)
        select id, lpad(((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint) % 10000)::text, 4, '0')
        from public.trade_legs where trade_id = v_id;
      update public.trades set status = 'meetup_set', meetup_spot = v_spot, meetup_at = v_at where id = v_id;

    elsif p_action = 'confirm' then
      select * into v_leg from public.trade_legs where id = (p_payload->>'legId')::uuid and trade_id = v_id;
      if not found then raise exception 'TRADE:404:Handoff not found'; end if;
      if v_leg.giver_id <> p_actor then raise exception 'TRADE:403:Only the giver can confirm a handoff'; end if;
      if v_trade.status not in ('meetup_set', 'done') then raise exception 'TRADE:409:Schedule the meetup first'; end if;
      if v_leg.confirmed_at is not null then return jsonb_build_object('trade', to_jsonb(v_trade)); end if;
      if v_trade.status = 'done' then raise exception 'TRADE:409:This trade is already complete'; end if;
      if exists (select 1 from public.trade_legs where trade_id = v_id and cash_cents > 0) then
        raise exception 'TRADE:409:Cash handoffs are disabled until the Stripe checkpoint';
      end if;
      insert into public.loop_code_attempts (leg_id) values (v_leg.id) on conflict do nothing;
      select * into v_attempt from public.loop_code_attempts where leg_id = v_leg.id for update;
      if v_attempt.window_started <= now() - interval '15 minutes' then
        update public.loop_code_attempts set failed_attempts = 0, window_started = now() where leg_id = v_leg.id;
        v_attempt.failed_attempts := 0;
      end if;
      if v_attempt.failed_attempts >= 5 then
        return jsonb_build_object('httpStatus', 429, 'error', 'Too many incorrect codes. Try again in 15 minutes.');
      end if;
      select code into v_code from public.trade_leg_codes where leg_id = v_leg.id;
      if v_code is null or v_code is distinct from (p_payload->>'code') then
        update public.loop_code_attempts set failed_attempts = failed_attempts + 1 where leg_id = v_leg.id;
        -- Return, rather than raise: the failed-attempt increment must commit.
        return jsonb_build_object('httpStatus', 400, 'error', 'Incorrect handoff code');
      end if;
      update public.trade_legs set confirmed_at = now() where id = v_leg.id;
      delete from public.loop_code_attempts where leg_id = v_leg.id;
      if not exists (select 1 from public.trade_legs where trade_id = v_id and confirmed_at is null) then
        perform i.id from public.listings i join public.trade_legs l on l.listing_id = i.id
          where l.trade_id = v_id order by i.id for update of i;
        update public.listings i set status = case when
          (select count(*) from public.trade_legs where trade_id = v_id) = 1
          and (select cash_cents from public.trade_legs where trade_id = v_id limit 1) > 0 then 'sold' else 'traded' end
          where i.kind = 'item' and i.id in (select listing_id from public.trade_legs where trade_id = v_id);
        update public.wants w set active = false where exists (
          select 1 from public.trade_legs l where l.trade_id = v_id and l.listing_id = w.listing_id and l.receiver_id = w.user_id
        );
        update public.trades set status = 'done' where id = v_id;
        delete from public.trade_leg_codes where leg_id in (select id from public.trade_legs where trade_id = v_id);
      end if;

    elsif p_action = 'cancel' then
      if v_trade.status = 'cancelled' then return jsonb_build_object('trade', to_jsonb(v_trade)); end if;
      if v_trade.status = 'done' then raise exception 'TRADE:409:A completed trade cannot be cancelled'; end if;
      if exists (select 1 from public.trade_legs where trade_id = v_id and confirmed_at is not null) then
        raise exception 'TRADE:409:A handoff already happened; cancellation needs manual resolution';
      end if;
      perform i.id from public.listings i join public.trade_legs l on l.listing_id = i.id
        where l.trade_id = v_id order by i.id for update of i;
      update public.listings set status = 'active' where kind = 'item' and status = 'pending'
        and id in (select listing_id from public.trade_legs where trade_id = v_id);
      delete from public.trade_leg_codes where leg_id in (select id from public.trade_legs where trade_id = v_id);
      delete from public.loop_code_attempts where leg_id in (select id from public.trade_legs where trade_id = v_id);
      update public.trades set status = 'cancelled' where id = v_id;
    else
      raise exception 'TRADE:400:Unknown trade action';
    end if;
  end if;

  select * into v_trade from public.trades where id = v_id;
  return jsonb_build_object('trade', to_jsonb(v_trade));
end;
$$;

-- Actor identity comes only from a verified session in the server API.
-- Browsers cannot call this service-only function with a forged actor ID.
revoke all on function public.loop_trade_action(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.loop_trade_action(uuid, text, jsonb) to service_role;
commit;
