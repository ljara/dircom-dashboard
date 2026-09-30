// Formularios (tarea, persona, coordinaciÃ³n) y detalle de tarea

// ── Modals ─────────────────────────────────────────────────
function openModal(type, item){
  document.getElementById('modal').style.display='flex';
  const inner=document.getElementById('modal-inner');
  const isEdit = item !== null;

  if(type==='tarea'){
    const extras = extraFields(state.tareasHeaders, SYSTEM_FIELDS_TAREA);
    // Helper: genera select de opciones desde la pestaña opciones
    const opSelect = (fieldKey, currentVal, placeholder) => {
      const opts = state.opciones[fieldKey] || [];
      if(!opts.length) return `<input id="f-${fieldKey}" value="${isEdit?escHtml(String(item[fieldKey]||'')):''}" placeholder="${placeholder}">`;
      return `<select id="f-${fieldKey}">
        <option value="">${placeholder}</option>
        ${opts.map(o=>`<option value="${escHtml(o)}"${isEdit&&String(item[fieldKey])===String(o)?' selected':''}>${escHtml(o)}</option>`).join('')}
      </select>`;
    };
    inner.innerHTML=`
      <div class="modal-header">
        <h2>${isEdit?'Editar tarea':'Nueva tarea'}</h2>
        <button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group"><label>Título *</label><input id="f-titulo" value="${isEdit?escHtml(item.titulo||''):''}" placeholder="Nombre de la tarea"></div>
        <div class="form-group"><label>Descripción</label><textarea id="f-desc">${isEdit?escHtml(item.descripcion||''):''}</textarea></div>
        <div class="form-group"><label>Coordinación *</label>
          <select id="f-coord">${state.coordinaciones.map(c=>{const m=getCoordMeta(c.id);return`<option value="${c.id}"${isEdit&&String(item.coordId)===String(c.id)?' selected':(!isEdit&&state.filterCoord===c.id?' selected':'')}>${m.icon} ${m.name}</option>`;}).join('')}</select>
        </div>
        <div class="form-group"><label>Solicitante</label><input id="f-solicitante" value="${isEdit?escHtml(item.solicitante||''):''}" placeholder="Nombre del solicitante"></div>
        <div class="form-group"><label>Tipo de requerimiento</label>${opSelect('tipo_requerimiento', isEdit?item.tipo_requerimiento:'', 'Seleccionar tipo…')}</div>
        <div class="form-group"><label>Categoría</label>${opSelect('categoria', isEdit?item.categoria:'', 'Seleccionar categoría…')}</div>
        <div class="form-group"><label>Asignado a</label>
          <select id="f-asig"><option value="">Sin asignar</option>${state.personas.map(p=>`<option value="${p.nombre}"${isEdit&&item.asignado===p.nombre?' selected':''}>${p.nombre}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Prioridad</label>
          <select id="f-prior">
            <option value="baja"${isEdit&&item.prioridad==='baja'?' selected':''}>Baja</option>
            <option value="media"${!isEdit||item.prioridad==='media'?' selected':''}>Media</option>
            <option value="alta"${isEdit&&item.prioridad==='alta'?' selected':''}>Alta</option>
          </select>
        </div>
        <div class="form-group"><label>Estado</label>
          <select id="f-status">
            ${['todo','progress','review','done'].map(s=>`<option value="${s}"${isEdit&&item.status===s?' selected':(!isEdit&&s==='todo'?' selected':'')}>${statusLabel(s)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Fecha límite</label><input type="date" id="f-fecha" value="${isEdit?(item.fecha||''):''}"></div>
        <div class="form-group"><label>Link</label><input id="f-link" type="url" value="${isEdit?escHtml(item.link||''):''}" placeholder="https://"></div>
        ${extras.length?`<div style="font-size:11px;color:var(--text-faint);margin-bottom:8px;margin-top:4px;text-transform:uppercase;letter-spacing:.05em">Campos adicionales</div>`:''}
        ${extras.map(f=>`<div class="form-group field-extra"><label>${f}</label><input id="f-extra-${f}" value="${isEdit?escHtml(String(item[f]||'')):''}" placeholder="${f}"></div>`).join('')}
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="submitTarea(${isEdit?`'${item.id}'`:'null'})">${isEdit?'Guardar cambios':'Agregar tarea'}</button>
      </div>`;

  } else if(type==='persona'){
    const extras = extraFields(state.personasHeaders, SYSTEM_FIELDS_PERSONA);
    inner.innerHTML=`
      <div class="modal-header">
        <h2>${isEdit?'Editar persona':'Agregar persona'}</h2>
        <button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group"><label>Nombre completo *</label><input id="p-nombre" value="${isEdit?escHtml(item.nombre||''):''}" placeholder="Nombre Apellido"></div>
        <div class="form-group"><label>Cargo / Rol</label><input id="p-rol" value="${isEdit?escHtml(item.rol||''):''}" placeholder="Ej: Diseñador/a, Periodista…"></div>
        <div class="form-group"><label>Coordinación *</label>
          <select id="p-coord">${state.coordinaciones.map(c=>{const m=getCoordMeta(c.id);return`<option value="${c.id}"${isEdit&&String(item.coordId)===String(c.id)?' selected':''}>${m.icon} ${m.name}</option>`;}).join('')}</select>
        </div>
        <div class="form-group"><label>¿Es jefe/a de coordinación?</label>
          <select id="p-jefe">
            <option value="false"${isEdit&&item.esJefe!=='true'&&item.esJefe!==true?' selected':''}>No</option>
            <option value="true"${isEdit&&(item.esJefe==='true'||item.esJefe===true)?' selected':''}>Sí</option>
          </select>
        </div>
        ${extras.length?`<div style="font-size:11px;color:var(--text-faint);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Campos adicionales del Sheet</div>`:''}
        ${extras.map(f=>`<div class="form-group field-extra"><label>${f}</label><input id="p-extra-${f}" value="${isEdit?escHtml(String(item[f]||'')):''}" placeholder="${f}"></div>`).join('')}
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="submitPersona(${isEdit?`'${item.id}'`:'null'})">${isEdit?'Guardar cambios':'Agregar'}</button>
      </div>`;

  } else if(type==='coordinacion'){
    inner.innerHTML=`
      <div class="modal-header"><h2>Nueva coordinación</h2><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-group"><label>ID único *</label><input id="c-id" placeholder="Ej: radio, prensa, digital (sin espacios)"></div>
        <div class="form-group"><label>Nombre *</label><input id="c-nombre" placeholder="Ej: UFRO Radio"></div>
        <div class="form-group"><label>Ícono (emoji)</label><input id="c-icon" placeholder="📻" maxlength="4"></div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="submitCoord()">Agregar coordinación</button>
      </div>`;
  }
}

function closeModal(){ document.getElementById('modal').style.display='none'; }

// ── Vista detallada de tarea ───────────────────────────────
function viewTask(t){
  const m = getCoordMeta(t.coordId);
  const extras = extraFields(state.tareasHeaders, SYSTEM_FIELDS_TAREA);

  const statusColors = {
    todo:     {bg:'var(--gray-light)',    color:'#444'},
    progress: {bg:'rgba(55,138,221,.13)',color:'#0C447C'},
    review:   {bg:'var(--amber-light)',   color:'#633806'},
    done:     {bg:'var(--green-light)',   color:'#27500A'}
  };
  const sc = statusColors[t.status] || statusColors.todo;

  const formatDate = (d) => {
    if(!d) return '<span style="color:var(--text-faint)">—</span>';
    try{ return new Date(d).toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'}); }
    catch(e){ return escHtml(String(d)); }
  };

  const field = (label, value) => `
    <div class="detail-field">
      <div class="d-label">${label}</div>
      <div class="d-value">${value}</div>
    </div>`;

  const extrasHTML = extras
    .filter(f => t[f] !== undefined && String(t[f]).trim() !== '')
    .map(f => field(f, escHtml(String(t[f]))))
    .join('');

  document.getElementById('modal').style.display='flex';
  document.getElementById('modal-inner').innerHTML = `
    <div class="modal-header">
      <h2>Detalle de tarea</h2>
      <button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="task-detail-header">
        <div class="task-detail-icon" style="background:${m.bg}">${m.icon}</div>
        <div>
          <div class="task-detail-title">${escHtml(t.titulo||'Sin título')}</div>
          <div class="task-detail-coord">${m.name}</div>
        </div>
      </div>
      <div class="detail-grid">
        ${field('Estado', `<span style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:4px;background:${sc.bg};color:${sc.color};font-size:12px;font-weight:500"><span style="width:7px;height:7px;border-radius:50%;background:${sc.color};display:inline-block"></span>${statusLabel(t.status)}</span>`)}
        ${field('Prioridad', `<span class="badge badge-${t.prioridad}">${priorLabel(t.prioridad)}</span>`)}
        ${field('Solicitante', t.solicitante ? escHtml(String(t.solicitante)) : '<span style="color:var(--text-faint)">—</span>')}
        ${field('Tipo de requerimiento', t.tipo_requerimiento ? escHtml(String(t.tipo_requerimiento)) : '<span style="color:var(--text-faint)">—</span>')}
        ${field('Categoría', t.categoria ? escHtml(String(t.categoria)) : '<span style="color:var(--text-faint)">—</span>')}
        ${field('Fecha de creación', formatDate(t.created))}
        ${field('Fecha límite', t.fecha ? `📅 ${formatFecha(t.fecha)}` : '<span style="color:var(--text-faint)">Sin fecha</span>')}
        ${t.status==='done' ? field('Fecha de término', t.completado ? formatDate(t.completado) : '<span style="color:var(--text-faint)">No registrada</span>') : ''}
        ${field('Asignado a', t.asignado
          ? `<span style="display:flex;align-items:center;gap:6px"><span style="width:22px;height:22px;border-radius:50%;background:${avatarColor(t.asignado)}22;color:${avatarColor(t.asignado)};display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:600">${getInitials(t.asignado)}</span>${escHtml(t.asignado)}</span>`
          : '<span style="color:var(--text-faint)">Sin asignar</span>')}
      </div>
      ${t.descripcion ? `<div class="detail-desc"><div class="d-label">Descripción</div><div class="d-value">${escHtml(String(t.descripcion))}</div></div>` : ''}
      ${t.link ? `<div class="detail-desc"><div class="d-label">Link</div><div class="d-value"><a href="${escHtml(String(t.link))}" target="_blank" rel="noopener" style="color:var(--blue);text-decoration:underline;word-break:break-all">${escHtml(String(t.link))}</a></div></div>` : ''}
      ${extrasHTML ? `<div class="detail-grid" style="margin-top:10px">${extrasHTML}</div>` : ''}
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cerrar</button>
      <button class="btn btn-edit" onclick='closeModal();openModal("tarea",${JSON.stringify(t)})'>✏ Editar tarea</button>
    </div>`;
}
