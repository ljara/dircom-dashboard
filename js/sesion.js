// Entrar con Google (cuentas @ufrontera.cl): botón, sesión guardada en este navegador y salir

const CLAVE_SESION = 'dircom-sesion';

function sesionGuardada(){
  try{ return localStorage.getItem(CLAVE_SESION); }catch(e){ return null; }
}

// Google entrega un token; el servidor lo verifica y devuelve la sesión del dashboard
async function alEntrarConGoogle(resp){
  try{
    const json = await callAPI('login', {credential: resp.credential});
    try{ localStorage.setItem(CLAVE_SESION, json.sesion); }catch(e){}
    // Entrar desde la URL general: los parámetros antiguos (?coord=) ya no hacen falta
    const params = new URLSearchParams(location.search);
    params.delete('coord');
    location.search = params.toString();
  } catch(e){ showToast(e.message); }
}

function cerrarSesion(){
  try{ localStorage.removeItem(CLAVE_SESION); }catch(e){}
  if(window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
  location.reload();
}

// Dibuja el botón de Google en cada elemento .g-btn vacío (se llama después de cada render)
let googleListo = false;
function montarBotonesGoogle(){
  if(!window.google?.accounts?.id) return;
  if(!googleListo){
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: alEntrarConGoogle, hd: 'ufrontera.cl' });
    googleListo = true;
  }
  document.querySelectorAll('.g-btn:empty').forEach(el=>
    google.accounts.id.renderButton(el, { theme:'outline', text:'signin_with', locale:'es',
      size: el.classList.contains('login-btn') ? 'large' : 'medium' }));
}
// La librería de Google carga en paralelo y avisa al terminar
window.onGoogleLibraryLoad = montarBotonesGoogle;

// ¿Mostrar la invitación a entrar? Solo en los enlaces antiguos (la directora con ?k= no la necesita)
function mostrarEntrar(){ return !esDirector() && !esPersona() && !state.urlKey && !state.bloqueado; }

// ── Pantalla de inicio de sesión (cuando el servidor exige entrar con Google) ──
// El fondo es un tablero de muestra desenfocado: el servidor no entrega datos reales sin sesión
function mostrarPantallaLogin(){
  state.bloqueado = true;
  state.rol = 'general'; state.view = 'dashboard';
  state.coordinaciones = ['Prensa','Diseño','Audiovisual','Digital'].map((n,i)=>({id:'m'+i, nombre:n, icon:'📁'}));
  state.personas = Array.from({length:8}, (_,i)=>({id:'pm'+i, nombre:'Persona '+(i+1), rol:'', coordId:'m'+(i%4), esJefe:'false'}));
  state.tareas = Array.from({length:36}, (_,i)=>normalizeTarea({
    id:'tm'+i, titulo:'Tarea de muestra '+(i+1), coord_id:'m'+(i%4), asignado:'Persona '+(i%8+1),
    status:['todo','progress','review','done'][i%4], prioridad:['alta','media','baja'][i%3],
    fecha: sumarDias(hoyChile(), (i%15)-5), created_at: new Date(Date.now()-i*864e5).toISOString()
  }));
  renderSidebarCoords();
  render();
  document.body.classList.add('bloqueado');
  const capa = document.createElement('div');
  capa.className = 'login-overlay';
  capa.innerHTML = `
    <div class="login-card">
      <div class="login-org">Universidad de La Frontera</div>
      <div class="login-titulo">DirCom</div>
      <div class="login-sub">Panel de gestión de tareas</div>
      <p class="login-texto">Entra con tu cuenta <strong>@ufrontera.cl</strong> para ver y actualizar tus tareas.</p>
      <div class="g-btn login-btn"></div>
      <p class="login-ayuda">¿Google te muestra tu cuenta personal? Agrega tu cuenta @ufrontera.cl en el navegador o abre una ventana de incógnito.</p>
    </div>`;
  document.body.appendChild(capa);
  montarBotonesGoogle();
}

// Bloque de la barra lateral: quién está conectado o el botón para entrar
function sesionSidebarHTML(){
  if(state.yo) return `<div class="sesion-yo">👤 ${escHtml(state.yo.nombre)}
    <button class="btn btn-ghost btn-sm" onclick="cerrarSesion()" title="${escHtml(state.yo.correo||'')}">Salir</button></div>`;
  if(mostrarEntrar()) return `<div class="g-btn"></div>`;
  return '';
}

// Aviso en Dashboard y Tareas para quienes siguen usando un enlace antiguo
function bannerEntrarHTML(){
  if(!mostrarEntrar()) return '';
  return `
    <div class="banner-entrar">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">Entra con tu cuenta @ufrontera.cl</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${state.editable
          ? 'Pronto este enlace dejará de permitir cambios.'
          : 'Este enlace es solo de lectura: para crear o actualizar tareas, entra con tu cuenta.'}</div>
      </div>
      <div class="g-btn"></div>
    </div>`;
}
