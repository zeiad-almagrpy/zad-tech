import React from 'react';
import { ArrowLeft, CheckCircle2, Code2, Layers3, Rocket, Sparkles, Users, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import RetryBox from '../components/RetryBox';
import SectionTitle from '../components/SectionTitle';
import CourseCard from '../components/CourseCard';
import Button from '../components/Button';
import { supabase } from '../lib/supabase';
import { CATALOG_SELECT, normalizeCourse } from '../lib/courses';

export default function Home() {
  const [courses, setCourses] = React.useState([]);
  const [loaded, setLoaded] = React.useState(!supabase);
  const [failed, setFailed] = React.useState('');
  const [reloadKey, setReloadKey] = React.useState(0);
  React.useEffect(() => {
    if (!supabase) return;
    setLoaded(false); setFailed('');
    supabase.from('courses').select(CATALOG_SELECT).eq('status', 'published').order('created_at', { ascending: false }).limit(3)
      .then(({ data, error }) => { if (error) { console.error(error); setFailed(error.message); } setCourses((data || []).map(normalizeCourse)); setLoaded(true); });
  }, [reloadKey]);
  return <>
    <section className="hero"><div className="container hero-grid"><div className="hero-copy"><div className="hero-kicker"><Sparkles size={15}/> تعلم. طبّق. ابنِ.</div><h1>خد <span>زادك</span> وابدأ رحلتك في البرمجة.</h1><p>منهج عملي، شرح واضح، أسئلة ومشاريع حقيقية تساعدك تنتقل من مشاهدة المحتوى إلى بناء شيء تفتخر به.</p><div className="hero-actions"><Link to="/courses"><Button>استكشف الكورسات <ArrowLeft size={18}/></Button></Link><Link to="/about" className="ghost-action"><Play size={18}/> كيف تعمل زاد؟</Link></div><div className="hero-trust"><span><CheckCircle2 size={17}/> مسارات عملية</span><span><CheckCircle2 size={17}/> مشاريع تطبيقية</span><span><CheckCircle2 size={17}/> تعلم على خطتك</span></div></div><div className="hero-card"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-symbol"><span className="big-z">Z</span><i className="dot dot-teal"/><i className="dot dot-amber"/></div><div className="floating-card fc-top"><Code2 size={20}/><div><strong>Build mindset</strong><span>تعلم بالممارسة</span></div></div><div className="floating-card fc-bottom"><Rocket size={20}/><div><strong>Next step</strong><span>مشروع حقيقي</span></div></div></div></div></section>
    <section className="section"><div className="container"><SectionTitle eyebrow="لماذا زاد؟" title="مش مجرد فيديوهات." description="كل درس مصمم ليقربك خطوة من القدرة على البناء بنفسك."/><div className="feature-grid">{[[Layers3,'تعلم منظم','مسارات واضحة بدل التنقل العشوائي بين المصادر.'],[Code2,'تطبيق عملي','أسئلة وتمارين ومشاريع بعد الشرح.'],[Rocket,'ابنِ Portfolio','كل مشروع ممكن يتحول لقطعة حقيقية في معرض أعمالك.']].map(([Icon,title,desc])=><div className="feature" key={title}><div className="feature-icon"><Icon/></div><h3>{title}</h3><p>{desc}</p></div>)}</div></div></section>
    <section className="section section-soft"><div className="container"><SectionTitle eyebrow="ابدأ من هنا" title="مسارات صُممت للمبتدئ والمطور الطموح." description="اختار المستوى المناسب وابدأ بخطوة واضحة." action={<Link className="text-link" to="/courses">كل الكورسات <ArrowLeft size={16}/></Link>}/>{courses.length?<div className="course-grid">{courses.map(c=><CourseCard key={c.id} course={c}/>)}</div>:failed?<RetryBox title="تعذر تحميل الكورسات" message={failed} onRetry={()=>setReloadKey(k=>k+1)}/>:<div className="empty-state"><h3>{loaded?'الكورسات قادمة قريبًا':'جاري تحميل الكورسات...'}</h3></div>}</div></section>
    <section className="section"><div className="container journey"><div><span className="eyebrow">رحلتك</span><h2>من أول سطر كود إلى أول مشروع.</h2><p>هدف زاد مش إنك تخلص كورس؛ الهدف إنك تخرج فاهم، مطبق، وقادر تكمل لوحدك.</p><Link to="/courses"><Button>ابدأ رحلتك</Button></Link></div><div className="journey-steps">{['افهم الأساس','طبّق بإيدك','اختبر نفسك','ابنِ مشروعك'].map((x,i)=><div className="journey-step" key={x}><span>0{i+1}</span><strong>{x}</strong></div>)}</div></div></section>
    <section className="cta-section"><div className="container cta"><div><span className="eyebrow">زادك في الرحلة</span><h2>جاهز تبدأ؟</h2><p>اختار أول كورس وخلي أول خطوة النهارده.</p></div><Link to="/courses"><Button variant="light">شوف الكورسات <ArrowLeft size={18}/></Button></Link></div></section>
  </>;
}
