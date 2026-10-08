// NavegaciÃ³n entre vistas, barra lateral y render principal

// ── Navigation ─────────────────────────────────────────────
// Vistas exclusivas de la directora (el servidor confirma el rol en getAll)
const VISTAS_DIRECTORA = ['reportes'];

function aplicarPermisos(){
  VISTAS_DIRECTORA.forEach(v=>{
    const nav=document.getElementById('nav-'+v);
    if(nav) nav.style.display = esDirector() ? '' : 'none';
  });
  // Agregar persona solo para la directora
  const addPersona=document.getElementById('sidebar-add-persona');
  if(addPersona) addPersona.style.display = esDirector() ? '' : 'none';
  if(!esDirector() && VISTAS_DIRECTORA.includes(state.view)) state.view='tareas';
}

function setView(v){
  if(!esDirector() && VISTAS_DIRECTORA.includes(v)) return;
  state.view=v; state.filterCoord=null; state.filterStatus='all'; state.filterPersona=null;
  document.querySelectorAll('.nav-item[id]').forEach(el=>el.classList.remove('active'));
  const a=document.getElementById('nav-'+v);
  if(a) a.classList.add('active');
  render();
}
// Menú lateral en mobile (botón ☰)
function toggleMenu(abrir){
  const abierto = abrir===undefined ? !document.body.classList.contains('menu-open') : abrir;
  document.body.classList.toggle('menu-open', abierto);
}
// Al elegir una opción del menú, cerrarlo
document.addEventListener('click', e=>{
  if(e.target.closest('#sidebar .nav-item')) toggleMenu(false);
});
function filterByCoord(id){ verTareas({coord:id}); }

// Abrir "Todas las tareas" con filtros aplicados (clic en los gráficos del dashboard)
function verTareas({coord=null, status='all', persona=null}={}){
  setView('tareas');
  state.filterCoord=coord; state.filterStatus=status; state.filterPersona=persona;
  state.busqueda='';
  render();
}

function renderSidebarCoords(){
  const el=document.getElementById('sidebar-coords');
  if(!el) return;

  // Actualizar rol en sidebar
  const rolEl = document.getElementById('sidebar-rol');
  if(rolEl){
    if(esDirector()){
      rolEl.textContent = 'Vista: Directora';
      rolEl.style.color = 'var(--primary-dark)';
      rolEl.style.fontWeight = '500';
    } else if(!state.urlCoord){
      rolEl.textContent = 'Vista: General';
      rolEl.style.color = 'var(--text-muted)';
    } else {
      const m = getCoordMeta(state.urlCoord);
      rolEl.textContent = `Vista: ${m.icon} ${m.name}`;
      rolEl.style.color = 'var(--text-muted)';
    }
  }

  el.innerHTML = state.coordinaciones.map((c,i)=>{
    const color = coordColor(i);
    // Indicador: tareas en revisión de esta coordinación
    const enRevision = activeTareas().filter(t=>String(t.coordId)===String(c.id)&&t.status==='review').length;
    // Resaltar si es la coord del URL
    const esMia = state.urlCoord && String(state.urlCoord)===String(c.id);
    return `<button class="nav-item${esMia?' active':''}" onclick="filterByCoord('${c.id}')" style="${esMia?'':''}">
      <span class="coord-dot" style="background:${color.hex}"></span>
      <span style="flex:1;text-align:left">${c.nombre}</span>
      ${enRevision?`<span style="background:var(--amber-light);color:#633806;font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px;flex-shrink:0" title="${enRevision} tarea${enRevision>1?'s':''} esperando revisión">✓ ${enRevision}</span>`:''}
    </button>`;
  }).join('');
}

// ── Render ─────────────────────────────────────────────────
function render(){
  const el=document.getElementById('main-content');
  // Recordar el campo enfocado: innerHTML lo reemplaza y se perdería el foco al escribir
  const act=document.activeElement;
  const foco=(act&&act.id&&el.contains(act)&&'selectionStart' in act)
    ? {id:act.id,start:act.selectionStart,end:act.selectionEnd} : null;
  aplicarPermisos();
  if(state.view==='dashboard')       el.innerHTML=renderDashboard();
  else if(state.view==='tareas')     el.innerHTML=renderTareasView();
  else if(state.view==='personas')   el.innerHTML=renderPersonasView();
  else if(state.view==='coordinaciones') el.innerHTML=renderCoordsView();
  else if(state.view==='calendario')     el.innerHTML=renderCalendario();
  else if(state.view==='opciones')       el.innerHTML=renderOpcionesView();
  else if(state.view==='papelera')       el.innerHTML=renderPapelera();
  else if(state.view==='reportes')       el.innerHTML=renderReportesView();
  if(foco){
    const nuevo=document.getElementById(foco.id);
    if(nuevo){
      nuevo.focus();
      try{ nuevo.setSelectionRange(foco.start,foco.end); }catch(e){}
    }
  }
}
