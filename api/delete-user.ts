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

  try {
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

    const { userId } = req.body ?? {};
    if (typeof userId !== 'string' || !userId.trim()) {
      return res.status(400).json({ message: 'ID pengguna tidak valid.' });
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
      return res.status(403).json({ message: 'Anda tidak memiliki akses untuk menghapus pengguna.' });
    }

    const { data: target, error: targetError } = await adminClient
      .from('users')
      .select('auth_id')
      .eq('id', userId)
      .maybeSingle();

    if (targetError) {
      return res.status(500).json({ message: targetError.message });
    }
    if (!target) {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
    }
    if (target.auth_id === callerAuth.user.id) {
      return res.status(400).json({ message: 'Akun yang sedang digunakan tidak dapat dihapus.' });
    }

    if (target.auth_id) {
      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(target.auth_id);
      if (authDeleteError) {
        return res.status(409).json({ message: authDeleteError.message });
      }
    }

    const { error: profileDeleteError } = await adminClient.from('users').delete().eq('id', userId);
    if (profileDeleteError) {
      return res.status(500).json({
        message: `Akun autentikasi telah dihapus, tetapi data profil gagal dibersihkan: ${profileDeleteError.message}`,
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('delete-user API error:', error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
          ? error.message
          : 'Terjadi kesalahan server saat menghapus pengguna.';
    return res.status(500).json({ message });
  }
}
