create table if not exists public.password_reset_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempt_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_password_reset_codes_updated_at on public.password_reset_codes;
create trigger trg_password_reset_codes_updated_at
before update on public.password_reset_codes
for each row
execute function public.set_updated_at();

alter table public.password_reset_codes enable row level security;
