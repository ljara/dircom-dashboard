// Vista: Todas las tareas (bÃºsqueda, filtros y orden)

// ── Tareas view ────────────────────────────────────────────
function renderTareasView(){
  const coord=state.filterCoord?state.coordinaciones.find(c=>String(c.id)===String(state.filterCoord)):null;
  let tasks=activeTareas();
  if(state.filterCoord) tasks=tasks.filter(t=>String(t.coordId)===String(state.filterCoord));
  if(state.filterStatus!=='all') tasks=tasks.filter(t=>t.status===state.filterStatus);
  if(state.busqueda){
    const q=state.busqueda.toLowerCase();
    tasks=tasks.filter(t=>
      (t.titulo||'').toLowerCase().includes(q)||
      (t.solicitante||'').toLowerCase().includes(q)||
      (t.asignado||'').toLowerCase().includes(q)||
      (t.descripcion||'').toLowerCase().includes(q)||
      (t.tipo_requerimiento||'').toLowerCase().includes(q)||
      (t.categoria||'').toLowerCase().includes(q)
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
        return new Date(a.fecha) - new Date(b.fecha);
      case 'fecha_desc':
        if(!a.fecha && !b.fecha) return 0;
        if(!a.fecha) return 1;
        if(!b.fecha) return -1;
        return new Date(b.fecha) - new Date(a.fecha);
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
  const enRevision = state.urlCoord
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
      <div><div class="page-title">${coord?(getCoordMeta(coord.id).icon+' '+coord.nombre):'Todas las tareas'}</div>
      <div class="page-sub">${tasks.length} tarea${tasks.length!==1?'s':''}${state.busqueda?` · búsqueda: "${state.busqueda}"`:''}</div></div>
      <div class="topbar-actions">
        ${state.filterCoord?`<button class="btn btn-ghost btn-sm" onclick="state.filterCoord=null;render()">✕ Quitar filtro</button>`:''}
        <button class="btn btn-primary" onclick="openModal('tarea',null)">＋ Nueva tarea</button>
      </div>
    </div>
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
        <select onchange="state.ordenTareas=this.value;render()"
          style="padding:7px 10px;border:1px solid var(--border-md);border-radius:var(--radius-sm);font-size:12px;font-family:inherit;background:var(--bg);color:var(--text);cursor:pointer;flex-shrink:0">
          <option value="created_desc"${state.ordenTareas==='created_desc'?' selected':''}>↓ Más recientes</option>
          <option value="fecha_asc"${state.ordenTareas==='fecha_asc'?' selected':''}>📅 Fecha límite (próxima)</option>
          <option value="fecha_desc"${state.ordenTareas==='fecha_desc'?' selected':''}>📅 Fecha límite (lejana)</option>
          <option value="prioridad"${state.ordenTareas==='prioridad'?' selected':''}>🔴 Prioridad</option>
          <option value="status"${state.ordenTareas==='status'?' selected':''}>⚡ Estado</option>
          <option value="titulo"${state.ordenTareas==='titulo'?' selected':''}>🔤 Título A-Z</option>
        </select>
      </div>
      <div class="filters">
        ${['all','todo','progress','review','done'].map(s=>`<button class="filter-pill${state.filterStatus===s?' active':''}" onclick="state.filterStatus='${s}';render()">${s==='all'?'Todas':statusLabel(s)}</button>`).join('')}
        <div style="flex:1"></div>
        ${state.coordinaciones.map(c=>{const m=getCoordMeta(c.id);return`<button class="filter-pill${state.filterCoord===c.id?' active':''}" onclick="state.filterCoord=state.filterCoord==='${c.id}'?null:'${c.id}';render()">${m.icon} ${c.nombre.split(' ')[0]}</button>`;}).join('')}
      </div>
      ${taskListHTML(tasks)}
    </div>`;
}
