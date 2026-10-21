// api/data.js — Vercel Serverless Function
// Actúa como intermediario entre el dashboard y Supabase
// Las credenciales nunca llegan al browser

import { timingSafeEqual, createHmac } from 'crypto';

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

// ── Sesión con Google (cuentas @ufrontera.cl) ──────────────
// El navegador envía el token de Google una vez (acción 'login'); el servidor lo verifica,
// busca a la persona por su correo en Equipo y entrega una sesión firmada (SESION_SECRETO).
const GOOGLE_CLIENT_ID = '540830306378-ci8r51abn7f8eces34di97s20cc13hhu.apps.googleusercontent.com';
const DOMINIO = 'ufrontera.cl';
const DURACION_SESION = 30 * 24 * 60 * 60 * 1000;   // 30 días

const firmar = texto => createHmac('sha256', process.env.SESION_SECRETO).update(texto).digest('base64url');

function crearSesion(datos) {
  const cuerpo = Buffer.from(JSON.stringify({ ...datos, exp: Date.now() + DURACION_SESION })).toString('base64url');
  return cuerpo + '.' + firmar(cuerpo);
}

function leerSesion(token) {
  if (!process.env.SESION_SECRETO || typeof token !== 'string') return null;
  const [cuerpo, firma] = token.split('.');
  if (!cuerpo || !firma) return null;
  const a = Buffer.from(firma), b = Buffer.from(firmar(cuerpo));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const datos = JSON.parse(Buffer.from(cuerpo, 'base64url').toString());
    return datos.exp > Date.now() ? datos : null;
  } catch { return null; }
}

// Devuelve el correo si el token de Google es válido, de este dashboard y de @ufrontera.cl
async function verificarGoogle(credential) {
  if (typeof credential !== 'string') return null;
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
  if (!r.ok) return null;
  const t = await r.json();
  const correo = String(t.email || '').toLowerCase();
  if (t.aud !== GOOGLE_CLIENT_ID || String(t.email_verified) !== 'true' || !correo.endsWith('@' + DOMINIO)) return null;
  return correo;
}

// Correos con los que la directora puede entrar con Google (variable DIRECTORA_CORREO, separados por coma)
const correosDirectora = () => (process.env.DIRECTORA_CORREO || '').split(',').map(c => c.trim().toLowerCase()).filter(Boolean);

// Enlaces antiguos (?coord= y tablero general): editables hasta que ENLACES_SOLO_LECTURA = 'si'
const enlacesEditables = () => (process.env.ENLACES_SOLO_LECTURA || '').trim().toLowerCase() !== 'si';

// ── Rol de quien hace la petición ──────────────────────────
// - ?k=<DIRECTORA_KEY>      → directora (todo, incluido Reportes)
// - sesión de Google        → directora (DIRECTORA_CORREO), gestor (gestiona_tareas), coordinador (es_jefe)
//                             o integrante, según Equipo
// - ?coord=<id> (antiguo)   → coordinación (solo sus tareas)
// - sin parámetros (antiguo)→ tablero general
// null = clave incorrecta; { sesionInvalida } = la sesión venció o la persona ya no está en Equipo
function esClaveDirectora(key) {
  const secreto = (process.env.DIRECTORA_KEY || '').trim();
  if (!secreto || typeof key !== 'string') return false;
  const a = Buffer.from(key.trim()), b = Buffer.from(secreto);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function resolverAcceso(key, coord, sesion) {
  if (key) return esClaveDirectora(key) ? { rol: 'directora', coord: null } : null;
  if (sesion) {
    const s = leerSesion(sesion);
    if (s && (s.directora || s.pid)) {
      const [p] = s.pid
        ? await sbGet('personas', `id=eq.${encodeURIComponent(s.pid)}&select=id,nombre,coord_id,es_jefe,gestiona_tareas,correo`)
        : [];
      // DIRECTORA_CORREO se revisa en cada petición: agregar o quitar un correo en Vercel
      // da o quita el acceso total sin volver a entrar
      if (correosDirectora().includes(s.correo))
        return { rol: 'directora', coord: null,
                 yo: { id: p?.id, nombre: p && p.correo === s.correo ? p.nombre : 'Administración', correo: s.correo } };
      // Quitar a la persona de Equipo (o cambiar su correo) le corta el acceso
      // Gestiona tareas: crea y modifica tareas de todas las coordinaciones (sin etiqueta de cargo)
      if (p && p.correo === s.correo && p.gestiona_tareas === true)
        return { rol: 'gestor', coord: null, yo: { id: p.id, nombre: p.nombre, correo: p.correo } };
      if (p && p.correo === s.correo) return {
        rol: p.es_jefe === true || p.es_jefe === 'true' ? 'coordinador' : 'integrante',
        coord: String(p.coord_id || '-'),   // sin coordinación no ve tareas
        yo: { id: p.id, nombre: p.nombre, correo: p.correo }
      };
    }
    return { sesionInvalida: true };
  }
  if (coord) return { rol: 'coordinacion', coord: String(coord), antiguo: true };
  return { rol: 'general', coord: null, antiguo: true };
}

// ── Permisos (tabla "Quién hace qué" del manual del equipo) ─
// Devuelve el motivo si el rol no puede hacer la acción, o null si puede.
// actual = fila actual de la tarea o persona que se modifica.
const SOLO_DIRECTORA = ['addPersona', 'deletePersona', 'addCoordinacion', 'deleteCoordinacion', 'addOpcion', 'deleteOpcion'];
const CAMPOS_INTEGRANTE = ['status', 'descripcion', 'link'];
const ESTADOS_INTEGRANTE = ['todo', 'progress', 'review'];

function denegar(acceso, action, body = {}, actual = null) {
  if (acceso.rol === 'directora') return null;
  if (SOLO_DIRECTORA.includes(action)) return 'Solo Administración puede hacer esto';
  if (acceso.antiguo) return enlacesEditables() ? null : 'Este enlace es solo de lectura: entra con tu cuenta @ufrontera.cl';
  const propia = c => String(c ?? '') === acceso.coord;
  if (acceso.rol === 'gestor')
    return action.endsWith('Tarea') ? null : 'Pídele este cambio a Administración';
  if (acceso.rol === 'coordinador') {
    if (actual && !propia(actual.coord_id)) return 'Solo puedes modificar lo de tu coordinación';
    if (action.endsWith('Tarea') && 'coord_id' in body && !propia(body.coord_id))
      return 'Solo puedes crear o mover tareas dentro de tu coordinación';
    return null;
  }
  // Integrante: solo sus tareas abiertas; estado hasta Revisión, descripción y link
  if (action !== 'updateTarea') return 'Pídele este cambio a tu coordinador/a';
  if (!actual || actual.asignado !== acceso.yo.nombre) return 'Solo puedes modificar tus propias tareas';
  if (['done', 'archivada'].includes(actual.status)) return 'Esta tarea ya está cerrada: pídele el cambio a tu coordinador/a';
  if (Object.keys(body).some(c => !CAMPOS_INTEGRANTE.includes(c))) return 'Solo puedes cambiar el estado, la descripción y el link';
  if ('status' in body && !ESTADOS_INTEGRANTE.includes(body.status))
    return 'Cuando termines, pásala a Revisión: tu coordinador/a la da por completada';
  return null;
}

// Campos obligatorios de una tarea: todos menos descripción y link
const OBLIGATORIOS_TAREA = ['titulo', 'coord_id', 'solicitante', 'tipo_requerimiento', 'categoria',
                            'asignado', 'prioridad', 'status', 'fecha'];
const NOMBRES_CAMPOS = { titulo: 'título', coord_id: 'coordinación', solicitante: 'solicitante',
  tipo_requerimiento: 'tipo de requerimiento', categoria: 'categoría', asignado: 'persona asignada',
  prioridad: 'prioridad', status: 'estado', fecha: 'fecha límite' };
const vacio = v => v === undefined || v === null || String(v).trim() === '';
const errorObligatorios = campos => 'Falta completar: ' + campos.map(c => NOMBRES_CAMPOS[c]).join(', ');

// Quién asignó la tarea y cuándo (para avisar a la coordinación cuando asigna la directora):
// 'directora', 'persona:<id>', 'coord:<id>' o 'general'
function registroAsignacion(acceso) {
  const por = acceso.rol === 'directora' ? 'directora'
            : acceso.yo ? 'persona:' + acceso.yo.id
            : acceso.rol === 'coordinacion' ? 'coord:' + acceso.coord : acceso.rol;
  return { asignado_por: por, asignado_at: new Date().toISOString() };
}

// Correo de la persona (para entrar con Google): solo la directora lo ve y lo modifica.
// Devuelve el body sin correo, con el correo normalizado (null si viene vacío) o un error.
function prepararCorreo(body, acceso) {
  const { correo, ...resto } = body;
  if (correo === undefined || acceso.rol !== 'directora') return { body: resto };
  const limpio = String(correo ?? '').trim().toLowerCase();
  if (limpio && !/^[^@\s]+@ufrontera\.cl$/.test(limpio)) return { error: 'El correo debe ser @ufrontera.cl' };
  return { body: { ...resto, correo: limpio || null } };
}

export default async function handler(req, res) {
  // CORS — solo permite origen del dashboard
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { action, data, key, coord, sesion } = req.method === 'GET'
      ? { action: req.query.action, data: req.query.data ? JSON.parse(req.query.data) : null,
          key: req.query.k, coord: req.query.coord, sesion: req.query.sesion }
      : req.body;

    // Entrar con Google: no requiere sesión previa
    if (action === 'login') {
      if (!process.env.SESION_SECRETO) return res.status(500).json({ error: 'Falta configurar SESION_SECRETO en Vercel' });
      const correo = await verificarGoogle(data?.credential);
      if (!correo) return res.status(403).json({ error: 'Solo se puede entrar con una cuenta @' + DOMINIO });
      const [p] = await sbGet('personas', `correo=eq.${encodeURIComponent(correo)}&select=id,nombre`);
      if (!p && correosDirectora().includes(correo))
        return res.json({ sesion: crearSesion({ directora: true, correo }), nombre: 'Administración' });
      if (!p) return res.status(403).json({ error: `Tu correo ${correo} no está registrado en Equipo. Pídele a Administración que lo agregue.` });
      return res.json({ sesion: crearSesion({ pid: p.id, correo }), nombre: p.nombre });
    }

    const acceso = await resolverAcceso(key, coord, sesion);
    if (!acceso) return res.status(403).json({ error: 'Clave de administración incorrecta: revisa el enlace' });
    if (acceso.sesionInvalida) return res.status(401).json({ error: 'Tu sesión venció: vuelve a entrar con Google', sesionInvalida: true });

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
        if (acceso.rol !== 'directora') personas.forEach(p => delete p.correo);
        return res.json({
          rol: acceso.rol, coordinaciones: coords, personas, tareas, opciones,
          yo: acceso.yo ? { nombre: acceso.yo.nombre, correo: acceso.yo.correo } : null,
          coord: acceso.yo ? acceso.coord : undefined,
          editable: acceso.antiguo ? enlacesEditables() : undefined
        });
      }

      case 'addTarea': {
        const id = 't' + Date.now();
        // completed_at y asignado_* los gestiona el servidor
        const { completed_at, asignado_por, asignado_at, ...body } = data;
        const motivo = denegar(acceso, action, body);
        if (motivo) return res.status(403).json({ error: motivo });
        const faltan = OBLIGATORIOS_TAREA.filter(c => vacio(body[c]));
        if (faltan.length) return res.status(400).json({ error: errorObligatorios(faltan) });
        if (body.status === 'done') body.completed_at = new Date().toISOString();
        Object.assign(body, registroAsignacion(acceso));
        const result = await sbPost('tareas', { id, ...body });
        return res.json({ ok: true, id, data: result });
      }

      case 'updateTarea': {
        const { id, completed_at, asignado_por, asignado_at, ...body } = data;
        // Campos obligatorios que vienen vacíos: solo se rechaza si la tarea ya tenía valor
        // (las tareas antiguas incompletas se pueden seguir editando)
        const vacios = OBLIGATORIOS_TAREA.filter(c => c in body && vacio(body[c]));
        const campos = [...new Set(['coord_id', 'asignado', 'status', ...vacios])].join(',');
        const [actual] = await sbGet('tareas', `id=eq.${encodeURIComponent(id)}&select=${campos}`);
        if (!actual) return res.status(404).json({ error: 'La tarea ya no existe' });
        const motivo = denegar(acceso, action, body, actual);
        if (motivo) return res.status(403).json({ error: motivo });
        const quitados = vacios.filter(c => !vacio(actual[c]));
        if (quitados.length) return res.status(400).json({ error: errorObligatorios(quitados) });
        // Si cambia la coordinación o la persona asignada, queda registrado quién lo hizo
        const cambio =
          ('coord_id' in body && String(body.coord_id ?? '') !== String(actual.coord_id ?? '')) ||
          ('asignado' in body && String(body.asignado ?? '') !== String(actual.asignado ?? ''));
        if (cambio) Object.assign(body, registroAsignacion(acceso));
        await sbPatch('tareas', id, body);
        await syncCompletedAt(id, body.status);
        return res.json({ ok: true });
      }

      case 'deleteTarea': {
        const [actual] = await sbGet('tareas', `id=eq.${encodeURIComponent(data.id)}&select=coord_id,asignado,status`);
        if (!actual) return res.json({ ok: true });
        const motivo = denegar(acceso, action, {}, actual);
        if (motivo) return res.status(403).json({ error: motivo });
        await sbDelete('tareas', data.id);
        return res.json({ ok: true });
      }

      case 'addPersona': {
        const id = 'p' + Date.now();
        const motivo = denegar(acceso, action);
        if (motivo) return res.status(403).json({ error: motivo });
        const p = prepararCorreo(data, acceso);
        if (p.error) return res.status(400).json({ error: p.error });
        const result = await sbPost('personas', { id, ...p.body });
        return res.json({ ok: true, id, data: result });
      }

      case 'updatePersona': {
        const { id, ...resto } = data;
        const [actual] = await sbGet('personas', `id=eq.${encodeURIComponent(id)}&select=coord_id`);
        if (!actual) return res.status(404).json({ error: 'La persona ya no existe' });
        const motivo = denegar(acceso, action, resto, actual);
        if (motivo) return res.status(403).json({ error: motivo });
        const p = prepararCorreo(resto, acceso);
        if (p.error) return res.status(400).json({ error: p.error });
        // Coordinación y rol de coordinador/a definen permisos: solo los cambia la directora
        if (acceso.rol !== 'directora') { delete p.body.coord_id; delete p.body.es_jefe; delete p.body.gestiona_tareas; }
        await sbPatch('personas', id, p.body);
        return res.json({ ok: true });
      }

      case 'deletePersona': {
        const motivo = denegar(acceso, action);
        if (motivo) return res.status(403).json({ error: motivo });
        await sbDelete('personas', data.id);
        return res.json({ ok: true });
      }

      case 'addCoordinacion': {
        const motivo = denegar(acceso, action);
        if (motivo) return res.status(403).json({ error: motivo });
        const result = await sbPost('coordinaciones', data);
        return res.json({ ok: true, data: result });
      }

      case 'deleteCoordinacion': {
        const motivo = denegar(acceso, action);
        if (motivo) return res.status(403).json({ error: motivo });
        await sbDelete('coordinaciones', data.id);
        return res.json({ ok: true });
      }

      case 'addOpcion': {
        const motivo = denegar(acceso, action);
        if (motivo) return res.status(403).json({ error: motivo });
        const result = await sbPost('opciones', data);
        return res.json({ ok: true, data: result });
      }

      case 'deleteOpcion': {
        const motivo = denegar(acceso, action);
        if (motivo) return res.status(403).json({ error: motivo });
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
