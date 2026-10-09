import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, CheckCircle2, ChevronDown, Circle, LockKeyhole, PlayCircle, Menu, X, Code2 } from 'lucide-react';
import ProjectBox from '../components/ProjectBox';
import RetryBox from '../components/RetryBox';
import Button from '../components/Button';
import { supabase } from '../lib/supabase';

const AUTO_NEXT_SECONDS = 8;
const byOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);
const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width:1025px)').matches;
const minutes = sec => (sec ? `${Math.max(1, Math.round(sec / 60))} د` : '');

// Same top bar for every state (loading, error, player) so there is always a way back.
function Shell({ title, children, bar }) {
  return (
    <section className="learning-page">
      <header className="learning-top">
        <div className="learning-top-inner">
          <Link className="lt-back" to="/dashboard"><ArrowRight size={18} /><span>لوحة الطالب</span></Link>
          <p className="lt-title">{title}</p>
          {bar}
        </div>
      </header>
      {children}
    </section>
  );
}

export default function Learning({ user }) {
  const { slug } = useParams();
  const [course, setCourse] = React.useState(null);
  const [error, setError] = React.useState('');
  const [reloadKey, setReloadKey] = React.useState(0);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [done, setDone] = React.useState([]);
  const [side, setSide] = React.useState(isDesktop);
  const [openMap, setOpenMap] = React.useState({});
  const [showProject, setShowProject] = React.useState(false);
  const [saveError, setSaveError] = React.useState('');
  const [auto, setAuto] = React.useState(null); // { seconds } while counting down to the next lesson

  // ---- load course, access check and progress
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(''); setCourse(null);
      if (!supabase) { setError('لم يتم ربط Supabase.'); return; }
      const { data, error: e } = await supabase
        .from('courses')
        .select('*,sections(id,title,sort_order,lessons(id,title,description,video_id,video_provider,is_preview,duration_seconds,sort_order,lesson_questions(id,question,options,correct_index,explanation,sort_order)))')
        .eq('slug', slug).single();
      if (cancelled) return;
      if (e) { setError(e.code === 'PGRST116' ? 'NOT_FOUND' : e.message); return; }

      const { data: adm } = await supabase.rpc('is_admin');
      if (!adm) {
        const { data: en } = await supabase.from('enrollments').select('id').eq('student_id', user.id).eq('course_id', data.id).eq('status', 'active').maybeSingle();
        if (cancelled) return;
        if (!en) { setError('NOT_ENROLLED'); return; }
      }

      // Sort once (without mutating) so every part of the page sees the same order.
      const sections = (data.sections || []).slice().sort(byOrder).map(s => ({
        ...s,
        lessons: (s.lessons || []).slice().sort(byOrder).map(l => ({ ...l, lesson_questions: (l.lesson_questions || []).slice().sort(byOrder) }))
      }));
      const flat = sections.flatMap(s => s.lessons);
      let doneIds = [];
      if (flat.length) {
        const { data: p } = await supabase.from('lesson_progress').select('lesson_id,completed').eq('student_id', user.id).in('lesson_id', flat.map(x => x.id));
        doneIds = (p || []).filter(x => x.completed).map(x => x.lesson_id);
      }
      if (cancelled) return;
      // Resume: open the first lesson the student has not finished yet.
      const firstTodo = flat.findIndex(l => !doneIds.includes(l.id));
      setIsAdmin(!!adm);
      setDone(doneIds);
      setActive(firstTodo === -1 ? Math.max(0, flat.length - 1) : firstTodo);
      setCourse({ ...data, sections });
    })();
    return () => { cancelled = true; };
  }, [slug, user.id, reloadKey]);

  const lessons = React.useMemo(
    () => (course ? course.sections.flatMap(s => s.lessons.map(l => ({ ...l, section: s.title, sectionId: s.id }))) : []),
    [course]
  );
  const current = lessons[active] || lessons[0];
  const firstTodo = lessons.findIndex(l => !done.includes(l.id));
  const unlockedUpTo = firstTodo === -1 ? lessons.length : firstTodo;
  const isLocked = (l, idx) => !(isAdmin || l.is_preview || done.includes(l.id) || idx <= unlockedUpTo);
  const percent = lessons.length ? Math.round((done.filter(id => lessons.some(l => l.id === id)).length / lessons.length) * 100) : 0;

  // ---- navigation helpers
  const closeDrawer = () => { if (!isDesktop()) setSide(false); };
  const select = idx => {
    setAuto(null); setShowProject(false); setActive(idx); closeDrawer();
  };
  const goNext = () => {
    setAuto(null);
    if (active < lessons.length - 1) setActive(active + 1);
  };
  React.useEffect(() => { window.scrollTo({ top: 0 }); }, [active, showProject]);
  React.useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') closeDrawer(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---- saving progress
  const markDone = async lessonId => {
    if (done.includes(lessonId)) return true;
    setSaveError('');
    setDone(d => [...d, lessonId]);
    if (!supabase) return true;
    const { error: e } = await supabase.from('lesson_progress').upsert(
      { student_id: user.id, lesson_id: lessonId, completed: true, updated_at: new Date().toISOString() },
      { onConflict: 'student_id,lesson_id' }
    );
    if (e) {
      setDone(d => d.filter(x => x !== lessonId));
      setSaveError('تعذر حفظ تقدمك. تأكد من الاتصال وحاول مرة أخرى.');
      return false;
    }
    return true;
  };
  const completeAndNext = async () => {
    if (!(await markDone(current.id))) return;
    goNext();
  };
  // Called by the quiz once the answers are checked: save the lesson, then count down to the next one.
  const onQuizChecked = async () => {
    const ok = await markDone(current.id);
    if (ok && active < lessons.length - 1) setAuto({ seconds: AUTO_NEXT_SECONDS });
  };
  React.useEffect(() => {
    if (!auto) return undefined;
    if (auto.seconds <= 0) { goNext(); return undefined; }
    const t = setTimeout(() => setAuto(a => (a ? { seconds: a.seconds - 1 } : a)), 1000);
    return () => clearTimeout(t);
  }, [auto]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- loading / error states
  if (error === 'NOT_ENROLLED') {
    return <Shell title="الكورس"><div className="empty-state"><h3>أنت غير مشترك في هذا الكورس</h3><p>اشترك أولًا ليتم تفعيل الدروس لك.</p><Link to={`/courses/${slug}`}><Button>تفاصيل الكورس</Button></Link></div></Shell>;
  }
  if (error === 'NOT_FOUND') {
    return <Shell title="الكورس"><div className="empty-state"><h3>الكورس غير موجود</h3><Link to="/courses"><Button>كل الكورسات</Button></Link></div></Shell>;
  }
  if (error) {
    return <Shell title="الكورس"><RetryBox title="تعذر تحميل الكورس" message={error} onRetry={() => setReloadKey(k => k + 1)} /></Shell>;
  }
  if (!course) {
    return <Shell title="جاري التحميل..."><div className="empty-state"><div className="loader" style={{ margin: '0 auto 12px' }} /><h3>جاري تحميل الدروس...</h3></div></Shell>;
  }
  if (!current) {
    return <Shell title={course.title}><div className="empty-state"><h3>لا توجد دروس بعد</h3><p>سيتم إضافة المحتوى قريبًا.</p></div></Shell>;
  }

  const isLast = active === lessons.length - 1;
  const currentDone = done.includes(current.id);
  const bar = (
    <>
      <div className="lt-progress"><div className="lt-bar" aria-hidden="true"><i style={{ width: `${percent}%` }} /></div><span>{percent}%</span></div>
      <button className="lt-toggle" onClick={() => setSide(s => !s)} aria-expanded={side}><Menu size={18} /><span>المحتوى</span></button>
    </>
  );

  return (
    <Shell title={course.title} bar={bar}>
      <div className={`learning-layout ${side ? '' : 'no-side'}`}>
        <aside className={`lesson-sidebar ${side ? 'show' : ''}`} aria-label="محتوى الكورس">
          <div className="sb-head">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span>محتوى الكورس</span>
              <button className="sb-close" onClick={() => setSide(false)} aria-label="إغلاق"><X size={20} /></button>
            </div>
            <strong>{course.title}</strong>
            <div className="sb-meter"><i style={{ width: `${percent}%` }} /></div>
            <small>{done.length} من {lessons.length} درس مكتمل</small>
          </div>

          {course.sections.map(s => {
            const doneInSection = s.lessons.filter(l => done.includes(l.id)).length;
            const open = openMap[s.id] ?? s.lessons.some(l => l.id === current.id);
            return (
              <div className={`lesson-group ${open ? '' : 'collapsed'}`} key={s.id}>
                <button className="group-title" onClick={() => setOpenMap(m => ({ ...m, [s.id]: !open }))} aria-expanded={open}>
                  <span>{s.title}</span><small>{doneInSection}/{s.lessons.length}</small><ChevronDown size={16} />
                </button>
                <div className="group-lessons">
                  {s.lessons.map(l => {
                    const idx = lessons.findIndex(x => x.id === l.id);
                    const isDone = done.includes(l.id);
                    const locked = isLocked(l, idx);
                    const isActive = !showProject && idx === active;
                    const Icon = isDone ? CheckCircle2 : locked ? LockKeyhole : isActive ? PlayCircle : Circle;
                    return (
                      <button
                        key={l.id}
                        className={`lesson-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''} ${locked ? 'locked' : ''}`}
                        disabled={locked}
                        aria-current={isActive ? 'true' : undefined}
                        onClick={() => select(idx)}
                      >
                        <span className="li-icon"><Icon /></span>
                        <span className="li-text">{l.title}</span>
                        <span className="li-dur">{minutes(l.duration_seconds)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {course.project_brief && (
            <button className={`lesson-item project-item ${showProject ? 'active' : ''}`} onClick={() => { setShowProject(true); closeDrawer(); }}>
              <span className="li-icon"><Code2 /></span>
              <span className="li-text">{course.project_title || 'المشروع التطبيقي'}</span>
            </button>
          )}
        </aside>
        <div className={`sb-backdrop ${side ? 'show' : ''}`} onClick={() => setSide(false)} aria-hidden="true" />

        <main className="lesson-content">
          {showProject ? (
            <ProjectBox course={course} user={user} onBack={() => setShowProject(false)} />
          ) : (
            <>
              <div className="video-wrap">
                {current.video_id ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${current.video_id}?rel=0`}
                    title={current.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="empty-video"><PlayCircle /><span>لم يتم إضافة فيديو لهذا الدرس بعد.</span></div>
                )}
              </div>

              <div className="lesson-heading">
                <span className="eyebrow">{current.section}</span>
                <h1>{current.title}</h1>
                <p>{current.description || 'شاهد الدرس ثم نفّذ التمرين قبل الانتقال للخطوة التالية.'}</p>
              </div>

              {current.lesson_questions.length > 0 && <Quiz key={current.id} questions={current.lesson_questions} onChecked={onQuizChecked} />}

              {auto && (
                <div className="next-banner" role="status">
                  <p>تم حفظ الدرس كمكتمل. هننقلك للدرس التالي خلال {auto.seconds} ثانية.</p>
                  <div>
                    <Button onClick={goNext}>انتقل الآن</Button>
                    <Button variant="outline" onClick={() => setAuto(null)}>ابقَ هنا</Button>
                  </div>
                </div>
              )}

              <div className="practice-box">
                <Code2 size={22} />
                <div>
                  <span className="eyebrow">بعد الدرس</span>
                  <h3>طبّق بإيدك</h3>
                  <p>اكتب مثالًا صغيرًا يستخدم الفكرة التي تعلمتها قبل ما تنتقل للدرس التالي.</p>
                </div>
              </div>

              {saveError && <p className="lesson-note" role="alert">{saveError}</p>}

              <div className="lesson-bar">
                <Button variant="outline" className="btn-prev" disabled={active === 0} onClick={() => select(active - 1)}><ArrowRight size={18} /><span>السابق</span></Button>
                {isLast && currentDone ? (
                  course.project_brief
                    ? <Button className="btn-next" onClick={() => setShowProject(true)}>انتقل للمشروع <ArrowLeft size={18} /></Button>
                    : <Link to="/dashboard" className="btn-next"><Button className="full-btn">أنهيت الكورس — لوحة الطالب</Button></Link>
                ) : (
                  <Button className="btn-next" onClick={currentDone ? goNext : completeAndNext}>
                    {currentDone ? 'الدرس التالي' : isLast ? 'إنهاء الكورس' : 'تم الدرس، التالي'} <ArrowLeft size={18} />
                  </Button>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </Shell>
  );
}

function Quiz({ questions, onChecked }) {
  const [ans, setAns] = React.useState({});
  const [shown, setShown] = React.useState(false);
  const score = questions.filter(q => ans[q.id] === q.correct_index).length;
  const check = () => { setShown(true); onChecked?.(score, questions.length); };
  return (
    <div className="quiz-box">
      <div><span className="eyebrow">اختبر نفسك</span><h3>أسئلة الدرس</h3></div>
      {questions.map((q, i) => (
        <div className="quiz-q" key={q.id}>
          <p><b>{i + 1}.</b> {q.question}</p>
          {(q.options || []).map((o, j) => {
            const st = shown ? (j === q.correct_index ? 'right' : ans[q.id] === j ? 'wrong' : '') : (ans[q.id] === j ? 'picked' : '');
            return <button key={j} className={`quiz-opt ${st}`} disabled={shown} onClick={() => setAns(a => ({ ...a, [q.id]: j }))}>{o}</button>;
          })}
          {shown && q.explanation && <small className="quiz-exp">{q.explanation}</small>}
        </div>
      ))}
      {shown ? (
        <div className="quiz-score">نتيجتك: {score} من {questions.length}<button onClick={() => { setAns({}); setShown(false); }}>إعادة المحاولة</button></div>
      ) : (
        <Button disabled={Object.keys(ans).length < questions.length} onClick={check}>تصحيح الإجابات</Button>
      )}
    </div>
  );
}
