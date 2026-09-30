// Cálculo de indicadores (KPI) por período: fechas, clasificación de tareas y agregados

// ── Fechas como días calendario 'YYYY-MM-DD' (hora de Chile) ──
// Trabajar con días (y no con horas) evita errores por zona horaria y cambio de horario.
function diaChile(valor){
  if(!valor) return '';
  const s = String(valor);
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;   // ya es una fecha sin hora (ej. fecha límite)
  const d = new Date(s);
  if(isNaN(d)) return '';
  return d.toLocaleDateString('en-CA',{timeZone:'America/Santiago'});
}
function hoyChile(){ return diaChile(new Date().toISOString()); }
function diaUTC(y, m0, d){ return new Date(Date.UTC(y, m0, d)).toISOString().slice(0,10); }  // acepta mes/día fuera de rango
function sumarDias(dia, n){ const d=new Date(dia+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
function diasEntre(a, b){ return Math.round((new Date(b+'T12:00:00Z')-new Date(a+'T12:00:00Z'))/864e5); }
function formatDia(dia){ return dia ? dia.split('-').reverse().join('/') : '—'; }

// ── Períodos ──
const ATAJOS_PERIODO = [
  ['semana','Esta semana'], ['mes','Este mes'], ['mes_anterior','Mes anterior'],
  ['trimestre','Este trimestre'], ['trimestre_anterior','Trimestre anterior'],
  ['anio','Este año'], ['anio_anterior','Año anterior']
];

// Devuelve {desde, hasta}. Los períodos en curso terminan hoy.
function rangoAtajo(atajo, hoy = hoyChile()){
  const [y, m] = hoy.split('-').map(Number);
  const q0 = Math.floor((m-1)/3)*3;   // primer mes (0-11) del trimestre actual
  switch(atajo){
    case 'semana': {
      const dow = new Date(hoy+'T12:00:00Z').getUTCDay();
      return { desde: sumarDias(hoy, -(dow===0?6:dow-1)), hasta: hoy };
    }
    case 'mes_anterior':       return { desde: diaUTC(y, m-2, 1), hasta: diaUTC(y, m-1, 0) };
    case 'trimestre':          return { desde: diaUTC(y, q0, 1),  hasta: hoy };
    case 'trimestre_anterior': return { desde: diaUTC(y, q0-3, 1), hasta: diaUTC(y, q0, 0) };
    case 'anio':               return { desde: `${y}-01-01`,      hasta: hoy };
    case 'anio_anterior':      return { desde: `${y-1}-01-01`,    hasta: `${y-1}-12-31` };
    case 'mes':
    default:                   return { desde: diaUTC(y, m-1, 1), hasta: hoy };
  }
}

// Período de igual duración inmediatamente anterior (para comparar)
function periodoAnterior(desde, hasta){
  const largo = diasEntre(desde, hasta) + 1;
  const h = sumarDias(desde, -1);
  return { desde: sumarDias(h, -(largo-1)), hasta: h };
}

// ── Clasificación de cada tarea respecto al período ──
function clasificarTarea(t, desde, hasta){
  const creada     = diaChile(t.created);
  const completada = t.status==='done' ? diaChile(t.completado) : '';
  const limite     = diaChile(t.fecha);
  const enPeriodo  = d => !!d && d >= desde && d <= hasta;
  // Pendiente al cierre: ya existía y no estaba completada al terminar el período.
  // Las completadas sin fecha de término (anteriores a v2.3.0) no se pueden ubicar y no cuentan como pendientes.
  const pendienteAlCierre = !!creada && creada <= hasta && (t.status!=='done' || (!!completada && completada > hasta));
  return {
    t, creada, completada, limite,
    creadaEnPeriodo:     enPeriodo(creada),
    completadaEnPeriodo: enPeriodo(completada),
    pendienteAlCierre,
    vencidaAlCierre:     pendienteAlCierre && !!limite && limite < hasta,
    diasResolucion:      completada && creada ? Math.max(0, diasEntre(creada, completada)) : null,
    aTiempo:             completada && limite ? completada <= limite : null,
    sinFechaTermino:     t.status==='done' && !completada
  };
}

// ── Agregados ──
function resumirFilas(filas){
  const comp     = filas.filter(f=>f.completadaEnPeriodo);
  const tiempos  = comp.map(f=>f.diasResolucion).filter(v=>v!==null).sort((a,b)=>a-b);
  const conPlazo = comp.filter(f=>f.aTiempo!==null);
  const aTiempo  = conPlazo.filter(f=>f.aTiempo).length;
  const mitad    = Math.floor(tiempos.length/2);
  return {
    creadas:       filas.filter(f=>f.creadaEnPeriodo).length,
    completadas:   comp.length,
    pendientes:    filas.filter(f=>f.pendienteAlCierre).length,
    vencidas:      filas.filter(f=>f.vencidaAlCierre).length,
    altaPendiente: filas.filter(f=>f.pendienteAlCierre&&f.t.prioridad==='alta').length,
    tiempoPromedio: tiempos.length ? tiempos.reduce((s,v)=>s+v,0)/tiempos.length : null,
    tiempoMediana:  tiempos.length ? (tiempos.length%2 ? tiempos[mitad] : (tiempos[mitad-1]+tiempos[mitad])/2) : null,
    aTiempo, conPlazo: conPlazo.length,
    cumplimiento:   conPlazo.length ? Math.round(aTiempo/conPlazo.length*100) : null
  };
}

function agruparFilas(filas, clave){
  const grupos = {};
  filas.forEach(f=>{ const k=clave(f)||'—'; (grupos[k] ||= []).push(f); });
  return Object.entries(grupos)
    .map(([nombre, g])=>({ nombre, ...resumirFilas(g) }))
    .sort((a,b)=>(b.creadas+b.completadas+b.pendientes)-(a.creadas+a.completadas+a.pendientes) || a.nombre.localeCompare(b.nombre,'es'));
}

// Indicadores completos de un período. `tareas` ya viene filtrado por coordinación si corresponde.
function calcularMetricas(tareas, desde, hasta){
  const activas = tareas.filter(t=>t.status!=='archivada');
  const filas = activas
    .map(t=>clasificarTarea(t, desde, hasta))
    .filter(f=>f.creadaEnPeriodo||f.completadaEnPeriodo||f.pendienteAlCierre);
  return {
    desde, hasta, filas,
    total:          resumirFilas(filas),
    porPersona:     agruparFilas(filas, f=>f.t.asignado||'Sin asignar'),
    porCoord:       agruparFilas(filas, f=>getCoordMeta(f.t.coordId).name),
    porTipo:        agruparFilas(filas, f=>f.t.tipo_requerimiento||'Sin tipo'),
    porCategoria:   agruparFilas(filas, f=>f.t.categoria||'Sin categoría'),
    porSolicitante: agruparFilas(filas, f=>f.t.solicitante||'Sin solicitante'),
    // Completadas sin fecha de término que existían al cierre (no se pueden asignar a un período)
    sinFechaTermino: activas.filter(t=>t.status==='done' && !diaChile(t.completado) && diaChile(t.created) && diaChile(t.created) <= hasta).length
  };
}

// Tareas visibles para el reporte según coordinación elegida (o la de la URL, para jefaturas)
function tareasParaReporte(){
  const coord = state.urlCoord || (state.repCoord!=='all' ? state.repCoord : null);
  return coord ? state.tareas.filter(t=>String(t.coordId)===String(coord)) : state.tareas;
}

// Período vigente del reporte (se inicializa con el atajo elegido)
function periodoReporte(){
  if(!state.repDesde || !state.repHasta){
    const r = rangoAtajo(state.repAtajo);
    state.repDesde = r.desde; state.repHasta = r.hasta;
  }
  return { desde: state.repDesde, hasta: state.repHasta };
}

// ── Formato ──
function fmtDias(v){ return v===null ? '—' : v.toLocaleString('es-CL',{maximumFractionDigits:1})+(v===1?' día':' días'); }
function fmtPct(v){ return v===null ? '—' : v+'%'; }

// Variación vs período anterior. `menorEsMejor` invierte el color (ej. tiempo de resolución, vencidas).
// `puntos` compara porcentajes en puntos porcentuales. `sinTono` para cifras que no son buenas ni malas (ej. demanda).
function variacion(actual, anterior, {menorEsMejor=false, puntos=false, sinTono=false}={}){
  if(actual===null || anterior===null) return { texto:'sin comparación', tono:'neutro' };
  const dif = actual - anterior;
  if(Math.abs(dif) < 1e-9) return { texto:'= igual que el período anterior', tono:'neutro' };
  let texto;
  if(puntos) texto = `${dif>0?'+':''}${Math.round(dif)} pts`;
  else if(anterior===0) texto = `${dif>0?'+':''}${dif.toLocaleString('es-CL',{maximumFractionDigits:1})}`;
  else texto = `${dif>0?'+':''}${Math.round(dif/anterior*100)}%`;
  const mejora = menorEsMejor ? dif<0 : dif>0;
  return { texto: `${dif>0?'▲':'▼'} ${texto} vs anterior`, tono: sinTono?'neutro':(mejora?'bueno':'malo') };
}
