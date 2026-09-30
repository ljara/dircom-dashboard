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
│   ├── components/
│   │   ├── listas.js          Listas de tareas y personas
│   │   ├── modales.js         Formularios y detalle de tarea
│   │   └── buscador.js        Buscador de la barra lateral
│   ├── views/                 Una vista por archivo
│   │   ├── dashboard.js
│   │   ├── tareas.js
│   │   ├── personas.js
│   │   ├── coordinaciones.js
│   │   ├── calendario.js
│   │   ├── opciones.js
│   │   └── papelera.js
│   ├── reporte.js             Reporte ejecutivo imprimible / PDF
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

Tablas usadas en Supabase: `coordinaciones`, `personas`, `tareas`, `opciones`.

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

- `https://<dominio>/` → vista de la Directora (todas las coordinaciones).
- `https://<dominio>/?coord=<id>` → abre en las tareas de esa coordinación, con aviso de tareas en revisión.

> Nota: el rol depende solo de la URL; no hay autenticación.

## Historial de versiones

- **v2.2.0** — Código separado en archivos (`css/`, `js/`, `img/`), sin cambios de funcionalidad
- v2.1.2 — Celdas del calendario con tamaño fijo
- v2.1.1 — Favicon
- v2.1.0 — Vista de calendario
- v2.0.0 — Migración a Supabase + Vercel serverless
- v1.5.0 — Buscador, ordenamiento, vista Opciones
- v1.4.0 — Papelera/archivado, URLs por coordinación
- v1.3.0 — Migración Google Sheets → Supabase
- v1.0.0 — MVP con Google Sheets + Apps Script
