// Reporte ejecutivo imprimible / PDF del período elegido en la vista Reportes

function generarReporte(){
  const { desde, hasta } = periodoReporte();
  const ant    = periodoAnterior(desde, hasta);
  const tareas = tareasParaReporte();
  const met    = calcularMetricas(tareas, desde, hasta);
  const metAnt = calcularMetricas(tareas, ant.desde, ant.hasta);
  const t      = met.total;
  const kpis   = indicadoresKPI(t, metAnt.total);

  const coordId  = state.urlCoord || (state.repCoord!=='all' ? state.repCoord : null);
  const ambito   = coordId ? getCoordMeta(coordId).name : 'Todas las coordinaciones';
  const generado = new Date().toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'});
  const periodoStr = `${formatDia(desde)} al ${formatDia(hasta)}`;
  const tonos = { bueno:'#639922', malo:'#E24B4A', neutro:'#999' };
  const MAX_FILAS = 25;
  const plural = (n, s, p) => `${n} ${n===1?s:p}`;

  // Resumen en texto
  const varComp = variacion(t.completadas, metAnt.total.completadas);
  const resumen = `
    Entre el ${formatDia(desde)} y el ${formatDia(hasta)}, ${coordId?`la coordinación <strong>${escHtml(ambito)}</strong>`:'la Dirección de Comunicaciones'}
    registró <strong>${plural(t.creadas,'tarea nueva','tareas nuevas')}</strong> y completó <strong>${t.completadas}</strong>
    ${varComp.texto!=='sin comparación'?`(${varComp.texto.replace('vs anterior','respecto del período anterior')})`:''}.
    ${t.tiempoPromedio!==null?`El tiempo promedio de resolución fue de <strong>${fmtDias(t.tiempoPromedio)}</strong>`:'No hay tiempos de resolución registrados'}${t.cumplimiento!==null?` y el <strong>${t.cumplimiento}%</strong> de las tareas con fecha límite se completó a tiempo`:''}.
    Al cierre del período quedaban ${plural(t.pendientes,'tarea pendiente','tareas pendientes')}${t.vencidas?`, <strong>${t.vencidas} de ellas vencida${t.vencidas!==1?'s':''}</strong>`:', ninguna vencida'}.`;

  // Detalle: completadas y vencidas
  const completadas = met.filas.filter(f=>f.completadaEnPeriodo).sort((a,b)=>b.completada.localeCompare(a.completada));
  const vencidas    = met.filas.filter(f=>f.vencidaAlCierre).sort((a,b)=>a.limite.localeCompare(b.limite));
  const masFilas = (n, cols) => n>MAX_FILAS ? `<tfoot><tr><td colspan="${cols}">y ${n-MAX_FILAS} más — ver exportación a Excel</td></tr></tfoot>` : '';

  const filasCompletadas = completadas.slice(0,MAX_FILAS).map(f=>`<tr>
    <td>${escHtml(f.t.titulo||'')}</td><td>${escHtml(getCoordMeta(f.t.coordId).name)}</td><td>${escHtml(f.t.asignado||'—')}</td>
    <td class="num">${formatDia(f.completada)}</td><td class="num">${fmtDias(f.diasResolucion)}</td>
    <td class="num">${f.aTiempo===null?'<span style="color:#999">Sin plazo</span>':f.aTiempo?'<span style="color:#639922">A tiempo</span>':'<span style="color:#E24B4A">Con atraso</span>'}</td>
  </tr>`).join('');

  const filasVencidas = vencidas.slice(0,MAX_FILAS).map(f=>`<tr>
    <td>${escHtml(f.t.titulo||'')}</td><td>${escHtml(getCoordMeta(f.t.coordId).name)}</td><td>${escHtml(f.t.asignado||'—')}</td>
    <td class="num" style="color:#E24B4A;font-weight:600">${formatDia(f.limite)}</td><td class="num">${fmtDias(diasEntre(f.limite, hasta))}</td>
  </tr>`).join('');

  const reportHTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte DIRCOM ${desde} a ${hasta}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;background:#fff;font-size:13px}
  .header{background:linear-gradient(135deg,#00447F 0%,#009BD9 100%);color:#FFFFFF;padding:32px 40px 24px}
  .header .org{font-size:10px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px}
  .header h1{font-size:24px;font-weight:700;margin-bottom:4px}
  .header .sub{font-size:13px}
  .header .fecha{font-size:11px;margin-top:8px}
  .stripe{height:5px;background:linear-gradient(90deg,#EF9F27,#E24B4A,#009BD9,#1D9E75)}
  .section{padding:20px 40px 0}
  .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:10px}
  .intro{font-size:12px;color:#444;line-height:1.8;background:#F8F8F6;border-left:4px solid #009BD9;padding:12px 16px;border-radius:0 6px 6px 0}
  .metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .metric{background:#F8F8F6;border-radius:8px;padding:12px;border-top:3px solid #009BD9}
  .metric.alerta{border-top-color:#E24B4A}
  .metric .ml{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:4px}
  .metric .mv{font-size:22px;font-weight:800;line-height:1.1}
  .metric .ms{font-size:9px;color:#999;margin-top:3px}
  .metric .mc{font-size:9px;font-weight:600;margin-top:4px}
  .aviso{font-size:10px;color:#633806;background:#FAEEDA;border-radius:6px;padding:8px 12px;margin-top:10px}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .box{border:1px solid #DCE8F1;border-radius:8px;overflow:hidden;page-break-inside:avoid}
  table{width:100%;border-collapse:collapse;font-size:10.5px}
  th{background:#EEF6FB;color:#00447F;font-weight:700;padding:7px 8px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid #009BD9}
  td{padding:5px 8px;border-bottom:1px solid #EDF2F6}
  tbody tr:nth-child(even) td{background:#F8FBFD}
  tr:last-child td{border-bottom:none}
  tfoot td{color:#999;font-style:italic}
  .num{text-align:right;white-space:nowrap}
  .num-alerta{color:#E24B4A;font-weight:700}
  .num-sub{color:#999;font-size:9px}
  .tabla-vacia{color:#aaa;font-size:11px;text-align:center;padding:14px}
  .glosario{font-size:9px;color:#999;line-height:1.6}
  .footer{background:#F1EFE8;padding:12px 40px;display:flex;justify-content:space-between;margin-top:24px}
  .footer span{font-size:10px;color:#aaa}
  @media print{ body{-webkit-print-color-adjust:exact;print-color-adjust:exact} }
</style>
</head>
<body>
  <div class="header">
    <div class="org">Universidad de La Frontera</div>
    <h1>Dirección de Comunicaciones</h1>
    <div class="sub">Reporte de gestión — ${periodoStr} · ${escHtml(ambito)}</div>
    <div class="fecha">Generado el ${generado} · comparado con ${formatDia(ant.desde)} al ${formatDia(ant.hasta)}</div>
  </div>
  <div class="stripe"></div>

  <div class="section">
    <div class="section-title">Resumen ejecutivo</div>
    <div class="intro">${resumen}</div>
  </div>

  <div class="section">
    <div class="section-title">Indicadores del período</div>
    <div class="metrics">
      ${kpis.map(k=>`<div class="metric${k.alerta?' alerta':''}">
        <div class="ml">${k.label}</div><div class="mv">${k.valor}</div>
        <div class="ms">${k.sub}</div><div class="mc" style="color:${tonos[k.var.tono]}">${k.var.texto}</div>
      </div>`).join('')}
    </div>
    ${met.sinFechaTermino?`<div class="aviso">ℹ ${met.sinFechaTermino} tarea(s) completada(s) antes de que se registrara la fecha de término no se incluyen en completadas, tiempos ni cumplimiento.</div>`:''}
  </div>

  <div class="section">
    <div class="section-title">Carga de trabajo por persona</div>
    <div class="box">${tablaGruposHTML(met.porPersona, 'Persona')}</div>
  </div>

  <div class="section">
    <div class="section-title">Por coordinación</div>
    <div class="box">${tablaGruposHTML(met.porCoord, 'Coordinación')}</div>
  </div>

  <div class="section">
    <div class="two-col">
      <div><div class="section-title">Por tipo de requerimiento</div><div class="box">${tablaGruposHTML(met.porTipo, 'Tipo', {completa:false, max:10})}</div></div>
      <div><div class="section-title">Por categoría</div><div class="box">${tablaGruposHTML(met.porCategoria, 'Categoría', {completa:false, max:10})}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Principales solicitantes</div>
    <div class="box">${tablaGruposHTML(met.porSolicitante, 'Solicitante', {completa:false, max:10})}</div>
  </div>

  ${vencidas.length?`
  <div class="section">
    <div class="section-title" style="color:#E24B4A">⚠ Vencidas al cierre del período (${vencidas.length})</div>
    <div class="box"><table>
      <thead><tr><th>Tarea</th><th>Coordinación</th><th>Responsable</th><th class="num">Fecha límite</th><th class="num">Atraso</th></tr></thead>
      <tbody>${filasVencidas}</tbody>${masFilas(vencidas.length, 5)}
    </table></div>
  </div>`:''}

  ${completadas.length?`
  <div class="section">
    <div class="section-title" style="color:#639922">✅ Completadas en el período (${completadas.length})</div>
    <div class="box"><table>
      <thead><tr><th>Tarea</th><th>Coordinación</th><th>Responsable</th><th class="num">Término</th><th class="num">Resolución</th><th class="num">Plazo</th></tr></thead>
      <tbody>${filasCompletadas}</tbody>${masFilas(completadas.length, 6)}
    </table></div>
  </div>`:''}

  <div class="section">
    <div class="glosario">
      <strong>Cómo se calcula:</strong> Creadas y Completadas cuentan las tareas cuya fecha de creación o de término cae en el período.
      Pendientes y Vencidas se miden al último día del período. Tiempo de resolución: días entre creación y término.
      Cumplimiento: completadas en o antes de su fecha límite, sobre las completadas que tenían fecha límite.
      El período de comparación es el de igual duración inmediatamente anterior. Las tareas en la papelera no se consideran.
    </div>
  </div>

  <div class="footer">
    <span>Universidad de La Frontera · Dirección de Comunicaciones</span>
    <span>Documento generado automáticamente · ${generado}</span>
  </div>
<script>window.onload=function(){ window.print(); }<\/script>
</body>
</html>`;

  const win = window.open('','_blank');
  if(!win){ showToast('El navegador bloqueó la ventana del reporte: permite las ventanas emergentes'); return; }
  win.document.write(reportHTML);
  win.document.close();
}
