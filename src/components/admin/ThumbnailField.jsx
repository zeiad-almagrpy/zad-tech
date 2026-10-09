import React from 'react';
import { ImagePlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ThumbnailField({ value, onChange }) {
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setErr('اختر ملف صورة فقط');
    if (file.size > 3 * 1024 * 1024) return setErr('الحد الأقصى لحجم الصورة 3MB');
    setBusy(true); setErr('');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('course-thumbnails').upload(path, file, { cacheControl: '31536000', contentType: file.type });
    if (error) setErr(error.message);
    else onChange(supabase.storage.from('course-thumbnails').getPublicUrl(path).data.publicUrl);
    setBusy(false);
  }

  return <div className="thumb-field">
    <span className="thumb-label">صورة الكورس</span>
    <div className="thumb-row">
      <img src={value || '/zad-icon.svg'} alt="" />
      <div className="thumb-actions">
        <label className="btn btn-outline thumb-btn">
          <ImagePlus size={18} /> {busy ? 'جاري الرفع...' : 'رفع صورة'}
          <input type="file" accept="image/*" hidden disabled={busy} onChange={pick} />
        </label>
        <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="أو الصق رابط الصورة https://..." />
      </div>
    </div>
    {err && <div className="form-error">{err}</div>}
  </div>;
}
