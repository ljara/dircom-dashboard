// api/keepalive.js — Vercel Cron Job
// Hace una consulta mínima a Supabase una vez al día para que el proyecto
// (plan gratuito) no se pause por inactividad. Programado en vercel.json.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  // Si existe CRON_SECRET, Vercel lo envía como "Bearer <secreto>"; así solo el cron puede llamarlo
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.authorization !== `Bearer ${secreto}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/coordinaciones?select=id&limit=1`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    if (!r.ok) throw new Error(`Supabase respondió ${r.status} ${r.statusText}`);
    return res.json({ ok: true, fecha: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
