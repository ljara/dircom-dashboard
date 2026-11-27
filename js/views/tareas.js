// Vista: Todas las tareas (bÃºsqueda, filtros y orden)

// ── Tareas view ────────────────────────────────────────────
function renderTareasView(){
  const coord=state.filterCoord?state.coordinaciones.find(c=>String(c.id)===String(state.filterCoord)):null;
  let tasks=activeTareas();
  if(state.filterCoord) tasks=tasks.filter(t=>String(t.coordId)===String(state.filterCoord));
  if(state.filterStatus!=='all') tasks=tasks.filter(t=>t.status===state.filterStatus);
  if(state.filterPersona) tasks=tasks.filter(t=>t.asignado===state.filterPersona);
  if(state.filterCampana) tasks=tasks.filter(t=>t.campana===state.filterCampana);
  if(state.filterPrograma) tasks=tasks.filter(t=>t.programa===state.filterPrograma);
  // Campañas para el filtro: las de la lista y las que aún tienen tareas aunque se hayan quitado
  const campanas=[...new Set([...(state.opciones.campana||[]), ...activeTareas().map(t=>t.campana).filter(Boolean)])];
  // Programas de UFROmedios (al final del mismo selector): filtran los capítulos por programa
  const programas=[...new Set([...(state.opciones.programa||[]), ...activeTareas().map(t=>t.programa).filter(Boolean)])];
  if(state.busqueda){
    const q=state.busqueda.toLowerCase();
    tasks=tasks.filter(t=>
      (t.titulo||'').toLowerCase().includes(q)||
      (t.solicitante||'').toLowerCase().includes(q)||
      (t.asignado||'').toLowerCase().includes(q)||
      (t.descripcion||'').toLowerCase().includes(q)||
      (t.tipo_requerimiento||'').toLowerCase().includes(q)||
      (t.categoria||'').toLowerCase().includes(q)||
      (t.campana||'').toLowerCase().includes(q) ||
      (t.programa||'').toLowerCase().includes(q)
    );
  }

  // Ordenamiento
  const PRIORIDAD_ORDEN = {alta:0, media:1, baja:2};
  const STATUS_ORDEN = {todo:0, progress:1, review:2, done:3};
  const hoySort = new Date(); hoySort.setHours(0,0,0,0);

  tasks = [...tasks].sort((a,b)=>{
    switch(state.ordenTareas){
      case 'fecha_asc':
        if(!a.fecha && !b.fecha) return 0;
        if(!a.fecha) return 1;
        if(!b.fecha) return -1;
        return (new Date(a.fecha) - new Date(b.fecha)) || claveHora(a).localeCompare(claveHora(b));
      case 'fecha_desc':
        if(!a.fecha && !b.fecha) return 0;
        if(!a.fecha) return 1;
        if(!b.fecha) return -1;
        return (new Date(b.fecha) - new Date(a.fecha)) || claveHora(a).localeCompare(claveHora(b));
      case 'prioridad':
        return (PRIORIDAD_ORDEN[a.prioridad]??1) - (PRIORIDAD_ORDEN[b.prioridad]??1);
      case 'status':
        return (STATUS_ORDEN[a.status]??0) - (STATUS_ORDEN[b.status]??0);
      case 'titulo':
        return (a.titulo||'').localeCompare(b.titulo||'', 'es');
      case 'created_desc':
      default:
        return new Date(b.created||0) - new Date(a.created||0);
    }
  });

  // Banner revisión pendiente para jefe de coordinación
  const enRevision = state.urlCoord && !['integrante','gestorCoord'].includes(state.rol)
    ? activeTareas().filter(t=>String(t.coordId)===String(state.urlCoord)&&t.status==='review')
    : [];
  const bannerRevision = enRevision.length ? `
    <div style="background:var(--amber-light);border:1px solid #EF9F27;border-radius:var(--radius);padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;gap:12px;cursor:pointer" onclick="state.filterStatus='review';render()">
      <span style="font-size:20px">⏳</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:#633806">${enRevision.length} tarea${enRevision.length>1?'s':''} esperando tu revisión</div>
        <div style="font-size:11px;color:#7A4A00;margin-top:2px">Haz clic para verlas</div>
      </div>
      <span style="font-size:12px;color:#633806;font-weight:500">Ver →</span>
    </div>` : '';

  return `
    <div class="topbar">
      <div><div class="page-title">${state.filterPersona?('👤 '+state.filterPersona):coord?(getCoordMeta(coord.id).icon+' '+coord.nombre):'Todas las tareas'}</div>
      <div class="page-sub">${tasks.length} tarea${tasks.length!==1?'s':''}${state.filterCampana?` · campaña: ${escHtml(state.filterCampana)}`:''}${state.filterPrograma?` · programa: ${escHtml(state.filterPrograma)}`:''}${state.busqueda?` · búsqueda: "${state.busqueda}"`:''}</div></div>
      <div class="topbar-actions">
        ${state.filterPersona?`<button class="btn btn-ghost btn-sm" onclick="state.filterPersona=null;render()">✕ Quitar filtro de persona</button>`:''}
        ${state.filterCoord?`<button class="btn btn-ghost btn-sm" onclick="state.filterCoord=null;render()">✕ Quitar filtro</button>`:''}
        ${puedeCrearTareas()?`<button class="btn btn-primary" onclick="openModal('tarea',null)">＋ Nueva tarea</button>`:''}
      </div>
    </div>
    ${bannerVencidasHTML()}
    ${bannerNovedadesHTML()}
    ${bannerRevision}
    <div class="section">
      <div style="padding:10px 14px;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:center">
        <div style="position:relative;flex:1">
          <input id="tareas-search" type="text" placeholder="Buscar por título, solicitante, asignado…"
            value="${state.busqueda}"
            style="width:100%;padding:7px 10px 7px 32px;border:1px solid var(--border-md);border-radius:var(--radius-sm);font-size:13px;font-family:inherit;background:var(--bg);color:var(--text)"
            oninput="state.busqueda=this.value;render()">
          <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:13px;pointer-events:none">🔍</span>
          ${state.busqueda?`<button onclick="state.busqueda='';render()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);border:none;background:transparent;cursor:pointer;font-size:14px;color:var(--text-muted)">✕</button>`:''}
        </div>
        ${state.busqueda?`<div title="Tareas que coinciden con la búsqueda (y los filtros aplicados)" style="display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:var(--radius-sm);background:var(--gray-light);flex-shrink:0;white-space:nowrap">
          <span style="font-size:18px;font-weight:700;color:var(--text);line-height:1">${tasks.length}</span>
          <span style="font-size:11px;color:var(--text-muted)">encontrada${tasks.length!==1?'s':''}</span>
        </div>`:''}
        ${selectorFiltrosHTML(campanas, programas)}
      </div>
      <div class="filters">
        ${['all','todo','progress','review','done'].map(s=>`<button class="filter-pill${state.filterStatus===s?' active':''}" onclick="state.filterStatus='${s}';render()">${s==='all'?'Todas':statusLabel(s)}</button>`).join('')}
        <div style="flex:1"></div>
        ${state.coordinaciones.map(c=>{const m=getCoordMeta(c.id);return`<button class="filter-pill${state.filterCoord===c.id?' active':''}" onclick="state.filterCoord=state.filterCoord==='${c.id}'?null:'${c.id}';render()">${m.icon} ${c.nombre.split(' ')[0]}</button>`;}).join('')}
      </div>
      ${taskListHTML(tasks)}
    </div>`;
}

// Selector único "⚙ Filtros": orden, campaña y, al final, programas de UFROmedios.
// Siempre muestra "⚙ Filtros"; lo elegido lleva ✓ y se aplica al cambiar.
const ORDENES_TAREAS = [
  ['created_desc','↓ Más recientes'], ['fecha_asc','📅 Fecha límite (próxima)'], ['fecha_desc','📅 Fecha límite (lejana)'],
  ['prioridad','🔴 Prioridad'], ['status','⚡ Estado'], ['titulo','🔤 Título A-Z']
];
function selectorFiltrosHTML(campanas, programas){
  const op = (valor, texto, activo) => `<option value="${escHtml(valor)}">${activo?'✓ ':' '}${escHtml(texto)}</option>`;
  const n = (state.filterCampana?1:0) + (state.filterPrograma?1:0);
  return `<select onchange="elegirFiltro(this.value)" title="Ordenar y filtrar por campaña o programa"
      style="padding:7px 10px;border:1px solid ${n?'var(--primary)':'var(--border-md)'};border-radius:var(--radius-sm);font-size:12px;font-family:inherit;background:${n?'var(--primary-light)':'var(--bg)'};color:var(--text);cursor:pointer;flex-shrink:0;max-width:200px">
    <option value="" selected>⚙ Filtros${n?` (${n})`:''}</option>
    <optgroup label="Ordenar por">
      ${ORDENES_TAREAS.map(([v,t])=>op('o:'+v, t, (state.ordenTareas||'created_desc')===v)).join('')}
    </optgroup>
    ${campanas.length?`<optgroup label="📣 Campaña">
      ${op('c:', 'Todas las campañas', !state.filterCampana)}
      ${campanas.map(c=>op('c:'+c, c, state.filterCampana===c)).join('')}
    </optgroup>`:''}
    ${programas.length?`<optgroup label="📻 Programas UFROmedios">
      ${op('p:', 'Todos los programas', !state.filterPrograma)}
      ${programas.map(p=>op('p:'+p, p, state.filterPrograma===p)).join('')}
    </optgroup>`:''}
  </select>`;
}

// "o:<orden>", "c:<campaña>" o "p:<programa>" (vacío después de ":" = quitar ese filtro)
function elegirFiltro(v){
  const tipo = v.slice(0,2), valor = v.slice(2);
  if(tipo==='o:') state.ordenTareas = valor;
  else if(tipo==='c:') state.filterCampana = valor;
  else if(tipo==='p:') state.filterPrograma = valor;
  render();
}
