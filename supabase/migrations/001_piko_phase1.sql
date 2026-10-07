-- Piko Phase 1 database
create extension if not exists pgcrypto;

create type public.publish_status as enum ('draft','published');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar text,
  level integer not null default 1 check (level >= 1),
  total_xp integer not null default 0 check (total_xp >= 0),
  streak integer not null default 0 check (streak >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  thumbnail text,
  difficulty text,
  status public.publish_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  xp_reward integer not null default 10 check (xp_reward >= 0),
  estimated_minutes integer not null default 10 check (estimated_minutes > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  type text not null default 'link',
  title text not null,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  progress_percent integer not null default 0 check (progress_percent between 0 and 100),
  last_accessed_at timestamptz,
  completed_at timestamptz,
  unique(user_id, lesson_id)
);

create table if not exists public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  reason text not null,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists chapters_course_position_idx on public.chapters(course_id,position);
create index if not exists lessons_chapter_position_idx on public.lessons(chapter_id,position);
create index if not exists resources_lesson_position_idx on public.resources(lesson_id,position);
create index if not exists progress_user_idx on public.progress(user_id);
create index if not exists xp_user_idx on public.xp_transactions(user_id,created_at desc);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id,full_name) values(new.id,new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.complete_lesson(p_lesson_id uuid)
returns integer language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  reward integer;
  already_done boolean;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select xp_reward into reward from public.lessons where id=p_lesson_id;
  if reward is null then raise exception 'Lesson not found'; end if;

  select completed into already_done from public.progress where user_id=uid and lesson_id=p_lesson_id;
  if coalesce(already_done,false) then
    return 0;
  end if;

  insert into public.progress(user_id,lesson_id,completed,progress_percent,last_accessed_at,completed_at)
  values(uid,p_lesson_id,true,100,now(),now())
  on conflict(user_id,lesson_id) do update set completed=true,progress_percent=100,last_accessed_at=now(),completed_at=now();

  insert into public.xp_transactions(user_id,amount,reason,reference_id)
  values(uid,reward,'lesson_completed',p_lesson_id);

  update public.profiles set total_xp=total_xp+reward,level=greatest(1,floor((total_xp+reward)/100.0)::int+1),updated_at=now()
  where id=uid;
  return reward;
end;
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.chapters enable row level security;
alter table public.lessons enable row level security;
alter table public.resources enable row level security;
alter table public.progress enable row level security;
alter table public.xp_transactions enable row level security;

drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles for select using (auth.uid()=id);

drop policy if exists "courses published read" on public.courses;
create policy "courses published read" on public.courses for select using (status='published');

drop policy if exists "chapters published course read" on public.chapters;
create policy "chapters published course read" on public.chapters for select using (exists(select 1 from public.courses c where c.id=course_id and c.status='published'));

drop policy if exists "lessons published course read" on public.lessons;
create policy "lessons published course read" on public.lessons for select using (exists(select 1 from public.chapters ch join public.courses c on c.id=ch.course_id where ch.id=chapter_id and c.status='published'));

drop policy if exists "resources published lesson read" on public.resources;
create policy "resources published lesson read" on public.resources for select using (exists(select 1 from public.lessons l join public.chapters ch on ch.id=l.chapter_id join public.courses c on c.id=ch.course_id where l.id=lesson_id and c.status='published'));

drop policy if exists "progress own read" on public.progress;
create policy "progress own read" on public.progress for select using (auth.uid()=user_id);

drop policy if exists "xp own read" on public.xp_transactions;
create policy "xp own read" on public.xp_transactions for select using (auth.uid()=user_id);

revoke all on function public.complete_lesson(uuid) from public;
grant execute on function public.complete_lesson(uuid) to authenticated;
