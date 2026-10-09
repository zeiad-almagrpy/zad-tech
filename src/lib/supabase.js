import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;
export const isDemoMode = !supabase;

// Pass the user id when you already have it: it saves a network call and,
// importantly, is safe to use from inside onAuthStateChange.
export async function getCurrentProfile(userId) {
  if (!supabase) return null;
  let id = userId;
  if (!id) {
    const { data: { user } } = await supabase.auth.getUser();
    id = user?.id;
  }
  if (!id) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}
export async function signOut() { if (supabase) await supabase.auth.signOut(); }
