-- ZAD v2: استيراد كورس كامل (أقسام + دروس + أسئلة) بضغطة واحدة
-- آمن للتشغيل أكثر من مرة. شغّله في Supabase SQL Editor قبل رفع الكود الجديد.
begin;

-- جداول المحتوى (لو موجودة مش هيتأثروا)
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete cascade,
  title text not null,
  description text,
  video_id text,
  video_provider text default 'youtube',
  is_preview boolean not null default false,
  duration_seconds int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.lessons add column if not exists video_provider text default 'youtube';
alter table public.lessons add column if not exists duration_seconds int;

-- جدول الأسئلة (اختيار من متعدد) مرتبط بالدرس
create table if not exists public.lesson_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  question text not null,
  options jsonb not null,
  correct_index int not null,
  explanation text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists sections_course_idx on public.sections(course_id);
create index if not exists lessons_section_idx on public.lessons(section_id);
create index if not exists lesson_questions_lesson_idx on public.lesson_questions(lesson_id);

alter table public.sections enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_questions enable row level security;

-- سياسات بأسماء zad_ (بتتجدد من غير ما تلمس أي سياسة قديمة)
drop policy if exists zad_sections_admin on public.sections;
create policy zad_sections_admin on public.sections for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists zad_lessons_admin on public.lessons;
create policy zad_lessons_admin on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists zad_questions_admin on public.lesson_questions;
create policy zad_questions_admin on public.lesson_questions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists zad_sections_read on public.sections;
create policy zad_sections_read on public.sections for select
  using (exists (select 1 from public.courses c where c.id = course_id and c.status = 'published'));
drop policy if exists zad_lessons_read on public.lessons;
create policy zad_lessons_read on public.lessons for select
  using (exists (select 1 from public.sections s join public.courses c on c.id = s.course_id
                 where s.id = section_id and c.status = 'published'));

-- الأسئلة: للمشترك النشط في الكورس، أو لدرس المعاينة
drop policy if exists zad_questions_read on public.lesson_questions;
create policy zad_questions_read on public.lesson_questions for select to authenticated
  using (exists (
    select 1 from public.lessons l
    join public.sections s on s.id = l.section_id
    where l.id = lesson_id
      and (l.is_preview or exists (
        select 1 from public.enrollments e
        where e.course_id = s.course_id and e.student_id = auth.uid() and e.status = 'active'))
  ));

-- الدالة: بتستقبل JSON واحد وتنشئ كل حاجة في transaction واحدة (يا الكل يتحفظ يا ولا حاجة)
create or replace function public.import_course(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c jsonb := payload->'course';
  v_course uuid; v_cat uuid; v_section uuid; v_lesson uuid;
  s jsonb; l jsonb; q jsonb; si int; li int; qi int;
begin
  if not public.is_admin() then raise exception 'للأدمن فقط'; end if;
  if coalesce(c->>'title','') = '' or coalesce(c->>'slug','') = '' then
    raise exception 'لازم course.title و course.slug';
  end if;
  if exists (select 1 from public.courses where slug = c->>'slug') then
    raise exception 'الـ slug "%" مستخدم قبل كده. غيّره أو احذف الكورس القديم.', c->>'slug';
  end if;
  if c->>'category_slug' is not null then
    select id into v_cat from public.categories where slug = c->>'category_slug';
    if v_cat is null then raise exception 'التصنيف "%" مش موجود', c->>'category_slug'; end if;
  end if;

  insert into public.courses (title, slug, short_description, description, category_id, level,
                              price, old_price, thumbnail_url, status, instructor_id)
  values (c->>'title', c->>'slug', c->>'short_description', c->>'description', v_cat,
          coalesce(c->>'level','مبتدئ'), coalesce((c->>'price')::numeric,0),
          nullif(c->>'old_price','')::numeric, c->>'thumbnail_url',
          coalesce(c->>'status','draft')::public.publish_status, auth.uid())
  returning id into v_course;

  si := 0;
  for s in select * from jsonb_array_elements(coalesce(payload->'sections','[]')) loop
    si := si + 1;
    insert into public.sections (course_id, title, sort_order)
    values (v_course, s->>'title', si) returning id into v_section;
    li := 0;
    for l in select * from jsonb_array_elements(coalesce(s->'lessons','[]')) loop
      li := li + 1;
      insert into public.lessons (section_id, title, description, video_id, video_provider,
                                  is_preview, duration_seconds, sort_order)
      values (v_section, l->>'title', l->>'description', nullif(l->>'video_id',''), 'youtube',
              coalesce((l->>'is_preview')::boolean,false),
              nullif(l->>'duration_seconds','')::int, li)
      returning id into v_lesson;
      qi := 0;
      for q in select * from jsonb_array_elements(coalesce(l->'questions','[]')) loop
        qi := qi + 1;
        insert into public.lesson_questions (lesson_id, question, options, correct_index, explanation, sort_order)
        values (v_lesson, q->>'question', q->'options', (q->>'correct')::int - 1, q->>'explanation', qi);
      end loop;
    end loop;
  end loop;
  return v_course;
end $$;
grant execute on function public.import_course(jsonb) to authenticated;

commit;
