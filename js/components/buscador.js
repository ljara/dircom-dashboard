// Buscador rÃ¡pido de la barra lateral

// ── Buscador sidebar ───────────────────────────────────────
function onSidebarSearch(q){
  const clearBtn = document.getElementById('search-clear');
  const resultsEl = document.getElementById('sidebar-search-results');
  if(clearBtn) clearBtn.style.display = q ? 'block' : 'none';

  if(!q.trim()){
    if(resultsEl) resultsEl.style.display='none';
    return;
  }

  const lower = q.toLowerCase();
  const matches = activeTareas().filter(t=>
    (t.titulo||'').toLowerCase().includes(lower)||
    (t.solicitante||'').toLowerCase().includes(lower)||
    (t.asignado||'').toLowerCase().includes(lower)||
    (t.descripcion||'').toLowerCase().includes(lower)
  ).slice(0,8);

  if(!resultsEl) return;

  if(!matches.length){
    resultsEl.style.display='block';
    resultsEl.innerHTML=`<div style="padding:12px 14px;font-size:12px;color:var(--text-muted)">Sin resultados para "${q}"</div>`;
    return;
  }

  resultsEl.style.display='block';
  resultsEl.innerHTML = matches.map(t=>{
    const m=getCoordMeta(t.coordId);
    const hoy=new Date();hoy.setHours(0,0,0,0);
    const vencida=t.fecha&&t.status!=='done'&&(()=>{try{return new Date(t.fecha)<hoy;}catch(e){return false;}})();
    return `<div onclick='viewTask(${JSON.stringify(t)});document.getElementById("sidebar-search").value="";onSidebarSearch("")'
      style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .1s"
      onmouseover="this.style.background='var(--gray-light)'" onmouseout="this.style.background='transparent'">
      <div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${vencida?'<span style="color:var(--red)">⚠</span> ':''}${t.titulo||''}
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:2px;display:flex;gap:8px">
        <span>${m.icon} ${m.name}</span>
        ${t.asignado?`<span>👤 ${t.asignado}</span>`:''}
        <span class="badge badge-${t.prioridad}" style="font-size:10px;padding:1px 6px">${priorLabel(t.prioridad)}</span>
      </div>
    </div>`;
  }).join('');
}
