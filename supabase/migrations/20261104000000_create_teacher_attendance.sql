create table if not exists public.teacher_attendance (
  id text primary key,
  teacher_id text not null,
  teacher_name text not null,
  date date not null,
  status text not null check (status in ('Hadir', 'Tidak hadir')),
  note text not null default '',
  checked_in_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by text not null,
  updated_by_name text not null,
  constraint teacher_attendance_teacher_date_unique unique (teacher_id, date)
);

create index if not exists teacher_attendance_date_idx on public.teacher_attendance (date);

alter table public.teacher_attendance enable row level security;

create policy "Active users can read permitted attendance"
  on public.teacher_attendance
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users as app_user
      where app_user.auth_id = auth.uid()
        and app_user.status = 'active'
        and (
          app_user.role = 'admin'
          or app_user.id::text = teacher_attendance.teacher_id
        )
    )
  );

create policy "Active users can create permitted attendance"
  on public.teacher_attendance
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.users as app_user
      where app_user.auth_id = auth.uid()
        and app_user.status = 'active'
        and (
          app_user.role = 'admin'
          or (
            app_user.role = 'teacher'
            and app_user.id::text = teacher_attendance.teacher_id
            and app_user.id::text = teacher_attendance.updated_by
          )
        )
    )
  );

create policy "Admins can update attendance"
  on public.teacher_attendance
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.users as app_user
      where app_user.auth_id = auth.uid()
        and app_user.status = 'active'
        and app_user.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.users as app_user
      where app_user.auth_id = auth.uid()
        and app_user.status = 'active'
        and app_user.role = 'admin'
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'teacher_attendance'
  ) then
    execute 'alter publication supabase_realtime add table public.teacher_attendance';
  end if;
end
$$;