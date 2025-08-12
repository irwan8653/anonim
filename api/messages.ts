import type { VercelRequest, VercelResponse } from '@vercel/node';

// Contoh endpoint GET/POST sederhana
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // nanti ganti ambil dari DB
    return res.status(200).json({ items: [] });
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as Record<string, unknown>;
    // TODO: simpan ke DB (Supabase, dsb.)
    return res.status(201).json({ saved: body });
  }

  res.setHeader('Allow', 'GET,POST');
  return res.status(405).end('Method Not Allowed');
}
