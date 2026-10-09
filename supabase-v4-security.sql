-- ZAD v4 — security hardening. Run ONCE in Supabase → SQL Editor.
-- Safe to re-run.

-- 1) A student must not be able to make themselves an admin.
--    The old policy "users can update own profile" lets a user update ANY column of their own row,
--    including `role`. This trigger blocks role changes unless the caller is already an admin.
--    Changes made from the SQL Editor (no logged-in user, auth.uid() is null) still work,
--    so the README step "update public.profiles set role='admin' ..." keeps working.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() is not null and not public.is_admin() then
      raise exception 'Only an admin can change a user role';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- 2) Same idea for new rows: nobody can insert a profile that already has a privileged role.
create or replace function public.force_student_role_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := 'student';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_force_student on public.profiles;
create trigger profiles_force_student
  before insert on public.profiles
  for each row execute function public.force_student_role_on_insert();

-- 3) Quick check: should return only the people you expect to be admins.
-- select id, full_name, role from public.profiles where role = 'admin';
