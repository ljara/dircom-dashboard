// Estado global de la aplicaciÃ³n y rol segÃºn la URL (?coord=)

let state = {
  tareas:[], personas:[], coordinaciones:[],
  tareasHeaders:[], personasHeaders:[],
  opciones:{},
  view:'dashboard', filterCoord:null, filterStatus:'all',
  filtroPeriodo:'todo', urlCoord:null, urlKey:null,
  rol:null,   // lo define el servidor: 'directora' | 'coordinacion'
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
  if(coord && !state.urlKey){
    state.urlCoord = coord;
    // Si hay coord en URL, arrancar en vista de tareas filtrada
    state.filterCoord = coord;
    state.view = 'tareas';
  }
}

// ── Rol actual ─────────────────────────────────────────────
function esDirector(){ return state.rol==='directora'; }
function coordActual(){ return state.urlCoord; }
