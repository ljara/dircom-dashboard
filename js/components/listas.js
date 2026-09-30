// Listas reutilizables de tareas y personas

// ── HTML helpers ───────────────────────────────────────────
function taskListHTML(tasks){
  if(!tasks.length) return `<div class="empty"><div class="empty-icon">📋</div><p>Sin tareas aquí todavía</p></div>`;
  return tasks.map(t=>{
    const m=getCoordMeta(t.coordId);
    const hoy=new Date();hoy.setHours(0,0,0,0);
    const esVencida=t.fecha&&t.status!=='done'&&(()=>{try{return new Date(t.fecha)<hoy;}catch(e){return false;}})();
    const extras=extraFields(state.tareasHeaders,SYSTEM_FIELDS_TAREA)
      .filter(f=>t[f]!==undefined&&t[f]!=='')
      .map(f=>`<span>· ${f}: ${t[f]}</span>`).join('');
    return `<div class="task-item">
      <div class="task-status-dot dot-${t.status}" style="cursor:pointer" onclick='viewTask(${JSON.stringify(t)})'></div>
      <div class="task-body" style="cursor:pointer" onclick='viewTask(${JSON.stringify(t)})'>
        <div class="task-title task-title-link">${esVencida?'<span title="Tarea vencida" style="color:var(--red);margin-right:4px">⚠</span>':''}${t.titulo||''}</div>
        <div class="task-meta">
          <span>${m.icon} ${m.name}</span>
          ${t.solicitante?`<span>📋 ${t.solicitante}</span>`:'<span style="color:var(--text-faint)">Sin solicitante</span>'}
          ${t.asignado?`<span>👤 ${t.asignado}</span>`:'<span style="color:var(--text-faint)">Sin asignar</span>'}
          ${t.fecha?`<span>📅 ${formatFecha(t.fecha)}</span>`:'<span style="color:var(--text-faint)">Sin fecha</span>'}
        </div>
      </div>
      <span class="badge badge-${t.prioridad}">${priorLabel(t.prioridad)}</span>
      <select class="status-select" onchange="changeStatus('${t.id}',this.value)" onclick="event.stopPropagation()">
        ${['todo','progress','review','done'].map(s=>`<option value="${s}"${t.status===s?' selected':''}>${statusLabel(s)}</option>`).join('')}
      </select>
      <button class="btn btn-sm btn-view" onclick='viewTask(${JSON.stringify(t)})' title="Ver detalle">👁</button>
      <button class="btn btn-sm btn-edit" onclick='openModal("tarea",${JSON.stringify(t)})' title="Editar">✏</button>
      <button class="btn btn-sm btn-danger" onclick="archiveTask('${t.id}')" title="Archivar">🗑</button>
    </div>`;
  }).join('');
}

function personaListHTML(personas){
  if(!personas.length) return `<div class="empty" style="padding:20px"><p>Sin personas registradas</p></div>`;
  return personas.map(p=>{
    const col=avatarColor(p.nombre);
    const m=getCoordMeta(p.coordId);
    const esJefe=p.esJefe==='true'||p.esJefe===true;
    return `<div class="persona-item">
      <div class="avatar" style="background:${col}22;color:${col}">${getInitials(p.nombre)}</div>
      <div class="persona-info">
        <div class="persona-name">${p.nombre} ${esJefe?'<span class="badge" style="background:var(--purple-light);color:var(--purple-dark);font-size:10px">Jefe/a</span>':''}</div>
        <div class="persona-role">${p.rol||''}${m?' · '+m.name:''}</div>
      </div>
      <button class="btn btn-sm btn-edit" onclick='openModal("persona",${JSON.stringify(p)})' title="Editar">✏</button>
      <button class="btn btn-sm btn-danger" onclick="deletePersona('${p.id}')" title="Eliminar">✕</button>
    </div>`;
  }).join('');
}
