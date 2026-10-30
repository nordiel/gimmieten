-- Get judged (#40): each member is a speaker ('player': researches, explains,
-- and judges the others) or a 'judge' (only rates). A room's format sets the
-- role new members get: 'party' makes everyone a speaker, 'judged' makes
-- everyone but the host a judge. Members can switch their own role in the lobby.

alter table public.rooms
  add column format text not null default 'party' check (format in ('party', 'judged'));

alter table public.room_players drop constraint room_players_role_check;
alter table public.room_players
  add constraint room_players_role_check check (role in ('player', 'judge', 'spectator'));

-- ---------------------------------------------------------------- phase machine

-- As before, except a lone speaker skips the speaking-order draw.
create or replace function private.advance(p_room uuid) returns void
language plpgsql set search_path = '' as $$
declare
  r public.rooms;
  v_order uuid[];
begin
  select * into r from public.rooms where id = p_room for update;

  if r.phase = 'reveal' then
    update public.room_players set done = false where room_id = p_room;
    update public.rooms set phase = 'research', phase_ends_at = now() + interval '5 minutes' where id = p_room;
  elsif r.phase = 'research' then
    select array_agg(user_id order by random()) into v_order
      from public.room_players where room_id = p_room and role = 'player';
    if coalesce(array_length(v_order, 1), 0) = 1 then
      update public.rooms
        set phase = 'upnext', speaking_order = v_order, current_turn = 0, phase_ends_at = now() + interval '15 seconds'
        where id = p_room;
    else
      update public.rooms
        set phase = 'order', speaking_order = v_order, current_turn = 0, phase_ends_at = now() + interval '4 seconds'
        where id = p_room;
    end if;
  elsif r.phase = 'order' then
    update public.rooms set phase = 'upnext', phase_ends_at = now() + interval '15 seconds' where id = p_room;
  elsif r.phase = 'upnext' then
    update public.rooms set phase = 'speaking', phase_ends_at = now() + make_interval(mins => r.explain_minutes)
      where id = p_room;
  elsif r.phase = 'speaking' then
    update public.rooms set phase = 'judging', ratings_count = 0, phase_ends_at = now() + interval '30 seconds'
      where id = p_room;
  elsif r.phase = 'judging' then
    if r.current_turn + 1 < coalesce(array_length(r.speaking_order, 1), 0) then
      update public.rooms
        set phase = 'upnext', current_turn = current_turn + 1, phase_ends_at = now() + interval '15 seconds'
        where id = p_room;
    else
      update public.rooms set phase = 'results', phase_ends_at = null where id = p_room;
    end if;
  else
    return;
  end if;

  update public.rooms
    set phase_started_at = now(), version = version + 1, last_activity_at = now()
    where id = p_room;
end $$;

-- ---------------------------------------------------------------- lobby RPCs

drop function public.create_room(text, text, text, int, int, text[]);
create or replace function public.create_room(
  p_nickname text,
  p_topic_mode text default 'own',
  p_category text default 'all',
  p_explain_minutes int default 1,
  p_max_players int default 6,
  p_completed text[] default '{}',
  p_format text default 'party'
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  v_nickname text := private.clean_nickname(p_nickname);
  v_code text;
  v_room uuid;
begin
  if (select count(*) from public.rooms where host_id = v_uid and created_at > now() - interval '1 hour') >= 20 then
    perform private.fail('rate_limited');
  end if;
  -- Idle rooms expire, freeing their codes.
  delete from public.rooms where last_activity_at < now() - interval '6 hours';

  v_code := private.new_room_code();
  insert into public.rooms (code, host_id, topic_mode, category, explain_minutes, max_players, format)
  values (
    v_code,
    v_uid,
    case when p_topic_mode = 'shared' then 'shared' else 'own' end,
    private.valid_category(p_category),
    case when p_explain_minutes = 2 then 2 else 1 end,
    least(6, greatest(2, coalesce(p_max_players, 6))),
    case when p_format = 'judged' then 'judged' else 'party' end
  )
  returning id into v_room;

  insert into public.room_players (room_id, user_id, nickname, ready, completed_topic_ids)
  values (v_room, v_uid, v_nickname, true, coalesce(p_completed[1:500], '{}'));
  return v_code;
end $$;

create or replace function public.join_room(p_code text, p_nickname text, p_completed text[] default '{}')
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  r public.rooms;
  v_nickname text;
begin
  select * into r from public.rooms where code = upper(btrim(p_code)) for update;
  if not found then perform private.fail('room_not_found'); end if;
  -- Rejoining (refresh, new tab) keeps your seat.
  if exists (select 1 from public.room_players where room_id = r.id and user_id = v_uid) then
    return r.id;
  end if;
  if r.phase <> 'lobby' then perform private.fail('room_started'); end if;
  if r.locked then perform private.fail('room_locked'); end if;
  if (select count(*) from public.room_players where room_id = r.id) >= r.max_players then
    perform private.fail('room_full');
  end if;
  v_nickname := private.clean_nickname(p_nickname);
  if exists (select 1 from public.room_players where room_id = r.id and lower(nickname) = lower(v_nickname)) then
    perform private.fail('nickname_taken');
  end if;

  insert into public.room_players (room_id, user_id, nickname, completed_topic_ids, role)
  values (
    r.id, v_uid, v_nickname, coalesce(p_completed[1:500], '{}'),
    case when r.format = 'judged' then 'judge' else 'player' end
  );
  perform private.bump(r.id);
  return r.id;
end $$;

-- Switching format resets everyone's role to the new default (spectators stay put).
drop function public.update_settings(uuid, text, text, int, int);
create or replace function public.update_settings(
  p_room uuid, p_topic_mode text, p_category text, p_explain_minutes int, p_max_players int,
  p_format text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  r public.rooms := private.lock_room(p_room);
  v_count int;
  v_format text := case when p_format is null then r.format when p_format = 'judged' then 'judged' else 'party' end;
begin
  perform private.require_host(r, v_uid);
  perform private.require_phase(r, 'lobby', 'results');
  select count(*) into v_count from public.room_players where room_id = p_room;
  update public.rooms set
    topic_mode = case when p_topic_mode = 'shared' then 'shared' else 'own' end,
    category = private.valid_category(p_category),
    explain_minutes = case when p_explain_minutes = 2 then 2 else 1 end,
    max_players = least(6, greatest(2, v_count, coalesce(p_max_players, 6))),
    format = v_format
  where id = p_room;
  if v_format <> r.format then
    update public.room_players
      set role = case when v_format = 'judged' and user_id <> r.host_id then 'judge' else 'player' end
      where room_id = p_room and role <> 'spectator';
  end if;
  perform private.bump(p_room);
end $$;

-- Speak or just judge. Lobby only, your own seat only.
create or replace function public.set_role(p_room uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  r public.rooms := private.lock_room(p_room);
begin
  perform private.require_member(p_room, v_uid);
  perform private.require_phase(r, 'lobby');
  if p_role not in ('player', 'judge') then perform private.fail('invalid_role'); end if;
  update public.room_players set role = p_role where room_id = p_room and user_id = v_uid;
  perform private.bump(p_room);
end $$;

-- ---------------------------------------------------------------- game RPCs

-- As before, but only speakers get topics. A round needs a speaker and at
-- least one other person to judge them.
create or replace function public.start_game(p_room uuid, p_topics jsonb, p_force boolean default false)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  r public.rooms := private.lock_room(p_room);
  v_players uuid[];
  v_player uuid;
  v_topic text;
  v_topics text[] := '{}';
begin
  perform private.require_host(r, v_uid);
  perform private.require_phase(r, 'lobby', 'results');

  if r.phase = 'lobby' then
    if not p_force and exists (
      select 1 from public.room_players where room_id = p_room and not ready and user_id <> v_uid
    ) then
      perform private.fail('not_ready');
    end if;
    -- An early start turns anyone not ready into a spectator.
    update public.room_players
      set role = case when ready or user_id = v_uid then role else 'spectator' end
      where room_id = p_room;
  end if;

  select array_agg(user_id order by joined_at) into v_players
    from public.room_players where room_id = p_room and role = 'player';
  if coalesce(array_length(v_players, 1), 0) < 1
    or (select count(*) from public.room_players where room_id = p_room and role in ('player', 'judge')) < 2 then
    perform private.fail('not_enough_players');
  end if;

  foreach v_player in array v_players loop
    v_topic := p_topics ->> v_player::text;
    if v_topic is null or not exists (
      select 1 from public.topics where id = v_topic and (r.category = 'all' or category = r.category)
    ) then
      perform private.fail('invalid_topics');
    end if;
    v_topics := v_topics || v_topic;
  end loop;
  if r.topic_mode = 'own' and (select count(distinct t) from unnest(v_topics) t) <> array_length(v_topics, 1) then
    perform private.fail('invalid_topics');
  end if;
  if r.topic_mode = 'shared' and (select count(distinct t) from unnest(v_topics) t) <> 1 then
    perform private.fail('invalid_topics');
  end if;

  insert into public.room_topics (room_id, round, user_id, topic_id)
    select p_room, r.round + 1, v_players[i], v_topics[i] from generate_subscripts(v_players, 1) i;
  update public.room_players set done = false, skipped = false, ready = false where room_id = p_room;
  update public.rooms set
    round = round + 1, phase = 'reveal', phase_started_at = now(), phase_ends_at = now() + interval '30 seconds',
    speaking_order = '{}', current_turn = 0, ratings_count = 0, version = version + 1, last_activity_at = now()
  where id = p_room;
end $$;

-- As before, but judges rate too, and the window waits for them.
create or replace function public.submit_rating(p_room uuid, p_clarity int, p_confidence int, p_learned int)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  r public.rooms := private.lock_room(p_room);
  me public.room_players := private.require_member(p_room, v_uid);
  v_raters int;
begin
  perform private.require_phase(r, 'judging');
  if me.role not in ('player', 'judge') then perform private.fail('not_a_player'); end if;
  if p_clarity not between 1 and 5 or p_confidence not between 1 and 5 or p_learned not between 1 and 5 then
    perform private.fail('invalid_rating');
  end if;

  insert into public.peer_ratings (room_id, round, target_id, rater_id, clarity, confidence, learned)
  values (p_room, r.round, r.speaking_order[r.current_turn + 1], v_uid, p_clarity, p_confidence, p_learned)
  on conflict do nothing;
  if not found then perform private.fail('already_rated'); end if;

  update public.rooms set ratings_count = ratings_count + 1 where id = p_room;
  select count(*) into v_raters from public.room_players where room_id = p_room and role in ('player', 'judge');
  if r.ratings_count + 1 >= v_raters then
    perform private.advance(p_room);
  else
    perform private.bump(p_room);
  end if;
end $$;

-- ---------------------------------------------------------------- privileges

revoke all on function private.advance(uuid) from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
