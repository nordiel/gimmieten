# Party Mode Spec

_Decided 2026-10-27. Tracking epic: #20. Architecture background: [`ROADMAP.md`](ROADMAP.md) §2 and §4._

A host creates a room and invites friends. Everyone researches at the same time, then the app picks a random speaking order. Each player explains while the others judge them.

## Decisions

| Question | Decision |
| --- | --- |
| Topics | **The host chooses per game:** each player gets their own topic (default), or everyone gets the same topic. |
| Voice | **Not in the app.** Players are in the same room or on their own call (Discord, Zoom, FaceTime). The app runs timers, turns, the spotlight, and judging. |
| Judging | Listeners rate each speaker 1–5 on **Clarity**, **Confidence**, and **"I learned something"**. The speaker self-rates the same three. |
| Joining | **Code or link plus a guest nickname.** No sign-up. An invisible anonymous account (Supabase anonymous sign-in) secures the room. |
| Speaking order | **Random**, drawn on the server when research ends, revealed with a shuffle that lands on the first speaker. |
| Host | The host plays too: they speak and judge like everyone else. |

## Room settings (host, in the lobby)

| Setting | Options | Default |
| --- | --- | --- |
| Topics | Own topic each · Same topic for all | Own topic each |
| Category | Everything or one category | Everything |
| Explanation time | 1 min · 2 min | 1 min |
| Room size | 2–6 players (4–6 recommended) | up to 6 |

Research is always 5 minutes, matching solo play (`src/lib/rules.ts`).

## Game flow

Each phase lists what each role sees. Timers are owned by the server; clients only display them (ROADMAP §4.2).

### 1. Lobby
- **Host** taps "Party mode → Create room", picks settings, and gets a 6-character code, a share link (`gimmieten.com/party/ABC123`), and a QR code.
- **Players** open the link or enter the code, then pick a nickname (2–20 characters, unique in the room).
- Everyone sees the player list and taps **Ready**. The host can **kick** players and **lock** the room.
- The host starts the game once there are at least 2 players and everyone is ready. The host can also start early, which drops anyone not ready to spectator.

### 2. Topic reveal
- **Own topic each:** every player sees a different topic, with no repeats within the room. Each player may **skip once**; this doesn't affect anyone else.
- **Same topic:** everyone sees the same topic, and the host may **re-roll once**.
- Each player sees their own topic. Other players' topics stay hidden until their turn, so they're a surprise.

### 3. Research (5 minutes, everyone at once)
- This is the solo research screen: countdown, notes, and the "No AI" reminder. **Notes never leave the device.**
- A player can tap **I'm ready**. The phase ends when the timer hits zero or everyone is ready.

### 4. Speaking order
- The server shuffles the players. Every screen plays a short shuffle animation that lands on the **first speaker**, then shows the full order.

### 5. Turns (repeated for each speaker)
- **Up next:** a 5-second interstitial reading "Ana is up: *Why cats purr*".
- **Speaker** sees "You're up" with their topic and a **Start** button. The clock starts when they tap it, or automatically after 10 seconds so the game never stalls. They can **Finish early**.
- **Listeners** see the speaker's name, topic, and countdown, plus a "Listen like you're learning it for the first time" prompt.
- **Judging** opens when the turn ends and lasts **30 seconds**, or until every judge has submitted.
  - Listeners rate Clarity, Confidence, and "I learned something", each 1–5.
  - The speaker self-rates the same three.
  - Ratings stay hidden until the window closes. **Individual ratings are never shown**; the speaker sees only averages.
- Then the next speaker's "Up next" begins.

### 6. Round results
- **Per player:** room score, self score, and the **self-vs-room gap** ("You underrated yourself by 15%").
- **Awards**, with ties shared:
  - 🏆 **Best Teacher**: highest room score.
  - 💪 **Most Confident**: highest average confidence.
  - 💡 **Taught Us the Most**: highest average "I learned something".
  - 🙈 **Humble Genius**: self score furthest below room score, if the gap is at least 10 points.
- **Play again** keeps the room and players and starts a new round with new topics and a new order.
- Each player's result is saved to their local history and counts toward their streak.

## Scoring

- Each criterion score is the **mean of the judges' ratings**. With **4 or more judges**, the single highest and lowest rating per criterion are dropped first (a trimmed mean), which blunts one friend inflating or one rival sinking a score.
- **Room score** = mean of the three criterion scores ÷ 5 × 100, the same scale as solo (20–100%).
- **Self score** uses the same formula on the speaker's own three ratings.
- With only 1 judge (a 2-player room), scores are shown but awards are skipped.

## Edge cases

| Situation | Behavior |
| --- | --- |
| Speaker disconnected when their turn comes | Wait 15 seconds, then move them to the end of the order once. If they're still gone on their second turn, skip them. |
| Judge disconnected | The judging window closes when connected judges have submitted, or after 30 seconds. |
| Host leaves | After 60 seconds, the longest-present player becomes host. |
| Player refreshes or loses connection | Reopening the link restores their seat; the anonymous session is kept in the browser. |
| Someone tries to join a full, locked, or started room | They see a clear message. Joining mid-game isn't supported in v1. |
| Shared-topic advantage | Later speakers hear earlier ones. The lobby says so when that mode is picked: "Later speakers hear earlier ones — that's part of the fun." |
| Idle rooms | Expire 6 hours after the last activity, after which the code can be reused. |

**Game length:** 6 players at 1 minute each is about 5 + 6 × (5 s + ~1 min + ~30 s) ≈ **15 minutes**. At 2 minutes it's about 21 minutes.

## Data model (Supabase / Postgres)

Extends ROADMAP §4.3.

```sql
rooms(id uuid pk, code text unique, host_id uuid,
      settings jsonb,            -- topic_mode ('own'|'shared'), category, explain_minutes, max_players
      status text,               -- lobby | playing | finished
      phase text,                -- lobby | reveal | research | order | upnext | speaking | judging | results
      phase_started_at timestamptz, phase_ends_at timestamptz,
      speaking_order uuid[], current_turn int, round int,
      locked bool, version int, last_activity_at timestamptz)

room_players(room_id, user_id, nickname, joined_at, ready bool, research_done bool,
             role text,          -- player | spectator
             kicked bool, primary key (room_id, user_id))

room_topics(room_id, round int, user_id, topic_id, skipped bool,
            primary key (room_id, round, user_id))    -- one row per player; same topic_id for all in shared mode

peer_ratings(room_id, round int, target_id, rater_id,
             clarity smallint, confidence smallint, learned smallint,  -- 1..5
             created_at, primary key (room_id, round, target_id, rater_id))
             -- rater_id = target_id is the self-rating
```

- **RPCs** (`SECURITY DEFINER`, all transitions compare-and-set on `version`): `create_room`, `join_room`, `set_ready`, `kick_player`, `set_locked`, `update_settings`, `start_game`, `skip_topic`, `finish_research`, `start_turn`, `submit_rating`, `advance_room`, `play_again`, `server_time`.
- **RLS:** room data is readable by members only. `room_topics` rows for other players become readable once that player's turn starts. Individual `peer_ratings` are never readable by the target; averages come from a view.
- **Realtime:** Postgres Changes on `rooms` and `room_players`, and Presence for who's connected.

## Build order

1. Supabase project (#25, Nordiel) → client and anonymous sign-in (#26) → schema, RLS, and lobby RPCs (#27).
2. The pure party logic in TypeScript can start **now**, without Supabase (#28).
3. Realtime room hook (#29) → lobby UI (#30) → game screens (#31, #32, #33).
4. Resilience (#34), party alerts (#35), and history and streaks (#36).
5. Playtest with real groups (#37).

Party mode needs real URLs (#8) and, for remote friends, the deployed site (#3). In-person testing works on the local network with `npm run dev -- --host`.
