// Estado global de la aplicación y permisos en pantalla según el rol (lo define el servidor)

let state = {
  tareas:[], personas:[], coordinaciones:[],
  tareasHeaders:[], personasHeaders:[],
  opciones:{},
  view:'dashboard', filterCoord:null, filterStatus:'all', filterPersona:null,
  filtroPeriodo:'todo', urlCoord:null,   // urlCoord: coordinación de quien entró (la entrega el servidor)
  rol:null,   // lo define el servidor: 'directora' | 'gestor' | 'coordinador' | 'integrante'
  yo:null,    // persona que entró con Google: {nombre, correo}
  busqueda:'', ordenTareas:'created_desc',
  calFecha: new Date(), calModo: 'mes', calPersonaFiltro: 'all',
  // Reportes: período (fechas YYYY-MM-DD) y coordinación
  repAtajo: 'mes', repDesde: null, repHasta: null, repCoord: 'all'
};

// ── Rol actual ─────────────────────────────────────────────
function esDirector(){ return state.rol==='directora'; }
function coordActual(){ return state.urlCoord; }
function esPersona(){ return ['gestor','coordinador','integrante'].includes(state.rol); }

// ── Permisos en pantalla (el servidor los vuelve a comprobar) ──
// Gestiona tareas: crea y modifica tareas de todas las coordinaciones
// Coordinador/a: todo en su coordinación · Integrante: estado (hasta Revisión), descripción y link de sus tareas
function puedeCrearTareas(){ return esDirector() || state.rol==='gestor' || state.rol==='coordinador'; }
function puedeEditarTarea(t){
  return esDirector() || state.rol==='gestor'
    || (state.rol==='coordinador' && String(t.coordId)===String(state.urlCoord));
}
function puedeAvanzarTarea(t){
  return puedeEditarTarea(t)
    || (state.rol==='integrante' && t.asignado===state.yo?.nombre && !['done','archivada'].includes(t.status));
}
// Estados que puede elegir en una tarea: el integrante llega hasta Revisión
function estadosPermitidos(t){
  return puedeEditarTarea(t) ? ['todo','progress','review','done'] : ['todo','progress','review'];
}
function puedeEditarPersona(p){
  return esDirector()
    || (state.rol==='coordinador' && String(p.coordId)===String(state.urlCoord));
}
