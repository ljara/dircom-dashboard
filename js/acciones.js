// Acciones que guardan datos: crear, editar, cambiar estado y eliminar

// ── Actions ────────────────────────────────────────────────
// Campos obligatorios del formulario de tarea (el servidor aplica la misma regla)
const CAMPOS_OBLIGATORIOS_TAREA = [
  {input:'f-titulo',             campo:'titulo',             nombre:'título'},
  {input:'f-coord',              campo:'coordId',            nombre:'coordinación'},
  {input:'f-solicitante',        campo:'solicitante',        nombre:'solicitante'},
  {input:'f-tipo_requerimiento', campo:'tipo_requerimiento', nombre:'tipo de requerimiento'},
  {input:'f-categoria',          campo:'categoria',          nombre:'categoría'},
  {input:'f-asig',               campo:'asignado',           nombre:'persona asignada'},
  {input:'f-prior',              campo:'prioridad',          nombre:'prioridad'},
  {input:'f-status',             campo:'status',             nombre:'estado'},
  {input:'f-fecha',              campo:'fecha',              nombre:'fecha límite'}
];

async function submitTarea(existingId){
  const titulo=document.getElementById('f-titulo').value.trim();
  // Campos obligatorios (todos menos descripción y link). Al crear se exigen todos;
  // al editar no se puede vaciar uno que ya tenía valor (las tareas antiguas incompletas se pueden seguir editando)
  const original=existingId ? state.tareas.find(t=>t.id===existingId) : null;
  // Integrante: solo se envían los campos que puede cambiar
  if(original && !puedeEditarTarea(original)){
    const cambios={
      descripcion: document.getElementById('f-desc').value,
      link:        document.getElementById('f-link').value,
      status:      document.getElementById('f-status').value
    };
    closeModal();
    state.tareas=state.tareas.map(t=>t.id===existingId?{...t,...cambios}:t);
    render();
    showToast('Tarea actualizada ✓');
    try{ await callAPI('updateTarea', {id:existingId, ...cambios}); await loadData(); }
    catch(e){ showToast('Error al guardar: '+e.message); await loadData(); }
    return;
  }
  const faltan=CAMPOS_OBLIGATORIOS_TAREA.filter(c=>{
    const el=document.getElementById(c.input);
    return el && !el.value.trim() && (!original || String(original[c.campo]||'').trim());
  });
  if(faltan.length){
    showToast('Falta completar: '+faltan.map(c=>c.nombre).join(', '));
    document.getElementById(faltan[0].input).focus();
    return;
  }

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
    es_jefe:         document.getElementById('p-permisos').value==='coordinador',
    gestiona_tareas: document.getElementById('p-permisos').value==='gestiona',
    gestiona_coord:  document.getElementById('p-permisos').value==='gestionaCoord'
  };
  // Coordinación y permisos solo los cambia la directora
  if(!esDirector()){ delete body.coord_id; delete body.es_jefe; delete body.gestiona_tareas; delete body.gestiona_coord; }
  // El correo (para entrar con Google) solo lo ve y edita la directora
  const elCorreo=document.getElementById('p-correo');
  if(elCorreo){
    const correo=elCorreo.value.trim().toLowerCase();
    if(correo && !/^[^@\s]+@ufrontera\.cl$/.test(correo)){ showToast('El correo debe ser @ufrontera.cl'); elCorreo.focus(); return; }
    body.correo=correo;
  }
  closeModal();

  // ── Optimistic update ──
  const tempId = existingId || ('p' + Date.now());
  const previa = existingId ? state.personas.find(p=>p.id===existingId) : null;
  const optimisticPersona = normalizePersona({
    id: tempId,
    ...(previa ? {coord_id: previa.coordId, es_jefe: previa.esJefe, gestiona_tareas: previa.gestiona, gestiona_coord: previa.gestionaCoord, correo: previa.correo} : {}),
    ...body
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
  // La fecha de término la registra el servidor; aquí se refleja de inmediato en pantalla
  const completado = t => status==='done' ? (t.completado||new Date().toISOString()) : '';
  state.tareas=state.tareas.map(t=>t.id===id?{...t,status,completado:completado(t)}:t);
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
