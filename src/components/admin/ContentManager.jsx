import React from 'react';
import { ArrowDown, ArrowUp, Edit3, Plus, Trash2, X } from 'lucide-react';
import Button from '../Button';
import { supabase } from '../../lib/supabase';
import { parseYouTubeId } from '../../lib/courses';

const emptyLesson = { title: '', video: '', description: '', minutes: '', is_preview: false };

// إدارة أقسام ودروس كورس: إضافة فيديو جديد، تعديل، حذف، وترتيب
export default function ContentManager({ course, onClose }) {
  const [sections, setSections] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [newSection, setNewSection] = React.useState('');
  const [form, setForm] = React.useState(null); // { sectionId, lessonId?, ...fields }

  const load = React.useCallback(async () => {
    const { data, error: e } = await supabase.from('sections')
      .select('id,title,sort_order,lessons(id,title,description,video_id,is_preview,duration_seconds,sort_order)')
      .eq('course_id', course.id).order('sort_order');
    if (e) return setError(e.message);
    setSections((data || []).map(s => ({ ...s, lessons: (s.lessons || []).sort((a, b) => a.sort_order - b.sort_order) })));
  }, [course.id]);
  React.useEffect(() => { load(); }, [load]);

  const run = async fn => {
    setBusy(true); setError('');
    try { await fn(); await load(); } catch (e) { setError(e.message || 'حصل خطأ'); }
    setBusy(false);
  };
  const must = r => { if (r.error) throw r.error; return r; };

  const addSection = () => newSection.trim() && run(async () => {
    const next = Math.max(0, ...sections.map(s => s.sort_order || 0)) + 1;
    must(await supabase.from('sections').insert({ course_id: course.id, title: newSection.trim(), sort_order: next }));
    setNewSection('');
  });
  const renameSection = s => { const t = prompt('اسم القسم', s.title); if (t && t.trim()) run(async () => must(await supabase.from('sections').update({ title: t.trim() }).eq('id', s.id))); };
  const removeSection = s => confirm(`حذف القسم "${s.title}" وكل دروسه؟`) && run(async () => must(await supabase.from('sections').delete().eq('id', s.id)));
  const removeLesson = l => confirm(`حذف الدرس "${l.title}"؟ هيتحذف تقدم الطلاب فيه.`) && run(async () => must(await supabase.from('lessons').delete().eq('id', l.id)));

  // إعادة ترقيم كامل بعد التحريك عشان نتجنب تكرار sort_order
  const move = (table, list, i, dir) => run(async () => {
    const j = i + dir; if (j < 0 || j >= list.length) return;
    const arr = [...list]; [arr[i], arr[j]] = [arr[j], arr[i]];
    await Promise.all(arr.map((x, k) => supabase.from(table).update({ sort_order: k + 1 }).eq('id', x.id).then(must)));
  });

  const saveLesson = e => {
    e.preventDefault();
    const f = form; const section = sections.find(s => s.id === f.sectionId);
    run(async () => {
      const payload = {
        title: f.title.trim(), description: f.description.trim() || null,
        video_id: parseYouTubeId(f.video) || null, video_provider: 'youtube',
        is_preview: !!f.is_preview, duration_seconds: f.minutes ? Math.round(Number(f.minutes) * 60) : null
      };
      if (f.lessonId) must(await supabase.from('lessons').update(payload).eq('id', f.lessonId));
      else {
        const next = Math.max(0, ...(section?.lessons || []).map(l => l.sort_order || 0)) + 1;
        must(await supabase.from('lessons').insert({ ...payload, section_id: f.sectionId, sort_order: next }));
      }
      setForm(null);
    });
  };
  const editLesson = (s, l) => setForm({ sectionId: s.id, lessonId: l.id, title: l.title, video: l.video_id || '', description: l.description || '', minutes: l.duration_seconds ? Math.round(l.duration_seconds / 60) : '', is_preview: l.is_preview });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return <div className="modal-backdrop"><div className="modal-card wide">
    <div className="modal-head"><div><span className="eyebrow">COURSE CONTENT</span><h2>محتوى: {course.title}</h2></div><button onClick={onClose}><X /></button></div>
    {error && <div className="form-error">{error}</div>}
    {busy && <div className="admin-loading">جاري الحفظ...</div>}

    {sections.map((s, si) => <div className="cm-section" key={s.id}>
      <div className="cm-head">
        <strong>{s.title}</strong>
        <div className="row-actions">
          <button onClick={() => move('sections', sections, si, -1)} title="فوق"><ArrowUp /></button>
          <button onClick={() => move('sections', sections, si, 1)} title="تحت"><ArrowDown /></button>
          <button onClick={() => renameSection(s)} title="تعديل الاسم"><Edit3 /></button>
          <button onClick={() => removeSection(s)} title="حذف"><Trash2 /></button>
        </div>
      </div>
      {s.lessons.map((l, li) => <div className="cm-lesson" key={l.id}>
        <span className="cm-num">{li + 1}</span>
        <div><strong>{l.title}</strong><small>{l.video_id ? `يوتيوب: ${l.video_id}` : 'بدون فيديو بعد'}{l.is_preview ? ' · معاينة مجانية' : ''}</small></div>
        <div className="row-actions">
          <button onClick={() => move('lessons', s.lessons, li, -1)} title="فوق"><ArrowUp /></button>
          <button onClick={() => move('lessons', s.lessons, li, 1)} title="تحت"><ArrowDown /></button>
          <button onClick={() => editLesson(s, l)} title="تعديل"><Edit3 /></button>
          <button onClick={() => removeLesson(l)} title="حذف"><Trash2 /></button>
        </div>
      </div>)}
      <Button variant="outline" className="cm-add" onClick={() => setForm({ ...emptyLesson, sectionId: s.id })}><Plus /> درس جديد في هذا القسم</Button>
    </div>)}

    {!sections.length && <div className="empty-state"><h3>لا توجد أقسام</h3><p>أضف أول قسم ثم أضف الدروس فيه.</p></div>}
    <div className="cm-new-section"><input value={newSection} onChange={e => setNewSection(e.target.value)} placeholder="اسم قسم جديد" onKeyDown={e => e.key === 'Enter' && addSection()} /><Button onClick={addSection}><Plus /> إضافة قسم</Button></div>

    {form && <div className="modal-backdrop inner"><div className="modal-card">
      <div className="modal-head"><h2>{form.lessonId ? 'تعديل الدرس' : 'درس جديد'}</h2><button onClick={() => setForm(null)}><X /></button></div>
      <form className="modal-form" onSubmit={saveLesson}>
        <label>عنوان الدرس<input required value={form.title} onChange={e => set('title', e.target.value)} /></label>
        <label>رابط فيديو يوتيوب (أو الـ ID)<input dir="ltr" value={form.video} onChange={e => set('video', e.target.value)} placeholder="https://youtu.be/xxxxxxxxxxx" /></label>
        <div className="form-grid">
          <label>المدة بالدقائق<input type="number" min="0" value={form.minutes} onChange={e => set('minutes', e.target.value)} /></label>
          <label className="check-label"><input type="checkbox" checked={form.is_preview} onChange={e => set('is_preview', e.target.checked)} /> معاينة مجانية</label>
        </div>
        <label>شرح مختصر<textarea rows="3" value={form.description} onChange={e => set('description', e.target.value)} /></label>
        <div className="modal-actions"><Button type="button" variant="outline" onClick={() => setForm(null)}>إلغاء</Button><Button type="submit">حفظ الدرس</Button></div>
      </form>
    </div></div>}
  </div></div>;
}
