// Avisos (🔔) de cada persona: tareas que le crearon, asignaron o cambiaron de fecha límite, tareas de su coordinación
// que pasaron a Revisión y, para Administración, tareas que creó otra persona.
// El servidor decide qué avisos le tocan a cada uno; el "visto" se guarda en su ficha de
// Equipo (sincronizado entre equipos). Sin ficha, se recuerda solo en este navegador.

const NOVEDADES_DIAS_INICIALES = 7;   // sin visto guardado: muestra lo de la última semana

function claveVisto(){ return 'dircom-visto-' + (state.yo?.correo || ''); }

function leerVisto(){
  if(state.visto) return state.visto;
  if(state.vistoLocal){
    try{ const v = localStorage.getItem(claveVisto()); if(v) return v; }catch(e){}
  }
  return new Date(Date.now() - NOVEDADES_DIAS_INICIALES*864e5).toISOString();
}

// Un aviso por tarea (el más reciente), solo de tareas que siguen activas
function novedadesVisibles(){
  const visto = new Date(leerVisto());
  const vistas = new Set();
  return (state.avisos||[])
    .filter(e=>new Date(e.created_at) > visto)
    .sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))
    .map(e=>({ ...e, tarea: activeTareas().find(t=>t.id===e.tarea_id) }))
    .filter(e=>e.tarea && !vistas.has(e.tarea_id) && vistas.add(e.tarea_id));
}

function esNovedad(t){ return novedadesVisibles().some(n=>n.tarea_id===t.id); }

// Se guarda la fecha del aviso más reciente (reloj del servidor), no la hora del equipo
async function marcarNovedadesVistas(){
  const nov = novedadesVisibles();
  if(!nov.length) return;
  const hasta = nov[0].created_at;
  // Viendo como otra persona: no se marcan sus avisos
  if(state.viendoComo){ state.visto = hasta; render(); return; }
  if(state.vistoLocal){
    try{ localStorage.setItem(claveVisto(), hasta); }catch(e){}
    state.visto = hasta;
    render();
    return;
  }
  const anterior = state.visto;
  state.visto = hasta;
  render();
  try{ await callAPI('marcarVisto', {hasta}); }
  catch(e){ state.visto = anterior; render(); showToast('Error: '+e.message); }
}

// "(2) DirCom — …" en la pestaña del navegador mientras haya avisos
const TITULO_BASE = document.title;
function actualizarTituloNovedades(){
  const n = novedadesVisibles().length;
  document.title = (n ? `(${n}) ` : '') + TITULO_BASE;
}

function textoAviso(e){
  const por = e.actor_rol==='directora' ? 'Administración' : (e.actor_nombre||'');
  const quien = por ? ' · por '+escHtml(por) : '';
  if(e.tipo==='revision') return 'pasó a Revisión'+quien;
  // Administración y quien gestiona tareas ven todas las coordinaciones: se indica cuál
  const coord = state.urlCoord ? '' : ' · '+escHtml(getCoordMeta(e.tarea.coordId).name);
  const para = e.para ? (e.para===state.yo?.nombre ? ' para ti' : ' para '+escHtml(e.para)) : '';
  return (e.tipo==='creada' ? 'nueva' : e.tipo==='fecha' ? 'nueva fecha límite' : 'asignada') + para + coord + quien;
}

function bannerNovedadesHTML(){
  const nov = novedadesVisibles();
  if(!nov.length) return '';
  const MAX = 5;
  const fila = e=>`<li style="margin:3px 0">
      <a href="#" class="task-title-link" style="font-weight:500" onclick="event.preventDefault();verNovedad('${e.tarea_id}')">${escHtml(e.tarea.titulo||'')}</a>
      <span style="color:var(--text-muted)"> · ${textoAviso(e)} · ${formatFecha(e.created_at)}</span>
    </li>`;
  return `
    <div style="background:var(--blue-light);border:1px solid #378ADD;border-radius:var(--radius);padding:12px 16px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="font-size:20px">🔔</span>
        <div style="flex:1;font-size:13px;font-weight:600;color:#0C447C">
          ${nov.length} aviso${nov.length>1?'s':''} desde tu última visita
        </div>
        <button class="btn btn-sm btn-ghost" onclick="marcarNovedadesVistas()">✓ Marcar como visto</button>
      </div>
      <ul style="margin:8px 0 0 30px;padding:0;font-size:12px">
        ${nov.slice(0,MAX).map(fila).join('')}
        ${nov.length>MAX?`<li style="color:var(--text-muted)">y ${nov.length-MAX} más (con la etiqueta "Nueva" en la lista)</li>`:''}
      </ul>
    </div>`;
}

function verNovedad(id){
  const t = state.tareas.find(x=>x.id===id);
  if(t) viewTask(t);
}
