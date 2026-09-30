// Arranque: carga inicial y actualizaciÃ³n automÃ¡tica cada 2 minutos

// ── Auto-refresh silencioso ────────────────────────────────
let autoRefreshInterval = null;
const REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutos

async function silentRefresh(){
  if(document.getElementById('modal').style.display==='flex') return;
  try{
    const data = await callAPI('getAll');
    state.coordinaciones = (data.coordinaciones||[]).map(normalizeCoord);
    state.personas       = (data.personas||[]).map(normalizePersona);
    state.tareas         = (data.tareas||[]).map(normalizeTarea);
    state.opciones       = data.opciones || {};
    renderSidebarCoords();
    render();
    const txt=document.getElementById('sync-text');
    const now=new Date().toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});
    if(txt) txt.textContent=`Actualizado ${now}`;
  } catch(e){ /* fallo silencioso */ }
}

function startAutoRefresh(){
  if(autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(silentRefresh, REFRESH_INTERVAL);
}

loadData().then(()=>startAutoRefresh());
