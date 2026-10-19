// Novedades para el enlace de una coordinación: tareas que la directora creó o asignó
// desde la última vez que se marcaron como vistas (se recuerda en este navegador)

const NOVEDADES_DIAS_INICIALES = 7;   // primera visita: muestra lo de la última semana

function claveVisto(){ return 'dircom-visto-' + state.urlCoord; }

function leerVisto(){
  try{ const v = localStorage.getItem(claveVisto()); if(v) return v; }catch(e){}
  return new Date(Date.now() - NOVEDADES_DIAS_INICIALES*864e5).toISOString();
}

// Tareas de la coordinación asignadas por la directora después de la última visita
function novedadesCoord(){
  if(!state.urlCoord) return [];
  const visto = new Date(leerVisto());
  return activeTareas()
    .filter(t=>String(t.coordId)===String(state.urlCoord) && t.asignadoPor==='directora'
      && t.asignadoAt && new Date(t.asignadoAt) > visto)
    .sort((a,b)=>new Date(b.asignadoAt)-new Date(a.asignadoAt));
}

function esNovedad(t){ return novedadesCoord().some(n=>n.id===t.id); }

// Se guarda la fecha de la novedad más reciente (reloj del servidor), no la hora del equipo
function marcarNovedadesVistas(){
  const nov = novedadesCoord();
  if(!nov.length) return;
  try{ localStorage.setItem(claveVisto(), nov[0].asignadoAt); }catch(e){}
  render();
}

// "(2) Dashboard — …" en la pestaña del navegador mientras haya novedades
const TITULO_BASE = document.title;
function actualizarTituloNovedades(){
  const n = novedadesCoord().length;
  document.title = (n ? `(${n}) ` : '') + TITULO_BASE;
}

function bannerNovedadesHTML(){
  const nov = novedadesCoord();
  if(!nov.length) return '';
  const MAX = 5;
  const fila = t=>{
    // Recién creada si se asignó al momento de crearla; si no, fue reasignada después
    const nueva = Math.abs(new Date(t.asignadoAt) - new Date(t.created)) < 60*1000;
    return `<li style="margin:3px 0">
      <a href="#" class="task-title-link" style="font-weight:500" onclick="event.preventDefault();verNovedad('${t.id}')">${escHtml(t.titulo||'')}</a>
      <span style="color:var(--text-muted)"> · ${nueva?'nueva'+(t.asignado?' para '+escHtml(t.asignado):''):'asignada'+(t.asignado?' a '+escHtml(t.asignado):'')} ·${formatFecha(t.asignadoAt)}</span>
    </li>`;
  };
  return `
    <div style="background:var(--blue-light);border:1px solid #378ADD;border-radius:var(--radius);padding:12px 16px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="font-size:20px">🔔</span>
        <div style="flex:1;font-size:13px;font-weight:600;color:#0C447C">
          ${nov.length} tarea${nov.length>1?'s':''} de la directora desde tu última visita
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
