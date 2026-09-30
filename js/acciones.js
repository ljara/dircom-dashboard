// Acciones que guardan datos: crear, editar, cambiar estado y eliminar

// ── Actions ────────────────────────────────────────────────
async function submitTarea(existingId){
  const titulo=document.getElementById('f-titulo').value.trim();
  if(!titulo){ showToast('El título es obligatorio'); return; }

  const extras = extraFields(state.tareasHeaders, SYSTEM_FIELDS_TAREA);
  const extraData = {};
  extras.forEach(f=>{ const el=document.getElementById('f-extra-'+f); if(el) extraData[f]=el.value; });

  const body={
    titulo,
    descripcion:        document.getElementById('f-desc').value,
    coord_id:           document.getElementById('f-coord').value,
    solicitante:        document.getElementById('f-solicitante').value,
    tipo_requerimiento: document.getElementById('f-tipo_requerimiento').value,
    categoria:          document.getElementById('f-categoria').value,
    asignado:           document.getElementById('f-asig').value,
    prioridad:          document.getElementById('f-prior').value,
    status:             document.getElementById('f-status').value,
    fecha:              document.getElementById('f-fecha').value||null,
    link:               document.getElementById('f-link').value,
    ...extraData
  };

  closeModal();

  // ── Optimistic update: actualizar UI inmediatamente ──
  const tempId = existingId || ('t' + Date.now());
  const optimisticTarea = normalizeTarea({
    id: tempId, ...body,
    coord_id: body.coord_id,
    created_at: existingId
      ? (state.tareas.find(t=>t.id===existingId)?.created || new Date().toISOString())
      : new Date().toISOString()
  });

  if(existingId){
    state.tareas = state.tareas.map(t => t.id===existingId ? optimisticTarea : t);
  } else {
    state.tareas = [optimisticTarea, ...state.tareas];
  }
  render();
  showToast(existingId?'Tarea actualizada ✓':'Tarea agregada ✓');

  // ── Confirmar en servidor en segundo plano ──
  try{
    if(existingId){
      await callAPI('updateTarea', {id:existingId, ...body});
    } else {
      await callAPI('addTarea', body);
    }
    // Recargar para sincronizar ID real del servidor
    await loadData();
  } catch(e){
    showToast('Error al guardar: '+e.message);
    await loadData(); // revertir
  }
}

async function submitPersona(existingId){
  const nombre=document.getElementById('p-nombre').value.trim();
  if(!nombre){ showToast('El nombre es obligatorio'); return; }
  const body={
    nombre,
    rol:      document.getElementById('p-rol').value,
    coord_id: document.getElementById('p-coord').value,
    es_jefe:  document.getElementById('p-jefe').value==='true'
  };
  closeModal();

  // ── Optimistic update ──
  const tempId = existingId || ('p' + Date.now());
  const optimisticPersona = normalizePersona({
    id: tempId, ...body,
    es_jefe: body.es_jefe
  });
  if(existingId){
    state.personas = state.personas.map(p => p.id===existingId ? optimisticPersona : p);
  } else {
    state.personas = [...state.personas, optimisticPersona];
  }
  render();
  showToast(existingId?'Persona actualizada ✓':'Persona agregada ✓');

  try{
    if(existingId){ await callAPI('updatePersona', {id:existingId, ...body}); }
    else { await callAPI('addPersona', body); }
    await loadData();
  } catch(e){ showToast('Error al guardar: '+e.message); await loadData(); }
}

async function submitCoord(){
  const id=document.getElementById('c-id').value.trim().replace(/\s+/g,'').toLowerCase();
  const nombre=document.getElementById('c-nombre').value.trim();
  if(!id||!nombre){ showToast('ID y nombre son obligatorios'); return; }
  if(state.coordinaciones.find(c=>c.id===id)){ showToast('Ya existe una coordinación con ese ID'); return; }
  const body={id,nombre,icon:document.getElementById('c-icon').value.trim()||'📁'};
  closeModal();

  // Optimistic update
  state.coordinaciones = [...state.coordinaciones, normalizeCoord(body)];
  renderSidebarCoords();
  render();
  showToast('Coordinación agregada ✓');

  try{ await callAPI('addCoordinacion', body); await loadData(); }
  catch(e){ showToast('Error: '+e.message); await loadData(); }
}

async function changeStatus(id,status){
  state.tareas=state.tareas.map(t=>t.id===id?{...t,status}:t);
  render();
  try{ await callAPI('updateTarea', {id, status}); showToast('Estado actualizado ✓'); }
  catch(e){ showToast('Error al actualizar.'); await loadData(); }
}

async function deleteTask(id){
  if(!confirm('¿Eliminar esta tarea?')) return;
  state.tareas=state.tareas.filter(t=>t.id!==id);
  render();
  try{ await callAPI('deleteTarea', {id}); showToast('Tarea eliminada'); }
  catch(e){ showToast('Error.'); await loadData(); }
}

async function deletePersona(id){
  if(!confirm('¿Eliminar esta persona?')) return;
  state.personas=state.personas.filter(p=>p.id!==id);
  render();
  try{ await callAPI('deletePersona', {id}); showToast('Persona eliminada'); }
  catch(e){ showToast('Error.'); await loadData(); }
}

async function deleteCoord(id){
  if(!confirm('¿Eliminar esta coordinación? Las tareas y personas asociadas quedarán sin coordinación.')) return;
  state.coordinaciones=state.coordinaciones.filter(c=>c.id!==id);
  render();
  try{ await callAPI('deleteCoordinacion', {id}); await loadData(); showToast('Coordinación eliminada'); }
  catch(e){ showToast('Error.'); await loadData(); }
}
