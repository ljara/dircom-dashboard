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
│   ├── state.js               Estado global y rol según la URL (?coord=)
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
│   └── data.js                Función serverless de Vercel (intermediario con Supabase)
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
| `DIRECTORA_KEY`        | Clave del enlace de la directora (secreta) |

Tablas usadas en Supabase: `coordinaciones`, `personas`, `tareas`, `opciones`.

Desde v2.3.0 la tabla `tareas` necesita la columna `completed_at` (fecha de término), que
`api/data.js` fija al marcar una tarea como completada y borra si se reabre:

```sql
alter table tareas add column if not exists completed_at timestamptz;
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
Sí/No para filtrar o armar tablas dinámicas. Las tareas en la papelera no se consideran; las
completadas antes de v2.3.0 no tienen fecha de término y se informan aparte.

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

- `https://<dominio>/?k=<DIRECTORA_KEY>` → vista de la Directora (todas las coordinaciones y Reportes).
- `https://<dominio>/?coord=<id>` → abre en las tareas de esa coordinación, con aviso de tareas en revisión.
  La API solo entrega las tareas de esa coordinación y la vista Reportes no está disponible.
- Sin `k` válida ni `coord`, la API responde 403.

> El rol lo decide `api/data.js` comparando `k` con `DIRECTORA_KEY`. Para cambiar la clave basta
> con actualizar la variable en Vercel y volver a desplegar; el enlace anterior deja de funcionar.
> Generar una clave: `node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`

## Historial de versiones

- **v2.4.0** — Vista de la directora protegida con clave; Reportes solo para la directora; cada coordinación recibe solo sus tareas
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
