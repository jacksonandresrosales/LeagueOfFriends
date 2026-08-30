create table if not exists public.recovery_codes (
  id bigint generated always as identity primary key,
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.recovery_codes enable row level security;

-- Solo accesible desde service_role en el servidor
create policy recovery_codes_service_only on public.recovery_codes
  using (false);
