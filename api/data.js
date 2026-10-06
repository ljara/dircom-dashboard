// api/data.js — Vercel Serverless Function
// Actúa como intermediario entre el dashboard y Supabase
// Las credenciales nunca llegan al browser

import { timingSafeEqual } from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const headers = {
  'Content-Type':  'application/json',
  'apikey':        SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Prefer':        'return=representation'
};

async function sbGet(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers });
  if (!res.ok) throw new Error(`Error leyendo ${table}: ${res.statusText}`);
  return res.json();
}

async function sbPost(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST', headers, body: JSON.stringify(body)
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || res.statusText); }
  return res.json();
}

async function sbPatch(table, id, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH', headers, body: JSON.stringify(body)
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || res.statusText); }
  return res.json();
}

async function sbPatchWhere(table, where, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${where}`, {
    method: 'PATCH', headers, body: JSON.stringify(body)
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || res.statusText); }
  return res.json();
}

// Registra la fecha de término (completed_at) según el estado de la tarea:
// - al pasar a 'done' se fija ahora, solo si no tenía (editar una tarea completada no la cambia)
// - al volver a un estado pendiente se borra
// - al archivar no se toca
async function syncCompletedAt(id, status) {
  if (status === 'done') {
    await sbPatchWhere('tareas', `id=eq.${id}&completed_at=is.null`, { completed_at: new Date().toISOString() });
  } else if (status && status !== 'archivada') {
    await sbPatchWhere('tareas', `id=eq.${id}&completed_at=not.is.null`, { completed_at: null });
  }
}

async function sbDelete(table, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'DELETE', headers
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || res.statusText); }
  return true;
}

async function sbDeleteWhere(table, where) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${where}`, {
    method: 'DELETE', headers
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || res.statusText); }
  return true;
}

// ── Rol según el enlace ────────────────────────────────────
// La directora entra con ?k=<DIRECTORA_KEY>; cada coordinación con ?coord=<id> y solo recibe sus tareas.
function esClaveDirectora(key) {
  const secreto = process.env.DIRECTORA_KEY;
  if (!secreto || typeof key !== 'string') return false;
  const a = Buffer.from(key), b = Buffer.from(secreto);
  return a.length === b.length && timingSafeEqual(a, b);
}

function resolverAcceso(key, coord) {
  if (esClaveDirectora(key)) return { rol: 'directora', coord: null };
  if (coord) return { rol: 'coordinacion', coord: String(coord) };
  return null;
}

export default async function handler(req, res) {
  // CORS — solo permite origen del dashboard
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { action, data, key, coord } = req.method === 'GET'
      ? { action: req.query.action, data: req.query.data ? JSON.parse(req.query.data) : null,
          key: req.query.k, coord: req.query.coord }
      : req.body;

    const acceso = resolverAcceso(key, coord);
    if (!acceso) return res.status(403).json({ error: 'Acceso no autorizado: usa el enlace entregado a tu coordinación' });

    switch (action) {

      case 'getAll': {
        // Una coordinación solo recibe sus propias tareas
        const filtroTareas = acceso.coord ? `coord_id=eq.${encodeURIComponent(acceso.coord)}&` : '';
        const [coords, personas, tareas, opcRows] = await Promise.all([
          sbGet('coordinaciones', 'order=created_at'),
          sbGet('personas',       'order=nombre'),
          sbGet('tareas',         filtroTareas + 'order=created_at.desc'),
          sbGet('opciones',       'order=tipo,orden')
        ]);
        const opciones = {};
        opcRows.forEach(o => {
          if (!opciones[o.tipo]) opciones[o.tipo] = [];
          opciones[o.tipo].push(o.valor);
        });
        return res.json({ rol: acceso.rol, coordinaciones: coords, personas, tareas, opciones });
      }

      case 'addTarea': {
        const id = 't' + Date.now();
        const { completed_at, ...body } = data;   // completed_at lo gestiona el servidor
        if (body.status === 'done') body.completed_at = new Date().toISOString();
        const result = await sbPost('tareas', { id, ...body });
        return res.json({ ok: true, id, data: result });
      }

      case 'updateTarea': {
        const { id, completed_at, ...body } = data;
        await sbPatch('tareas', id, body);
        await syncCompletedAt(id, body.status);
        return res.json({ ok: true });
      }

      case 'deleteTarea': {
        await sbDelete('tareas', data.id);
        return res.json({ ok: true });
      }

      case 'addPersona': {
        const id = 'p' + Date.now();
        const result = await sbPost('personas', { id, ...data });
        return res.json({ ok: true, id, data: result });
      }

      case 'updatePersona': {
        const { id, ...body } = data;
        await sbPatch('personas', id, body);
        return res.json({ ok: true });
      }

      case 'deletePersona': {
        await sbDelete('personas', data.id);
        return res.json({ ok: true });
      }

      case 'addCoordinacion': {
        const result = await sbPost('coordinaciones', data);
        return res.json({ ok: true, data: result });
      }

      case 'deleteCoordinacion': {
        await sbDelete('coordinaciones', data.id);
        return res.json({ ok: true });
      }

      case 'addOpcion': {
        const result = await sbPost('opciones', data);
        return res.json({ ok: true, data: result });
      }

      case 'deleteOpcion': {
        await sbDeleteWhere('opciones',
          `tipo=eq.${encodeURIComponent(data.tipo)}&valor=eq.${encodeURIComponent(data.valor)}`
        );
        return res.json({ ok: true });
      }

      default:
        return res.status(400).json({ error: 'Acción no reconocida: ' + action });
    }

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
