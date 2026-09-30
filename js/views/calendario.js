// Vista: Calendario (mensual y por persona)

// ── Calendario (v2.1.0) ────────────────────────────────────
function renderCalendario(){
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const ref = new Date(state.calFecha); ref.setDate(1);
  const mes = ref.getMonth();
  const anio = ref.getFullYear();
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const dias = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

  // Tareas activas con fecha
  let tareasCal = activeTareas().filter(t=>t.fecha);
  if(state.calPersonaFiltro !== 'all')
    tareasCal = tareasCal.filter(t=>t.asignado === state.calPersonaFiltro);

  // Colores por coordinación
  const coordColor = id => getCoordMeta(id).hex;

  // Personas con tareas para el filtro
  const personasConTareas = [...new Set(activeTareas().filter(t=>t.fecha&&t.asignado).map(t=>t.asignado))].sort();

  const navPrev = () => {
    const d = new Date(state.calFecha);
    d.setMonth(d.getMonth()-1);
    state.calFecha = d; render();
  };
  const navNext = () => {
    const d = new Date(state.calFecha);
    d.setMonth(d.getMonth()+1);
    state.calFecha = d; render();
  };

  // Construir grilla del mes
  const primerDia = new Date(anio, mes, 1);
  let inicioGrilla = new Date(primerDia);
  // Ajustar para que empiece en lunes
  const dow = primerDia.getDay(); // 0=dom
  inicioGrilla.setDate(primerDia.getDate() - (dow===0?6:dow-1));

  const celdas = [];
  for(let i=0; i<42; i++){
    const d = new Date(inicioGrilla);
    d.setDate(inicioGrilla.getDate()+i);
    celdas.push(new Date(d));
  }

  // Agrupar tareas por fecha
  const tareasPorFecha = {};
  tareasCal.forEach(t=>{
    try{
      const fecha = new Date(t.fecha);
      const key = fecha.toISOString().slice(0,10);
      if(!tareasPorFecha[key]) tareasPorFecha[key]=[];
      tareasPorFecha[key].push(t);
    }catch(e){}
  });

  const STATUS_COLORS = {
    todo:     {bg:'#F1EFE8',text:'#444'},
    progress: {bg:'#E6F1FB',text:'#0C447C'},
    review:   {bg:'#FAEEDA',text:'#633806'},
    done:     {bg:'#EAF3DE',text:'#27500A'},
    archivada:{bg:'#eee',text:'#888'}
  };

  const calHTML = `
    <div class="topbar">
      <div><div class="page-title">📅 Calendario de tareas</div>
      <div class="page-sub">Tareas con fecha límite · ${meses[mes]} ${anio}</div></div>
      <div class="topbar-actions">
        <select onchange="state.calPersonaFiltro=this.value;render()"
          style="padding:7px 10px;border:1px solid var(--border-md);border-radius:var(--radius-sm);font-size:12px;font-family:inherit;background:var(--surface);color:var(--text)">
          <option value="all"${state.calPersonaFiltro==='all'?' selected':''}>👥 Todas las personas</option>
          ${personasConTareas.map(p=>`<option value="${p}"${state.calPersonaFiltro===p?' selected':''}>${p}</option>`).join('')}
        </select>
        <button class="btn btn-sm" onclick="state.calModo=state.calModo==='mes'?'persona':'mes';render()">
          ${state.calModo==='mes'?'👤 Vista por persona':'📅 Vista mensual'}
        </button>
        <button class="btn btn-primary btn-sm" onclick="openModal('tarea',null)">＋ Nueva tarea</button>
      </div>
    </div>`;

  if(state.calModo === 'persona'){
    // Vista por persona — semana actual
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - (hoy.getDay()===0?6:hoy.getDay()-1));
    const semana = Array.from({length:7}, (_,i)=>{ const d=new Date(lunes); d.setDate(lunes.getDate()+i); return d; });

    const personas = state.calPersonaFiltro === 'all'
      ? personasConTareas
      : [state.calPersonaFiltro];

    // Si no hay personas con tareas mostrar todas las personas del equipo
    const personasMostrar = personas.length ? personas :
      [...new Set(activeTareas().filter(t=>t.asignado).map(t=>t.asignado))].sort();

    return calHTML + `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:13px;font-weight:500">Semana del ${semana[0].toLocaleDateString('es-CL',{day:'2-digit',month:'long'})} al ${semana[6].toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'})}</div>
        <div style="display:flex;gap:6px">
          ${semana.map(d=>`<div style="text-align:center;min-width:40px">
            <div style="font-size:10px;font-weight:600;color:var(--text-faint);text-transform:uppercase">${dias[semana.indexOf(d)]}</div>
            <div style="font-size:13px;font-weight:${d.toDateString()===hoy.toDateString()?'700':'400'};color:${d.toDateString()===hoy.toDateString()?'var(--purple)':'var(--text-muted)'}">${d.getDate()}</div>
          </div>`).join('')}
        </div>
      </div>
      ${personasMostrar.map(persona=>{
        const tareasPersona = activeTareas().filter(t=>t.asignado===persona&&t.fecha);
        const col = avatarColor(persona);
        return `<div class="persona-week">
          <div class="persona-week-header">
            <div class="avatar" style="background:${col}22;color:${col}">${getInitials(persona)}</div>
            <div class="persona-week-name">${persona}</div>
            <div class="persona-week-count">${tareasPersona.length} tarea${tareasPersona.length!==1?'s':''} con fecha</div>
          </div>
          <div class="persona-week-grid">
            ${semana.map(dia=>{
              const key = dia.toISOString().slice(0,10);
              const tareasDia = tareasPersona.filter(t=>{
                try{ return new Date(t.fecha).toISOString().slice(0,10)===key; }catch(e){return false;}
              });
              const esHoy = dia.toDateString()===hoy.toDateString();
              return `<div class="persona-day-cell${tareasDia.length?' has-tasks':''}${esHoy?' today':''}">
                <div class="persona-day-label" style="${esHoy?'color:var(--purple);font-weight:700':''}">
                  ${dias[semana.indexOf(dia)]} ${dia.getDate()}
                </div>
                ${tareasDia.map(t=>{
                  const sc=STATUS_COLORS[t.status]||STATUS_COLORS.todo;
                  return `<div class="persona-day-task" style="background:${sc.bg};color:${sc.text}" title="${t.titulo}" onclick='viewTask(${JSON.stringify(t)})'>${t.titulo}</div>`;
                }).join('')}
                ${!tareasDia.length?`<div style="font-size:10px;color:var(--text-faint);text-align:center;margin-top:8px">libre</div>`:''}
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}`;
  }

  // Vista mensual
  return calHTML + `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px">
      <div class="cal-nav">
        <button onclick="(${navPrev.toString()})()">‹ Anterior</button>
        <div class="cal-month-title">${meses[mes]} ${anio}</div>
        <button onclick="(${navNext.toString()})()">Siguiente ›</button>
        <button onclick="state.calFecha=new Date();render()" style="font-size:12px;color:var(--purple);border-color:var(--purple)">Hoy</button>
      </div>
      <div class="cal-legend">
        ${['todo','progress','review','done'].map(s=>`
          <div class="cal-legend-item">
            <div class="cal-legend-dot" style="background:${STATUS_COLORS[s].bg};border:1px solid ${STATUS_COLORS[s].text}44"></div>
            <span style="color:var(--text-muted)">${statusLabel(s)}</span>
          </div>`).join('')}
      </div>
    </div>
    <div class="cal-grid">
      ${dias.map(d=>`<div class="cal-header-cell">${d}</div>`).join('')}
      ${celdas.map(dia=>{
        const key = dia.toISOString().slice(0,10);
        const esMes = dia.getMonth()===mes;
        const esHoy = dia.toDateString()===hoy.toDateString();
        const tareas = tareasPorFecha[key]||[];
        const MAX_VISIBLE = 3;
        return `<div class="cal-cell${!esMes?' other-month':''}${esHoy?' today':''}">
          <div class="cal-day-num">${dia.getDate()}</div>
          ${tareas.slice(0,MAX_VISIBLE).map(t=>{
            const sc=STATUS_COLORS[t.status]||STATUS_COLORS.todo;
            return `<div class="cal-task" style="background:${sc.bg};color:${sc.text};border-left:3px solid ${coordColor(t.coordId)}"
              title="${t.titulo}${t.asignado?' · '+t.asignado:''}"
              onclick='viewTask(${JSON.stringify(t)})'>${t.titulo}</div>`;
          }).join('')}
          ${tareas.length>MAX_VISIBLE?`<div class="cal-more" onclick="state.calPersonaFiltro='all';state.filterStatus='all';state.busqueda='';setView('tareas')">+${tareas.length-MAX_VISIBLE} más</div>`:''}
        </div>`;
      }).join('')}
    </div>`;
}
