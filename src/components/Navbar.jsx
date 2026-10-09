import React from 'react';
import { Menu, X, UserRound, LayoutDashboard, LogOut } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import Button from './Button';
import { signOut } from '../lib/supabase';

export default function Navbar({ user, profile }) {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const logout = async () => { setOpen(false); await signOut(); navigate('/'); };
  return <header className="navbar-wrap"><nav className="navbar container"><Link to="/" onClick={() => setOpen(false)}><Logo /></Link><div className={`nav-links ${open ? 'open' : ''}`}>
    <NavLink to="/courses" onClick={() => setOpen(false)}>الكورسات</NavLink>
    <NavLink to="/about" onClick={() => setOpen(false)}>عن زاد</NavLink>
    <NavLink to="/contact" onClick={() => setOpen(false)}>تواصل معنا</NavLink>
    {user ? <><NavLink to="/dashboard" onClick={() => setOpen(false)}>لوحة الطالب</NavLink>{profile?.role === 'admin' && <NavLink to="/admin" onClick={() => setOpen(false)}>الإدارة</NavLink>}<button className="nav-logout" onClick={logout}><LogOut size={16}/> خروج</button></> : <Link to="/login" className="nav-login" onClick={() => setOpen(false)}><UserRound size={16}/> دخول</Link>}
  </div><div className="nav-actions">{user ? <Link className="icon-btn" to="/dashboard" aria-label="لوحة الطالب"><LayoutDashboard size={19}/></Link> : <Link to="/login"><Button>ابدأ التعلم</Button></Link>}<button className="menu-btn" aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button></div></nav></header>;
}
