import React from 'react';
import { X, Upload, FileJson } from 'lucide-react';
import Button from './Button';
import { supabase } from '../lib/supabase';

export const SAMPLE = {
  course: {
    title: 'JavaScript من الصفر', slug: 'javascript-from-zero', short_description: 'وصف مختصر',
    description: 'وصف كامل للكورس', level: 'مبتدئ', price: 299, old_price: 399,
    thumbnail_url: '', status: 'draft', category_slug: 'javascript'
  },
  sections: [{
    title: 'القسم الأول: البداية',
    lessons: [{
      title: 'مقدمة', description: 'نبذة عن الدرس', video_id: 'dQw4w9WgXcQ', duration_seconds: 600, is_preview: true,
      questions: [{ question: 'ما هي لغة JavaScript؟', options: ['لغة برمجة', 'قاعدة بيانات', 'نظام تشغيل'], correct: 1, explanation: 'JavaScript لغة برمجة.' }]
    }]
  }]
};

function validate(d) {
  const errs = [];
  if (!d?.course?.title) errs.push('course.title مطلوب');
  if (!d?.course?.slug || !/^[a-z0-9-]+$/.test(d.course.slug)) errs.push('course.slug مطلوب (حروف إنجليزي صغيرة وأرقام و - فقط)');
  if (!Array.isArray(d?.sections) || !d.sections.length) errs.push('لازم قسم واحد على الأقل في sections');
  let lessons = 0, questions = 0;
  (d?.sections || []).forEach((s, i) => {
    if (!s.title) errs.push(`القسم ${i + 1}: العنوان ناقص`);
    (s.lessons || []).forEach((l, j) => {
      lessons++;
      if (!l.title) errs.push(`القسم ${i + 1} / الدرس ${j + 1}: العنوان ناقص`);
      (l.questions || []).forEach((q, k) => {
        questions++;
        const n = Array.isArray(q.options) ? q.options.length : 0;
        if (!q.question) errs.push(`القسم ${i + 1} / الدرس ${j + 1} / سؤال ${k + 1}: نص السؤال ناقص`);
        if (n < 2) errs.push(`القسم ${i + 1} / الدرس ${j + 1} / سؤال ${k + 1}: محتاج اختيارين على الأقل`);
        if (!Number.isInteger(q.correct) || q.correct < 1 || q.correct > n) errs.push(`القسم ${i + 1} / الدرس ${j + 1} / سؤال ${k + 1}: correct لازم رقم من 1 إلى ${n}`);
      });
    });
  });
  return { errs, sections: d?.sections?.length || 0, lessons, questions };
}

export default function CourseImport({ onClose, onDone }) {
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  let parsed = null, parseErr = '';
  if (text.trim()) { try { parsed = JSON.parse(text); } catch (e) { parseErr = 'JSON غير صالح: ' + e.message; } }
  const info = parsed ? validate(parsed) : null;
  const ok = info && !info.errs.length;

  const onFile = async e => { const f = e.target.files?.[0]; if (f) setText(await f.text()); };
  const submit = async () => {
    setBusy(true); setError('');
    const { error: err } = await supabase.rpc('import_course', { payload: parsed });
    setBusy(false);
    if (err) setError(err.message); else onDone();
  };

  return <div className="modal-backdrop"><div className="modal-card import-card">
    <div className="modal-head"><div><span className="eyebrow">COURSE IMPORT</span><h2>استيراد كورس كامل</h2></div><button onClick={onClose}><X /></button></div>
    <p className="import-hint">الصق ملف JSON فيه الكورس + الأقسام + الدروس + الأسئلة، وهيتحفظ كله مرة واحدة. <b>correct</b> = رقم الإجابة الصحيحة (1 = أول اختيار).</p>
    <div className="import-tools">
      <Button type="button" variant="outline" onClick={() => setText(JSON.stringify(SAMPLE, null, 2))}><FileJson /> املأ نموذج</Button>
      <label className="btn btn-outline"><Upload /> رفع ملف .json<input type="file" accept=".json,application/json" hidden onChange={onFile} /></label>
    </div>
    <textarea className="import-area" dir="ltr" rows="14" value={text} onChange={e => setText(e.target.value)} placeholder='{ "course": {...}, "sections": [...] }' />
    {parseErr && <div className="form-error">{parseErr}</div>}
    {info && !info.errs.length && <div className="success-note">جاهز للاستيراد: {info.sections} أقسام · {info.lessons} دروس · {info.questions} أسئلة</div>}
    {info?.errs.length > 0 && <div className="form-error">{info.errs.slice(0, 8).map(x => <div key={x}>• {x}</div>)}</div>}
    {error && <div className="form-error">{error}</div>}
    <div className="modal-actions"><Button type="button" variant="outline" onClick={onClose}>إلغاء</Button><Button type="button" disabled={!ok || busy} onClick={submit}>{busy ? 'جاري الاستيراد...' : 'استيراد الكورس'}</Button></div>
  </div></div>;
}
