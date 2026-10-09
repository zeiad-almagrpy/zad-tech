import React from 'react';
import { Check, Copy, Wrench } from 'lucide-react';
import Button from '../Button';
import { supabase } from '../../lib/supabase';

const LABEL = { pending: 'بانتظار المراجعة', needs_fix: 'يحتاج تعديل', approved: 'مقبول' };
const CLS = { pending: 'pending', needs_fix: 'rejected', approved: 'paid' };

// مراجعة أكواد المشاريع اللي الطلاب سلّموها
export default function Submissions({ users, courses }) {
  const [list, setList] = React.useState(null);
  const [error, setError] = React.useState('');
  const [filter, setFilter] = React.useState('pending');
  const [fb, setFb] = React.useState({});

  const load = React.useCallback(async () => {
    const { data, error: e } = await supabase.from('project_submissions').select('*').order('updated_at', { ascending: false });
    if (e) setError(e.message); else { setList(data); setFb(Object.fromEntries(data.map(s => [s.id, s.feedback || '']))); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const review = async (s, status) => {
    const { error: e } = await supabase.from('project_submissions')
      .update({ status, feedback: fb[s.id] || null, reviewed_at: new Date().toISOString() }).eq('id', s.id);
    if (e) setError(e.message); else load();
  };
  const name = id => users.find(u => u.id === id)?.full_name || id.slice(0, 8);
  const title = id => courses.find(c => c.id === id)?.title || 'كورس';
  const shown = (list || []).filter(s => !filter || s.status === filter);

  return <div className="admin-panel">
    <div className="panel-head"><h2>مشاريع الطلاب</h2>
      <select value={filter} onChange={e => setFilter(e.target.value)}><option value="">الكل</option>{Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
    {error && <div className="form-error">{error}</div>}
    {!list && !error && <p>جاري التحميل...</p>}
    {list && !shown.length && <div className="empty-state"><h3>لا توجد مشاريع هنا</h3></div>}
    {shown.map(s => <div className="sub-card" key={s.id}>
      <div className="sub-head"><div><strong>{name(s.student_id)}</strong><span>{title(s.course_id)} · {new Date(s.updated_at).toLocaleString('ar-EG')}</span></div><span className={`status ${CLS[s.status]}`}>{LABEL[s.status]}</span></div>
      {s.notes && <p className="sub-notes">ملاحظة الطالب: {s.notes}</p>}
      <pre className="code-view" dir="ltr">{s.code}</pre>
      <textarea rows="2" placeholder="تعليقك للطالب (اختياري)" value={fb[s.id] || ''} onChange={e => setFb(f => ({ ...f, [s.id]: e.target.value }))} />
      <div className="sub-actions">
        <Button variant="outline" onClick={() => navigator.clipboard?.writeText(s.code)}><Copy /> نسخ الكود</Button>
        <Button variant="outline" onClick={() => review(s, 'needs_fix')}><Wrench /> يحتاج تعديل</Button>
        <Button onClick={() => review(s, 'approved')}><Check /> قبول</Button>
      </div>
    </div>)}
  </div>;
}
