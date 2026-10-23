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

// Enlaces antiguos (?coord= y tablero general): editables hasta que ENLACES_SOLO_LECTURA = 'si',
// y cerrados del todo (no reciben datos; se pide entrar con Google) cuando SOLO_CON_GOOGLE = 'si'
const activado = nombre => (process.env[nombre] || '').trim().toLowerCase() === 'si';
const enlacesEditables = () => !activado('ENLACES_SOLO_LECTURA');

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

const yoDe = p => ({ id: p.id, nombre: p.nombre, correo: p.correo, visto: p.visto_at || null });

async function resolverAcceso(key, coord, sesion) {
  if (key) return esClaveDirectora(key) ? { rol: 'directora', coord: null } : null;
  if (sesion) {
    const s = leerSesion(sesion);
    if (s && (s.directora || s.pid)) {
      const [p] = s.pid
        ? await sbGet('personas', `id=eq.${encodeURIComponent(s.pid)}&select=id,nombre,coord_id,es_jefe,gestiona_tareas,correo,visto_at`)
        : [];
      // DIRECTORA_CORREO se revisa en cada petición: agregar o quitar un correo en Vercel
      // da o quita el acceso total sin volver a entrar
      if (correosDirectora().includes(s.correo))
        return { rol: 'directora', coord: null,
                 yo: p && p.correo === s.correo ? yoDe(p) : { nombre: 'Administración', correo: s.correo } };
      // Quitar a la persona de Equipo (o cambiar su correo) le corta el acceso
      // Gestiona tareas: crea y modifica tareas de todas las coordinaciones (sin etiqueta de cargo)
      if (p && p.correo === s.correo && p.gestiona_tareas === true)
        return { rol: 'gestor', coord: null, yo: yoDe(p) };
      if (p && p.correo === s.correo) return {
        rol: p.es_jefe === true || p.es_jefe === 'true' ? 'coordinador' : 'integrante',
        coord: String(p.coord_id || '-'),   // sin coordinación no ve tareas
        yo: yoDe(p)
      };
    }
    return { sesionInvalida: true };
  }
  if (activado('SOLO_CON_GOOGLE')) return { loginRequerido: true };
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

// ── Avisos (🔔) ────────────────────────────────────────────
// Cada creación, reasignación, cambio de fecha límite o paso a Revisión queda en la tabla eventos.
// tipo: 'creada' | 'asignada' | 'fecha' | 'revision'; para = persona asignada (nombre)
async function registrarEvento(acceso, tipo, tarea, url) {
  const evento = {
    tipo, tarea_id: tarea.id, coord_id: tarea.coord_id ?? null, para: tarea.asignado || null,
    actor_id: acceso.yo?.id || null, actor_rol: acceso.rol,
    actor_nombre: acceso.rol === 'directora' ? 'Administración' : acceso.yo?.nombre || null
  };
  try { await sbPost('eventos', evento); }
  catch (e) { console.error('No se pudo registrar el evento:', e); }   // el aviso no debe frenar el cambio
  return enviarCorreos(evento, tarea, url);
}

// Quién recibe cada aviso (nunca quien hizo el cambio):
// - la persona asignada: cuando le crean o asignan una tarea, o le cambian la fecha límite
// - coordinador/a: lo que Administración o quien gestiona tareas crea, asigna o cambia de fecha
//   en su coordinación, y las tareas de su coordinación que pasan a Revisión
// - Administración: las tareas que crea otra persona
function avisoPara(acceso, e) {
  const yo = acceso.yo;
  if (e.actor_id && e.actor_id === yo.id) return false;
  if (e.tipo !== 'revision' && e.para && e.para === yo.nombre) return true;
  if (acceso.rol === 'directora') return e.tipo === 'creada' && e.actor_rol !== 'directora';
  if (acceso.rol === 'coordinador' && String(e.coord_id ?? '') === acceso.coord)
    return e.tipo === 'revision' || ['directora', 'gestor'].includes(e.actor_rol);
  return false;
}

const DIAS_AVISOS = 7;   // sin visto guardado: avisos de la última semana
async function avisosDe(acceso) {
  if (!acceso.yo) return [];
  const desde = acceso.yo.visto || new Date(Date.now() - DIAS_AVISOS * 864e5).toISOString();
  try {
    const eventos = await sbGet('eventos',
      `created_at=gt.${encodeURIComponent(desde)}&order=created_at.desc&limit=300`);
    return eventos.filter(e => avisoPara(acceso, e));
  } catch (e) { console.error('No se pudieron leer los eventos:', e); return []; }
}

// ── Avisos por correo ──────────────────────────────────────
// Se envían al momento, con las mismas reglas que los avisos 🔔 (avisoPara).
// Requiere CORREO_USUARIO y CORREO_CLAVE (contraseña de aplicación de Google).
// CORREO_PRUEBA: si está, todos los correos van a esa dirección (para probar sin molestar al equipo).
function accesoDe(p) {
  if (correosDirectora().includes(p.correo)) return { rol: 'directora', yo: { id: p.id, nombre: p.nombre } };
  if (p.gestiona_tareas === true) return { rol: 'gestor', yo: { id: p.id, nombre: p.nombre } };
  return { rol: p.es_jefe === true || p.es_jefe === 'true' ? 'coordinador' : 'integrante',
           coord: String(p.coord_id || '-'), yo: { id: p.id, nombre: p.nombre } };
}

async function destinatarios(evento) {
  const personas = await sbGet('personas', 'select=id,nombre,coord_id,es_jefe,gestiona_tareas,correo&correo=not.is.null');
  const lista = personas.filter(p => avisoPara(accesoDe(p), evento)).map(p => ({ nombre: p.nombre, correo: p.correo }));
  // Administración sin ficha en Equipo
  const conFicha = new Set(personas.map(p => p.correo));
  correosDirectora().filter(c => !conFicha.has(c))
    .forEach(c => { if (avisoPara({ rol: 'directora', yo: { nombre: 'Administración' } }, evento)) lista.push({ nombre: 'Administración', correo: c }); });
  return [...new Map(lista.map(d => [d.correo, d])).values()];
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fechaCorta = f => { const d = new Date(String(f).slice(0, 10) + 'T12:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }); };

function armarCorreo(evento, tarea, coordNombre, dest, url) {
  const por = evento.actor_nombre || 'Alguien';
  const paraTi = evento.para && evento.para === dest.nombre;
  const [asunto, frase] =
    evento.tipo === 'revision' ? ['Tarea en revisión', `${esc(por)} pasó a <strong>Revisión</strong> esta tarea. Revísala y dala por completada o devuélvela.`]
    : evento.tipo === 'fecha' ? ['Cambio en fecha de entrega', `${esc(por)} cambió la fecha límite${paraTi ? ' de tu tarea' : ''}${tarea.fecha_anterior ? ' (antes: ' + esc(fechaCorta(tarea.fecha_anterior)) + ')' : ''}.`]
    : evento.tipo === 'creada' ? ['Nueva tarea', paraTi ? `${esc(por)} te asignó una tarea nueva.` : `${esc(por)} creó una tarea nueva.`]
    : ['Tarea asignada', paraTi ? `${esc(por)} te asignó esta tarea.` : `${esc(por)} asignó esta tarea${evento.para ? ' a ' + esc(evento.para) : ''}.`];
  const fila = (k, v) => v ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">${k}</td><td style="padding:4px 0">${esc(v)}</td></tr>` : '';
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;max-width:520px">
  <p>Hola ${esc(dest.nombre)},</p>
  <p>${frase}</p>
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin:16px 0">
    <div style="font-size:16px;font-weight:bold;margin-bottom:8px">${esc(tarea.titulo)}</div>
    <table style="font-size:13px;border-collapse:collapse">
      ${fila('Coordinación', coordNombre)}${fila('Solicitante', tarea.solicitante)}${fila('Asignada a', tarea.asignado)}${fila('Fecha límite', fechaCorta(tarea.fecha))}
    </table>
  </div>
  <p><a href="${url}" style="background:#00447F;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">Ver en dashboard</a></p>
  <p style="font-size:12px;color:#6b7280;margin-top:24px">Aviso automático de DirCom — Gestión de tareas. No respondas este correo.</p>
</div>`;
  // Versión en texto plano: los correos solo HTML tienen más probabilidad de caer en spam
  const texto = [
    `Hola ${dest.nombre},`, '', frase.replace(/<[^>]+>/g, '').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'), '',
    tarea.titulo,
    ...[['Coordinación', coordNombre], ['Solicitante', tarea.solicitante], ['Asignada a', tarea.asignado], ['Fecha límite', fechaCorta(tarea.fecha)]]
      .filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    '', `Ver en dashboard: ${url}`, '', 'Aviso automático de DirCom — Gestión de tareas. No respondas este correo.'
  ].join('\n');
  return { asunto: `🔔 ${asunto}: ${tarea.titulo}`, html, texto };
}

// Devuelve un resumen del envío (se muestra en pantalla solo en modo prueba)
let transporte = null;
async function enviarCorreos(evento, tarea, url) {
  const usuario = process.env.CORREO_USUARIO, clave = process.env.CORREO_CLAVE;
  if (!usuario || !clave) return 'no se envió: faltan CORREO_USUARIO o CORREO_CLAVE en Vercel';
  try {
    const dest = await destinatarios(evento);
    if (!dest.length) return 'nadie a quien avisar (¿la persona asignada y su coordinador/a tienen correo en Equipo?)';
    const [coord] = tarea.coord_id ? await sbGet('coordinaciones', `id=eq.${encodeURIComponent(tarea.coord_id)}&select=nombre`) : [];
    if (!transporte) {
      const { default: nodemailer } = await import('nodemailer');
      transporte = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true,
        auth: { user: usuario, pass: clave.replace(/\s/g, '') }, connectionTimeout: 5000, socketTimeout: 5000 });
    }
    const prueba = (process.env.CORREO_PRUEBA || '').trim();
    const envios = dest.map(d => {
      const { asunto, html, texto } = armarCorreo(evento, tarea, coord?.nombre, d, url);
      return transporte.sendMail({
        from: `"DirCom" <${usuario}>`,
        to: prueba || d.correo,
        subject: prueba ? asunto.replace('🔔 ', `🔔 [Prueba → ${d.nombre}] `) : asunto,
        html, text: texto
      });
    });
    const r = await Promise.allSettled(envios);
    const fallidos = r.filter(x => x.status === 'rejected');
    fallidos.forEach(x => console.error('No se pudo enviar un correo:', x.reason));
    const nombres = dest.map(d => d.nombre).join(', ');
    return fallidos.length ? `error al enviar a ${nombres}: ${fallidos[0].reason?.message || fallidos[0].reason}`
                           : `enviado (para ${nombres})`;
  } catch (e) {   // el correo no debe frenar el cambio
    console.error('Error al enviar correos:', e);
    return 'error: ' + e.message;
  }
}

// Modo prueba: el resultado del envío vuelve al navegador para mostrarlo
const resumenCorreo = r => (process.env.CORREO_PRUEBA || '').trim() && r ? { correo: r } : {};

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

    // Dirección del dashboard para el botón de los correos (producción o vista previa)
    const urlApp = 'https://' + (req.headers?.['x-forwarded-host'] || req.headers?.host || 'dircom-dashboard.vercel.app');

    const acceso = await resolverAcceso(key, coord, sesion);
    if (!acceso) return res.status(403).json({ error: 'Clave de administración incorrecta: revisa el enlace' });
    if (acceso.sesionInvalida) return res.status(401).json({ error: 'Tu sesión venció: vuelve a entrar con Google', sesionInvalida: true });
    if (acceso.loginRequerido) return res.status(401).json({ error: 'Entra con tu cuenta @' + DOMINIO, loginRequerido: true });

    switch (action) {

      case 'getAll': {
        // Una coordinación solo recibe sus propias tareas
        const filtroTareas = acceso.coord ? `coord_id=eq.${encodeURIComponent(acceso.coord)}&` : '';
        const [coords, personas, tareas, opcRows, avisos] = await Promise.all([
          sbGet('coordinaciones', 'order=created_at'),
          sbGet('personas',       'order=nombre'),
          sbGet('tareas',         filtroTareas + 'order=created_at.desc'),
          sbGet('opciones',       'order=tipo,orden'),
          avisosDe(acceso)
        ]);
        const opciones = {};
        opcRows.forEach(o => {
          if (!opciones[o.tipo]) opciones[o.tipo] = [];
          opciones[o.tipo].push(o.valor);
        });
        personas.forEach(p => { delete p.visto_at; if (acceso.rol !== 'directora') delete p.correo; });
        return res.json({
          rol: acceso.rol, coordinaciones: coords, personas, tareas, opciones,
          yo: acceso.yo ? { nombre: acceso.yo.nombre, correo: acceso.yo.correo } : null,
          coord: acceso.yo ? acceso.coord : undefined,
          editable: acceso.antiguo ? enlacesEditables() : undefined,
          avisos,
          // Sin ficha en Equipo, el "visto" se guarda solo en el navegador
          visto: acceso.yo?.id ? acceso.yo.visto : undefined
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
        const correo = await registrarEvento(acceso, 'creada', { id, ...body }, urlApp);
        return res.json({ ok: true, id, data: result, ...resumenCorreo(correo) });
      }

      case 'updateTarea': {
        const { id, completed_at, asignado_por, asignado_at, ...body } = data;
        // Campos obligatorios que vienen vacíos: solo se rechaza si la tarea ya tenía valor
        // (las tareas antiguas incompletas se pueden seguir editando)
        const vacios = OBLIGATORIOS_TAREA.filter(c => c in body && vacio(body[c]));
        const campos = [...new Set(['coord_id', 'asignado', 'status', 'titulo', 'fecha', 'solicitante', ...vacios])].join(',');
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
        const tarea = { id, ...actual, ...body };
        const correos = [];
        if (cambio) correos.push(await registrarEvento(acceso, 'asignada', tarea, urlApp));
        // Cambio de fecha límite (si además se reasignó, basta el aviso de asignación, que trae la fecha)
        else if ('fecha' in body && String(body.fecha ?? '').slice(0, 10) !== String(actual.fecha ?? '').slice(0, 10))
          correos.push(await registrarEvento(acceso, 'fecha', { ...tarea, fecha_anterior: actual.fecha }, urlApp));
        if (body.status === 'review' && actual.status !== 'review') correos.push(await registrarEvento(acceso, 'revision', tarea, urlApp));
        return res.json({ ok: true, ...resumenCorreo(correos.join(' · ')) });
      }

      // Marca los avisos como vistos hasta la fecha del más reciente (reloj del servidor)
      case 'marcarVisto': {
        const hasta = new Date(data?.hasta);
        if (isNaN(hasta) || hasta > new Date()) return res.status(400).json({ error: 'Fecha no válida' });
        if (!acceso.yo?.id) return res.json({ ok: true });
        await sbPatch('personas', acceso.yo.id, { visto_at: hasta.toISOString() });
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
