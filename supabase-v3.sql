-- ZAD v3: متابعة التقدم + رفع الصور + المشاريع + رسائل التواصل
-- آمن للتشغيل أكثر من مرة. شغّله في Supabase SQL Editor بعد supabase.sql و supabase-v2-course-import.sql
begin;

-- 1) تقدم الطلاب (لو الجدول موجود عندك مش هيتأثر)
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.lesson_progress add column if not exists completed boolean not null default false;
alter table public.lesson_progress add column if not exists updated_at timestamptz not null default now();
create unique index if not exists lesson_progress_student_lesson_uq on public.lesson_progress(student_id, lesson_id);
alter table public.lesson_progress enable row level security;

drop policy if exists zad_progress_own on public.lesson_progress;
create policy zad_progress_own on public.lesson_progress for all to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists zad_progress_admin_read on public.lesson_progress;
create policy zad_progress_admin_read on public.lesson_progress for select to authenticated
  using (public.is_admin());

-- 2) مشروع اختياري لكل كورس (سيبه فاضي = مفيش مشروع)
alter table public.courses add column if not exists project_title text;
alter table public.courses add column if not exists project_brief text;

create table if not exists public.project_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  code text not null check (length(code) between 1 and 50000),
  notes text check (notes is null or length(notes) <= 2000),
  status text not null default 'pending' check (status in ('pending','needs_fix','approved')),
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (student_id, course_id)
);
alter table public.project_submissions enable row level security;

drop policy if exists zad_sub_read_own on public.project_submissions;
create policy zad_sub_read_own on public.project_submissions for select to authenticated
  using (student_id = auth.uid() or public.is_admin());
drop policy if exists zad_sub_admin on public.project_submissions;
create policy zad_sub_admin on public.project_submissions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists zad_sub_admin_delete on public.project_submissions;
create policy zad_sub_admin_delete on public.project_submissions for delete to authenticated
  using (public.is_admin());

-- الطالب بيسلّم من خلال الدالة دي بس (مينفعش يغيّر الحالة أو الملاحظات بنفسه)
create or replace function public.submit_project(p_course uuid, p_code text, p_notes text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'لازم تسجل دخول'; end if;
  if coalesce(trim(p_code),'') = '' then raise exception 'الكود فاضي'; end if;
  if not exists (select 1 from public.enrollments
                 where student_id = auth.uid() and course_id = p_course and status = 'active') then
    raise exception 'أنت غير مشترك في الكورس';
  end if;
  if exists (select 1 from public.project_submissions
             where student_id = auth.uid() and course_id = p_course and status = 'approved') then
    raise exception 'المشروع تم قبوله بالفعل';
  end if;
  insert into public.project_submissions (student_id, course_id, code, notes)
  values (auth.uid(), p_course, p_code, p_notes)
  on conflict (student_id, course_id) do update
    set code = excluded.code, notes = excluded.notes, status = 'pending', updated_at = now();
end $$;
grant execute on function public.submit_project(uuid, text, text) to authenticated;

-- 3) رسائل "تواصل معنا"
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  email text not null check (length(email) between 3 and 200),
  message text not null check (length(message) between 1 and 4000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
drop policy if exists zad_contact_insert on public.contact_messages;
create policy zad_contact_insert on public.contact_messages for insert to anon, authenticated
  with check (is_read = false);
drop policy if exists zad_contact_admin on public.contact_messages;
create policy zad_contact_admin on public.contact_messages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 4) تخزين صور الكورسات
insert into storage.buckets (id, name, public)
values ('course-thumbnails', 'course-thumbnails', true)
on conflict (id) do nothing;

drop policy if exists zad_thumbs_read on storage.objects;
create policy zad_thumbs_read on storage.objects for select
  using (bucket_id = 'course-thumbnails');
drop policy if exists zad_thumbs_admin_insert on storage.objects;
create policy zad_thumbs_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'course-thumbnails' and public.is_admin());
drop policy if exists zad_thumbs_admin_update on storage.objects;
create policy zad_thumbs_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'course-thumbnails' and public.is_admin());
drop policy if exists zad_thumbs_admin_delete on storage.objects;
create policy zad_thumbs_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'course-thumbnails' and public.is_admin());

commit;
