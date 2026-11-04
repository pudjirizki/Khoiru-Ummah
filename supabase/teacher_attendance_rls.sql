-- Run this in the Supabase SQL Editor after creating public.teacher_attendance.
-- The users table must contain id, auth_id, role, and status columns.

create or replace function public.current_attendance_user_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.id::text
  from public.users as u
  where u.auth_id = (select auth.uid())
    and u.status = 'active'
  limit 1
$$;

create or replace function public.current_attendance_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users as u
    where u.auth_id = (select auth.uid())
      and u.status = 'active'
      and u.role = 'admin'
  )
$$;

create or replace function public.current_attendance_user_is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users as u
    where u.auth_id = (select auth.uid())
      and u.status = 'active'
      and u.role = 'teacher'
  )
$$;

revoke all on function public.current_attendance_user_id() from public, anon;
revoke all on function public.current_attendance_user_is_admin() from public, anon;
revoke all on function public.current_attendance_user_is_teacher() from public, anon;
grant execute on function public.current_attendance_user_id() to authenticated;
grant execute on function public.current_attendance_user_is_admin() to authenticated;
grant execute on function public.current_attendance_user_is_teacher() to authenticated;

alter table public.teacher_attendance enable row level security;
revoke all on table public.teacher_attendance from public, anon, authenticated;
grant select, insert, update on table public.teacher_attendance to authenticated;

drop policy if exists teacher_attendance_select on public.teacher_attendance;
create policy teacher_attendance_select
on public.teacher_attendance
for select
to authenticated
using (
  public.current_attendance_user_is_admin()
  or teacher_id = public.current_attendance_user_id()
);

drop policy if exists teacher_attendance_insert on public.teacher_attendance;
create policy teacher_attendance_insert
on public.teacher_attendance
for insert
to authenticated
with check (
  id = date::text || '_' || teacher_id
  and updated_by::text = public.current_attendance_user_id()
  and (
    public.current_attendance_user_is_admin()
    or (
      public.current_attendance_user_is_teacher()
      and teacher_id = public.current_attendance_user_id()
    )
  )
);

drop policy if exists teacher_attendance_admin_update on public.teacher_attendance;
create policy teacher_attendance_admin_update
on public.teacher_attendance
for update
to authenticated
using (public.current_attendance_user_is_admin())
with check (
  public.current_attendance_user_is_admin()
  and id = date::text || '_' || teacher_id
  and updated_by::text = public.current_attendance_user_id()
);

-- Restrictive policies keep any pre-existing permissive policy from broadening access.
drop policy if exists teacher_attendance_scope_guard on public.teacher_attendance;
create policy teacher_attendance_scope_guard
on public.teacher_attendance
as restrictive
for all
to authenticated
using (
  public.current_attendance_user_is_admin()
  or teacher_id = public.current_attendance_user_id()
)
with check (
  id = date::text || '_' || teacher_id
  and updated_by::text = public.current_attendance_user_id()
  and (
    public.current_attendance_user_is_admin()
    or (
      public.current_attendance_user_is_teacher()
      and teacher_id = public.current_attendance_user_id()
    )
  )
);

drop policy if exists teacher_attendance_update_guard on public.teacher_attendance;
create policy teacher_attendance_update_guard
on public.teacher_attendance
as restrictive
for update
to authenticated
using (public.current_attendance_user_is_admin())
with check (
  public.current_attendance_user_is_admin()
  and updated_by::text = public.current_attendance_user_id()
);
