// Utilidades: colores, fechas, etiquetas, filtros de tareas y avisos

// ── Color helpers ──────────────────────────────────────────
function coordColor(idx){ return PALETTE[idx % PALETTE.length]; }
function getCoordMeta(id){
  const idx = state.coordinaciones.findIndex(c=>String(c.id)===String(id));
  const coord = state.coordinaciones[idx];
  if(!coord) return {name:id||'Sin coordinación',icon:'📁',hex:'#888',bg:'rgba(136,136,136,.13)'};
  const color = coordColor(idx);
  return {name:coord.nombre,icon:coord.icon||'📁',hex:color.hex,bg:color.bg};
}

// ── Helpers ────────────────────────────────────────────────
function formatFecha(d){
  if(!d) return '—';
  try{
    const date = new Date(d);
    if(isNaN(date)) return String(d);
    return date.toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'America/Santiago'});
  } catch(e){ return String(d); }
}
function statusLabel(s){ return {todo:'Por hacer',progress:'En progreso',review:'Revisión',done:'Completada'}[s]||s; }
function priorLabel(p){ return {alta:'Alta',media:'Media',baja:'Baja'}[p]||p; }
function getInitials(n){ return (n||'').split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase(); }
const AV=['#1F5A99','#378ADD','#1D9E75','#EF9F27','#D4537E','#D85A30'];
function avatarColor(n){ let h=0;for(let c of(n||''))h=(h*31+c.charCodeAt(0))%AV.length;return AV[h]; }
function tasksFor(id){ return state.tareas.filter(t=>String(t.coordId)===String(id)&&t.status!=='archivada'); }
function completedPct(id){ const t=tasksFor(id);if(!t.length)return 0;return Math.round(t.filter(x=>x.status==='done').length/t.length*100); }
function activeTareas(){ return state.tareas.filter(t=>t.status!=='archivada'); }
function showToast(msg){ const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3000); }

// Campos extra (columnas del Sheet que no son del sistema)
function extraFields(headers, systemFields){
  return headers.filter(h => h && !systemFields.includes(h));
}

function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
