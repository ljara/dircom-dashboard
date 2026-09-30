// Vista: Reportes — indicadores por período configurable, PDF y exportación a Excel

function setRepAtajo(atajo){
  const r = rangoAtajo(atajo);
  state.repAtajo = atajo; state.repDesde = r.desde; state.repHasta = r.hasta;
  render();
}

function setRepFecha(campo, valor){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return;
  if(campo==='desde') state.repDesde = valor; else state.repHasta = valor;
  if(state.repDesde > state.repHasta) [state.repDesde, state.repHasta] = [state.repHasta, state.repDesde];
  state.repAtajo = 'personalizado';
  render();
}

function renderReportesView(){
  const { desde, hasta } = periodoReporte();
  const ant = periodoAnterior(desde, hasta);
  const tareas = tareasParaReporte();
  const met = calcularMetricas(tareas, desde, hasta);
  const metAnt = calcularMetricas(tareas, ant.desde, ant.hasta);
  const kpis = indicadoresKPI(met.total, metAnt.total);
  const dias = diasEntre(desde, hasta) + 1;
  const tonos = { bueno:'var(--green)', malo:'var(--red)', neutro:'var(--text-faint)' };

  const selectorCoord = state.urlCoord
    ? `<span class="rep-coord-fija">${getCoordMeta(state.urlCoord).icon} ${escHtml(getCoordMeta(state.urlCoord).name)}</span>`
    : `<select class="rep-input" onchange="state.repCoord=this.value;render()">
        <option value="all"${state.repCoord==='all'?' selected':''}>Todas las coordinaciones</option>
        ${state.coordinaciones.map(c=>`<option value="${c.id}"${String(state.repCoord)===String(c.id)?' selected':''}>${getCoordMeta(c.id).icon} ${escHtml(c.nombre)}</option>`).join('')}
      </select>`;

  return `
    <div class="topbar">
      <div><div class="page-title">📈 Reportes</div>
      <div class="page-sub">Indicadores de gestión del ${formatDia(desde)} al ${formatDia(hasta)} · ${dias} día${dias!==1?'s':''}</div></div>
      <div class="topbar-actions">
        <button class="btn" onclick="exportarTareasCSV()">⬇ Exportar Excel (CSV)</button>
        <button class="btn" onclick="generarReporte()" style="background:#1a1a1a;color:#fff;border-color:#1a1a1a">📄 Generar PDF</button>
      </div>
    </div>

    <div class="section rep-periodo">
      <div class="rep-atajos">
        ${ATAJOS_PERIODO.map(([k,l])=>`<button class="filter-pill${state.repAtajo===k?' active':''}" onclick="setRepAtajo('${k}')">${l}</button>`).join('')}
        <span class="filter-pill${state.repAtajo==='personalizado'?' active':''}" style="cursor:default">Personalizado</span>
      </div>
      <div class="rep-controles">
        <label>Desde <input type="date" class="rep-input" value="${desde}" onchange="setRepFecha('desde',this.value)"></label>
        <label>Hasta <input type="date" class="rep-input" value="${hasta}" onchange="setRepFecha('hasta',this.value)"></label>
        ${selectorCoord}
        <span class="rep-comparado">Comparado con ${formatDia(ant.desde)} – ${formatDia(ant.hasta)}</span>
      </div>
    </div>

    <div class="metrics rep-metrics">
      ${kpis.map(k=>`<div class="metric"${k.alerta?' style="border-color:var(--red)"':''}>
        <div class="m-label">${k.label}</div>
        <div class="m-value"${k.alerta?' style="color:var(--red)"':''}>${k.valor}</div>
        <div class="m-sub">${k.sub}</div>
        <div class="m-var" style="color:${tonos[k.var.tono]}">${k.var.texto}</div>
      </div>`).join('')}
    </div>

    ${met.sinFechaTermino ? `<div class="rep-aviso">
      ℹ ${met.sinFechaTermino} tarea${met.sinFechaTermino!==1?'s':''} completada${met.sinFechaTermino!==1?'s':''} antes de que se registrara la fecha de término:
      no se ${met.sinFechaTermino!==1?'incluyen':'incluye'} en "Completadas", tiempos ni cumplimiento.
    </div>` : ''}

    <div class="section">
      <div class="section-header"><div class="section-title">👤 Carga de trabajo por persona</div></div>
      <div class="tabla-wrap">${tablaGruposHTML(met.porPersona, 'Persona')}</div>
    </div>

    <div class="section">
      <div class="section-header"><div class="section-title">🏢 Por coordinación</div></div>
      <div class="tabla-wrap">${tablaGruposHTML(met.porCoord, 'Coordinación')}</div>
    </div>

    <div class="rep-tres">
      <div class="section">
        <div class="section-header"><div class="section-title">📋 Por tipo de requerimiento</div></div>
        <div class="tabla-wrap">${tablaGruposHTML(met.porTipo, 'Tipo', {completa:false, max:10})}</div>
      </div>
      <div class="section">
        <div class="section-header"><div class="section-title">🏷 Por categoría</div></div>
        <div class="tabla-wrap">${tablaGruposHTML(met.porCategoria, 'Categoría', {completa:false, max:10})}</div>
      </div>
      <div class="section">
        <div class="section-header"><div class="section-title">🙋 Por solicitante</div></div>
        <div class="tabla-wrap">${tablaGruposHTML(met.porSolicitante, 'Solicitante', {completa:false, max:10})}</div>
      </div>
    </div>

    <div class="rep-glosario">
      <strong>Cómo se calcula:</strong> <em>Creadas</em> y <em>Completadas</em> cuentan las tareas cuya fecha de creación o de término cae en el período.
      <em>Pendientes</em> y <em>Vencidas</em> se miden al último día del período. <em>Tiempo de resolución</em>: días entre creación y término.
      <em>Cumplimiento</em>: completadas en o antes de su fecha límite, sobre las completadas que tenían fecha límite. Las tareas en la papelera no se consideran.
    </div>`;
}
