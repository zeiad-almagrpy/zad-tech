import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Home from './pages/Home';
import Courses from './pages/Courses';
import CourseDetails from './pages/CourseDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Learning from './pages/Learning';
import Checkout from './pages/Checkout';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import { supabase, getCurrentProfile } from './lib/supabase';

// The admin area is rarely opened, so it loads on demand and keeps the first download small.
const Admin = React.lazy(() => import('./pages/Admin'));

function Splash({ text = 'جاري تجهيز زاد...' }) {
  return <div className="loading-screen"><div className="loader" /><span>{text}</span></div>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  const [user, setUser] = React.useState(null);
  // undefined = still loading, null = no profile, object = loaded
  const [profile, setProfile] = React.useState(undefined);
  const [loading, setLoading] = React.useState(true);
  const userIdRef = React.useRef(null);

  React.useEffect(() => {
    let mounted = true;
    let subscription;

    const loadProfile = async (u) => {
      if (!u) { if (mounted) setProfile(null); return; }
      try {
        const p = await getCurrentProfile(u.id);
        if (mounted) setProfile(p);
      } catch {
        if (mounted) setProfile(null);
      }
    };

    const init = async () => {
      if (!supabase) { setLoading(false); return; }
      try {
        // Never leave the splash screen forever if the network or Supabase is slow.
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase session timeout')), 10000));
        const { data } = await Promise.race([supabase.auth.getSession(), timeout]);
        const sessionUser = data.session?.user || null;
        userIdRef.current = sessionUser?.id || null;
        if (mounted) setUser(sessionUser);
        await loadProfile(sessionUser);
      } catch (error) {
        console.warn('Zad: could not read the session.', error);
        if (mounted) setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }

      // Important: do not await other Supabase calls inside this callback — it can deadlock.
      // We hand the work to setTimeout so the callback returns immediately.
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        const next = session?.user || null;
        if (next && next.id !== userIdRef.current) setProfile(undefined); // a different person signed in: wait for their profile
        userIdRef.current = next?.id || null;
        setUser(prev => (prev?.id === next?.id ? prev : next));
        setTimeout(() => loadProfile(next), 0);
      });
      subscription = listener?.subscription;
    };

    init();
    return () => { mounted = false; subscription?.unsubscribe(); };
  }, []);

  if (loading) return <Splash />;

  const adminRoute = () => {
    if (!user) return <Navigate to="/login" />;
    if (profile === undefined) return <Splash text="جاري التحقق من الصلاحيات..." />;
    if (profile?.role !== 'admin') return <Navigate to="/dashboard" />;
    return <React.Suspense fallback={<Splash text="جاري تحميل لوحة الإدارة..." />}><Admin /></React.Suspense>;
  };

  return (
    <AppLayout user={user} profile={profile}>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:slug" element={<CourseDetails user={user} />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
        <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
        <Route path="/learn/:slug" element={user ? <Learning user={user} /> : <Navigate to="/login" />} />
        <Route path="/checkout/:slug" element={user ? <Checkout user={user} /> : <Navigate to="/login" />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/admin" element={adminRoute()} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}
