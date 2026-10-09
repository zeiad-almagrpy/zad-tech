import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Logo from '../components/Logo';

const EMAIL = import.meta.env.VITE_CONTACT_EMAIL || '';
const WA = import.meta.env.VITE_WHATSAPP_NUMBER || '';

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div><Logo /><p>زاد — زادك في رحلة التعلم والبناء والنمو.</p></div>
        <div>
          <h4>روابط</h4>
          <Link to="/courses">الكورسات</Link>
          <Link to="/about">عن زاد</Link>
          <Link to="/contact">تواصل معنا</Link>
        </div>
        <div>
          <h4>التعلم</h4>
          <Link to="/courses?category=Frontend">Frontend</Link>
          <Link to="/courses?category=JavaScript">JavaScript</Link>
          <Link to="/courses?category=React">React</Link>
        </div>
        <div>
          <h4>تواصل</h4>
          {EMAIL && <p>{EMAIL}</p>}
          {WA && <a href={`https://wa.me/${WA}`} target="_blank" rel="noreferrer">واتساب</a>}
          <Link to="/contact">أرسل رسالة</Link>
        </div>
      </div>
      <div className="footer-bottom">© {new Date().getFullYear()} Zad. جميع الحقوق محفوظة.</div>
    </footer>
  );
}

export default function AppLayout({ children, user, profile }) {
  const { pathname } = useLocation();
  // The lesson player has its own top bar, so it hides the site navbar and footer.
  const player = pathname.startsWith('/learn/');
  const showFooter = !player && !pathname.startsWith('/admin');
  return (
    <div className="app-shell">
      {!player && <Navbar user={user} profile={profile} />}
      <main>{children}</main>
      {showFooter && <Footer />}
    </div>
  );
}
