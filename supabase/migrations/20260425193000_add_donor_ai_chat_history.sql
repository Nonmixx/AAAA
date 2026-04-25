create table if not exists public.donor_ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  donor_profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New Chat',
  current_stage text not null default 'greeting',
  detected_item text not null default 'Clothing / Mixed Items',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.donor_ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.donor_ai_chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'bot')),
  type text not null check (type in ('text', 'image', 'analysis')),
  text text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_donor_ai_chat_sessions_owner_updated
  on public.donor_ai_chat_sessions(donor_profile_id, updated_at desc);

create index if not exists idx_donor_ai_chat_messages_session_created
  on public.donor_ai_chat_messages(session_id, created_at asc);
