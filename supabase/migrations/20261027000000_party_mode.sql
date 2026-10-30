-- Party mode (docs/PARTY_MODE.md).
--
-- Clients only ever SELECT, and Row Level Security limits that to rooms they
-- belong to. Every change goes through the functions below, which check the
-- caller, the phase, and the deadline, and lock the room row so concurrent
-- calls from several phones apply exactly once.

create schema if not exists private;

-- ---------------------------------------------------------------- tables

-- Ids and categories only; titles and hints live in the app bundle.
create table public.topics (
  id text primary key,
  category text not null
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users on delete cascade,
  topic_mode text not null default 'own' check (topic_mode in ('own', 'shared')),
  category text not null default 'all',
  explain_minutes smallint not null default 1 check (explain_minutes in (1, 2)),
  max_players smallint not null default 6 check (max_players between 2 and 6),
  locked boolean not null default false,
  phase text not null default 'lobby'
    check (phase in ('lobby', 'reveal', 'research', 'order', 'upnext', 'speaking', 'judging', 'results')),
  round int not null default 0,
  phase_started_at timestamptz not null default now(),
  phase_ends_at timestamptz,
  speaking_order uuid[] not null default '{}',
  current_turn int not null default 0,
  ratings_count int not null default 0,
  -- Bumped by every change; realtime subscribers refetch when it moves.
  version int not null default 0,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create table public.room_players (
  room_id uuid not null references public.rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  nickname text not null,
  joined_at timestamptz not null default now(),
  ready boolean not null default false,
  -- Finished the current reveal or research step.
  done boolean not null default false,
  -- Used this round's one topic skip (or, in shared mode, the host's re-roll).
  skipped boolean not null default false,
  role text not null default 'player' check (role in ('player', 'spectator')),
  -- Topic ids from the player's local history, so the host can deal fresh ones.
  completed_topic_ids text[] not null default '{}',
  primary key (room_id, user_id)
);
create unique index room_players_nickname on public.room_players (room_id, lower(nickname));

create table public.room_topics (
  room_id uuid not null references public.rooms on delete cascade,
  round int not null,
  user_id uuid not null,
  topic_id text not null references public.topics,
  primary key (room_id, round, user_id)
);

create table public.peer_ratings (
  room_id uuid not null references public.rooms on delete cascade,
  round int not null,
  target_id uuid not null,
  -- rater_id = target_id is the speaker's self-rating.
  rater_id uuid not null,
  clarity smallint not null check (clarity between 1 and 5),
  confidence smallint not null check (confidence between 1 and 5),
  learned smallint not null check (learned between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (room_id, round, target_id, rater_id)
);

-- ---------------------------------------------------------------- read access

create or replace function private.is_member(p_room uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.room_players where room_id = p_room and user_id = auth.uid()
  );
$$;

-- Another player's topic stays secret until their turn comes up.
create or replace function private.topic_visible(p_room uuid, p_round int, p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.rooms r
    where r.id = p_room and (
      p_round < r.round
      or r.phase = 'results'
      or (
        r.phase in ('upnext', 'speaking', 'judging')
        and array_position(r.speaking_order, p_user) - 1 <= r.current_turn
      )
    )
  );
$$;

alter table public.topics enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.room_topics enable row level security;
alter table public.peer_ratings enable row level security;

create policy "topics are public" on public.topics
  for select to anon, authenticated using (true);
create policy "members read their room" on public.rooms
  for select to authenticated using (private.is_member(id));
create policy "members read the player list" on public.room_players
  for select to authenticated using (private.is_member(room_id));
create policy "own topic, or others once revealed" on public.room_topics
  for select to authenticated
  using (private.is_member(room_id) and (user_id = auth.uid() or private.topic_visible(room_id, round, user_id)));
-- Only your own ratings; speakers see averages via round_scores().
create policy "raters read their own ratings" on public.peer_ratings
  for select to authenticated using (rater_id = auth.uid());

-- No direct writes, even if a policy is added by mistake later.
revoke insert, update, delete, truncate on public.topics, public.rooms, public.room_players,
  public.room_topics, public.peer_ratings from anon, authenticated;

-- ---------------------------------------------------------------- helpers

create or replace function private.fail(p_code text) returns void
language plpgsql set search_path = '' as $$
begin
  -- The message is a stable code the app translates.
  raise exception '%', p_code using errcode = 'P0001';
end $$;

create or replace function private.require_uid() returns uuid
language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then perform private.fail('not_signed_in'); end if;
  return auth.uid();
end $$;

create or replace function private.lock_room(p_room uuid) returns public.rooms
language plpgsql set search_path = '' as $$
declare r public.rooms;
begin
  select * into r from public.rooms where id = p_room for update;
  if not found then perform private.fail('room_not_found'); end if;
  return r;
end $$;

create or replace function private.require_member(p_room uuid, p_uid uuid) returns public.room_players
language plpgsql set search_path = '' as $$
declare p public.room_players;
begin
  select * into p from public.room_players where room_id = p_room and user_id = p_uid;
  if not found then perform private.fail('not_in_room'); end if;
  return p;
end $$;

create or replace function private.require_host(p_room public.rooms, p_uid uuid) returns void
language plpgsql set search_path = '' as $$
begin
  if p_room.host_id <> p_uid then perform private.fail('not_host'); end if;
end $$;

create or replace function private.require_phase(p_room public.rooms, variadic p_phases text[]) returns void
language plpgsql set search_path = '' as $$
begin
  if not (p_room.phase = any (p_phases)) then perform private.fail('wrong_phase'); end if;
end $$;

create or replace function private.bump(p_room uuid) returns void
language sql set search_path = '' as $$
  update public.rooms set version = version + 1, last_activity_at = now() where id = p_room;
$$;

-- Length and markup checks; the app adds stricter character rules on top.
create or replace function private.clean_nickname(p_raw text) returns text
language plpgsql stable set search_path = '' as $$
declare v text := regexp_replace(btrim(coalesce(p_raw, '')), '\s+', ' ', 'g');
begin
  if char_length(v) < 2 then perform private.fail('nickname_too_short'); end if;
  if char_length(v) > 20 then perform private.fail('nickname_too_long'); end if;
  if v ~ '[[:cntrl:]<>{}"`\\]' or position('''' in v) > 0 then perform private.fail('nickname_invalid'); end if;
  return v;
end $$;

create or replace function private.valid_category(p_category text) returns text
language sql stable set search_path = '' as $$
  select case
    when exists (select 1 from public.topics where category = p_category) then p_category
    else 'all'
  end;
$$;

-- Six characters with no I, L, O, 0, or 1, from a cryptographic source.
create or replace function private.new_room_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_bytes bytea;
begin
  loop
    v_bytes := extensions.gen_random_bytes(6);
    v_code := '';
    for i in 0..5 loop
      v_code := v_code || substr(alphabet, 1 + get_byte(v_bytes, i) % 31, 1);
    end loop;
    exit when not exists (select 1 from public.rooms where code = v_code);
  end loop;
  return v_code;
end $$;

-- The phase machine. Callers must already hold the room lock.
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
    update public.rooms
      set phase = 'order', speaking_order = v_order, current_turn = 0, phase_ends_at = now() + interval '4 seconds'
      where id = p_room;
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

create or replace function public.server_time() returns timestamptz
language sql stable as $$ select now(); $$;

create or replace function public.create_room(
  p_nickname text,
  p_topic_mode text default 'own',
  p_category text default 'all',
  p_explain_minutes int default 1,
  p_max_players int default 6,
  p_completed text[] default '{}'
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
  insert into public.rooms (code, host_id, topic_mode, category, explain_minutes, max_players)
  values (
    v_code,
    v_uid,
    case when p_topic_mode = 'shared' then 'shared' else 'own' end,
    private.valid_category(p_category),
    case when p_explain_minutes = 2 then 2 else 1 end,
    least(6, greatest(2, coalesce(p_max_players, 6)))
  )
  returning id into v_room;

  insert into public.room_players (room_id, user_id, nickname, ready, completed_topic_ids)
  values (v_room, v_uid, v_nickname, true, coalesce(p_completed[1:500], '{}'));
  return v_code;
end $$;

-- What a visitor with a code may know before joining.
create or replace function public.peek_room(p_code text) returns json
language plpgsql stable security definer set search_path = '' as $$
declare r public.rooms;
begin
  select * into r from public.rooms where code = upper(btrim(p_code));
  if not found then return null; end if;
  return json_build_object(
    'roomId', case when private.is_member(r.id) then r.id end,
    'phase', r.phase,
    'players', (select count(*) from public.room_players where room_id = r.id),
    'maxPlayers', r.max_players,
    'locked', r.locked
  );
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

  insert into public.room_players (room_id, user_id, nickname, completed_topic_ids)
  values (r.id, v_uid, v_nickname, coalesce(p_completed[1:500], '{}'));
  perform private.bump(r.id);
  return r.id;
end $$;

create or replace function public.set_ready(p_room uuid, p_ready boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  r public.rooms := private.lock_room(p_room);
begin
  perform private.require_member(p_room, v_uid);
  perform private.require_phase(r, 'lobby');
  update public.room_players set ready = p_ready where room_id = p_room and user_id = v_uid;
  perform private.bump(p_room);
end $$;

create or replace function public.update_settings(
  p_room uuid, p_topic_mode text, p_category text, p_explain_minutes int, p_max_players int
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  r public.rooms := private.lock_room(p_room);
  v_count int;
begin
  perform private.require_host(r, v_uid);
  perform private.require_phase(r, 'lobby', 'results');
  select count(*) into v_count from public.room_players where room_id = p_room;
  update public.rooms set
    topic_mode = case when p_topic_mode = 'shared' then 'shared' else 'own' end,
    category = private.valid_category(p_category),
    explain_minutes = case when p_explain_minutes = 2 then 2 else 1 end,
    max_players = least(6, greatest(2, v_count, coalesce(p_max_players, 6)))
  where id = p_room;
  perform private.bump(p_room);
end $$;

create or replace function public.set_locked(p_room uuid, p_locked boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  r public.rooms := private.lock_room(p_room);
begin
  perform private.require_host(r, v_uid);
  update public.rooms set locked = p_locked where id = p_room;
  perform private.bump(p_room);
end $$;

create or replace function public.kick_player(p_room uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  r public.rooms := private.lock_room(p_room);
begin
  perform private.require_host(r, v_uid);
  perform private.require_phase(r, 'lobby', 'results');
  if p_user = v_uid then perform private.fail('cannot_kick_self'); end if;
  delete from public.room_players where room_id = p_room and user_id = p_user;
  perform private.bump(p_room);
end $$;

create or replace function public.leave_room(p_room uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  r public.rooms := private.lock_room(p_room);
  v_next uuid;
begin
  perform private.require_member(p_room, v_uid);
  perform private.require_phase(r, 'lobby', 'results');
  delete from public.room_players where room_id = p_room and user_id = v_uid;
  if r.host_id = v_uid then
    select user_id into v_next from public.room_players where room_id = p_room order by joined_at limit 1;
    if v_next is null then
      delete from public.rooms where id = p_room;
      return;
    end if;
    update public.rooms set host_id = v_next where id = p_room;
  end if;
  perform private.bump(p_room);
end $$;

-- ---------------------------------------------------------------- game RPCs

-- Starts round 1 from the lobby, or the next round from results ("play again").
-- The host deals topics (the app knows everyone's completed topics); the
-- server checks the deal is valid for the room's settings.
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
      set role = case when ready or user_id = v_uid then 'player' else 'spectator' end
      where room_id = p_room;
  end if;

  select array_agg(user_id order by joined_at) into v_players
    from public.room_players where room_id = p_room and role = 'player';
  if coalesce(array_length(v_players, 1), 0) < 2 then perform private.fail('not_enough_players'); end if;

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

-- Own mode: any player swaps their topic once. Shared mode: the host re-rolls once for everyone.
create or replace function public.skip_topic(p_room uuid, p_topic_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  r public.rooms := private.lock_room(p_room);
  me public.room_players := private.require_member(p_room, v_uid);
begin
  perform private.require_phase(r, 'reveal');
  if me.role <> 'player' then perform private.fail('not_a_player'); end if;
  if me.skipped then perform private.fail('already_skipped'); end if;
  if not exists (
    select 1 from public.topics where id = p_topic_id and (r.category = 'all' or category = r.category)
  ) then
    perform private.fail('invalid_topics');
  end if;
  if exists (select 1 from public.room_topics where room_id = p_room and round = r.round and topic_id = p_topic_id) then
    perform private.fail('topic_taken');
  end if;

  if r.topic_mode = 'own' then
    update public.room_topics set topic_id = p_topic_id
      where room_id = p_room and round = r.round and user_id = v_uid;
  else
    perform private.require_host(r, v_uid);
    update public.room_topics set topic_id = p_topic_id where room_id = p_room and round = r.round;
  end if;
  update public.room_players set skipped = true where room_id = p_room and user_id = v_uid;
  perform private.bump(p_room);
end $$;

-- "Got it" during reveal, "I'm ready" during research. Advances once every player is done.
create or replace function public.mark_done(p_room uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  r public.rooms := private.lock_room(p_room);
begin
  perform private.require_member(p_room, v_uid);
  perform private.require_phase(r, 'reveal', 'research');
  update public.room_players set done = true where room_id = p_room and user_id = v_uid;
  if not exists (select 1 from public.room_players where room_id = p_room and role = 'player' and not done) then
    perform private.advance(p_room);
  else
    perform private.bump(p_room);
  end if;
end $$;

create or replace function public.start_turn(p_room uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  r public.rooms := private.lock_room(p_room);
begin
  perform private.require_phase(r, 'upnext');
  if r.speaking_order[r.current_turn + 1] is distinct from v_uid then perform private.fail('not_your_turn'); end if;
  perform private.advance(p_room);
end $$;

create or replace function public.finish_turn(p_room uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  r public.rooms := private.lock_room(p_room);
begin
  perform private.require_phase(r, 'speaking');
  if r.speaking_order[r.current_turn + 1] is distinct from v_uid then perform private.fail('not_your_turn'); end if;
  perform private.advance(p_room);
end $$;

-- Rate the current speaker (or yourself, if you're the speaker). Closes the
-- window early once every player has submitted.
create or replace function public.submit_rating(p_room uuid, p_clarity int, p_confidence int, p_learned int)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  r public.rooms := private.lock_room(p_room);
  me public.room_players := private.require_member(p_room, v_uid);
  v_players int;
begin
  perform private.require_phase(r, 'judging');
  if me.role <> 'player' then perform private.fail('not_a_player'); end if;
  if p_clarity not between 1 and 5 or p_confidence not between 1 and 5 or p_learned not between 1 and 5 then
    perform private.fail('invalid_rating');
  end if;

  insert into public.peer_ratings (room_id, round, target_id, rater_id, clarity, confidence, learned)
  values (p_room, r.round, r.speaking_order[r.current_turn + 1], v_uid, p_clarity, p_confidence, p_learned)
  on conflict do nothing;
  if not found then perform private.fail('already_rated'); end if;

  update public.rooms set ratings_count = ratings_count + 1 where id = p_room;
  select count(*) into v_players from public.room_players where room_id = p_room and role = 'player';
  if r.ratings_count + 1 >= v_players then
    perform private.advance(p_room);
  else
    perform private.bump(p_room);
  end if;
end $$;

-- Any member may call this once a deadline passes; only the first call with
-- the current version moves the room on.
create or replace function public.advance_room(p_room uuid, p_version int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  r public.rooms := private.lock_room(p_room);
begin
  perform private.require_member(p_room, v_uid);
  if r.version <> p_version or r.phase_ends_at is null or now() < r.phase_ends_at then
    return false;
  end if;
  perform private.advance(p_room);
  return true;
end $$;

-- Each speaker's judge ratings as sorted, anonymous arrays plus their self-rating.
-- The app applies the scoring rules (src/lib/party/scoring.ts).
create or replace function public.round_scores(p_room uuid, p_round int)
returns table (
  target_id uuid,
  clarity smallint[],
  confidence smallint[],
  learned smallint[],
  self_clarity smallint,
  self_confidence smallint,
  self_learned smallint
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_member(p_room) then perform private.fail('not_in_room'); end if;
  if not exists (
    select 1 from public.rooms
    where id = p_room and (round > p_round or (round = p_round and phase = 'results'))
  ) then
    perform private.fail('round_not_finished');
  end if;
  return query
    select
      p.target_id,
      coalesce(array_agg(p.clarity order by p.clarity) filter (where p.rater_id <> p.target_id), '{}'),
      coalesce(array_agg(p.confidence order by p.confidence) filter (where p.rater_id <> p.target_id), '{}'),
      coalesce(array_agg(p.learned order by p.learned) filter (where p.rater_id <> p.target_id), '{}'),
      max(p.clarity) filter (where p.rater_id = p.target_id),
      max(p.confidence) filter (where p.rater_id = p.target_id),
      max(p.learned) filter (where p.rater_id = p.target_id)
    from public.peer_ratings p
    where p.room_id = p_room and p.round = p_round
    group by p.target_id;
end $$;

-- ---------------------------------------------------------------- privileges

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
-- Needed to evaluate the read policies; still not callable through the API.
grant execute on function private.is_member(uuid), private.topic_visible(uuid, int, uuid) to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;

-- Realtime: clients watch their room row; every change bumps its version.
alter publication supabase_realtime add table public.rooms;
