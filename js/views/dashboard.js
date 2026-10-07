// Vista: Dashboard general y listado de tareas vencidas

// ── Dashboard ──────────────────────────────────────────────
function renderDashboard(){
  const hoy = new Date();
  hoy.setHours(0,0,0,0);

  const periodo = state.filtroPeriodo || 'todo';
  let tareasBase = activeTareas();
  if(periodo==='semana'){
    const ini=new Date(hoy);ini.setDate(hoy.getDate()-hoy.getDay());
    tareasBase=tareasBase.filter(t=>{try{const d=new Date(t.created);return d>=ini&&d<=hoy;}catch(e){return false;}});
  } else if(periodo==='mes'){
    const ini=new Date(hoy.getFullYear(),hoy.getMonth(),1);
    tareasBase=tareasBase.filter(t=>{try{const d=new Date(t.created);return d>=ini&&d<=hoy;}catch(e){return false;}});
  }

  const total    = tareasBase.length;
  const done     = tareasBase.filter(t=>t.status==='done').length;
  const progress = tareasBase.filter(t=>t.status==='progress').length;
  const alta     = tareasBase.filter(t=>t.prioridad==='alta'&&t.status!=='done').length;

  const vencidas = activeTareas().filter(t=>{
    if(!t.fecha||t.status==='done') return false;
    try{ return new Date(t.fecha)<hoy; }catch(e){ return false; }
  });

  // Carga por persona
  const cargaMap={};
  tareasBase.filter(t=>t.asignado&&t.status!=='done').forEach(t=>{
    cargaMap[t.asignado]=(cargaMap[t.asignado]||0)+1;
  });
  const cargaTop=Object.entries(cargaMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const cargaMax=cargaTop.length?cargaTop[0][1]:1;

  const estados  = ['todo','progress','review','done'];
  const conteos  = estados.map(s=>tareasBase.filter(t=>t.status===s).length);
  const colores  = {todo:'#888780',progress:'#378ADD',review:'#EF9F27',done:'#639922'};

  // Dona distribución por ESTADO
  const donaEstadoHTML = ()=>{
    if(!total) return `<div class="empty" style="padding:24px"><p>Sin tareas en el período</p></div>`;
    const r=54,cx=70,cy=70,circum=2*Math.PI*r;
    let off=0;
    const slices=estados.map((s,i)=>{
      const dash=total?conteos[i]/total*circum:0;
      const sl=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colores[s]}" stroke-width="18"
        stroke-dasharray="${dash} ${circum-dash}" stroke-dashoffset="${-off}" transform="rotate(-90 ${cx} ${cy})" style="transition:all .4s"/>`;
      off+=dash; return sl;
    }).join('');
    const legend=estados.map((s,i)=>conteos[i]>0?`
      <div style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:5px">
        <span style="width:10px;height:10px;border-radius:50%;background:${colores[s]};flex-shrink:0"></span>
        <span style="color:var(--text-muted);flex:1">${statusLabel(s)}</span>
        <span style="font-weight:600">${conteos[i]}</span>
      </div>`:'').join('');
    return `<div style="display:flex;align-items:center;gap:20px;padding:12px 16px">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--gray-light)" stroke-width="18"/>
        ${slices}
        <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="18" font-weight="700" fill="var(--text)">${total}</text>
        <text x="${cx}" y="${cy+16}" text-anchor="middle" font-size="10" fill="var(--text-faint)">tareas</text>
      </svg>
      <div style="flex:1">${legend}</div>
    </div>`;
  };

  // Dona distribución por COORDINACIÓN
  const donaCoordHTML = ()=>{
    const coordTotals = state.coordinaciones.map(c=>({
      c, m:getCoordMeta(c.id),
      cnt:tareasBase.filter(t=>String(t.coordId)===String(c.id)).length
    })).filter(x=>x.cnt>0);
    const grandTotal = coordTotals.reduce((s,x)=>s+x.cnt,0);
    if(!grandTotal) return `<div class="empty" style="padding:24px"><p>Sin tareas en el período</p></div>`;
    const r=54,cx=70,cy=70,circum=2*Math.PI*r;
    let off=0;
    const slices=coordTotals.map((x,i)=>{
      const dash=x.cnt/grandTotal*circum;
      const sl=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${x.m.hex}" stroke-width="18"
        stroke-dasharray="${dash} ${circum-dash}" stroke-dashoffset="${-off}" transform="rotate(-90 ${cx} ${cy})" style="transition:all .4s"/>`;
      off+=dash; return sl;
    }).join('');
    const legend=coordTotals.map(x=>`
      <div style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:5px;cursor:pointer" onclick="filterByCoord('${x.c.id}')">
        <span style="width:10px;height:10px;border-radius:50%;background:${x.m.hex};flex-shrink:0"></span>
        <span style="color:var(--text-muted);flex:1">${x.m.icon} ${x.m.name}</span>
        <span style="font-weight:600">${x.cnt}</span>
      </div>`).join('');
    return `<div style="display:flex;align-items:center;gap:20px;padding:12px 16px">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--gray-light)" stroke-width="18"/>
        ${slices}
        <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="18" font-weight="700" fill="var(--text)">${grandTotal}</text>
        <text x="${cx}" y="${cy+16}" text-anchor="middle" font-size="10" fill="var(--text-faint)">tareas</text>
      </svg>
      <div style="flex:1">${legend}</div>
    </div>`;
  };

  return `
    <div class="topbar">
      <div><div class="page-title">Dashboard general</div>
      <div class="page-sub">${total} tareas activas · ${state.personas.length} personas · ${state.coordinaciones.length} coordinaciones</div></div>
      <div class="topbar-actions">
        <div style="display:flex;gap:4px;background:var(--gray-light);border-radius:var(--radius-sm);padding:3px">
          ${['todo','semana','mes'].map(p=>`<button onclick="state.filtroPeriodo='${p}';render()" style="padding:4px 12px;border-radius:4px;border:none;font-size:12px;cursor:pointer;font-family:inherit;background:${periodo===p?'var(--surface)':'transparent'};color:${periodo===p?'var(--text)':'var(--text-muted)'};font-weight:${periodo===p?'500':'400'}">${p==='todo'?'Todo':p==='semana'?'Esta semana':'Este mes'}</button>`).join('')}
        </div>
        ${esDirector()?`<button class="btn" onclick="openModal('persona',null)">＋ Persona</button>`:''}
        <button class="btn btn-primary" onclick="openModal('tarea',null)">＋ Nueva tarea</button>
        ${esDirector()?`<button class="btn" onclick="setView('reportes')" style="background:#1a1a1a;color:#fff;border-color:#1a1a1a">📈 Reportes</button>`:''}
      </div>
    </div>

    <div class="metrics">
      <div class="metric"><div class="m-label">Total tareas</div><div class="m-value">${total}</div><div class="m-sub">período seleccionado</div></div>
      <div class="metric"><div class="m-label">Completadas</div><div class="m-value" style="color:var(--green)">${done}</div><div class="m-sub">${total?Math.round(done/total*100):0}% del total</div></div>
      <div class="metric"><div class="m-label">En progreso</div><div class="m-value" style="color:var(--blue)">${progress}</div><div class="m-sub">activas ahora</div></div>
      <div class="metric"><div class="m-label">Alta prioridad</div><div class="m-value" style="color:var(--red)">${alta}</div><div class="m-sub">pendientes</div></div>
      <div class="metric" style="cursor:${vencidas.length?'pointer':'default'};${vencidas.length?'border-color:var(--red);background:#FFFAFA':''}" onclick="${vencidas.length?'mostrarVencidas()':''}">
        <div class="m-label" style="${vencidas.length?'color:var(--red)':''}">⚠ Vencidas</div>
        <div class="m-value" style="color:${vencidas.length?'var(--red)':'var(--text-faint)'}">${vencidas.length}</div>
        <div class="m-sub" style="${vencidas.length?'color:var(--red)':''}">${vencidas.length?'clic para ver listado':'al día ✓'}</div>
      </div>
    </div>

    <div class="dash-tres">
      <div class="section">
        <div class="section-header"><div class="section-title">📊 Por estado</div></div>
        ${donaEstadoHTML()}
      </div>
      <div class="section">
        <div class="section-header"><div class="section-title">🏢 Por coordinación</div></div>
        ${donaCoordHTML()}
      </div>
      <div class="section">
        <div class="section-header"><div class="section-title">👤 Carga por persona</div></div>
        ${cargaTop.length===0
          ? `<div class="empty" style="padding:24px"><p>Sin tareas asignadas</p></div>`
          : `<div style="padding:12px 16px">${cargaTop.map(([nombre,cnt])=>`
            <div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                <span style="display:flex;align-items:center;gap:6px">
                  <span style="width:20px;height:20px;border-radius:50%;background:${avatarColor(nombre)}22;color:${avatarColor(nombre)};display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700">${getInitials(nombre)}</span>
                  ${nombre}
                </span>
                <span style="font-weight:600;color:var(--text)">${cnt}</span>
              </div>
              <div style="height:5px;background:var(--gray-light);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${Math.round(cnt/cargaMax*100)}%;background:${avatarColor(nombre)};border-radius:3px"></div>
              </div>
            </div>`).join('')}</div>`
        }
      </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div style="font-size:14px;font-weight:600">Coordinaciones</div>
      <button class="btn btn-sm btn-ghost" onclick="setView('coordinaciones')">Gestionar →</button>
    </div>
    <div class="cards-grid">
      ${state.coordinaciones.map((c)=>{
        const m=getCoordMeta(c.id);
        const pct=completedPct(c.id);
        const cnt=tasksFor(c.id).length;
        const pers=state.personas.filter(p=>String(p.coordId)===String(c.id)).length;
        const venc=vencidas.filter(t=>String(t.coordId)===String(c.id)).length;
        const jefe=state.personas.find(p=>String(p.coordId)===String(c.id)&&(p.esJefe==='true'||p.esJefe===true));
        return `<div class="coord-card" onclick="filterByCoord('${c.id}')">
          <div class="coord-card-header">
            <div class="coord-icon-wrap" style="background:${m.bg}">${m.icon}</div>
            <div style="flex:1"><div class="coord-card-name">${m.name}</div>
            <div class="coord-card-jefe">${jefe?jefe.nombre:'Sin jefe asignado'}</div></div>
            ${venc?`<span style="background:var(--red-light);color:var(--red);font-size:10px;font-weight:600;padding:2px 7px;border-radius:4px">⚠ ${venc}</span>`:''}
          </div>
          <div class="coord-stats"><span>☑ ${cnt} tareas</span><span>👤 ${pers} personas</span></div>
          <div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:${m.hex}"></div></div>
          <div class="prog-pct">${pct}% completado</div>
        </div>`;
      }).join('')}
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-title">☑ Tareas recientes</div>
        <button class="btn btn-sm btn-ghost" onclick="setView('tareas')">Ver todas →</button>
      </div>
      ${taskListHTML(activeTareas().slice().reverse().slice(0,8))}
    </div>`;
}

// Modal listado de vencidas
function mostrarVencidas(){
  const hoy=new Date();hoy.setHours(0,0,0,0);
  const vencidas=activeTareas().filter(t=>{
    if(!t.fecha||t.status==='done') return false;
    try{ return new Date(t.fecha)<hoy; }catch(e){ return false; }
  });
  document.getElementById('modal').style.display='flex';
  document.getElementById('modal-inner').innerHTML=`
    <div class="modal-header">
      <h2 style="color:var(--red)">⚠ Tareas vencidas (${vencidas.length})</h2>
      <button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body" style="padding:0">
      ${vencidas.length===0
        ? `<div class="empty"><div class="empty-icon">✅</div><p>No hay tareas vencidas</p></div>`
        : vencidas.map(t=>{
            const m=getCoordMeta(t.coordId);
            const diasStr=(()=>{
              try{
                const diff=Math.floor((hoy-new Date(t.fecha))/(1000*60*60*24));
                return `vencida hace ${diff} día${diff!==1?'s':''}`;
              }catch(e){return '';}
            })();
            return `<div class="task-item" style="border-bottom:1px solid var(--border)">
              <div class="task-status-dot" style="background:var(--red)"></div>
              <div class="task-body">
                <div class="task-title">${t.titulo||''}</div>
                <div class="task-meta">
                  <span>${m.icon} ${m.name}</span>
                  ${t.asignado?`<span>👤 ${t.asignado}</span>`:''}
                  <span style="color:var(--red);font-weight:500">📅 ${formatFecha(t.fecha)} · ${diasStr}</span>
                </div>
              </div>
              <button class="btn btn-sm btn-edit" onclick='closeModal();openModal("tarea",${JSON.stringify(t)})' title="Editar">✏</button>
            </div>`;
          }).join('')
      }
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cerrar</button>
      <button class="btn btn-primary" onclick="closeModal();setView('tareas')">Ver todas las tareas →</button>
    </div>`;
}
