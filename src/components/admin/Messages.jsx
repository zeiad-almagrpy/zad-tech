import React from 'react';
import { Mail, Trash2, CheckCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// رسائل نموذج "تواصل معنا"
export default function Messages() {
  const [list, setList] = React.useState(null);
  const [error, setError] = React.useState('');
  const load = React.useCallback(async () => {
    const { data, error: e } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
    if (e) setError(e.message); else setList(data);
  }, []);
  React.useEffect(() => { load(); }, [load]);
  const mark = async m => { await supabase.from('contact_messages').update({ is_read: !m.is_read }).eq('id', m.id); load(); };
  const del = async m => { if (!confirm('حذف الرسالة؟')) return; await supabase.from('contact_messages').delete().eq('id', m.id); load(); };

  return <div className="admin-panel">
    <div className="panel-head"><h2>رسائل التواصل</h2><span>{list?.filter(m => !m.is_read).length || 0} جديدة</span></div>
    {error && <div className="form-error">{error}</div>}
    {!list && !error && <p>جاري التحميل...</p>}
    {list && !list.length && <div className="empty-state"><h3>لا توجد رسائل</h3></div>}
    {list?.map(m => <div className={`msg-card ${m.is_read ? '' : 'unread'}`} key={m.id}>
      <div className="sub-head"><div><strong>{m.name}</strong><span dir="ltr">{m.email} · {new Date(m.created_at).toLocaleString('ar-EG')}</span></div>
        <div className="row-actions">
          <a href={`mailto:${m.email}`} title="رد بالبريد"><Mail /></a>
          <button onClick={() => mark(m)} title="تمييز كمقروء"><CheckCheck /></button>
          <button onClick={() => del(m)} title="حذف"><Trash2 /></button>
        </div></div>
      <p>{m.message}</p>
    </div>)}
  </div>;
}
