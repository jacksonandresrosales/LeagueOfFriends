begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(18);

select has_table('public', 'profiles', 'profiles existe');
select has_table('public', 'riot_accounts', 'riot_accounts existe');
select has_table('public', 'friendships', 'friendships existe');
select has_table('public', 'challenges', 'challenges existe');
select has_table('public', 'challenge_participants', 'challenge_participants existe');
select has_table('public', 'ranked_snapshots', 'ranked_snapshots existe');
select has_table('public', 'mastery_snapshots', 'mastery_snapshots existe');
select has_table('public', 'challenge_progress', 'challenge_progress existe');
select has_table('public', 'notification_preferences', 'notification_preferences existe');
select has_table('public', 'notifications', 'notifications existe');
select has_table('private', 'sync_jobs', 'private.sync_jobs existe');
select has_table('private', 'email_outbox', 'private.email_outbox existe');

select ok(
  (
    select bool_and(pg_class.relrowsecurity)
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname in ('public', 'private')
      and pg_class.relname in (
        'profiles', 'riot_accounts', 'friendships', 'challenges',
        'challenge_participants', 'ranked_snapshots', 'mastery_snapshots',
        'challenge_progress', 'notification_preferences', 'notifications',
        'sync_jobs', 'email_outbox'
      )
  ),
  'RLS está activado en todas las tablas de la aplicación'
);

select col_is_pk('public', 'profiles', 'id', 'profiles.id es la clave primaria');
select col_is_pk(
  'public',
  'challenge_participants',
  array['challenge_id', 'profile_id'],
  'challenge_participants tiene una clave primaria compuesta'
);
select has_function(
  'private',
  'is_challenge_member',
  array['bigint'],
  'existe la función privada de pertenencia a retos'
);
select has_trigger(
  'public',
  'profiles',
  'profiles_set_updated_at',
  'profiles actualiza updated_at automáticamente'
);
select has_trigger(
  'public',
  'challenges',
  'challenges_set_updated_at',
  'challenges actualiza updated_at automáticamente'
);

select * from finish();
rollback;
