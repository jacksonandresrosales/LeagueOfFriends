create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) between 2 and 32),
  constraint profiles_timezone_length check (char_length(timezone) between 1 and 64)
);

create table public.riot_accounts (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  puuid text not null unique,
  summoner_id text,
  game_name text not null,
  tag_line text not null,
  platform_route text not null,
  regional_route text not null,
  is_primary boolean not null default false,
  verified_at timestamptz,
  last_synced_at timestamptz,
  sync_status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint riot_accounts_identity_unique unique (id, profile_id),
  constraint riot_accounts_game_name_length check (char_length(game_name) between 3 and 32),
  constraint riot_accounts_tag_line_length check (char_length(tag_line) between 2 and 8),
  constraint riot_accounts_sync_status_check check (sync_status in ('pending', 'ready', 'stale', 'failed'))
);

create unique index riot_accounts_primary_profile_idx
  on public.riot_accounts (profile_id)
  where is_primary;

create index riot_accounts_profile_id_idx on public.riot_accounts (profile_id);

create table public.friendships (
  id bigint generated always as identity primary key,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_distinct_profiles check (requester_id <> addressee_id),
  constraint friendships_status_check check (status in ('pending', 'accepted', 'rejected', 'blocked'))
);

create unique index friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_requester_id_idx on public.friendships (requester_id);
create index friendships_addressee_id_idx on public.friendships (addressee_id);

create table public.challenges (
  id bigint generated always as identity primary key,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  metric text not null,
  status text not null default 'draft',
  queue_type text not null default 'ranked_solo_5x5',
  target_value integer,
  target_tier text,
  target_division text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  winner_profile_id uuid references public.profiles (id) on delete set null,
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint challenges_name_length check (char_length(name) between 3 and 48),
  constraint challenges_metric_check check (metric in ('lp_gain', 'target_rank', 'wins', 'mastery_gain')),
  constraint challenges_status_check check (status in ('draft', 'inviting', 'active', 'completed', 'cancelled')),
  constraint challenges_queue_type_check check (queue_type in ('ranked_solo_5x5')),
  constraint challenges_dates_check check (ends_at > starts_at),
  constraint challenges_target_value_check check (target_value is null or target_value > 0),
  constraint challenges_target_check check (
    (metric = 'target_rank' and target_tier is not null)
    or (metric <> 'target_rank' and target_value is not null)
  ),
  constraint challenges_rules_object_check check (jsonb_typeof(rules) = 'object')
);

create index challenges_creator_status_idx on public.challenges (creator_id, status);
create index challenges_status_ends_at_idx on public.challenges (status, ends_at);
create index challenges_winner_profile_id_idx on public.challenges (winner_profile_id);

create table public.challenge_participants (
  challenge_id bigint not null references public.challenges (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  riot_account_id bigint not null,
  role text not null default 'participant',
  status text not null default 'invited',
  baseline_value integer,
  current_value integer,
  joined_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (challenge_id, profile_id),
  constraint challenge_participants_riot_account_fkey
    foreign key (riot_account_id, profile_id)
    references public.riot_accounts (id, profile_id)
    on delete restrict,
  constraint challenge_participants_account_unique unique (challenge_id, riot_account_id),
  constraint challenge_participants_role_check check (role in ('creator', 'participant')),
  constraint challenge_participants_status_check check (status in ('invited', 'accepted', 'declined', 'removed')),
  constraint challenge_participants_baseline_check check (baseline_value is null or baseline_value >= 0),
  constraint challenge_participants_current_check check (current_value is null or current_value >= 0)
);

alter table public.challenges
  add constraint challenges_winner_participant_fkey
  foreign key (id, winner_profile_id)
  references public.challenge_participants (challenge_id, profile_id);

create index challenge_participants_profile_status_idx
  on public.challenge_participants (profile_id, status);
create index challenge_participants_riot_account_id_idx
  on public.challenge_participants (riot_account_id);

create table public.ranked_snapshots (
  id bigint generated always as identity primary key,
  riot_account_id bigint not null references public.riot_accounts (id) on delete cascade,
  queue_type text not null,
  tier text not null,
  division text not null,
  league_points integer not null,
  wins integer not null,
  losses integer not null,
  captured_at timestamptz not null default now(),
  constraint ranked_snapshots_unique unique (riot_account_id, queue_type, captured_at),
  constraint ranked_snapshots_league_points_check check (league_points between 0 and 100),
  constraint ranked_snapshots_wins_check check (wins >= 0),
  constraint ranked_snapshots_losses_check check (losses >= 0)
);

create index ranked_snapshots_account_queue_captured_idx
  on public.ranked_snapshots (riot_account_id, queue_type, captured_at desc);

create table public.mastery_snapshots (
  id bigint generated always as identity primary key,
  riot_account_id bigint not null references public.riot_accounts (id) on delete cascade,
  champion_id integer not null,
  mastery_level smallint not null,
  mastery_points bigint not null,
  captured_at timestamptz not null default now(),
  constraint mastery_snapshots_unique unique (riot_account_id, champion_id, captured_at),
  constraint mastery_snapshots_champion_id_check check (champion_id > 0),
  constraint mastery_snapshots_level_check check (mastery_level >= 0),
  constraint mastery_snapshots_points_check check (mastery_points >= 0)
);

create index mastery_snapshots_account_champion_captured_idx
  on public.mastery_snapshots (riot_account_id, champion_id, captured_at desc);

create table public.challenge_progress (
  id bigint generated always as identity primary key,
  challenge_id bigint not null,
  profile_id uuid not null,
  metric_value integer not null,
  progress_value integer not null,
  position smallint not null,
  captured_at timestamptz not null default now(),
  constraint challenge_progress_participant_fkey
    foreign key (challenge_id, profile_id)
    references public.challenge_participants (challenge_id, profile_id)
    on delete cascade,
  constraint challenge_progress_unique unique (challenge_id, profile_id, captured_at),
  constraint challenge_progress_metric_check check (metric_value >= 0),
  constraint challenge_progress_position_check check (position > 0)
);

create index challenge_progress_challenge_captured_position_idx
  on public.challenge_progress (challenge_id, captured_at desc, position);
create index challenge_progress_profile_id_idx on public.challenge_progress (profile_id);

create table public.notification_preferences (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  email_enabled boolean not null default true,
  overtaken_enabled boolean not null default true,
  challenge_updates_enabled boolean not null default true,
  digest_frequency text not null default 'daily',
  updated_at timestamptz not null default now(),
  constraint notification_preferences_frequency_check check (digest_frequency in ('instant', 'daily', 'weekly'))
);

create table public.notifications (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  challenge_id bigint references public.challenges (id) on delete cascade,
  type text not null,
  deduplication_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (type in ('overtaken', 'invitation', 'challenge_started', 'challenge_ended')),
  constraint notifications_payload_object_check check (jsonb_typeof(payload) = 'object')
);

create index notifications_profile_read_created_idx
  on public.notifications (profile_id, read_at, created_at desc);
create index notifications_challenge_id_idx on public.notifications (challenge_id);

create table private.sync_jobs (
  id bigint generated always as identity primary key,
  riot_account_id bigint not null references public.riot_accounts (id) on delete cascade,
  reason text not null,
  status text not null default 'pending',
  attempts smallint not null default 0,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sync_jobs_status_check check (status in ('pending', 'processing', 'completed', 'failed')),
  constraint sync_jobs_attempts_check check (attempts >= 0)
);

create index sync_jobs_status_run_after_idx
  on private.sync_jobs (status, run_after)
  where status in ('pending', 'failed');
create index sync_jobs_riot_account_id_idx on private.sync_jobs (riot_account_id);

create table private.email_outbox (
  id bigint generated always as identity primary key,
  notification_id bigint not null unique references public.notifications (id) on delete cascade,
  recipient_email text not null,
  status text not null default 'pending',
  attempts smallint not null default 0,
  run_after timestamptz not null default now(),
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_outbox_status_check check (status in ('pending', 'processing', 'sent', 'failed')),
  constraint email_outbox_attempts_check check (attempts >= 0)
);

create index email_outbox_status_run_after_idx
  on private.email_outbox (status, run_after)
  where status in ('pending', 'failed');

create function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function private.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger challenges_set_updated_at
  before update on public.challenges
  for each row execute function private.set_updated_at();
create trigger challenge_participants_set_updated_at
  before update on public.challenge_participants
  for each row execute function private.set_updated_at();
create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function private.set_updated_at();
create trigger sync_jobs_set_updated_at
  before update on private.sync_jobs
  for each row execute function private.set_updated_at();
create trigger email_outbox_set_updated_at
  before update on private.email_outbox
  for each row execute function private.set_updated_at();

create function private.is_challenge_member(target_challenge_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.challenge_participants as participant
    where participant.challenge_id = target_challenge_id
      and participant.profile_id = (select auth.uid())
      and participant.status in ('invited', 'accepted')
  );
$$;

revoke execute on function private.is_challenge_member(bigint) from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.riot_accounts enable row level security;
alter table public.friendships enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.ranked_snapshots enable row level security;
alter table public.mastery_snapshots enable row level security;
alter table public.challenge_progress enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table private.sync_jobs enable row level security;
alter table private.email_outbox enable row level security;

create policy profiles_select_authenticated
  on public.profiles for select
  to authenticated
  using (true);

create policy profiles_insert_own
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy riot_accounts_select_own
  on public.riot_accounts for select
  to authenticated
  using ((select auth.uid()) = profile_id);

create policy friendships_select_participant
  on public.friendships for select
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy friendships_insert_requester
  on public.friendships for insert
  to authenticated
  with check ((select auth.uid()) = requester_id and status = 'pending');

create policy friendships_update_participant
  on public.friendships for update
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id))
  with check ((select auth.uid()) in (requester_id, addressee_id));

create policy friendships_delete_participant
  on public.friendships for delete
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy challenges_select_member
  on public.challenges for select
  to authenticated
  using (
    creator_id = (select auth.uid())
    or (select private.is_challenge_member(id))
  );

create policy challenges_insert_creator
  on public.challenges for insert
  to authenticated
  with check ((select auth.uid()) = creator_id and status in ('draft', 'inviting'));

create policy challenges_update_creator
  on public.challenges for update
  to authenticated
  using ((select auth.uid()) = creator_id)
  with check ((select auth.uid()) = creator_id);

create policy challenges_delete_creator_draft
  on public.challenges for delete
  to authenticated
  using ((select auth.uid()) = creator_id and status = 'draft');

create policy challenge_participants_select_member
  on public.challenge_participants for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or (select private.is_challenge_member(challenge_id))
  );

create policy challenge_participants_insert_creator
  on public.challenge_participants for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.challenges
      where challenges.id = challenge_id
        and challenges.creator_id = (select auth.uid())
    )
  );

create policy challenge_participants_update_self
  on public.challenge_participants for update
  to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

create policy challenge_participants_delete_creator
  on public.challenge_participants for delete
  to authenticated
  using (
    exists (
      select 1
      from public.challenges
      where challenges.id = challenge_id
        and challenges.creator_id = (select auth.uid())
        and challenges.status in ('draft', 'inviting')
    )
  );

create policy ranked_snapshots_select_own
  on public.ranked_snapshots for select
  to authenticated
  using (
    exists (
      select 1
      from public.riot_accounts
      where riot_accounts.id = riot_account_id
        and riot_accounts.profile_id = (select auth.uid())
    )
  );

create policy mastery_snapshots_select_own
  on public.mastery_snapshots for select
  to authenticated
  using (
    exists (
      select 1
      from public.riot_accounts
      where riot_accounts.id = riot_account_id
        and riot_accounts.profile_id = (select auth.uid())
    )
  );

create policy challenge_progress_select_member
  on public.challenge_progress for select
  to authenticated
  using ((select private.is_challenge_member(challenge_id)));

create policy notification_preferences_select_own
  on public.notification_preferences for select
  to authenticated
  using ((select auth.uid()) = profile_id);

create policy notification_preferences_insert_own
  on public.notification_preferences for insert
  to authenticated
  with check ((select auth.uid()) = profile_id);

create policy notification_preferences_update_own
  on public.notification_preferences for update
  to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

create policy notifications_select_own
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = profile_id);

create policy notifications_update_own
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.profiles to authenticated;
grant insert (id, display_name, avatar_url, timezone) on public.profiles to authenticated;
grant update (display_name, avatar_url, timezone) on public.profiles to authenticated;

grant select on public.riot_accounts to authenticated;

grant select on public.friendships to authenticated;
grant insert (requester_id, addressee_id, status) on public.friendships to authenticated;
grant update (status, responded_at) on public.friendships to authenticated;
grant delete on public.friendships to authenticated;

grant select on public.challenges to authenticated;
grant insert (
  creator_id, name, metric, status, queue_type, target_value,
  target_tier, target_division, starts_at, ends_at, rules
) on public.challenges to authenticated;
grant update (
  name, metric, status, queue_type, target_value,
  target_tier, target_division, starts_at, ends_at, rules
) on public.challenges to authenticated;
grant delete on public.challenges to authenticated;

grant select on public.challenge_participants to authenticated;
grant insert (
  challenge_id, profile_id, riot_account_id, role, status,
  baseline_value, current_value, joined_at
) on public.challenge_participants to authenticated;
grant update (status, joined_at) on public.challenge_participants to authenticated;
grant delete on public.challenge_participants to authenticated;

grant select on public.ranked_snapshots to authenticated;
grant select on public.mastery_snapshots to authenticated;
grant select on public.challenge_progress to authenticated;

grant select, insert on public.notification_preferences to authenticated;
grant update (
  email_enabled, overtaken_enabled, challenge_updates_enabled, digest_frequency
) on public.notification_preferences to authenticated;

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant usage, select on sequence public.friendships_id_seq to authenticated;
grant usage, select on sequence public.challenges_id_seq to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
