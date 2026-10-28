# Dashboard DIRCOM — Dirección de Comunicaciones UFRO

Panel de gestión de tareas por coordinación. Frontend estático en HTML/CSS/JS, datos en Supabase
a través de una función serverless de Vercel (las credenciales nunca llegan al navegador).

## Estructura

```
dircom-dashboard/
├── index.html                 Estructura de la página (barra lateral, contenedores) y carga de scripts
├── manual-dircom.html         Manual de usuario
├── css/
│   └── styles.css             Estilos
├── img/
│   └── favicon.webp
├── js/
│   ├── config.js              Paleta de colores y campos del sistema
│   ├── state.js               Estado global y permisos en pantalla
│   ├── utils.js               Utilidades (fechas, colores, etiquetas, avisos)
│   ├── api.js                 Llamadas a /api/data y normalización de datos
│   ├── metricas.js            Cálculo de KPI por período (fechas, agregados, comparación)
│   ├── components/
│   │   ├── listas.js          Listas de tareas y personas
│   │   ├── modales.js         Formularios y detalle de tarea
│   │   ├── buscador.js        Buscador de la barra lateral
│   │   └── tablas.js          Indicadores y tablas de reporte (pantalla y PDF)
│   ├── views/                 Una vista por archivo
│   │   ├── dashboard.js
│   │   ├── tareas.js
│   │   ├── personas.js
│   │   ├── coordinaciones.js
│   │   ├── calendario.js
│   │   ├── reportes.js
│   │   ├── opciones.js
│   │   └── papelera.js
│   ├── reporte.js             Reporte de gestión imprimible / PDF
│   ├── exportar.js            Exportación a Excel (CSV)
│   ├── acciones.js            Crear, editar, cambiar estado y eliminar
│   ├── app.js                 Navegación y render principal
│   └── main.js                Arranque y actualización automática
├── api/
│   ├── data.js                Función serverless de Vercel (intermediario con Supabase)
│   └── keepalive.js           Cron diario que consulta Supabase para que no se pause
└── vercel.json
```

Los archivos de `js/` son scripts clásicos (no módulos ES): comparten el ámbito global para que los
`onclick="..."` del HTML generado encuentren las funciones. **El orden de los `<script>` en
`index.html` importa**: `main.js` va al final porque es el que arranca la aplicación.

## Configuración (Vercel)

Variables de entorno necesarias para `api/data.js`:

| Variable               | Descripción                               |
|------------------------|-------------------------------------------|
| `SUPABASE_URL`         | URL del proyecto Supabase                 |
| `SUPABASE_SERVICE_KEY` | Service role key de Supabase (secreta)    |
| `SESION_SECRETO`       | Firma las sesiones de Google (secreta). Sin ella no se puede entrar con Google |
| `DIRECTORA_CORREO`     | Correos @ufrontera.cl con acceso total (Administración), separados por coma. Se revisa en cada petición |
| `CRON_SECRET`          | Opcional: protege `/api/keepalive` para que solo lo llame el cron |
| `CORREO_USUARIO`       | Opcional: cuenta @ufrontera.cl que envía los avisos por correo (Gmail SMTP). Sin ella y `CORREO_CLAVE` no se envían correos |
| `CORREO_CLAVE`         | Contraseña de aplicación de Google de esa cuenta (secreta) |
| `VER_COMO_CORREO`      | Opcional: correos que pueden usar "👁 Ver como…" (ver el dashboard como otra persona de Equipo, en solo lectura), separados por coma |
| `CORREO_PRUEBA`        | Opcional, solo para probar: todos los correos van a esta dirección y la app muestra el resultado del envío. No usar en Production |

El plan gratuito de Supabase pausa el proyecto tras 7 días sin actividad. Para evitarlo,
`vercel.json` programa un cron diario (12:00 UTC) que llama a `/api/keepalive`, que hace una
consulta mínima a `coordinaciones`. Los crons solo corren en el despliegue de producción (`main`).

Tablas usadas en Supabase: `coordinaciones`, `personas`, `tareas`, `opciones`.

Desde v2.3.0 la tabla `tareas` necesita la columna `completed_at` (fecha de término), que
`api/data.js` fija al marcar una tarea como completada y borra si se reabre:

```sql
alter table tareas add column if not exists completed_at timestamptz;
```

Desde v2.6.0 también necesita `asignado_por` y `asignado_at`: el servidor registra quién creó o
reasignó cada tarea (`directora`, `coord:<id>` o `general`) y cuándo. Con eso, el enlace de cada
coordinación muestra las tareas que la directora le creó o asignó desde la última visita:

```sql
alter table tareas add column if not exists asignado_por text;
alter table tareas add column if not exists asignado_at timestamptz;
```

Desde v2.7.0 (login con Google) la tabla `personas` necesita el correo de cada persona y el permiso
"Gestiona tareas". `asignado_por` puede valer además `persona:<id>`:

```sql
alter table personas add column if not exists correo text;
create unique index if not exists personas_correo_unico on personas (lower(correo));
alter table personas add column if not exists gestiona_tareas boolean not null default false;
```

Desde v2.8.0 los avisos 🔔 salen de la tabla `eventos` (creada, asignada, fecha, revision), que llena el
servidor; el "visto" de cada persona queda en `personas.visto_at`:

```sql
create table eventos (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  tipo text not null, tarea_id text not null, coord_id text, para text,
  actor_id text, actor_rol text, actor_nombre text
);
create index eventos_created_at on eventos (created_at desc);
alter table eventos enable row level security;
alter table personas add column visto_at timestamptz;
```

Desde v2.12.0 el permiso "Gestiona tareas de su coordinación":

```sql
alter table personas add column if not exists gestiona_coord boolean not null default false;
```

## Reportes

Vista **📈 Reportes**: período configurable (atajos o fechas desde/hasta), filtro por coordinación
y comparación con el período anterior de igual duración.

| Indicador | Cálculo |
|---|---|
| Creadas / Completadas | Tareas cuya fecha de creación / de término cae en el período |
| Pendientes / Vencidas al cierre | Estado al último día del período |
| Tiempo de resolución | Días entre creación y término (promedio y mediana) |
| Cumplimiento de plazos | Completadas en o antes de su fecha límite ÷ completadas con fecha límite |

Desglose por persona, coordinación, tipo de requerimiento, categoría y solicitante.
Salidas: **PDF** (ventana de impresión) y **Excel (CSV)** con el detalle de cada tarea y columnas
Sí/No para filtrar o armar tablas dinámicas. Las tareas en la papelera no se consideran.

## Desarrollo local

La interfaz se puede abrir directamente, pero los datos vienen de `/api/data`, que solo existe
cuando corre Vercel. Para probar con datos reales:

```
npm i -g vercel
vercel link        # vincular con el proyecto existente
vercel env pull    # descargar las variables de entorno
vercel dev         # http://localhost:3000
```

## Vistas por rol

**Login con Google** (`https://<dominio>/` → "Iniciar sesión con Google", solo cuentas @ufrontera.cl).
`api/data.js` verifica el token de Google, busca a la persona por `personas.correo` y entrega una
sesión firmada de 30 días. El rol se vuelve a calcular en cada petición:

| Rol | Cómo se define | Puede |
|---|---|---|
| Administración (`directora`) | Correo en `DIRECTORA_CORREO` | Todo |
| Gestiona tareas (`gestor`) | `personas.gestiona_tareas` | Crear y modificar tareas de todas las coordinaciones |
| Coordinador/a (`coordinador`) | `personas.es_jefe` | Todo con las tareas de su coordinación; nombre y cargo de su equipo |
| Gestiona tareas de su coordinación (`gestorCoord`) | `personas.gestiona_coord` | Crear y modificar tareas de su coordinación (como el coordinador/a, sin editar personas ni recibir los avisos de Revisión) |
| Integrante (`integrante`) | Resto | En sus tareas abiertas: estado hasta Revisión, descripción y link |

Personas, permisos, correos, coordinaciones y opciones solo los modifica Administración. Los
permisos se comprueban en el servidor (`denegar()`); la interfaz solo oculta los botones.

Sin sesión, la API responde 401 y no entrega datos: la app muestra la pantalla de login sobre un
tablero de muestra desenfocado. Desde v2.10.0 no hay otra forma de entrar (se retiraron el enlace
`?k=` y los enlaces por coordinación `?coord=`).

## Historial de versiones

- **v2.12.1** — Imagen y Diseño y Marketing intercambian su color; se quita el aviso de tareas sin fecha de término (las tareas anteriores al lanzamiento se borraron)
- **v2.12.0** — Permiso "Gestiona tareas de su coordinación" (`personas.gestiona_coord`, rol `gestorCoord`): crea, edita, completa y archiva tareas solo de su coordinación; su coordinador/a recibe aviso 🔔 y correo de lo que crea, asigna o cambia de fecha
- **v2.11.0** — Calendario de toda la Dirección para coordinadores/as: `getAll` les entrega aparte (`calendario`) las tareas con fecha de las demás coordinaciones, solo para el calendario y sin poder editarlas; integrantes ven solo su calendario. "👁 Ver como…" para los correos de `VER_COMO_CORREO`: el servidor arma la vista de otra persona y rechaza cualquier cambio mientras está activo
- **v2.10.0** — Solo se entra con Google: se retiran el enlace de Administración `?k=` (`DIRECTORA_KEY`), los enlaces antiguos y las variables `ENLACES_SOLO_LECTURA` y `SOLO_CON_GOOGLE`
- **v2.9.0** — Avisos por correo con las mismas reglas que los avisos 🔔 (botón "Ver en dashboard", modo prueba con `CORREO_PRUEBA`); aviso cuando cambia la fecha límite; la fecha límite ya no se muestra un día antes ni vence antes de tiempo
- **v2.8.0** — Avisos 🔔 por persona: asignaciones (a la persona asignada y, si viene de Administración o de quien gestiona tareas, a su coordinador/a), tareas que pasan a Revisión (al coordinador/a) y tareas creadas por otras personas (a Administración); el "visto" se guarda en el servidor
- **v2.7.0** — Login con Google (@ufrontera.cl) y permisos por persona aplicados en el servidor (Integrante, Gestiona tareas, Coordinador/a, Administración); pantalla de login sobre un tablero desenfocado (`SOLO_CON_GOOGLE`); la vista de la directora pasa a llamarse Administración; nombre "DirCom"
- **v2.6.0** — Avisos para cada coordinación: tareas creadas o asignadas por la directora desde la última visita (aviso, etiqueta "Nueva" y contador en la pestaña); Equipo con tareas por persona
- v2.4.0 — Vista de la directora protegida con clave; Reportes solo para la directora; cada coordinación recibe solo sus tareas
- v2.3.0 — Vista Reportes: período configurable, KPI, comparación, PDF y exportación a Excel; registro de fecha de término
- v2.2.0 — Código separado en archivos (`css/`, `js/`, `img/`), sin cambios de funcionalidad
- v2.1.2 — Celdas del calendario con tamaño fijo
- v2.1.1 — Favicon
- v2.1.0 — Vista de calendario
- v2.0.0 — Migración a Supabase + Vercel serverless
- v1.5.0 — Buscador, ordenamiento, vista Opciones
- v1.4.0 — Papelera/archivado, URLs por coordinación
- v1.3.0 — Migración Google Sheets → Supabase
- v1.0.0 — MVP con Google Sheets + Apps Script
