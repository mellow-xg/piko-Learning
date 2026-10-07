-- Piko Phase 1: server-side XP level calculation
create or replace function public.level_for_xp(p_xp bigint)
returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when p_xp >= 850 then 5
    when p_xp >= 500 then 4
    when p_xp >= 250 then 3
    when p_xp >= 100 then 2
    else 1
  end
$$;

update public.profiles
set level = public.level_for_xp(total_xp),
    updated_at = now();

create or replace function public.complete_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_xp integer := 10;
  v_total_xp bigint;
  v_progress_id uuid;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  if not exists (
    select 1
    from public.lessons l
    join public.chapters ch on ch.id = l.chapter_id
    join public.courses c on c.id = ch.course_id
    where l.id = p_lesson_id and c.status = 'published'
  ) then
    raise exception 'Lesson not found or not published';
  end if;

  insert into public.progress(user_id, lesson_id, completed, progress_percent, last_accessed_at, completed_at)
  values(v_user_id, p_lesson_id, true, 100, now(), now())
  on conflict(user_id, lesson_id) do update
    set completed=true, progress_percent=100, last_accessed_at=now(), completed_at=now()
    where public.progress.completed=false
  returning id into v_progress_id;

  if v_progress_id is null then
    select total_xp into v_total_xp from public.profiles where id=v_user_id;
    return jsonb_build_object('completed',true,'xp_awarded',0,'total_xp',coalesce(v_total_xp,0),'level',public.level_for_xp(coalesce(v_total_xp,0)));
  end if;

  insert into public.xp_transactions(user_id, amount, reason, reference_id)
  values(v_user_id, v_xp, 'lesson_completion', p_lesson_id);

  update public.profiles
  set total_xp=total_xp+v_xp,
      level=public.level_for_xp(total_xp+v_xp),
      updated_at=now()
  where id=v_user_id
  returning total_xp into v_total_xp;

  if v_total_xp is null then raise exception 'Profile not found'; end if;

  return jsonb_build_object('completed',true,'xp_awarded',v_xp,'total_xp',v_total_xp,'level',public.level_for_xp(v_total_xp));
end
$$;

revoke all on function public.level_for_xp(bigint) from public, anon, authenticated;
grant execute on function public.level_for_xp(bigint) to authenticated;
revoke all on function public.complete_lesson(uuid) from public, anon;
grant execute on function public.complete_lesson(uuid) to authenticated;
