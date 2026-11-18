// Solicitantes: sugerencias al escribir, nombre único en reportes y herramienta "Unificar solicitantes"
// state.solicitantes llega del servidor: [{nombre, n}] con cada forma escrita y cuántas tareas la usan.

// ── Comparación de nombres ─────────────────────────────────
// Clave sin mayúsculas, tildes, puntos ni espacios de más: "Carmen  Hernández." = "carmen hernandez"
function normSol(s){
  return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'')
    .toLowerCase().replace(/[.,]/g,' ').replace(/\s+/g,' ').trim();
}

// Títulos y tratamientos que no cuentan al comparar ("Sra. Carmen Hernández" = "Carmen Hernández")
const TITULOS_SOL = new Set(['sr','sra','srta','don','dona','dr','dra','prof','profa','profesor','profesora','mg','mag']);
function palabrasSol(clave){
  const p = clave.split(' ');
  const sin = p.filter(w=>!TITULOS_SOL.has(w));
  return sin.length ? sin : p;
}

function distancia(a, b){   // Levenshtein
  if(a===b) return 0;
  let prev = Array.from({length:b.length+1}, (_,j)=>j);
  for(let i=1;i<=a.length;i++){
    const cur=[i];
    for(let j=1;j<=b.length;j++) cur[j]=Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1));
    prev=cur;
  }
  return prev[b.length];
}

// Dos palabras equivalen si son iguales o difieren en una letra; con conInicial, también si una es la inicial de la otra
function palabraIgual(a, b, conInicial=true){
  if(a===b) return true;
  if(a.length===1 || b.length===1) return conInicial && a[0]===b[0];
  return Math.min(a.length,b.length)>=4 && distancia(a,b)<=1;
}

// ¿Pueden ser la misma persona? (claves ya normalizadas y distintas)
// - error de tipeo: "carmen hernandes" / "carmen hernandez"
// - uno contenido en el otro: "carmen hernandez" / "carmen hernandez soto" / "c hernandez"
// - otro orden: "hernandez carmen" / "carmen hernandez soto"
// - con título: "sra carmen hernandez" / "carmen hernandez"
// Un nombre de una sola palabra ("Carmen") no se agrupa solo: se unifica a mano.
function posibleMismaPersona(x, y){
  const px=palabrasSol(x), py=palabrasSol(y);
  const sx=px.join(' '), sy=py.join(' ');
  if(sx===sy) return true;
  if(Math.min(sx.length,sy.length)>=8 && distancia(sx,sy)<=2) return true;
  const [corto, largo] = px.length<=py.length ? [px,py] : [py,px];
  if(corto.length<2) return false;
  // En orden, empezando por el nombre (admite iniciales: "c hernandez")
  if(palabraIgual(corto[0], largo[0])){
    let j=1, ok=true;
    for(let i=1;i<corto.length && ok;i++){
      while(j<largo.length && !palabraIgual(corto[i], largo[j])) j++;
      if(j>=largo.length) ok=false;
      j++;
    }
    if(ok) return true;
  }
  // En cualquier orden (sin iniciales): cada palabra del corto está en el largo
  const usadas = new Set();
  return corto.every(w=>{
    const k = largo.findIndex((v,i)=>!usadas.has(i) && palabraIgual(w, v, false));
    if(k<0) return false;
    usadas.add(k); return true;
  });
}

// ── Formas conocidas ───────────────────────────────────────
// Agrupa por clave normalizada: [{clave, nombre (la forma más usada), n (total), formas:[{nombre,n}]}]
let _cacheSol = { fuente:null, lista:[], porClave:{} };
function solicitantesConocidos(){
  if(_cacheSol.fuente === state.solicitantes) return _cacheSol;
  const porClave = {};
  (state.solicitantes||[]).forEach(({nombre, n})=>{
    const clave = normSol(nombre); if(!clave) return;
    const g = porClave[clave] ||= { clave, formas:[], n:0 };
    g.formas.push({ nombre: String(nombre), n }); g.n += n;   // tal como está escrito
  });
  const lista = Object.values(porClave);
  lista.forEach(g=>{ g.formas.sort((a,b)=>b.n-a.n); g.nombre = g.formas[0].nombre.trim(); });
  lista.sort((a,b)=>b.n-a.n || a.nombre.localeCompare(b.nombre,'es'));
  _cacheSol = { fuente: state.solicitantes, lista, porClave };
  return _cacheSol;
}

// Nombre con que se muestra un solicitante en los reportes (junta mayúsculas, tildes y espacios)
function nombreSolicitante(s){
  const clave = normSol(s);
  if(!clave) return '';
  return solicitantesConocidos().porClave[clave]?.nombre || String(s).trim();
}

// ── Sugerencias al escribir ────────────────────────────────
let _sugSel = -1;
function sugerirSolicitante(input){
  const caja = document.getElementById('sug-solicitante'); if(!caja) return;
  const q = normSol(input.value);
  const palabras = q ? q.split(' ') : [];
  const opciones = !palabras.length ? [] : solicitantesConocidos().lista.filter(g=>{
    const pg = g.clave.split(' ');
    return g.clave!==q && palabras.every(p=>pg.some(w=>w.startsWith(p)));
  }).slice(0,6);
  _sugSel = -1;
  if(!opciones.length){ caja.innerHTML=''; caja.style.display='none'; return; }
  caja.innerHTML = opciones.map((g,i)=>
    `<div class="sug-item" data-i="${i}" data-nombre="${escHtml(g.nombre)}" onmousedown="event.preventDefault();elegirSolicitante(this.dataset.nombre)">
      <span>${escHtml(g.nombre)}</span><span class="sug-n">${g.n} tarea${g.n!==1?'s':''}</span>
    </div>`).join('');
  caja.style.display='block';
}
function elegirSolicitante(nombre){
  const input = document.getElementById('f-solicitante');
  if(input) input.value = nombre;
  cerrarSugerencias();
}
function cerrarSugerencias(){
  const caja = document.getElementById('sug-solicitante');
  if(caja){ caja.innerHTML=''; caja.style.display='none'; }
  _sugSel = -1;
}
function teclaSolicitante(ev){
  const caja = document.getElementById('sug-solicitante');
  const items = caja ? [...caja.querySelectorAll('.sug-item')] : [];
  if(!items.length) return;
  if(ev.key==='ArrowDown' || ev.key==='ArrowUp'){
    ev.preventDefault();
    _sugSel = (_sugSel + (ev.key==='ArrowDown'?1:-1) + items.length) % items.length;
    items.forEach((el,i)=>el.classList.toggle('activo', i===_sugSel));
  } else if(ev.key==='Enter' && _sugSel>=0){
    ev.preventDefault(); elegirSolicitante(items[_sugSel].dataset.nombre);
  } else if(ev.key==='Escape'){
    ev.stopPropagation(); cerrarSugerencias();
  }
}
function campoSolicitanteHTML(valor, dis){
  return `<div class="sug-wrap">
    <input id="f-solicitante"${dis} value="${escHtml(valor||'')}" placeholder="Nombre del solicitante" autocomplete="off"
      oninput="sugerirSolicitante(this)" onkeydown="teclaSolicitante(event)" onblur="cerrarSugerencias()">
    <div id="sug-solicitante" class="sug-lista" style="display:none"></div>
  </div>`;
}

// ── Unificar solicitantes (solo Administración) ────────────
// Grupos de nombres que pueden ser la misma persona y aún no se han descartado
function gruposSolicitantes(){
  const lista = solicitantesConocidos().lista;
  const padre = lista.map((_,i)=>i);
  const raiz = i => padre[i]===i ? i : (padre[i]=raiz(padre[i]));
  for(let i=0;i<lista.length;i++)
    for(let j=i+1;j<lista.length;j++)
      if(posibleMismaPersona(lista[i].clave, lista[j].clave)) padre[raiz(i)] = raiz(j);
  const grupos = {};
  lista.forEach((g,i)=>(grupos[raiz(i)] ||= []).push(g));
  const ignorados = new Set(state.solicitantesIgnorados||[]);
  return Object.values(grupos)
    .map(gs=>{
      const formas = gs.flatMap(g=>g.formas).sort((a,b)=>b.n-a.n);
      const clave = gs.map(g=>g.clave).sort().join('|');
      return { clave, formas, sugerido: nombreSugerido(formas) };
    })
    .filter(g=>g.formas.length>1 && !ignorados.has(g.clave))
    .sort((a,b)=>b.formas.reduce((s,f)=>s+f.n,0)-a.formas.reduce((s,f)=>s+f.n,0));
}

// Nombre propuesto: el más completo (más palabras, sin contar títulos), con tildes y mayúsculas, y luego el más usado
function nombreSugerido(formas){
  const puntaje = f => palabrasSol(normSol(f.nombre)).length*10000
    + (f.nombre!==f.nombre.normalize('NFD').replace(/[̀-ͯ]/g,'') ? 1000 : 0)
    + (/^\s*\p{Lu}/u.test(f.nombre) ? 500 : 0) + f.n;
  return [...formas].sort((a,b)=>puntaje(b)-puntaje(a))[0].nombre.trim();
}

// Fila de una forma escrita, con casilla para marcarla; clic en el nombre lo usa como nombre correcto
function formaSolHTML(f, idCaja, marcada){
  const espacios = f.nombre!==f.nombre.trim() || /\s\s/.test(f.nombre);
  return `<label class="unif-forma" data-clave="${escHtml(normSol(f.nombre))}">
    <input type="checkbox"${marcada?' checked':''} data-nombre="${escHtml(f.nombre)}"${idCaja==='unif-manual'?' onchange="contarManual()"':''}>
    <span class="unif-nombre" title="Usar este nombre" data-nombre="${escHtml(f.nombre)}"
      onclick="event.preventDefault();document.querySelector('#${idCaja} .unif-final').value=this.dataset.nombre.trim()">${escHtml(f.nombre.trim())}</span>
    ${espacios?'<span class="sug-n">(con espacios de más)</span>':''}
    <span class="sug-n">${f.n} tarea${f.n!==1?'s':''}</span>
  </label>`;
}

function unificarSolicitantesHTML(){
  const grupos = gruposSolicitantes();
  const todas = solicitantesConocidos().lista.flatMap(g=>g.formas)
    .sort((a,b)=>a.nombre.trim().localeCompare(b.nombre.trim(),'es'));
  const ignorados = state.solicitantesIgnorados||[];
  const nombreClave = k => solicitantesConocidos().porClave[k]?.nombre || k;
  return `<div class="section" style="margin-top:16px">
    <div class="section-header">
      <div class="section-title">🙋 Unificar solicitantes</div>
      <span style="font-size:12px;color:var(--text-muted)">${grupos.length} grupo${grupos.length!==1?'s':''} por revisar</span>
    </div>
    <div style="padding:8px 14px 0;font-size:12px;color:var(--text-muted)">Nombres escritos de distinta forma que pueden ser la misma persona. Marca las formas que correspondan, revisa el nombre correcto y unifica: se corrigen todas esas tareas.</div>
    ${!grupos.length ? `<div class="empty" style="padding:16px"><p>No hay solicitantes por unificar ✓</p></div>`
      : grupos.map((g,gi)=>`
      <div class="unif-grupo" id="unif-${gi}" data-clave="${escHtml(g.clave)}">
        ${g.formas.map(f=>formaSolHTML(f, 'unif-'+gi, true)).join('')}
        <div class="unif-acciones">
          <input class="unif-final" value="${escHtml(g.sugerido)}" title="Nombre correcto (haz clic en una forma para usarla, o escríbelo)">
          <button class="btn btn-primary btn-sm" onclick="unificarSolicitantes('unif-${gi}')">Unificar</button>
          <button class="btn btn-sm" onclick="ignorarGrupoSolicitantes('unif-${gi}')">No son la misma persona</button>
        </div>
      </div>`).join('')}

    <details class="unif-extra">
      <summary>✋ Unificar a mano <span class="sug-n">(para casos que no aparecen arriba: siglas, nombres sueltos, etc.)</span></summary>
      <div class="unif-grupo" id="unif-manual" style="border-bottom:none">
        <input class="unif-buscar" placeholder="Buscar solicitante…" oninput="filtrarManual(this.value)">
        <div class="unif-todas">
          ${todas.length ? todas.map(f=>formaSolHTML(f, 'unif-manual', false)).join('') : '<p class="sug-n">Sin solicitantes</p>'}
        </div>
        <div class="unif-acciones">
          <input class="unif-final" placeholder="Nombre correcto (clic en un nombre para usarlo, o escríbelo)">
          <button class="btn btn-primary btn-sm" onclick="unificarSolicitantes('unif-manual')">Unificar <span id="unif-manual-n">(0)</span></button>
        </div>
      </div>
    </details>

    ${ignorados.length ? `<details class="unif-extra">
      <summary>🚫 Grupos descartados <span class="sug-n">(${ignorados.length}, marcados como "No son la misma persona")</span></summary>
      ${ignorados.map(k=>`<div class="unif-descartado">
        <span>${k.split('|').map(c=>escHtml(nombreClave(c))).join(' · ')}</span>
        <button class="btn btn-sm" data-clave="${escHtml(k)}" onclick="restaurarGrupoSolicitantes(this.dataset.clave)">Volver a mostrar</button>
      </div>`).join('')}
    </details>` : ''}
  </div>`;
}

// Unificar a mano: buscar (sin perder lo marcado) y contar lo marcado
function filtrarManual(texto){
  const palabras = normSol(texto).split(' ').filter(Boolean);
  document.querySelectorAll('#unif-manual .unif-forma').forEach(el=>{
    const pc = el.dataset.clave.split(' ');
    const ve = !palabras.length || palabras.every(p=>pc.some(w=>w.startsWith(p)));
    el.style.display = ve || el.querySelector('input').checked ? '' : 'none';
  });
}
function contarManual(){
  const n = document.querySelectorAll('#unif-manual input[type=checkbox]:checked').length;
  const el = document.getElementById('unif-manual-n'); if(el) el.textContent = `(${n})`;
}

async function unificarSolicitantes(idCaja){
  const caja = document.getElementById(idCaja); if(!caja) return;
  const a = caja.querySelector('.unif-final').value.trim();
  const de = [...caja.querySelectorAll('input[type=checkbox]:checked')].map(c=>c.dataset.nombre);
  if(!a){ showToast('Escribe el nombre correcto'); return; }
  if(!de.length || (de.length===1 && de[0]===a)){ showToast('Marca al menos una forma distinta del nombre correcto'); return; }
  if(!confirm(`¿Cambiar el solicitante de todas las tareas de:\n\n${de.map(d=>'• '+d.trim()).join('\n')}\n\npor "${a}"?`)) return;
  try{
    const r = await callAPI('unificarSolicitante', { de, a });
    showToast(`${r.cambiadas} tarea${r.cambiadas!==1?'s':''} actualizada${r.cambiadas!==1?'s':''} ✓`);
    await loadData();
  } catch(e){ showToast('Error: '+e.message); }
}

async function ignorarGrupoSolicitantes(idCaja){
  const caja = document.getElementById(idCaja); if(!caja) return;
  const clave = caja.dataset.clave;
  try{
    await callAPI('ignorarSolicitantes', { clave });
    state.solicitantesIgnorados = [...(state.solicitantesIgnorados||[]), clave];
    render();
    showToast('Listo: ese grupo no volverá a aparecer');
  } catch(e){ showToast('Error: '+e.message); }
}

async function restaurarGrupoSolicitantes(clave){
  try{
    await callAPI('restaurarSolicitantes', { clave });
    state.solicitantesIgnorados = (state.solicitantesIgnorados||[]).filter(k=>k!==clave);
    render();
    showToast('El grupo vuelve a aparecer para revisarlo');
  } catch(e){ showToast('Error: '+e.message); }
}
