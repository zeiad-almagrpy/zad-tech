import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, LockKeyhole, ShieldCheck } from 'lucide-react';
import Button from '../components/Button';
import Logo from '../components/Logo';
import { supabase } from '../lib/supabase';

export default function Login(){const [email,setEmail]=React.useState('');const [password,setPassword]=React.useState('');const [error,setError]=React.useState('');const nav=useNavigate();
 const submit=async e=>{e.preventDefault();setError('');if(!supabase){setError('لم يتم ربط Supabase.');return}const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setError(error.message);else nav('/dashboard');};
 return <AuthShell title="أهلاً بك في زاد" subtitle="كمل رحلتك من حيث توقفت."><form className="auth-form" onSubmit={submit}><label>البريد الإلكتروني<div className="input-icon"><Mail/><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></div></label><label>كلمة المرور<div className="input-icon"><LockKeyhole/><input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></div></label>{error&&<div className="form-error">{error}</div>}<Button className="full-btn">تسجيل الدخول</Button><p className="auth-switch">لسه جديد؟ <Link to="/register">اعمل حساب</Link></p></form></AuthShell>}

function AuthShell({title,subtitle,children}){return <section className="auth-page"><div className="auth-decoration"/><div className="auth-card"><Logo/><span className="eyebrow">ZAD ACADEMY</span><h1>{title}</h1><p>{subtitle}</p>{children}</div></section>}
export { AuthShell };
