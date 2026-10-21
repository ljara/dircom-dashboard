// Estado global de la aplicaciÃ³n y rol segÃºn la URL (?coord=) o la sesiÃ³n de Google

let state = {
  tareas:[], personas:[], coordinaciones:[],
  tareasHeaders:[], personasHeaders:[],
  opciones:{},
  view:'dashboard', filterCoord:null, filterStatus:'all', filterPersona:null,
  filtroPeriodo:'todo', urlCoord:null, urlKey:null,
  rol:null,   // lo define el servidor: 'directora' | 'coordinador' | 'integrante' | 'coordinacion' | 'general'
  yo:null,    // persona que entró con Google: {nombre, correo}
  editable:false,   // enlaces antiguos (?coord= y general): si todavía pueden modificar
  busqueda:'', ordenTareas:'created_desc',
  calFecha: new Date(), calModo: 'mes', calPersonaFiltro: 'all',
  // Reportes: período (fechas YYYY-MM-DD) y coordinación
  repAtajo: 'mes', repDesde: null, repHasta: null, repCoord: 'all'
};

// ── Leer parámetro URL al iniciar ──────────────────────────
function initUrlParams(){
  const params = new URLSearchParams(window.location.search);
  state.urlKey = params.get('k');
  const coord = params.get('coord');
  if(coord && !state.urlKey && !sesionGuardada()){
    state.urlCoord = coord;
    // Si hay coord en URL, arrancar en vista de tareas filtrada
    state.filterCoord = coord;
    state.view = 'tareas';
  }
}

// ── Rol actual ─────────────────────────────────────────────
function esDirector(){ return state.rol==='directora'; }
function coordActual(){ return state.urlCoord; }
function esPersona(){ return ['gestor','coordinador','integrante'].includes(state.rol); }

// ── Permisos en pantalla (el servidor los vuelve a comprobar) ──
// Gestiona tareas: crea y modifica tareas de todas las coordinaciones
// Coordinador/a: todo en su coordinación · Integrante: estado (hasta Revisión), descripción y link de sus tareas
// Enlaces antiguos: lo que permitían antes, mientras sigan editables
function puedeCrearTareas(){ return esDirector() || state.rol==='gestor' || state.rol==='coordinador' || state.editable; }
function puedeEditarTarea(t){
  return esDirector() || state.rol==='gestor' || state.editable
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
  return esDirector() || state.editable
    || (state.rol==='coordinador' && String(p.coordId)===String(state.urlCoord));
}
