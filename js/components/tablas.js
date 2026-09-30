// Piezas de reporte compartidas por la vista Reportes y el PDF: indicadores y tablas por grupo

// Indicadores principales con su comparación contra el período anterior
function indicadoresKPI(act, ant){
  return [
    { label:'Tareas creadas', valor: act.creadas, sub:'demanda del período',
      var: variacion(act.creadas, ant.creadas, {sinTono:true}) },
    { label:'Completadas', valor: act.completadas, sub:'terminadas en el período',
      var: variacion(act.completadas, ant.completadas) },
    { label:'Pendientes al cierre', valor: act.pendientes, sub:`${act.altaPendiente} de prioridad alta`,
      var: variacion(act.pendientes, ant.pendientes, {menorEsMejor:true}) },
    { label:'Vencidas al cierre', valor: act.vencidas, sub:'pendientes con plazo cumplido', alerta: act.vencidas>0,
      var: variacion(act.vencidas, ant.vencidas, {menorEsMejor:true}) },
    { label:'Tiempo de resolución', valor: fmtDias(act.tiempoPromedio), sub:`promedio · mediana ${fmtDias(act.tiempoMediana)}`,
      var: variacion(act.tiempoPromedio, ant.tiempoPromedio, {menorEsMejor:true}) },
    { label:'Cumplimiento de plazos', valor: fmtPct(act.cumplimiento), sub:`${act.aTiempo} de ${act.conPlazo} con fecha límite a tiempo`,
      var: variacion(act.cumplimiento, ant.cumplimiento, {puntos:true}) }
  ];
}

// Tabla de indicadores por grupo (persona, coordinación, tipo…).
// completa: todas las columnas; si no, solo volumen (creadas/completadas/pendientes).
function tablaGruposHTML(grupos, etiqueta, {completa=true, max=Infinity}={}){
  if(!grupos.length) return `<div class="tabla-vacia">Sin datos en el período</div>`;
  const visibles = grupos.slice(0, max);
  const resto = grupos.length - visibles.length;
  const cab = completa
    ? ['Creadas','Completadas','Pendientes','Vencidas','Tiempo prom.','A tiempo']
    : ['Creadas','Completadas','Pendientes'];
  const filas = visibles.map(g=>{
    const celdas = completa
      ? [g.creadas, g.completadas, g.pendientes,
         g.vencidas ? `<span class="num-alerta">${g.vencidas}</span>` : 0,
         fmtDias(g.tiempoPromedio),
         g.conPlazo ? `${fmtPct(g.cumplimiento)} <span class="num-sub">(${g.aTiempo}/${g.conPlazo})</span>` : '—']
      : [g.creadas, g.completadas, g.pendientes];
    return `<tr><td>${escHtml(g.nombre)}</td>${celdas.map(c=>`<td class="num">${c}</td>`).join('')}</tr>`;
  }).join('');
  return `<table class="tabla-kpi">
    <thead><tr><th>${etiqueta}</th>${cab.map(c=>`<th class="num">${c}</th>`).join('')}</tr></thead>
    <tbody>${filas}</tbody>
    ${resto>0?`<tfoot><tr><td colspan="${cab.length+1}">y ${resto} más — ver exportación a Excel</td></tr></tfoot>`:''}
  </table>`;
}
