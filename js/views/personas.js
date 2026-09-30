// Vista: Equipo

// ── Personas view ──────────────────────────────────────────
function renderPersonasView(){
  return `
    <div class="topbar">
      <div><div class="page-title">Equipo</div><div class="page-sub">${state.personas.length} personas registradas</div></div>
      <button class="btn btn-primary" onclick="openModal('persona',null)">＋ Agregar persona</button>
    </div>
    ${state.coordinaciones.map((c)=>{
      const m=getCoordMeta(c.id);
      const pers=state.personas.filter(p=>String(p.coordId)===String(c.id));
      return `<div class="section">
        <div class="section-header">
          <div class="section-title">
            <span style="width:26px;height:26px;border-radius:6px;font-size:14px;display:inline-flex;align-items:center;justify-content:center;background:${m.bg}">${m.icon}</span>
            ${m.name}
          </div>
          <span style="font-size:12px;color:var(--text-muted)">${pers.length} personas</span>
        </div>
        ${personaListHTML(pers)}
      </div>`;
    }).join('')}`;
}
