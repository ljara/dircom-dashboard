// Capítulos de programa (UFROmedios): cuando el tipo de requerimiento es "Producción Programa"
// la tarea es un capítulo, con su programa (lista en Opciones) y sus invitados.
// Cada invitado: {nombre, cargo, genero: 'mujer'|'hombre'|'otro', ufro: true|false, tipo}
// tipo = tipo de contenido (lista en Opciones).

const GENEROS_INV = { mujer:'Mujer', hombre:'Hombre', otro:'Otro' };
const origenInv = i => i.ufro ? 'ufro' : 'externo';
const ORIGEN_LABEL = { ufro:'UFRO', externo:'Externo' };

// "Producción Programa", "Produccion de programa", etc.
function esProgramaTipo(tipo){
  const n = normSol(tipo);
  return n.includes('produccion') && n.includes('programa');
}
function esPrograma(t){ return esProgramaTipo(t.tipo_requerimiento); }

// Opciones de una lista, más el valor actual si ya no está (se conserva al editar)
function opcionesCon(tipo, actual){
  const l = [...(state.opciones[tipo]||[])];
  if(actual && !l.includes(actual)) l.push(actual);
  return l;
}

// ── Totales ────────────────────────────────────────────────
function resumenVacio(){
  return { total:0, ufro:0, externo:0, mujer:0, hombre:0, otro:0,
           cruce:{ mujer:{ufro:0,externo:0}, hombre:{ufro:0,externo:0}, otro:{ufro:0,externo:0} } };
}
function resumenInvitados(lista){
  const r = resumenVacio();
  (lista||[]).forEach(i=>{
    if(!GENEROS_INV[i.genero]) return;
    const origen = origenInv(i);
    r.total++; r[i.genero]++; r[origen]++; r.cruce[i.genero][origen]++;
  });
  return r;
}
function textoResumenInv(r){
  if(!r.total) return 'Sin invitados';
  const g = Object.keys(GENEROS_INV).filter(k=>r[k])
    .map(k=>`${r[k]} ${k==='mujer'?(r[k]===1?'mujer':'mujeres'):k==='hombre'?(r[k]===1?'hombre':'hombres'):'otro'}`).join(', ');
  return `${r.total} invitado${r.total!==1?'s':''}: ${g} · ${r.ufro} UFRO, ${r.externo} externo${r.externo!==1?'s':''}`;
}

// ── Formulario de la tarea ─────────────────────────────────
function seccionInvitadosHTML(item, dis){
  const lista = item?.invitados || [];
  const ver = esProgramaTipo(item?.tipo_requerimiento);
  const programas = opcionesCon('programa', item?.programa);
  return `<div id="invitados-wrap" class="inv-wrap" style="display:${ver?'block':'none'}" data-dis="${dis?'1':''}">
    <div class="inv-titulo">🎙 Capítulo</div>
    <div class="form-group" style="margin-bottom:10px"><label>Programa *</label>
      <select id="f-programa"${dis}>
        <option value="">Selecciona el programa…</option>
        ${programas.map(p=>`<option value="${escHtml(p)}"${item?.programa===p?' selected':''}>${escHtml(p)}</option>`).join('')}
      </select>
      ${programas.length?'':`<div class="sug-n" style="margin-top:4px">Aún no hay programas: la directora los agrega en Opciones.</div>`}
    </div>
    <div class="inv-titulo">Invitados del capítulo</div>
    <div id="inv-filas">${lista.map(i=>filaInvitadoHTML(i, dis)).join('')}</div>
    ${dis ? '' : `<button type="button" class="btn btn-sm" onclick="agregarInvitado()">＋ Agregar invitado</button>`}
    <div id="inv-totales" class="inv-totales">${textoResumenInv(resumenInvitados(lista))}</div>
  </div>`;
}
function filaInvitadoHTML(i={}, dis=''){
  const sel = (v, a) => String(v)===String(a) ? ' selected' : '';
  const origen = i.nombre!==undefined ? origenInv(i) : '';
  const tipos = opcionesCon('tipo_contenido', i.tipo);
  return `<div class="inv-fila">
    <input class="inv-nombre"${dis} value="${escHtml(i.nombre||'')}" placeholder="Nombre *">
    <input class="inv-cargo"${dis} value="${escHtml(i.cargo||'')}" placeholder="Cargo o institución">
    <select class="inv-genero"${dis} onchange="actualizarTotalesInv()">
      <option value="">Género *</option>
      ${Object.entries(GENEROS_INV).map(([k,l])=>`<option value="${k}"${sel(i.genero,k)}>${l}</option>`).join('')}
    </select>
    <select class="inv-origen"${dis} onchange="actualizarTotalesInv()">
      <option value="">Origen *</option>
      <option value="ufro"${sel(origen,'ufro')}>UFRO</option>
      <option value="externo"${sel(origen,'externo')}>Externo</option>
    </select>
    <select class="inv-tipo"${dis}>
      <option value="">Tipo de contenido *</option>
      ${tipos.map(t=>`<option value="${escHtml(t)}"${sel(i.tipo,t)}>${escHtml(t)}</option>`).join('')}
    </select>
    ${dis ? '' : `<button type="button" class="btn btn-sm btn-danger" title="Quitar" onclick="this.parentElement.remove();actualizarTotalesInv()">✕</button>`}
  </div>`;
}
function agregarInvitado(){
  const filas = document.getElementById('inv-filas'); if(!filas) return;
  filas.insertAdjacentHTML('beforeend', filaInvitadoHTML());
  filas.lastElementChild.querySelector('.inv-nombre').focus();
  actualizarTotalesInv();
}
// Lee las filas del formulario. Las filas vacías se ignoran; las incompletas son error.
function leerInvitados(){
  const lista = [], errores = [];
  document.querySelectorAll('#inv-filas .inv-fila').forEach((f, n)=>{
    const nombre = f.querySelector('.inv-nombre').value.trim();
    const cargo  = f.querySelector('.inv-cargo').value.trim();
    const genero = f.querySelector('.inv-genero').value;
    const origen = f.querySelector('.inv-origen').value;
    const tipo   = f.querySelector('.inv-tipo').value;
    if(!nombre && !cargo && !genero && !origen && !tipo) return;
    if(!nombre || !genero || !origen || !tipo) errores.push(n+1);
    lista.push({ nombre, cargo, genero, ufro: origen==='ufro', tipo });
  });
  return { lista, errores };
}
function programaElegido(){ return document.getElementById('f-programa')?.value || ''; }
function actualizarTotalesInv(){
  const el = document.getElementById('inv-totales'); if(!el) return;
  const filas = [...document.querySelectorAll('#inv-filas .inv-fila')]
    .map(f=>({ genero: f.querySelector('.inv-genero').value, origen: f.querySelector('.inv-origen').value }))
    .filter(i=>i.genero && i.origen)
    .map(i=>({ genero: i.genero, ufro: i.origen==='ufro' }));
  el.textContent = textoResumenInv(resumenInvitados(filas));
}
// Muestra u oculta la sección según el tipo de requerimiento elegido
function toggleInvitados(){
  const wrap = document.getElementById('invitados-wrap');
  const tipo = document.getElementById('f-tipo_requerimiento');
  if(wrap && tipo) wrap.style.display = esProgramaTipo(tipo.value) ? 'block' : 'none';
}
function invitadosVisibles(){
  const wrap = document.getElementById('invitados-wrap');
  return !!wrap && wrap.style.display!=='none' && !wrap.dataset.dis;
}

// ── Detalle y lista ────────────────────────────────────────
function detalleInvitadosHTML(t){
  if(!esPrograma(t) && !(t.invitados||[]).length) return '';
  const lista = t.invitados||[];
  return `<div class="detail-desc">
    ${t.programa?`<div class="d-label">📻 Programa: <strong>${escHtml(t.programa)}</strong></div>`:''}
    <div class="d-label">🎙 Invitados · ${escHtml(textoResumenInv(resumenInvitados(lista)))}</div>
    ${lista.length ? `<table class="inv-tabla"><tbody>${lista.map(i=>`<tr>
      <td><strong>${escHtml(i.nombre||'')}</strong>${i.cargo?`<div class="sug-n">${escHtml(i.cargo)}</div>`:''}</td>
      <td>${GENEROS_INV[i.genero]||'—'}</td><td>${ORIGEN_LABEL[origenInv(i)]}</td><td>${escHtml(i.tipo||'—')}</td>
    </tr>`).join('')}</tbody></table>` : ''}
  </div>`;
}
function chipInvitados(t){
  const n = (t.invitados||[]).length;
  const prog = t.programa ? `<span title="Programa">📻 ${escHtml(t.programa)}</span>` : '';
  return prog + (n ? `<span title="${escHtml(textoResumenInv(resumenInvitados(t.invitados)))}">🎙 ${n} invitado${n!==1?'s':''}</span>` : '');
}

// ── Reportes ───────────────────────────────────────────────
// Capítulos de programa completados en el período y sus invitados, en total, por programa y por tipo de contenido
function metricasInvitados(filas){
  const caps = filas.filter(f=>f.completadaEnPeriodo && esPrograma(f.t));
  const invs = caps.flatMap(f=>f.t.invitados||[]);
  const agrupar = (items, clave) => {
    const g = {};
    items.forEach(([k, lista, cap])=>{
      k = k || '(sin indicar)';
      if(!g[k]) g[k] = { nombre:k, capitulos:0, lista:[] };
      g[k].capitulos += cap; g[k].lista.push(...lista);
    });
    return Object.values(g).map(x=>({ nombre:x.nombre, capitulos:x.capitulos, ...resumenInvitados(x.lista) }))
      .sort((a,b)=>b.total-a.total || b.capitulos-a.capitulos || a.nombre.localeCompare(b.nombre));
  };
  return {
    capitulos: caps.length, ...resumenInvitados(invs),
    porPrograma: agrupar(caps.map(f=>[f.t.programa, f.t.invitados||[], 1])),
    porTipo:     agrupar(invs.map(i=>[i.tipo, [i], 0]))
  };
}
function invitadosReporteHTML(m){
  const pct = (n, d) => d ? Math.round(n/d*100)+'%' : '—';
  const fila = (etq, k) => {
    const c = m.cruce[k], tot = c.ufro + c.externo;
    return `<tr><td>${etq}</td><td class="num">${c.ufro}</td><td class="num">${c.externo}</td><td class="num"><strong>${tot}</strong></td><td class="num">${pct(tot, m.total)}</td></tr>`;
  };
  return `<table class="tabla-kpi">
    <thead><tr><th>Género</th><th class="num">UFRO</th><th class="num">Externos</th><th class="num">Total</th><th class="num">%</th></tr></thead>
    <tbody>${fila('Mujeres','mujer')}${fila('Hombres','hombre')}${fila('Otro','otro')}</tbody>
    <tfoot><tr><td><strong>Total</strong> · ${m.capitulos} capítulo${m.capitulos!==1?'s':''}</td><td class="num"><strong>${m.ufro}</strong></td><td class="num"><strong>${m.externo}</strong></td><td class="num"><strong>${m.total}</strong></td><td class="num">${m.capitulos?`${(m.total/m.capitulos).toLocaleString('es-CL',{maximumFractionDigits:1})} por cap.`:''}</td></tr></tfoot>
  </table>`;
}
// Tabla por programa (con capítulos) o por tipo de contenido
function invitadosGruposHTML(grupos, etiqueta, conCapitulos){
  if(!grupos.length) return '';
  return `<table class="tabla-kpi">
    <thead><tr><th>${etiqueta}</th>${conCapitulos?'<th class="num">Capítulos</th>':''}<th class="num">Invitados</th><th class="num">Mujeres</th><th class="num">Hombres</th><th class="num">Otro</th><th class="num">UFRO</th><th class="num">Externos</th></tr></thead>
    <tbody>${grupos.map(g=>`<tr><td>${escHtml(g.nombre)}</td>${conCapitulos?`<td class="num">${g.capitulos}</td>`:''}<td class="num"><strong>${g.total}</strong></td><td class="num">${g.mujer}</td><td class="num">${g.hombre}</td><td class="num">${g.otro}</td><td class="num">${g.ufro}</td><td class="num">${g.externo}</td></tr>`).join('')}</tbody>
  </table>`;
}
