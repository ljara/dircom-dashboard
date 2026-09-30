// ComunicaciÃ³n con /api/data (Vercel) y normalizaciÃ³n de datos de Supabase

// ── API — llama a Vercel Function (credenciales protegidas en servidor) ──
// v2.0.0 — 2026-09-29
const API_BASE = '/api/data';

async function callAPI(action, data) {
  setSyncing(true);
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  } finally { setSyncing(false); }
}

// sb* functions replaced by callAPI

// Normalizar campos de Supabase (snake_case → camelCase que usa el dashboard)
function normalizeTarea(t){
  return {
    id:                 t.id,
    titulo:             t.titulo,
    descripcion:        t.descripcion||'',
    coordId:            t.coord_id,
    asignado:           t.asignado||'',
    solicitante:        t.solicitante||'',
    tipo_requerimiento: t.tipo_requerimiento||'',
    categoria:          t.categoria||'',
    status:             t.status||'todo',
    prioridad:          t.prioridad||'media',
    fecha:              t.fecha||'',
    link:               t.link||'',
    created:            t.created_at||''
  };
}

function normalizePersona(p){
  return {
    id:       p.id,
    nombre:   p.nombre,
    rol:      p.rol||'',
    coordId:  p.coord_id,
    esJefe:   p.es_jefe===true||p.es_jefe==='true'?'true':'false'
  };
}

function normalizeCoord(c){
  return { id:c.id, nombre:c.nombre, icon:c.icon||'📁' };
}

function setSyncing(val){
  const dot=document.getElementById('sync-dot');
  const txt=document.getElementById('sync-text');
  if(dot) dot.className='sync-dot'+(val?' syncing':'');
  if(txt) txt.textContent=val?'Guardando…':'Sincronizado';
}

// ── loadData via API segura (v2.0.0) ─────────────────────
async function loadData(){
  initUrlParams();
  try{
    const data = await callAPI('getAll');
    state.coordinaciones = (data.coordinaciones||[]).map(normalizeCoord);
    state.personas       = (data.personas||[]).map(normalizePersona);
    state.tareas         = (data.tareas||[]).map(normalizeTarea);
    state.opciones       = data.opciones || {};
    state.tareasHeaders  = ['id','titulo','descripcion','coordId','asignado','solicitante','tipo_requerimiento','categoria','status','prioridad','fecha','link','created'];
    state.personasHeaders= ['id','nombre','rol','coordId','esJefe'];
    renderSidebarCoords();
  } catch(e){
    showToast('Error al cargar datos: '+e.message);
    console.error('loadData error:', e);
  }
  document.getElementById('loading').style.display='none';
  render();
}
