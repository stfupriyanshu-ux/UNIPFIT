-- =====================================================================
-- UNIVZERO schema. Run in the Supabase SQL editor (or `supabase db push`).
-- Every user-data table has user_id + Row Level Security.
-- Streaks/percentages are NEVER stored: they are computed from check_ins.
-- =====================================================================
create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ---------- profiles ----------
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  avatar_media_id uuid,
  theme text not null default 'system' check (theme in ('system','light','dark')),
  timezone text not null default 'UTC',
  ai_personality text not null default 'supportive' check (ai_personality in ('supportive','coach','strict','friend')),
  notification_prefs jsonb not null default '{}'::jsonb,
  privacy jsonb not null default '{"ai_uses_my_data": true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare tz text := coalesce(new.raw_user_meta_data->>'timezone', 'UTC');
begin
  begin perform now() at time zone tz; exception when others then tz := 'UTC'; end;
  insert into public.profiles (user_id, display_name, timezone)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'display_name', ''), 80), tz)
  on conflict (user_id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- The user's local "today" (used by future-self locking)
create or replace function public.user_today() returns date
language sql stable security definer set search_path = public as $$
  select (now() at time zone coalesce((select timezone from public.profiles where user_id = auth.uid()), 'UTC'))::date
$$;

-- ---------- challenges ----------
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  day_one_message text not null default '' check (char_length(day_one_message) <= 2000),
  start_date date not null,
  end_date date not null,
  duration_days int generated always as (end_date - start_date + 1) stored,
  strict_mode boolean not null default false,
  status text not null default 'active' check (status in ('active','paused','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint challenge_dates_valid check (end_date >= start_date and end_date - start_date <= 3649),
  unique (id, user_id)
);
create index challenges_user_idx on public.challenges (user_id, status);

-- ---------- check_ins (source of truth for progress) ----------
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null,
  check_date date not null,
  status text not null check (status in ('yes','no','skipped')),
  miss_reason text check (miss_reason is null or char_length(miss_reason) <= 500),
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (challenge_id, check_date),                       -- prevents duplicate check-ins
  foreign key (challenge_id, user_id) references public.challenges (id, user_id) on delete cascade
);
create index check_ins_user_date_idx on public.check_ins (user_id, check_date);

-- ---------- daily_notes ----------
create table public.daily_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid,
  note_date date not null,
  content text not null check (char_length(content) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (challenge_id, user_id) references public.challenges (id, user_id) on delete cascade,
  unique nulls not distinct (user_id, challenge_id, note_date)
);

-- ---------- goals + milestones ----------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  target_value numeric not null default 100 check (target_value > 0),
  current_value numeric not null default 0 check (current_value >= 0),
  unit text not null default '' check (char_length(unit) <= 20),
  deadline date,
  status text not null default 'active' check (status in ('active','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals (id) on delete cascade,
  challenge_id uuid,
  kind text not null check (kind in ('goal','challenge_streak','challenge_progress','custom')),
  milestone_key text not null default gen_random_uuid()::text,
  title text not null check (char_length(title) between 1 and 120),
  target_value numeric,
  target_date date,
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (challenge_id, user_id) references public.challenges (id, user_id) on delete cascade,
  unique (user_id, milestone_key)
);

-- ---------- routines ----------
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  frequency text not null default 'daily' check (frequency in ('daily','weekly')),
  days_of_week smallint[] not null default '{}' check (days_of_week <@ array[0,1,2,3,4,5,6]::smallint[]),
  time_of_day time,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create table public.routine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null,
  log_date date not null,
  created_at timestamptz not null default now(),
  unique (routine_id, log_date),
  foreign key (routine_id, user_id) references public.routines (id, user_id) on delete cascade
);

-- ---------- tasks ----------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  notes text not null default '' check (char_length(notes) <= 1000),
  due_date date,
  repeat text not null default 'none' check (repeat in ('none','daily','weekly')),
  repeat_days smallint[] not null default '{}' check (repeat_days <@ array[0,1,2,3,4,5,6]::smallint[]),
  position int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index tasks_user_idx on public.tasks (user_id, archived, position);
create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null,
  completion_date date not null,
  completed_at timestamptz not null default now(),
  unique (task_id, completion_date),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete cascade
);

-- ---------- timer_sessions (real server-side timer state) ----------
create table public.timer_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid,
  session_date date not null,
  start_time timestamptz not null default now(),
  end_time timestamptz,
  paused_at timestamptz,
  paused_seconds int not null default 0,
  duration_seconds int check (duration_seconds is null or duration_seconds >= 0),
  status text not null default 'running' check (status in ('running','paused','stopped')),
  created_at timestamptz not null default now(),
  foreign key (task_id, user_id) references public.tasks (id, user_id) on delete set null (task_id)
);
create unique index one_active_timer_per_user on public.timer_sessions (user_id) where status in ('running','paused');
create index timer_sessions_user_date_idx on public.timer_sessions (user_id, session_date);

-- ---------- media ----------
create table public.media_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('promise','strict_photo','note_photo','avatar','future_photo','future_media')),
  bucket text not null check (bucket in ('promises','photos','future-self')),
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  challenge_id uuid,
  note_date date,
  status text not null default 'pending' check (status in ('pending','ready')),
  created_at timestamptz not null default now(),
  foreign key (challenge_id, user_id) references public.challenges (id, user_id) on delete cascade
);
create index media_user_idx on public.media_files (user_id, purpose);

alter table public.profiles add constraint profiles_avatar_fk
  foreign key (avatar_media_id) references public.media_files (id) on delete set null;

create table public.promise_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null,
  media_file_id uuid not null references public.media_files (id) on delete cascade,
  duration_seconds int check (duration_seconds is null or duration_seconds between 0 and 600),
  created_at timestamptz not null default now(),
  unique (challenge_id),
  foreign key (challenge_id, user_id) references public.challenges (id, user_id) on delete cascade
);

-- ---------- notifications (in-app log of reminders that fired) ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('morning','check_in','goal','streak','milestone','future_self','system')),
  title text not null check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 300),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------- future_self (content locked until deliver_on) ----------
create table public.future_self (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid,
  title text not null default 'A note to future me' check (char_length(title) <= 120),
  message text not null check (char_length(message) between 1 and 5000),
  deliver_on date not null,
  photo_media_id uuid references public.media_files (id) on delete set null,
  media_id uuid references public.media_files (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (challenge_id, user_id) references public.challenges (id, user_id) on delete cascade
);
create index future_self_user_idx on public.future_self (user_id, deliver_on);

-- Safe listing: message and media ids stay NULL until the date arrives.
create or replace function public.list_future_self()
returns table (id uuid, title text, deliver_on date, challenge_id uuid, locked boolean,
               message text, photo_media_id uuid, media_id uuid, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select f.id, f.title, f.deliver_on, f.challenge_id,
         f.deliver_on > public.user_today(),
         case when f.deliver_on <= public.user_today() then f.message end,
         case when f.deliver_on <= public.user_today() then f.photo_media_id end,
         case when f.deliver_on <= public.user_today() then f.media_id end,
         f.created_at
  from public.future_self f
  where f.user_id = auth.uid()
  order by f.deliver_on asc
$$;
revoke all on function public.list_future_self() from public, anon;
grant execute on function public.list_future_self() to authenticated;
revoke all on function public.user_today() from public, anon;
grant execute on function public.user_today() to authenticated;

-- ---------- ai_conversations ----------
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  personality text not null check (personality in ('supportive','coach','strict','friend')),
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) <= 8000),
  actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index ai_conv_user_idx on public.ai_conversations (user_id, created_at desc);

-- ---------- updated_at triggers ----------
do $$
declare t text;
begin
  foreach t in array array['profiles','challenges','daily_notes','goals','routines','tasks'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------- Row Level Security: users can only touch their own rows ----------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','challenges','check_ins','daily_notes','goals','milestones','routines','routine_logs',
    'tasks','task_completions','timer_sessions','media_files','promise_recordings','notifications','ai_conversations'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows: select" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "own rows: insert" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "own rows: update" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "own rows: delete" on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- future_self: rows are invisible to direct reads until their date (use list_future_self()).
alter table public.future_self enable row level security;
create policy "future: insert own" on public.future_self for insert to authenticated
  with check (user_id = (select auth.uid()) and deliver_on > public.user_today());
create policy "future: select unlocked" on public.future_self for select to authenticated
  using (user_id = (select auth.uid()) and deliver_on <= public.user_today());
create policy "future: update unlocked" on public.future_self for update to authenticated
  using (user_id = (select auth.uid()) and deliver_on <= public.user_today())
  with check (user_id = (select auth.uid()));
create policy "future: delete unlocked" on public.future_self for delete to authenticated
  using (user_id = (select auth.uid()) and deliver_on <= public.user_today());

-- ---------- Storage: private buckets, size + type limits, per-user folders ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('promises',    'promises',    false, 10485760, array['audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/wav','video/webm','video/mp4']),
  ('photos',      'photos',      false, 5242880,  array['image/jpeg','image/png','image/webp']),
  ('future-self', 'future-self', false, 52428800, array['audio/webm','audio/mp4','audio/ogg','video/webm','video/mp4'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "own folder: select" on storage.objects for select to authenticated
  using (bucket_id in ('promises','photos') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own folder: insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('promises','photos','future-self') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own folder: delete" on storage.objects for delete to authenticated
  using (bucket_id in ('promises','photos') and (storage.foldername(name))[1] = (select auth.uid())::text);
-- 'future-self' has no select policy on purpose: the server signs playback URLs only after the unlock date.
