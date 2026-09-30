// Vista: Papelera (tareas archivadas)

// ── Papelera ───────────────────────────────────────────────
function renderPapelera(){
  const archivadas = state.tareas.filter(t=>t.status==='archivada');
  return `
    <div class="topbar">
      <div><div class="page-title">🗑 Papelera</div>
      <div class="page-sub">${archivadas.length} tareas archivadas</div></div>
    </div>
    <div class="section">
      <div class="section-header">
        <div class="section-title">Tareas archivadas</div>
        ${archivadas.length?`<button class="btn btn-sm btn-danger" onclick="emptyTrash()">Vaciar papelera</button>`:''}
      </div>
      ${archivadas.length===0
        ? `<div class="empty"><div class="empty-icon">🗑</div><p>La papelera está vacía</p></div>`
        : archivadas.map(t=>{
            const m=getCoordMeta(t.coordId);
            return `<div class="task-item">
              <div class="task-status-dot" style="background:var(--gray)"></div>
              <div class="task-body">
                <div class="task-title" style="color:var(--text-muted);text-decoration:line-through">${t.titulo||''}</div>
                <div class="task-meta">
                  <span>${m.icon} ${m.name}</span>
                  ${t.asignado?`<span>👤 ${t.asignado}</span>`:''}
                  ${t.fecha?`<span>📅 ${formatFecha(t.fecha)}</span>`:''}
                </div>
              </div>
              <button class="btn btn-sm" onclick="restoreTask('${t.id}')" style="color:var(--green);border-color:transparent">↩ Restaurar</button>
              <button class="btn btn-sm btn-danger" onclick="deleteTaskPermanent('${t.id}')">✕ Eliminar</button>
            </div>`;
          }).join('')
      }
    </div>`;
}

async function archiveTask(id){
  state.tareas=state.tareas.map(t=>t.id===id?{...t,status:'archivada'}:t);
  render();
  try{
    await callAPI('updateTarea', {id, status:'archivada'});
    showToast('Tarea archivada — puedes restaurarla desde la Papelera');
  } catch(e){ showToast('Error al archivar: '+e.message); }
}

async function restoreTask(id){
  state.tareas=state.tareas.map(t=>t.id===id?{...t,status:'todo'}:t);
  render();
  try{
    await callAPI('updateTarea', {id, status:'todo'});
    showToast('Tarea restaurada ✓');
  } catch(e){ showToast('Error al restaurar: '+e.message); }
}

async function deleteTaskPermanent(id){
  if(!confirm('¿Eliminar definitivamente? Esta acción no se puede deshacer.')) return;
  state.tareas=state.tareas.filter(t=>t.id!==id);
  render();
  try{ await callAPI('deleteTarea', {id}); showToast('Tarea eliminada definitivamente'); }
  catch(e){ showToast('Error al eliminar.'); await loadData(); }
}

async function emptyTrash(){
  if(!confirm('¿Vaciar la papelera? Se eliminarán todas las tareas archivadas de forma permanente.')) return;
  const archivadas=state.tareas.filter(t=>t.status==='archivada');
  state.tareas=state.tareas.filter(t=>t.status!=='archivada');
  render();
  try{
    await Promise.all(archivadas.map(t=>callAPI('deleteTarea',{id:t.id})));
    showToast('Papelera vaciada');
  } catch(e){ showToast('Error al vaciar papelera.'); await loadData(); }
}
