# ZAD Platform

Zad Academy MVP built with React + Vite + Supabase.

## 1. Install
npm install

## 2. Environment
Create `.env` beside `package.json` and copy `.env.example` values:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_WHATSAPP_NUMBER` (international format without +)
- `VITE_VODAFONE_CASH_NUMBER`

Do not put a Supabase `service_role` key in the frontend.

## 3. Database
Run `supabase.sql` in Supabase SQL Editor. If you already ran an earlier version, do not blindly rerun policy statements; use the current project schema or recreate the dev database.

## 3.1 استيراد كورس كامل (v2)
شغّل `supabase-v2-course-import.sql` مرة واحدة في SQL Editor **قبل** رفع الكود الجديد.
بعدها: لوحة الإدارة ← «استيراد كورس كامل» ← الصق JSON (أو اضغط «املأ نموذج») ← استيراد.

## 3.2 تحديث v3
شغّل `supabase-v3.sql` مرة واحدة (تقدم الطلاب، رفع الصور، المشاريع، رسائل التواصل).
أضف `VITE_CONTACT_EMAIL` في `.env`.

## 4. Admin
Create a normal account, then in Supabase SQL Editor:
`update public.profiles set role='admin' where id='AUTH_USER_UUID';`
Then sign out/in again and open `/admin`.

## 5. Run
npm run dev

## Current MVP flow
- Public course catalog reads published courses from Supabase.
- Admin can create/edit/delete courses directly in Supabase.
- Students register/login with Supabase Auth.
- Student creates a pending Vodafone Cash payment request.
- WhatsApp is used to send the transfer proof.
- Admin approves payment and the app creates an active enrollment.
- Course lessons use YouTube video IDs; videos are not stored in Supabase.
- Student progress is stored in `lesson_progress`.


## 3.3 تحديث v4 (أمان) — مهم

شغّل `supabase-v4-security.sql` مرة واحدة في SQL Editor. يمنع أي طالب من تحويل نفسه إلى `admin`
(السياسة القديمة كانت تسمح له بتعديل عمود `role` في صفّه). بعد التشغيل راجع:
`select id, full_name, role from public.profiles where role = 'admin';`

## Deploy على Vercel

ملف `vercel.json` موجود ويحوّل كل المسارات إلى `index.html`. بدونه، تحديث الصفحة (Refresh) أو فتح
رابط مباشر مثل `/courses` يعطي 404. تأكد من إضافة متغيرات `.env` في Vercel → Settings → Environment Variables
ثم Redeploy.

## هيكل الـ CSS

`src/styles/index.css` يستورد الملفات بالترتيب:
`tokens` (الألوان والمقاسات) ← `base` ← `typography` (المقاييس المرنة) ← `components` (الإدارة والمشروع) ←
`motion` ← `learning` (مشغّل الدروس) ← `legacy-media` ← `responsive`.
نقاط الكسر: 420 / 720 / 1024 / 1440 / 1920. حجم الخط الأساسي يكبر تلقائيًا على الشاشات الكبيرة.
