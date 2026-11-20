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

  // Mismos campos que la búsqueda de "Todas las tareas", para que "Ver todas" muestre el mismo total
  const lower = q.toLowerCase();
  const todas = activeTareas().filter(t=>
    ['titulo','solicitante','asignado','descripcion','tipo_requerimiento','categoria','campana','programa']
      .some(c=>(t[c]||'').toLowerCase().includes(lower))
  );
  const MAX = 8;
  const matches = todas.slice(0,MAX);

  if(!resultsEl) return;

  if(!matches.length){
    resultsEl.style.display='block';
    resultsEl.innerHTML=`<div style="padding:12px 14px;font-size:12px;color:var(--text-muted)">Sin resultados para "${q}"</div>`;
    return;
  }

  resultsEl.style.display='block';
  const n = todas.length;
  // Total encontrado como número destacado; queda fijo arriba al desplazar la lista
  const total = `<div style="position:sticky;top:0;z-index:1;padding:6px 12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);background:var(--gray-light)">
      <span style="font-size:18px;font-weight:700;color:var(--text);line-height:1">${n}</span>
      <span style="font-size:11px;color:var(--text-muted)">tarea${n!==1?'s':''} encontrada${n!==1?'s':''}${n>MAX?` · se muestran ${MAX}`:''}</span>
    </div>`;
  const verTodas = n>MAX ? `<div onclick="buscarEnTareas()" style="padding:8px 12px;cursor:pointer;font-size:12px;font-weight:500;color:var(--primary-dark,#00447F);text-align:center"
      onmouseover="this.style.background='var(--gray-light)'" onmouseout="this.style.background='transparent'">
      Ver los ${n} en Todas las tareas →
    </div>` : '';
  resultsEl.innerHTML = total + matches.map(t=>{
    const m=getCoordMeta(t.coordId);
    const hoy=new Date();hoy.setHours(0,0,0,0);
    const vencida=t.fecha&&t.status!=='done'&&(()=>{try{return fechaLocal(t.fecha)<hoy;}catch(e){return false;}})();
    return `<div onclick='viewTask(${jsonAttr(t)});document.getElementById("sidebar-search").value="";onSidebarSearch("")'
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
  }).join('') + verTodas;
}

// Lleva la búsqueda del buscador lateral a "Todas las tareas", sin otros filtros
function buscarEnTareas(){
  const input = document.getElementById('sidebar-search');
  const q = input ? input.value : '';
  if(input) input.value='';
  onSidebarSearch('');
  verTareas();
  state.busqueda = q;
  render();
}
