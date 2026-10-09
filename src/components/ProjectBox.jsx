import React from 'react';
import { ArrowRight, Code2, MessageCircle, Send } from 'lucide-react';
import Button from './Button';
import { supabase } from '../lib/supabase';

const WA = import.meta.env.VITE_WHATSAPP_NUMBER || '';
const LABEL = { pending: 'بانتظار المراجعة', needs_fix: 'يحتاج تعديل', approved: 'مقبول 🎉' };
const CLS = { pending: 'pending', needs_fix: 'rejected', approved: 'paid' };

// صندوق تسليم المشروع: الطالب يكتب الكود → يوصل للأدمن في لوحة الإدارة
export default function ProjectBox({ course, user, onBack }) {
  const [sub, setSub] = React.useState(null);
  const [code, setCode] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!supabase) return;
    supabase.from('project_submissions').select('*').eq('student_id', user.id).eq('course_id', course.id).maybeSingle()
      .then(({ data }) => { if (data) { setSub(data); setCode(data.code); setNotes(data.notes || ''); } });
  }, [course.id, user.id]);

  const submit = async e => {
    e.preventDefault(); setError(''); setMsg('');
    if (!supabase) return setError('التسليم يحتاج اتصال بـ Supabase.');
    setBusy(true);
    const { error: err } = await supabase.rpc('submit_project', { p_course: course.id, p_code: code, p_notes: notes || null });
    setBusy(false);
    if (err) return setError(err.message);
    setMsg('تم إرسال المشروع ✅ هنراجعه ونرد عليك هنا.');
    const { data } = await supabase.from('project_submissions').select('*').eq('student_id', user.id).eq('course_id', course.id).maybeSingle();
    setSub(data);
  };

  const waText = encodeURIComponent(`مشروع كورس ${course.title}\nالطالب: ${user.user_metadata?.full_name || user.email}\n\n${code}`);
  const locked = sub?.status === 'approved';

  return <div className="project-box">
    <button className="back-link plain" onClick={onBack}><ArrowRight size={16} /> رجوع للدروس</button>
    <span className="eyebrow">المشروع التطبيقي</span>
    <h1><Code2 /> {course.project_title || 'مشروع الكورس'}</h1>
    <div className="project-brief">{course.project_brief}</div>

    {sub && <div className="project-status">
      <span className={`status ${CLS[sub.status]}`}>{LABEL[sub.status]}</span>
      {sub.feedback && <p><b>تعليق المراجع:</b> {sub.feedback}</p>}
    </div>}

    <form onSubmit={submit}>
      <label>اكتب الكود هنا
        <textarea className="code-input" dir="ltr" rows="14" required disabled={locked} value={code} onChange={e => setCode(e.target.value)} placeholder="// الصق أو اكتب كود المشروع هنا" spellCheck="false" />
      </label>
      <label>ملاحظات (اختياري)<input disabled={locked} value={notes} onChange={e => setNotes(e.target.value)} placeholder="أي حاجة تحب تقولها للمراجع" /></label>
      {error && <div className="form-error">{error}</div>}
      {msg && <div className="success-note">{msg}</div>}
      <div className="project-actions">
        <Button type="submit" disabled={busy || locked}><Send /> {sub ? 'إعادة التسليم' : 'تسليم المشروع'}</Button>
        {WA && <a href={`https://wa.me/${WA}?text=${waText}`} target="_blank" rel="noreferrer"><Button type="button" variant="outline"><MessageCircle /> أو ابعته واتساب</Button></a>}
      </div>
    </form>
  </div>;
}
