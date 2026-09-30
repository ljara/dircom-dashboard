// NavegaciÃ³n entre vistas, barra lateral y render principal

// ── Navigation ─────────────────────────────────────────────
function setView(v){
  state.view=v; state.filterCoord=null; state.filterStatus='all';
  document.querySelectorAll('.nav-item[id]').forEach(el=>el.classList.remove('active'));
  const a=document.getElementById('nav-'+v);
  if(a) a.classList.add('active');
  render();
}
function filterByCoord(id){ state.filterCoord=id; state.view='tareas'; render(); }

function renderSidebarCoords(){
  const el=document.getElementById('sidebar-coords');
  if(!el) return;

  // Actualizar rol en sidebar
  const rolEl = document.getElementById('sidebar-rol');
  if(rolEl){
    if(esDirector()){
      rolEl.textContent = 'Vista: Directora';
      rolEl.style.color = 'var(--purple)';
      rolEl.style.fontWeight = '500';
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
  if(state.view==='dashboard')       el.innerHTML=renderDashboard();
  else if(state.view==='tareas')     el.innerHTML=renderTareasView();
  else if(state.view==='personas')   el.innerHTML=renderPersonasView();
  else if(state.view==='coordinaciones') el.innerHTML=renderCoordsView();
  else if(state.view==='calendario')     el.innerHTML=renderCalendario();
  else if(state.view==='opciones')       el.innerHTML=renderOpcionesView();
  else if(state.view==='papelera')       el.innerHTML=renderPapelera();
}
