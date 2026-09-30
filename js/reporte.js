// Reporte ejecutivo imprimible / PDF

// ── Generar Reporte PDF ────────────────────────────────────
function generarReporte(){
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const fechaStr = hoy.toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'});
  const periodo = state.filtroPeriodo || 'todo';
  const periodoStr = periodo==='semana'?'Esta semana':periodo==='mes'?'Este mes':'Todas las fechas';

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
  const review   = tareasBase.filter(t=>t.status==='review').length;
  const todo     = tareasBase.filter(t=>t.status==='todo').length;
  const alta     = tareasBase.filter(t=>t.prioridad==='alta'&&t.status!=='done').length;
  const vencidas = activeTareas().filter(t=>{
    if(!t.fecha||t.status==='done') return false;
    try{ return new Date(t.fecha)<hoy; }catch(e){ return false; }
  });

  const colores = {todo:'#888780',progress:'#378ADD',review:'#EF9F27',done:'#639922'};
  const estados = [{k:'todo',l:'Por hacer',v:todo},{k:'progress',l:'En progreso',v:progress},{k:'review',l:'En revisión',v:review},{k:'done',l:'Completadas',v:done}];

  // Carga por persona
  const cargaMap={};
  tareasBase.filter(t=>t.asignado&&t.status!=='done').forEach(t=>{ cargaMap[t.asignado]=(cargaMap[t.asignado]||0)+1; });
  const cargaTop=Object.entries(cargaMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const cargaMax=cargaTop.length?cargaTop[0][1]:1;

  // SVG dona distribución general
  const r=60,cx=80,cy=80,circum=2*Math.PI*r;
  let off=0;
  const donaSlices=estados.map(e=>{
    const pct=total?e.v/total:0;
    const dash=pct*circum;
    const gap=circum-dash;
    const s=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colores[e.k]}" stroke-width="22"
      stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-off}" transform="rotate(-90 ${cx} ${cy})"/>`;
    off+=dash;
    return s;
  }).join('');

  // SVG barras apiladas por coordinación
  const barWidth = 340;
  const barH = 22;
  const barGap = 36;
  const coordBarsSVG = state.coordinaciones.map((c, i)=>{
    const m = getCoordMeta(c.id);
    const ct = tareasBase.filter(t=>String(t.coordId)===String(c.id));
    const ctTotal = ct.length || 1;
    let xOff = 0;
    const bars = estados.map(e=>{
      const cnt = ct.filter(t=>t.status===e.k).length;
      const w = Math.round((cnt/ctTotal)*barWidth);
      const bar = cnt>0 ? `<rect x="${xOff}" y="${i*barGap+16}" width="${w}" height="${barH}" fill="${colores[e.k]}" rx="2"/>
        <text x="${xOff+w/2}" y="${i*barGap+16+barH/2+4}" text-anchor="middle" font-size="9" fill="#fff" font-weight="600">${cnt>0?cnt:''}</text>` : '';
      xOff+=w;
      return bar;
    }).join('');
    const pct = ct.length ? Math.round(ct.filter(t=>t.status==='done').length/ct.length*100) : 0;
    return `<text x="0" y="${i*barGap+12}" font-size="11" fill="#444" font-weight="500">${m.icon} ${m.name}</text>
      ${bars}
      <text x="${barWidth+8}" y="${i*barGap+16+barH/2+4}" font-size="10" fill="#639922" font-weight="700">${pct}%</text>`;
  }).join('');
  const svgBarHeight = state.coordinaciones.length * barGap + 10;

  // Filas tablas
  const vencidasRows = vencidas.slice(0,10).map(t=>{
    const m=getCoordMeta(t.coordId);
    return `<tr><td>${t.titulo||''}</td><td>${m.name}</td><td>${t.asignado||'—'}</td><td style="color:#E24B4A;font-weight:600">${formatFecha(t.fecha)}</td></tr>`;
  }).join('');

  const recientesRows = tareasBase.filter(t=>t.status==='done').slice(-8).reverse().map(t=>{
    const m=getCoordMeta(t.coordId);
    return `<tr><td>${t.titulo||''}</td><td>${m.name}</td><td>${t.asignado||'—'}</td></tr>`;
  }).join('');

  const coordRows = state.coordinaciones.map(c=>{
    const m=getCoordMeta(c.id);
    const ct=tareasBase.filter(t=>String(t.coordId)===String(c.id));
    const cdone=ct.filter(t=>t.status==='done').length;
    const cpct=ct.length?Math.round(cdone/ct.length*100):0;
    const jefe=state.personas.find(p=>String(p.coordId)===String(c.id)&&(p.esJefe==='true'||p.esJefe===true));
    const cvenc=vencidas.filter(t=>String(t.coordId)===String(c.id)).length;
    const color=cpct>=70?'#639922':cpct>=40?'#EF9F27':'#E24B4A';
    return `<tr>
      <td>${m.icon} ${m.name}</td>
      <td>${jefe?jefe.nombre:'—'}</td>
      <td style="text-align:center">${ct.length}</td>
      <td style="text-align:center">${cdone}</td>
      <td style="text-align:center;font-weight:700;color:${color}">${cpct}%</td>
      <td style="text-align:center;color:${cvenc?'#E24B4A':'#639922'};font-weight:600">${cvenc||'✓'}</td>
    </tr>`;
  }).join('');

  const reportHTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte DIRCOM ${fechaStr}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;background:#fff;font-size:13px}
  .page{padding:0}
  /* Header */
  .header{background:linear-gradient(135deg,#7F77DD 0%,#534AB7 100%);color:#fff;padding:32px 40px 24px}
  .header .org{font-size:10px;letter-spacing:.12em;text-transform:uppercase;opacity:.75;margin-bottom:6px}
  .header h1{font-size:24px;font-weight:700;margin-bottom:4px}
  .header .sub{font-size:13px;opacity:.85}
  .header .fecha{font-size:11px;opacity:.65;margin-top:8px}
  .stripe{height:5px;background:linear-gradient(90deg,#EF9F27,#E24B4A,#7F77DD,#1D9E75)}
  /* Sections */
  .section{padding:24px 40px}
  .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#888;margin-bottom:10px}
  .intro{font-size:12px;color:#555;line-height:1.8;margin-bottom:20px;background:#F8F8F6;border-left:4px solid #7F77DD;padding:12px 16px;border-radius:0 6px 6px 0}
  /* Métricas */
  .metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:4px}
  .metric{background:#F8F8F6;border-radius:8px;padding:12px;border-top:3px solid var(--c)}
  .metric .ml{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:4px}
  .metric .mv{font-size:26px;font-weight:800;color:var(--c);line-height:1}
  .metric .ms{font-size:9px;color:#999;margin-top:3px}
  /* Dos columnas */
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .card{background:#F8F8F6;border-radius:8px;padding:16px}
  .card-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:8px}
  .card-desc{font-size:10px;color:#999;line-height:1.5;margin-bottom:12px}
  /* Tablas */
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#EEEDFE;color:#534AB7;font-weight:700;padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.04em}
  td{padding:6px 10px;border-bottom:1px solid #eee}
  tr:last-child td{border-bottom:none}
  .table-red th{background:#FCEBEB;color:#791F1F}
  .table-green th{background:#EAF3DE;color:#27500A}
  /* Vencidas alert */
  .alert-red{border:1px solid #FCEBEB;border-radius:8px;overflow:hidden}
  .alert-green{border:1px solid #EAF3DE;border-radius:8px;overflow:hidden}
  .section-border{border:1px solid #eee;border-radius:8px;overflow:hidden}
  /* Pie */
  .footer{background:#F1EFE8;padding:12px 40px;display:flex;justify-content:space-between;align-items:center;margin-top:8px}
  .footer span{font-size:10px;color:#aaa}
  /* Barras carga */
  .bar-wrap{margin-bottom:8px}
  .bar-label{display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px}
  .bar-track{height:7px;background:#E0E0DB;border-radius:4px;overflow:hidden}
  .bar-fill{height:100%;border-radius:4px;background:#7F77DD}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .no-print{display:none}
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="org">Universidad de La Frontera</div>
    <h1>Dirección de Comunicaciones</h1>
    <div class="sub">Reporte Ejecutivo — ${periodoStr}</div>
    <div class="fecha">Generado el ${fechaStr}</div>
  </div>
  <div class="stripe"></div>

  <div class="section">
    <div class="section-title">Resumen ejecutivo</div>
    <div class="intro">
      Al ${fechaStr}, la Dirección de Comunicaciones registra <strong>${total} tareas activas</strong> distribuidas en
      ${state.coordinaciones.length} coordinaciones, con un cumplimiento general del
      <strong>${total?Math.round(done/total*100):0}%</strong>.
      ${progress} tarea${progress!==1?'s':''} se encuentran en ejecución activa y ${alta} presentan prioridad alta pendiente.
      ${vencidas.length
        ? `Se identifican <strong>${vencidas.length} tarea${vencidas.length>1?'s':''} vencida${vencidas.length>1?'s':''}</strong> que requieren atención inmediata.`
        : 'No se registran tareas vencidas en el período.'}
    </div>

    <div class="metrics">
      <div class="metric" style="--c:#7F77DD"><div class="ml">Total tareas</div><div class="mv">${total}</div><div class="ms">período seleccionado</div></div>
      <div class="metric" style="--c:#639922"><div class="ml">Completadas</div><div class="mv">${done}</div><div class="ms">${total?Math.round(done/total*100):0}% del total</div></div>
      <div class="metric" style="--c:#378ADD"><div class="ml">En progreso</div><div class="mv">${progress}</div><div class="ms">en ejecución</div></div>
      <div class="metric" style="--c:#EF9F27"><div class="ml">Alta prioridad</div><div class="mv">${alta}</div><div class="ms">pendientes</div></div>
      <div class="metric" style="--c:${vencidas.length?'#E24B4A':'#639922'}"><div class="ml">Vencidas</div><div class="mv">${vencidas.length}</div><div class="ms">${vencidas.length?'requieren atención':'al día ✓'}</div></div>
    </div>
  </div>

  <div class="section" style="padding-top:0">
    <div class="two-col">
      <div class="card">
        <div class="card-title">Distribución por estado</div>
        <div class="card-desc">Proporción de tareas según su estado actual de avance.</div>
        <div style="display:flex;align-items:center;gap:16px">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#E8E8E4" stroke-width="22"/>
            ${donaSlices}
            <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="20" font-weight="800" fill="#1a1a1a">${total}</text>
            <text x="${cx}" y="${cy+16}" text-anchor="middle" font-size="10" fill="#888">tareas</text>
          </svg>
          <div style="flex:1">
            ${estados.map(e=>`<div style="display:flex;align-items:center;gap:7px;margin-bottom:7px">
              <span style="width:10px;height:10px;border-radius:50%;background:${colores[e.k]};flex-shrink:0;display:inline-block"></span>
              <span style="font-size:11px;color:#555;flex:1">${e.l}</span>
              <span style="font-size:12px;font-weight:700">${e.v}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Carga por persona</div>
        <div class="card-desc">Tareas pendientes asignadas por integrante del equipo.</div>
        ${cargaTop.length===0
          ? `<div style="color:#aaa;font-size:12px;text-align:center;padding:20px">Sin tareas asignadas</div>`
          : cargaTop.map(([nombre,cnt])=>`<div class="bar-wrap">
              <div class="bar-label"><span>${nombre}</span><span style="font-weight:700">${cnt}</span></div>
              <div class="bar-track"><div class="bar-fill" style="width:${Math.round(cnt/cargaMax*100)}%"></div></div>
            </div>`).join('')}
      </div>
    </div>
  </div>

  <div class="section" style="padding-top:0">
    <div class="card">
      <div class="card-title">Distribución por coordinación</div>
      <div class="card-desc">Desglose de tareas por estado dentro de cada coordinación. Las barras muestran la proporción relativa de cada estado.</div>
      <div style="margin-bottom:10px;display:flex;gap:16px;flex-wrap:wrap">
        ${estados.map(e=>`<div style="display:flex;align-items:center;gap:5px;font-size:10px;color:#555">
          <span style="width:10px;height:10px;border-radius:2px;background:${colores[e.k]};display:inline-block"></span>${e.l}
        </div>`).join('')}
      </div>
      <svg width="100%" viewBox="0 0 420 ${svgBarHeight}" style="overflow:visible">
        ${coordBarsSVG}
      </svg>
    </div>
  </div>

  <div class="section" style="padding-top:0">
    <div class="section-title">Estado por coordinación</div>
    <div class="section-border">
      <table>
        <thead><tr>
          <th>Coordinación</th><th>Jefe/a</th>
          <th style="text-align:center">Tareas</th>
          <th style="text-align:center">Completadas</th>
          <th style="text-align:center">Cumplimiento</th>
          <th style="text-align:center">Vencidas</th>
        </tr></thead>
        <tbody>${coordRows}</tbody>
      </table>
    </div>
  </div>

  ${vencidas.length?`
  <div class="section" style="padding-top:0">
    <div class="section-title" style="color:#E24B4A">⚠ Tareas vencidas</div>
    <div class="alert-red">
      <table class="table-red">
        <thead><tr><th>Tarea</th><th>Coordinación</th><th>Responsable</th><th>Fecha límite</th></tr></thead>
        <tbody>${vencidasRows}</tbody>
      </table>
    </div>
  </div>`:''}

  ${recientesRows?`
  <div class="section" style="padding-top:0">
    <div class="section-title" style="color:#639922">✅ Tareas completadas</div>
    <div class="alert-green">
      <table class="table-green">
        <thead><tr><th>Tarea</th><th>Coordinación</th><th>Responsable</th></tr></thead>
        <tbody>${recientesRows}</tbody>
      </table>
    </div>
  </div>`:''}

  <div class="footer">
    <span>Universidad de La Frontera · Dirección de Comunicaciones</span>
    <span>Documento generado automáticamente · ${fechaStr}</span>
  </div>
</div>
<script>window.onload=function(){ window.print(); }<\/script>
</body>
</html>`;

  const win = window.open('','_blank');
  win.document.write(reportHTML);
  win.document.close();
}
