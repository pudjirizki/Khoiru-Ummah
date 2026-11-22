import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return res.status(500).json({ message: 'Konfigurasi server Supabase belum lengkap.' });
  }

  const { authorization } = req.headers;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Sesi login tidak ditemukan.' });
  }

  const accessToken = authorization.slice('Bearer '.length);
  const callerClient = createClient(supabaseUrl, anonKey);
  const { data: callerAuth, error: callerAuthError } = await callerClient.auth.getUser(accessToken);

  if (callerAuthError || !callerAuth.user) {
    return res.status(401).json({ message: 'Sesi login tidak valid.' });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: caller, error: callerError } = await adminClient
    .from('users')
    .select('role, status')
    .eq('auth_id', callerAuth.user.id)
    .maybeSingle();

  if (callerError) {
    return res.status(500).json({ message: callerError.message });
  }

  if (caller?.role !== 'admin' || caller.status !== 'active') {
    return res.status(403).json({ message: 'Anda tidak memiliki akses untuk menambah pengguna.' });
  }

  const { name, phoneNumber, role, email, password, status } = req.body ?? {};
  const sanitizedName = typeof name === 'string' ? name.trim() : '';
  const sanitizedEmail = String(email ?? '').trim();
  const normalizedRole = role === 'admin' || role === 'teacher' || role === 'parent' ? role : null;
  const normalizedStatus = status === 'inactive' ? 'inactive' : status === 'active' ? 'active' : null;

  if (!sanitizedName || !normalizedRole || !sanitizedEmail || typeof password !== 'string' || password.length < 6 || !normalizedStatus) {
    return res.status(400).json({ message: 'Data pengguna belum lengkap.' });
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: sanitizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      name: sanitizedName,
      name_lowercase: sanitizedName.toLowerCase(),
      phone_number: String(phoneNumber || ''),
      role: normalizedRole,
      status: normalizedStatus,
    },
  });

  if (createError || !created.user) {
    return res.status(400).json({
      message: createError?.message || 'Pengguna gagal dibuat.',
    });
  }

  const { error: upsertError } = await adminClient.from('users').upsert(
    {
      auth_id: created.user.id,
      name: sanitizedName,
      name_lowercase: sanitizedName.toLowerCase(),
      phone_number: String(phoneNumber || ''),
      role: normalizedRole,
      email: sanitizedEmail,
      status: normalizedStatus,
    },
    { onConflict: 'auth_id' }
  );

  if (upsertError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    return res.status(400).json({ message: upsertError.message });
  }

  return res.status(200).json({ id: created.user.id });
}
