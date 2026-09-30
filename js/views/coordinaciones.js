// Vista: Coordinaciones

// ── Coordinaciones view ────────────────────────────────────
function renderCoordsView(){
  return `
    <div class="topbar">
      <div><div class="page-title">Coordinaciones</div><div class="page-sub">${state.coordinaciones.length} coordinaciones activas</div></div>
      <button class="btn btn-primary" onclick="openModal('coordinacion',null)">＋ Nueva coordinación</button>
    </div>
    <div class="section">
      <div class="section-header"><div class="section-title">⚙ Listado</div></div>
      ${state.coordinaciones.length===0?`<div class="empty"><div class="empty-icon">📋</div><p>Sin coordinaciones</p></div>`:
        state.coordinaciones.map((c)=>{
          const m=getCoordMeta(c.id);
          const cnt=tasksFor(c.id).length;
          const pers=state.personas.filter(p=>String(p.coordId)===String(c.id)).length;
          return `<div class="persona-item">
            <div class="avatar" style="background:${m.bg};color:${m.hex};font-size:17px;width:36px;height:36px">${m.icon}</div>
            <div class="persona-info">
              <div class="persona-name">${m.name}</div>
              <div class="persona-role">ID: ${c.id} · ${cnt} tareas · ${pers} personas</div>
            </div>
            <button class="btn btn-sm btn-danger" onclick="deleteCoord('${c.id}')">✕ Eliminar</button>
          </div>`;
        }).join('')}
    </div>`;
}
