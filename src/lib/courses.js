// أدوات مشتركة لعرض الكورسات الحقيقية (من Supabase) بنفس شكل الكروت
export const CATALOG_SELECT = '*,categories(name),sections(id,lessons(id,duration_seconds))';

export function formatDuration(sec) {
  if (!sec) return 'حسب المحتوى';
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} دقيقة`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} ساعة و${r} دقيقة` : `${h} ساعة`;
}

export function normalizeCourse(c) {
  if (!('thumbnail_url' in c)) return c; // بيانات الديمو جاهزة بالشكل ده
  const lessons = (c.sections || []).flatMap(s => s.lessons || []);
  const secs = lessons.reduce((n, l) => n + (l.duration_seconds || 0), 0);
  return {
    ...c,
    category: c.categories?.name || 'عام',
    thumbnail: c.thumbnail_url || '/zad-icon.svg',
    description: c.short_description || c.description || '',
    oldPrice: c.old_price,
    lessons: lessons.length,
    duration: formatDuration(secs),
    rating: c.rating || null
  };
}

// يقبل رابط يوتيوب كامل أو ID مباشر ويرجّع الـ ID
export function parseYouTubeId(input) {
  const s = (input || '').trim();
  if (!s) return '';
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? m[1] : s;
}
