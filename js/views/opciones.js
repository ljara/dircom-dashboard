// Vista: Opciones de las listas desplegables

// ── Opciones ───────────────────────────────────────────────
function renderOpcionesView(){
  const tipos = Object.keys(state.opciones).length
    ? Object.keys(state.opciones)
    : ['tipo_requerimiento','categoria'];

  const tipoLabel = t => t==='tipo_requerimiento'?'Tipo de requerimiento':
                         t==='categoria'?'Categoría':t;

  return `
    <div class="topbar">
      <div><div class="page-title">🏷 Opciones</div>
      <div class="page-sub">Listas desplegables disponibles al crear tareas</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">
      ${tipos.map(tipo=>{
        const valores = state.opciones[tipo]||[];
        return `<div class="section">
          <div class="section-header">
            <div class="section-title">📋 ${tipoLabel(tipo)}</div>
            <span style="font-size:12px;color:var(--text-muted)">${valores.length} opciones</span>
          </div>
          <div style="padding:8px 0">
            ${valores.length===0
              ? `<div class="empty" style="padding:16px"><p>Sin opciones aún</p></div>`
              : valores.map((v,i)=>`
                <div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid var(--border)">
                  <span style="width:20px;height:20px;border-radius:50%;background:var(--primary-light);color:var(--primary-dark);font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">${i+1}</span>
                  <span style="flex:1;font-size:13px">${v}</span>
                  <button class="btn btn-sm btn-danger" onclick="deleteOpcion('${tipo}','${v.replace(/'/g,"\\'")}')">✕</button>
                </div>`).join('')}
          </div>
          <div style="padding:10px 14px;border-top:1px solid var(--border);display:flex;gap:8px">
            <input id="nueva-opcion-${tipo}" placeholder="Nueva opción…"
              style="flex:1;padding:7px 10px;border:1px solid var(--border-md);border-radius:var(--radius-sm);font-size:13px;font-family:inherit"
              onkeydown="if(event.key==='Enter')agregarOpcion('${tipo}')">
            <button class="btn btn-primary btn-sm" onclick="agregarOpcion('${tipo}')">＋ Agregar</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

async function agregarOpcion(tipo){
  const input = document.getElementById(`nueva-opcion-${tipo}`);
  const valor = input.value.trim();
  if(!valor){ showToast('Escribe un valor primero'); return; }
  if((state.opciones[tipo]||[]).includes(valor)){ showToast('Esa opción ya existe'); return; }

  const orden = (state.opciones[tipo]||[]).length + 1;
  setSyncing(true);
  try{
    await callAPI('addOpcion', {tipo, valor, orden});
    if(!state.opciones[tipo]) state.opciones[tipo]=[];
    state.opciones[tipo].push(valor);
    input.value='';
    render();
    showToast('Opción agregada ✓');
  } catch(e){ showToast('Error: '+e.message); }
  finally{ setSyncing(false); }
}

async function deleteOpcion(tipo, valor){
  if(!confirm(`¿Eliminar "${valor}" de ${tipo}?`)) return;
  setSyncing(true);
  try{
    // Borrar por tipo+valor en Supabase
    await callAPI('deleteOpcion', {tipo, valor});
    state.opciones[tipo] = (state.opciones[tipo]||[]).filter(v=>v!==valor);
    render();
    showToast('Opción eliminada');
  } catch(e){ showToast('Error: '+e.message); }
  finally{ setSyncing(false); }
}
