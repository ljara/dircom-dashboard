// Exportación a Excel (CSV) del detalle de tareas del período, lista para tablas dinámicas

// Excel en español (Chile) usa ";" como separador y "," como decimal.
// El BOM inicial hace que Excel reconozca los acentos (UTF-8).
function csvCelda(v){
  const s = v===null || v===undefined ? '' : String(v);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
}

// Columnas de invitados: solo en tareas de Producción Programa (o que tengan invitados)
function invCol(f, k){
  if(!esPrograma(f.t) && !(f.t.invitados||[]).length) return '';
  return resumenInvitados(f.t.invitados)[k];
}

function descargarCSV(lineas, nombre){
  const blob = new Blob(['﻿' + lineas.join('\r\n')], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}

// Una fila por invitado de los capítulos de programa completados en el período
// (mismas columnas que la planilla que usaba UFRO Radio, más el origen)
function exportarInvitadosCSV(){
  if(!esDirector()) return;
  const { desde, hasta } = periodoReporte();
  const met = calcularMetricas(tareasParaReporte(), desde, hasta);
  const caps = met.filas.filter(f=>f.completadaEnPeriodo && esPrograma(f.t));
  const filas = caps.flatMap(f=>(f.t.invitados||[]).map(i=>({ f, i })));
  if(!filas.length){ showToast('No hay invitados en capítulos completados del período'); return; }
  const columnas = [
    ['Tipo de contenido',  ({i})=>i.tipo],
    ['Invitado',           ({i})=>i.nombre],
    ['Cargo o institución',({i})=>i.cargo],
    ['Género',             ({i})=>GENEROS_INV[i.genero]||''],
    ['Origen',             ({i})=>ORIGEN_LABEL[origenInv(i)]],
    ['Programa',           ({f})=>f.t.programa],
    ['Fecha de aparición', ({f})=>f.t.fecha ? String(f.t.fecha).slice(0,10) : ''],
    ['Capítulo (tarea)',   ({f})=>f.t.titulo],
    ['Coordinación',       ({f})=>getCoordMeta(f.t.coordId).name]
  ];
  descargarCSV([
    columnas.map(([c])=>csvCelda(c)).join(';'),
    ...filas.map(r=>columnas.map(([,get])=>csvCelda(get(r))).join(';'))
  ], `dircom-invitados_${desde}_${hasta}.csv`);
  showToast(`${filas.length} invitados exportados ✓`);
}

function exportarTareasCSV(){
  if(!esDirector()) return;
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
    ['Campaña',               f=>f.t.campana],
    ['Programa',              f=>f.t.programa],
    ['Invitados',             f=>invCol(f,'total')],
    ['Invitadas mujeres',     f=>invCol(f,'mujer')],
    ['Invitados hombres',     f=>invCol(f,'hombre')],
    ['Invitados otro',        f=>invCol(f,'otro')],
    ['Invitados UFRO',        f=>invCol(f,'ufro')],
    ['Invitados externos',    f=>invCol(f,'externo')],
    ['Nombres invitados',     f=>(f.t.invitados||[]).map(i=>`${i.nombre} (${GENEROS_INV[i.genero]||'—'}, ${ORIGEN_LABEL[origenInv(i)]}${i.tipo?', '+i.tipo:''})`).join(' | ')],
    ['Prioridad',             f=>priorLabel(f.t.prioridad)],
    ['Estado actual',         f=>statusLabel(f.t.status)],
    ['Fecha creación',        f=>f.creada],
    ['Fecha límite',          f=>f.limite],
    ['Hora',                  f=>horaTexto(f.t)],
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
