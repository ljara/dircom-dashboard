// Exportación a Excel (CSV) del detalle de tareas del período, lista para tablas dinámicas

// Excel en español (Chile) usa ";" como separador y "," como decimal.
// El BOM inicial hace que Excel reconozca los acentos (UTF-8).
function csvCelda(v){
  const s = v===null || v===undefined ? '' : String(v);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
}

function exportarTareasCSV(){
  const { desde, hasta } = periodoReporte();
  const met = calcularMetricas(tareasParaReporte(), desde, hasta);
  if(!met.filas.length){ showToast('No hay tareas en el período seleccionado'); return; }

  const siNo = v => v===null ? '' : (v ? 'Sí' : 'No');
  const columnas = [
    ['ID',                    f=>f.t.id],
    ['Título',                f=>f.t.titulo],
    ['Coordinación',          f=>getCoordMeta(f.t.coordId).name],
    ['Asignado a',            f=>f.t.asignado],
    ['Solicitante',           f=>f.t.solicitante],
    ['Tipo de requerimiento', f=>f.t.tipo_requerimiento],
    ['Categoría',             f=>f.t.categoria],
    ['Prioridad',             f=>priorLabel(f.t.prioridad)],
    ['Estado actual',         f=>statusLabel(f.t.status)],
    ['Fecha creación',        f=>f.creada],
    ['Fecha límite',          f=>f.limite],
    ['Fecha término',         f=>f.completada],
    ['Días de resolución',    f=>f.diasResolucion],
    ['Completada a tiempo',   f=>siNo(f.aTiempo)],
    ['Creada en el período',  f=>siNo(f.creadaEnPeriodo)],
    ['Completada en el período', f=>siNo(f.completadaEnPeriodo)],
    ['Pendiente al cierre',   f=>siNo(f.pendienteAlCierre)],
    ['Vencida al cierre',     f=>siNo(f.vencidaAlCierre)],
    ['Link',                  f=>f.t.link]
  ];

  const lineas = [
    columnas.map(([c])=>csvCelda(c)).join(';'),
    ...met.filas.map(f=>columnas.map(([,get])=>csvCelda(get(f))).join(';'))
  ];
  const blob = new Blob(['﻿' + lineas.join('\r\n')], { type:'text/csv;charset=utf-8' });

  const coord = state.urlCoord || (state.repCoord!=='all' ? state.repCoord : null);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `dircom-tareas_${desde}_${hasta}${coord?'_'+coord:''}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  showToast(`${met.filas.length} tareas exportadas ✓`);
}
