import React from 'react';
import { Mail, MessageCircle, Send } from 'lucide-react';
import Button from '../components/Button';
import { supabase } from '../lib/supabase';

const WA = import.meta.env.VITE_WHATSAPP_NUMBER || '';
const EMAIL = import.meta.env.VITE_CONTACT_EMAIL || '';

export default function Contact() {
  const [f, setF] = React.useState({ name: '', email: '', message: '', website: '' }); // website = honeypot ضد السبام
  const [state, setState] = React.useState('idle'); // idle | sending | sent
  const [error, setError] = React.useState('');
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));

  const submit = async e => {
    e.preventDefault(); setError('');
    if (f.website) return setState('sent'); // بوت
    const last = Number(localStorage.getItem('zad_contact_ts') || 0);
    if (Date.now() - last < 30000) return setError('استنى نصف دقيقة قبل إرسال رسالة تانية.');
    if (!supabase) return setError('النموذج غير متصل بالخادم حاليًا. تواصل معنا عبر واتساب.');
    setState('sending');
    const { error: err } = await supabase.from('contact_messages').insert({ name: f.name.trim(), email: f.email.trim(), message: f.message.trim() });
    if (err) { setState('idle'); return setError('تعذر الإرسال، حاول مرة أخرى أو راسلنا واتساب.'); }
    localStorage.setItem('zad_contact_ts', String(Date.now()));
    setState('sent'); setF({ name: '', email: '', message: '', website: '' });
  };

  return <section className="section"><div className="container contact-page">
    <div className="contact-intro"><span className="eyebrow">GET IN TOUCH</span><h1>خلينا نتكلم.</h1><p>عندك سؤال عن كورس، اقتراح، أو فكرة تعاون؟ ابعتلنا.</p>
      <div className="contact-methods">
        {EMAIL && <a href={`mailto:${EMAIL}`}><Mail /> {EMAIL}</a>}
        {WA && <a href={`https://wa.me/${WA}`} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a>}
      </div></div>
    <form className="contact-form" onSubmit={submit}>
      <label>الاسم<input required maxLength="120" value={f.name} onChange={e => set('name', e.target.value)} placeholder="اسمك" /></label>
      <label>البريد<input required type="email" maxLength="200" value={f.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" /></label>
      <label>رسالتك<textarea required rows="6" maxLength="4000" value={f.message} onChange={e => set('message', e.target.value)} placeholder="اكتب رسالتك..." /></label>
      <input className="hp-field" tabIndex="-1" autoComplete="off" value={f.website} onChange={e => set('website', e.target.value)} aria-hidden="true" />
      {error && <div className="form-error">{error}</div>}
      {state === 'sent' && <div className="success-note">وصلتنا رسالتك ✅ هنرد عليك قريبًا.</div>}
      <Button className="full-btn" disabled={state === 'sending'}>{state === 'sending' ? 'جاري الإرسال...' : 'إرسال الرسالة'} <Send /></Button>
    </form>
  </div></section>;
}
