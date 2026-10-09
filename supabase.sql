-- ZAD Platform - Safe Supabase update/migration
-- This script is intended for an EXISTING ZAD database.
-- It does not drop tables or delete user/course/payment data.
-- Safe to run more than once.

begin;

-- ------------------------------------------------------------
-- 1) Categories table (needed by the v1 Admin course editor)
-- ------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

-- Seed only if the table is empty; never overwrite existing categories.
insert into public.categories (name, slug)
select * from (values
  ('HTML & CSS', 'html-css'),
  ('JavaScript', 'javascript'),
  ('React', 'react'),
  ('Backend', 'backend'),
  ('Databases', 'databases'),
  ('Git & GitHub', 'git-github')
) as seed(name, slug)
where not exists (select 1 from public.categories);

-- ------------------------------------------------------------
-- 2) Helper: admin check
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ------------------------------------------------------------
-- 3) Make sure the columns used by Zad v1 exist.
--    ADD COLUMN IF NOT EXISTS is non-destructive.
-- ------------------------------------------------------------

-- Profiles
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists role text default 'student';
alter table public.profiles add column if not exists created_at timestamptz default now();

-- Courses
alter table public.courses add column if not exists title text;
alter table public.courses add column if not exists slug text;
alter table public.courses add column if not exists short_description text;
alter table public.courses add column if not exists description text;
alter table public.courses add column if not exists category_id uuid;
alter table public.courses add column if not exists level text default 'مبتدئ';
alter table public.courses add column if not exists price numeric default 0;
alter table public.courses add column if not exists old_price numeric;
alter table public.courses add column if not exists thumbnail_url text;
alter table public.courses add column if not exists status text default 'draft';
alter table public.courses add column if not exists instructor_id uuid;
alter table public.courses add column if not exists created_at timestamptz default now();

-- Payments
alter table public.payments add column if not exists student_id uuid;
alter table public.payments add column if not exists course_id uuid;
alter table public.payments add column if not exists amount numeric default 0;
alter table public.payments add column if not exists status text default 'pending';
alter table public.payments add column if not exists paid_at timestamptz;
alter table public.payments add column if not exists created_at timestamptz default now();

-- Enrollments
alter table public.enrollments add column if not exists student_id uuid;
alter table public.enrollments add column if not exists course_id uuid;
alter table public.enrollments add column if not exists status text default 'active';
alter table public.enrollments add column if not exists created_at timestamptz default now();

-- ------------------------------------------------------------
-- 4) Useful indexes. IF NOT EXISTS is safe.
-- ------------------------------------------------------------
create index if not exists courses_status_idx on public.courses(status);
create index if not exists courses_category_id_idx on public.courses(category_id);
create index if not exists payments_status_idx on public.payments(status);
create index if not exists payments_student_id_idx on public.payments(student_id);
create index if not exists payments_course_id_idx on public.payments(course_id);
create index if not exists enrollments_student_course_idx on public.enrollments(student_id, course_id);

-- ------------------------------------------------------------
-- 5) RLS
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.categories enable row level security;
alter table public.payments enable row level security;
alter table public.enrollments enable row level security;

-- ------------------------------------------------------------
-- 6) Categories policies
-- ------------------------------------------------------------
drop policy if exists "categories are public" on public.categories;
drop policy if exists "admins manage categories" on public.categories;

create policy "categories are public"
on public.categories
for select
using (true);

create policy "admins manage categories"
on public.categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ------------------------------------------------------------
-- 7) Courses policies
-- ------------------------------------------------------------
drop policy if exists "published courses are public" on public.courses;
drop policy if exists "admins manage courses" on public.courses;
drop policy if exists "admins can manage courses" on public.courses;
drop policy if exists "admins full access to courses" on public.courses;

create policy "published courses are public"
on public.courses
for select
using (status = 'published');

create policy "admins manage courses"
on public.courses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ------------------------------------------------------------
-- 8) Profiles policies
-- ------------------------------------------------------------
drop policy if exists "users can view own profile" on public.profiles;
drop policy if exists "users can update own profile" on public.profiles;
drop policy if exists "admins can view profiles" on public.profiles;

create policy "users can view own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "admins can view profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

-- ------------------------------------------------------------
-- 9) Payments policies
-- ------------------------------------------------------------
drop policy if exists "students can create own payments" on public.payments;
drop policy if exists "students can view own payments" on public.payments;
drop policy if exists "admins manage payments" on public.payments;

create policy "students can create own payments"
on public.payments
for insert
to authenticated
with check (student_id = auth.uid());

create policy "students can view own payments"
on public.payments
for select
to authenticated
using (student_id = auth.uid() or public.is_admin());

create policy "admins manage payments"
on public.payments
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ------------------------------------------------------------
-- 10) Enrollment policies
-- ------------------------------------------------------------
drop policy if exists "students can view own enrollments" on public.enrollments;
drop policy if exists "admins manage enrollments" on public.enrollments;

create policy "students can view own enrollments"
on public.enrollments
for select
to authenticated
using (student_id = auth.uid() or public.is_admin());

create policy "admins manage enrollments"
on public.enrollments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ------------------------------------------------------------
-- 11) Optional uniqueness for student/course enrollment.
--     Create only when no duplicate rows exist.
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from public.enrollments
    group by student_id, course_id
    having count(*) > 1
    limit 1
  ) then
    create unique index if not exists enrollments_student_course_unique
      on public.enrollments(student_id, course_id);
  end if;
end $$;

commit;

-- Verification queries (run separately if you want to inspect the result):
-- select id, title, status, price from public.courses order by created_at desc;
-- select id, name, slug from public.categories order by name;
-- select id, email from auth.users order by created_at desc;
-- select id, full_name, role from public.profiles order by created_at desc;
