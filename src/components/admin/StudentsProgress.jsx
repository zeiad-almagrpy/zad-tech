import React from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// متابعة تقدم كل طالب في كل كورس مشترك فيه
export default function StudentsProgress({ users, courses }) {
  const [rows, setRows] = React.useState(null);
  const [error, setError] = React.useState('');
  const [q, setQ] = React.useState('');
  const [courseId, setCourseId] = React.useState('');

  React.useEffect(() => {
    (async () => {
      try {
        const [en, ls, pr] = await Promise.all([
          supabase.from('enrollments').select('student_id,course_id').eq('status', 'active'),
          supabase.from('lessons').select('id,sections!inner(course_id)'),
          supabase.from('lesson_progress').select('student_id,lesson_id,updated_at').eq('completed', true).range(0, 19999)
        ]);
        for (const r of [en, ls, pr]) if (r.error) throw r.error;
        const total = {}; const courseOf = {};
        ls.data.forEach(l => { const c = l.sections.course_id; courseOf[l.id] = c; total[c] = (total[c] || 0) + 1; });
        const done = {}; const last = {};
        pr.data.forEach(p => {
          const c = courseOf[p.lesson_id]; if (!c) return;
          const k = `${p.student_id}|${c}`;
          done[k] = (done[k] || 0) + 1;
          if (!last[k] || p.updated_at > last[k]) last[k] = p.updated_at;
        });
        setRows(en.data.map(e => {
          const k = `${e.student_id}|${e.course_id}`; const t = total[e.course_id] || 0; const d = done[k] || 0;
          return { key: k, student_id: e.student_id, course_id: e.course_id, total: t, done: d, pct: t ? Math.round(d / t * 100) : 0, last: last[k] };
        }));
      } catch (e) { setError(e.message); }
    })();
  }, []);

  const name = id => users.find(u => u.id === id)?.full_name || id.slice(0, 8);
  const title = id => courses.find(c => c.id === id)?.title || 'كورس';
  const list = (rows || []).filter(r => (!courseId || r.course_id === courseId) && name(r.student_id).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.last || '').localeCompare(a.last || ''));

  return <div className="admin-panel">
    <div className="panel-head"><h2>متابعة تقدم الطلاب</h2>
      <div className="filters-row">
        <select value={courseId} onChange={e => setCourseId(e.target.value)}><option value="">كل الكورسات</option>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
        <div className="searchbox small"><Search /><input value={q} onChange={e => setQ(e.target.value)} placeholder="اسم الطالب..." /></div>
      </div></div>
    {error && <div className="form-error">{error}</div>}
    {!rows && !error && <p>جاري التحميل...</p>}
    {rows && !list.length && <div className="empty-state"><h3>لا يوجد طلاب</h3></div>}
    {list.map(r => <div className="progress-row" key={r.key}>
      <div className="payment-avatar">{name(r.student_id)[0]}</div>
      <div className="pr-info"><strong>{name(r.student_id)}</strong><span>{title(r.course_id)}</span></div>
      <div className="pr-bar"><div className="progress"><i style={{ width: `${r.pct}%` }} /></div><small>{r.done} / {r.total} درس · {r.pct}%</small></div>
      <span className={`status ${r.pct === 100 ? 'paid' : r.done ? 'pending' : 'rejected'}`}>{r.pct === 100 ? 'خلّص' : r.done ? 'شغّال' : 'لم يبدأ'}</span>
      <small className="pr-last">{r.last ? new Date(r.last).toLocaleDateString('ar-EG') : '—'}</small>
    </div>)}
  </div>;
}
