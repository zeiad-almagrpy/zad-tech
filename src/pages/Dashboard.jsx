import React from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, Clock3, Trophy, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import RetryBox from '../components/RetryBox';
import { supabase } from '../lib/supabase';

const byOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

export default function Dashboard({ user }) {
  const [enrolled, setEnrolled] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [projects, setProjects] = React.useState(0);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      if (!supabase) { setLoading(false); return; }
      const { data, error: e } = await supabase
        .from('enrollments')
        .select('id,status,course_id,courses(*,categories(name),sections(id,sort_order,lessons(id,title,sort_order)))')
        .eq('student_id', user.id).eq('status', 'active')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (e) { console.error(e); setError(e.message); setLoading(false); return; }

      const withProgress = await Promise.all((data || []).filter(r => r.courses).map(async r => {
        const c = r.courses;
        const { data: p } = await supabase
          .from('lesson_progress')
          .select('lesson_id,completed,lessons!inner(section_id,sections!inner(course_id))')
          .eq('student_id', user.id).eq('lessons.sections.course_id', c.id);
        const doneIds = new Set((p || []).filter(x => x.completed).map(x => x.lesson_id));
        const flat = (c.sections || []).slice().sort(byOrder).flatMap(s => (s.lessons || []).slice().sort(byOrder));
        const doneCount = flat.filter(l => doneIds.has(l.id)).length;
        const next = flat.find(l => !doneIds.has(l.id)) || null; // where "continue" will land
        return { ...c, doneCount, total: flat.length, next, progress: flat.length ? Math.round((doneCount / flat.length) * 100) : 0 };
      }));
      if (cancelled) return;
      setEnrolled(withProgress);
      const { count } = await supabase.from('project_submissions').select('id', { count: 'exact', head: true }).eq('student_id', user.id);
      if (cancelled) return;
      setProjects(count || 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user.id, reloadKey]);

  const name = user?.user_metadata?.full_name;
  return (
    <section className="section dashboard-page">
      <div className="container">
        <div className="dashboard-head">
          <div>
            <span className="eyebrow">مساحتي</span>
            <h1>أهلاً، {name || 'بك'} 👋</h1>
            <p>كمّل خطوتك التالية، ومتوقفش عند المشاهدة.</p>
          </div>
          <Link to="/courses"><Button variant="outline">اكتشف كورسات <ArrowLeft /></Button></Link>
        </div>

        <div className="dashboard-stats">
          <Stat icon={BookOpen} label="الكورسات" value={enrolled.length} />
          <Stat icon={CheckCircle2} label="الدروس المكتملة" value={enrolled.reduce((n, c) => n + (c.doneCount || 0), 0)} />
          <Stat icon={Clock3} label="كورسات مكتملة" value={enrolled.filter(c => c.progress === 100).length} />
          <Stat icon={Trophy} label="مشاريع مُسلَّمة" value={projects} />
        </div>

        <div className="dashboard-grid">
          <div className="panel">
            <div className="panel-head"><h2>كمّل التعلم</h2><Link to="/courses">كل الكورسات</Link></div>
            {loading ? <p>جاري التحميل...</p>
              : error ? <RetryBox title="تعذر تحميل كورساتك" message={error} onRetry={() => setReloadKey(k => k + 1)} />
              : enrolled.length ? enrolled.map(c => (
                <div className="progress-course" key={c.id}>
                  <img src={c.thumbnail_url || c.thumbnail || '/zad-icon.svg'} alt="" />
                  <div className="pc-info">
                    <div><strong>{c.title}</strong><span>{c.progress}% مكتمل</span></div>
                    <div className="progress"><i style={{ width: `${c.progress}%` }} /></div>
                    {c.next && <p className="pc-next">الدرس التالي: {c.next.title}</p>}
                    <Link className="text-link" to={`/learn/${c.slug}`}>
                      {c.progress === 100 ? 'راجع الكورس' : c.doneCount ? 'كمّل من حيث توقفت' : 'ابدأ الكورس'} <ArrowLeft size={15} />
                    </Link>
                  </div>
                </div>
              ))
              : <div className="empty-state"><h3>لسه مشتركتش في كورس</h3><Link to="/courses"><Button>اكتشف الكورسات</Button></Link></div>}
          </div>
          <div className="panel profile-mini">
            <div className="avatar"><UserRound /></div>
            <h3>{name || 'طالب زاد'}</h3>
            <p>{user?.email}</p>
            <div className="mini-line"><span>نوع الحساب</span><strong>طالب</strong></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value }) {
  return <div className="dash-stat"><Icon /><div><strong>{value}</strong><span>{label}</span></div></div>;
}
