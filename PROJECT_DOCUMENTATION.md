# Documentacion del Proyecto

## Introduccion

GiovSoft es una aplicacion web con arquitectura frontend-backend. El frontend esta construido con React, Vite y TypeScript, e incluye dos experiencias principales:

- Un sitio web publico para promocionar servicios tecnologicos para pequenas empresas.
- Un panel administrativo interno disponible en una ruta separada.

El backend se mantiene en fase inicial con configuracion base en Node.js, preparado para futuras APIs.

El proyecto se organiza en dos directorios principales:

- `frontend/`: Contiene la aplicacion React completa.
- `backend/`: Contiene la configuracion inicial del servidor Node.js.

## Arquitectura General

La aplicacion sigue una arquitectura cliente-servidor separada:

- **Frontend**: SPA en React con Vite, TypeScript, React Router, `lucide-react` y estilos globales en CSS.
- **Backend**: API REST en Node.js con Express, CORS y persistencia local en JSON.

Estado actual:

- Frontend: Sitio publico, paginas de servicios, formulario de contacto y dashboard administrativo funcionales.
- Backend: API Express funcional con endpoints de contacto y resumen administrativo.
- Docker: Configuracion de contenedores para frontend y backend mediante Docker Compose.

### Rutas Principales

- `/`: Sitio web publico de GiovSoft.
- `/servicios/:slug`: Paginas publicas dinamicas para cada servicio.
- `/admin`: Panel administrativo interno.
- `*`: Redireccion al sitio publico.

### Diagrama de Arquitectura

```text
+-----------------------------+       +-------------------+
|          Frontend           |       |      Backend      |
|                             |       |                   |
| - React / Vite              | <---> | - Node.js         |
| - TypeScript                |       | - API futura      |
| - React Router              |       | - Express TBD     |
| - Sitio publico             |       | - Endpoints TBD   |
| - Paginas de servicios      |       |                   |
| - Panel admin               |       |                   |
+-----------------------------+       +-------------------+
```

## Frontend

### Tecnologias Utilizadas

- **React**: Biblioteca para construir interfaces de usuario.
- **Vite**: Herramienta de desarrollo y build.
- **TypeScript**: Tipado estatico.
- **React Router DOM**: Rutas publicas y administrativas.
- **Lucide React**: Iconografia.
- **CSS global**: Variables, modo claro/oscuro, responsive design y animaciones.

### Estructura de Archivos

```text
frontend/
|-- public/
|   |-- favicon.svg
|   |-- icons.svg
|   `-- img/
|       |-- logo-black.svg
|       `-- logo-white.svg
|-- src/
|   |-- App.tsx                    # Configuracion de rutas
|   |-- main.tsx                   # Punto de entrada de React
|   |-- index.css                  # Estilos globales del sitio y admin
|   |-- assets/
|   |   `-- hero.png               # Visual principal del sitio
|   |-- components/
|   |   |-- Header.tsx             # Header del panel administrativo
|   |   |-- Layout.tsx             # Layout del panel administrativo
|   |   |-- Sidebar.tsx            # Sidebar del panel administrativo
|   |   |-- SiteHeader.tsx         # Header publico compartido
|   |   `-- SiteFooter.tsx         # Footer publico compartido
|   |-- data/
|   |   `-- services.tsx           # Catalogo de servicios publicos
|   |-- hooks/
|   |   `-- useSiteTheme.ts        # Modo claro/oscuro del sitio publico
|   `-- pages/
|       |-- Dashboard.tsx          # Panel administrativo
|       |-- Website.tsx            # Sitio web publico
|       `-- ServicePage.tsx        # Paginas dinamicas de servicios
|-- package.json
|-- vite.config.ts
`-- tsconfig.json
```

## Sitio Web Publico

El sitio publico esta implementado en `frontend/src/pages/Website.tsx` y se sirve desde `/`.

### Objetivo Comercial

Promocionar a GiovSoft como aliado tecnologico para pequenas empresas, con enfoque en construir una base digital profesional para vender, comunicarse y crecer.

Servicios promocionados:

- GiovSoft 360.
- Sitios web.
- Ecommerce.
- Correos corporativos.
- Dominios.
- Google Workspace.

### Secciones Implementadas

- **Header publico**: Logo adaptable a modo claro/oscuro, navegacion, boton de inicio, dropdown animado de servicios, cambio de tema y CTA a WhatsApp.
- **Hero**: Propuesta de valor, chips de servicios, visual tecnologico animado y CTA.
- **Metricas**: Cards compactas con iconos y beneficios comerciales.
- **Servicios**: Cards de servicios con iconos, hover y enlaces a paginas individuales.
- **Proceso**: Timeline vertical animado con nodos, linea de progreso y cards tecnologicas.
- **Aliado tecnologico**: Beneficios y stack de capacidades.
- **Footer compacto**: Logo, contacto, redes sociales, mapa del sitio, servicios, legales y acceso administrativo.

## Paginas de Servicios

Las paginas de servicios usan una ruta dinamica en `frontend/src/pages/ServicePage.tsx`:

```text
/servicios/:slug
```

La informacion base de cada servicio vive en `frontend/src/data/services.tsx`. Esto alimenta:

- Dropdown de servicios en el header.
- Cards del sitio publico.
- Footer.
- Pagina individual de cada servicio.

### Servicios Actuales

#### GiovSoft 360

Ruta: `/servicios/giovsoft-360`

Servicio paquete que une diagnostico, implementacion y acompanamiento continuo. Incluye presencia web o ecommerce, dominio, correos corporativos, Google Workspace y soporte para evolucionar la base digital del negocio.

Elementos visuales:

- Hub central `360`.
- Nodos estaticos de Sitio web, Ecommerce, Dominio, Correos y Workspace.
- Roadmap de diagnostico, implementacion, lanzamiento y mejora continua.
- Tarjetas de beneficios del paquete.

#### Sitios web

Ruta: `/servicios/sitios-web`

Pagina enfocada en desarrollo de sitios web profesionales, calidad visual, SEO inicial, performance y responsive design.

Elementos visuales:

- Maqueta tipo navegador.
- Panel de codigo con animacion de escritura.
- Tarjetas de calidad: desarrollo, SEO, carga rapida y responsive.

#### Ecommerce

Ruta: `/servicios/ecommerce`

Pagina enfocada en tiendas en linea para pequenas empresas.

Elementos visuales:

- Dashboard de tienda activa.
- Tarjetas de producto.
- Flujo Carrito -> Pago -> Entrega.
- Banda de integraciones: Stripe, Mercado Pago, Skydrop, Envia.com y WhatsApp.
- Metricas y tarjetas de operacion comercial.

Alcance comercial:

- Catalogo, carrito y pedidos.
- Integracion con pasarelas como Stripe y Mercado Pago.
- Integracion con soluciones logisticas como Skydrop, Envia.com u operadores compatibles.
- Base para administrar ventas, pagos y envios.

#### Correos corporativos

Ruta: `/servicios/correos-corporativos`

Pagina enfocada en correo profesional con dominio propio.

Elementos visuales:

- Panel tipo bandeja de entrada.
- Cuenta `contacto@tuempresa.com`.
- Estado de dominio conectado.
- Indicadores SPF, DKIM y MX.

#### Dominios

Ruta: `/servicios/dominios`

Pagina enfocada en registro, configuracion y conexion de dominios.

Elementos visuales:

- Buscador de dominio.
- Estado de disponibilidad.
- Orbita de conexiones web, mail y tienda.
- Registros DNS A, MX y TXT.

#### Google Workspace

Ruta: `/servicios/google-workspace`

Pagina enfocada en Gmail empresarial, Drive, Meet, Calendario y administracion de usuarios.

Elementos visuales:

- Centro de trabajo tipo Workspace.
- Rail de apps.
- Modulos Gmail, Drive, Meet y Calendario.
- Stack de administracion, seguridad y colaboracion.

## Modo Claro/Oscuro

El sitio publico incluye cambio de tema:

- Hook compartido en `frontend/src/hooks/useSiteTheme.ts`.
- Persistencia en `localStorage` bajo la clave `site-theme`.
- Logos separados para cada modo:
  - `public/img/logo-white.svg`
  - `public/img/logo-black.svg`
- Transicion visual usando `document.startViewTransition` cuando el navegador lo soporta.
- Fallback con transiciones CSS.

El header compartido funciona tanto en `site-shell` como en `service-page-shell`, por lo que el logo cambia correctamente en la pagina principal y en las paginas de servicios.

## WhatsApp

El CTA principal del header dice **Enviar mensaje** y abre WhatsApp con un mensaje prellenado:

```text
Hola GiovSoft, quiero informacion sobre sus servicios digitales.
```

El numero oficial de WhatsApp configurado es `5566042994`, usando formato internacional para Mexico:

```text
https://wa.me/525566042994?text=...
```

## Panel Administrativo

El panel administrativo esta disponible en `/admin`.

### Componentes Principales

- **Layout**: Estructura general del admin.
- **Sidebar**: Menu lateral colapsable.
- **Header**: Barra superior del panel.
- **Dashboard**: Vista inicial con metricas, actividad reciente y prioridades.

### Estado Actual

El admin ya consulta el backend para mostrar resumen de solicitudes, leads recientes y prioridades. Aun no cuenta con autenticacion ni proteccion de ruta.

## Estilos

Los estilos se concentran en `frontend/src/index.css`.

Incluyen:

- Variables CSS para tema administrativo.
- Variables CSS especificas del sitio publico.
- Modo claro/oscuro del sitio.
- Animaciones de hero, timeline, cards, escritura de codigo y cambio de tema.
- Disenos especiales para las paginas de servicios.
- Diseno responsive.
- Estilos del footer, servicios, metricas y proceso.

### Consideraciones de Diseno

- El sitio publico prioriza una estetica tecnologica, limpia y orientada a pequenas empresas.
- El panel admin conserva su diseno operativo.
- El sitio publico y el admin comparten archivo CSS, pero usan clases diferenciadas (`site-*`, `service-*`, `footer-*`, `timeline-*`, etc.) para reducir interferencias.
- Las paginas de servicio usan bloques visuales propios para reforzar el valor de cada oferta.

## Backend

### Tecnologias Utilizadas

- **Node.js**: Entorno de ejecucion.
- **Express**: Servidor HTTP y rutas REST.
- **CORS**: Acceso controlado desde frontend local o contenedorizado.
- **Nodemailer**: Envio de autorespuesta al cliente y notificacion administrativa por correo.
- **PostgreSQL / Cloud SQL**: Persistencia productiva para solicitudes, notas e historial.
- **JSON local**: Fallback de desarrollo en `backend/data/contact-requests.json` cuando no hay variables de base de datos.

### Estado Actual

El backend ya expone endpoints iniciales para formularios y panel administrativo. En produccion puede usar PostgreSQL mediante Cloud SQL; en desarrollo conserva fallback JSON para levantar sin infraestructura adicional.

### Base de Datos

El diseño SQL vive en:

```text
database/schema.sql
```

Tablas principales:

- `contact_requests`: solicitud comercial capturada desde el sitio.
- `contact_request_notes`: notas internas de seguimiento por solicitud.
- `contact_request_status_history`: historial de cambios de etapa y notas.
- `clients`: ficha operativa de cliente con contactos, servicios contratados, dominios, hosting, pagos, recordatorios, contratos, documentos digitales y actividad.

Variables compatibles:

```text
DATABASE_URL
DB_SSL=true
```

O por campos separados:

```text
PGHOST / DB_HOST
PGPORT / DB_PORT
PGDATABASE / DB_NAME
PGUSER / DB_USER
PGPASSWORD / DB_PASSWORD
```

Para Cloud SQL con Unix socket:

```text
CLOUD_SQL_CONNECTION_NAME=project:region:instance
DB_NAME=giovsoft
DB_USER=giovsoft_app
DB_PASSWORD=...
```

Si ninguna variable de base de datos existe, el backend usa `JSON local`.

### Endpoints Implementados

```text
GET  /api/health
POST /api/contact-requests
GET  /api/admin/contact-requests
GET  /api/admin/summary
GET  /api/admin/clients
POST /api/admin/clients
PATCH /api/admin/clients/:id
```

### Modulo de Clientes

El modulo `/admin/clientes` funciona como CRM operativo para crear clientes manualmente y llevar rastreo de:

- Contactos principales y roles.
- Servicios contratados, estado, fecha de inicio y renovacion.
- Dominios, registrador, vencimiento y estado DNS.
- Hosting, proveedor, plan, vencimiento y acceso.
- Pagos, monto, fecha limite y estado.
- Recordatorios con fecha, asunto y responsable.
- Contratos firmados y URL de respaldo.
- Documentos digitales, tipo, estado y URL.
- Actividad historica de la ficha.

Las colecciones se almacenan en PostgreSQL como `JSONB` para permitir una captura flexible mientras el modelo comercial se estabiliza. Cuando el flujo madure, estas colecciones pueden normalizarse en tablas independientes sin cambiar la experiencia del usuario.

### Formulario de Contacto

La pagina `/contacto` envia solicitudes al backend mediante:

```text
POST /api/contact-requests
```

Campos principales:

- `name`
- `company`
- `email`
- `phone`
- `service`
- `message`

Al registrarse una solicitud:

- Se guarda en `backend/data/contact-requests.json`.
- Aparece en el panel administrativo.
- Si SMTP esta configurado, se envia una autorespuesta al correo del cliente.
- Si SMTP esta configurado, se envia una notificacion al correo administrativo.
- Si SMTP no esta configurado, la solicitud se guarda igual y queda marcada con `emailStatus: skipped`.
- Los correos usan plantilla HTML profesional con logo embebido, resumen de solicitud y CTA. Incluyen animacion CSS suave cuando el cliente de correo la soporta.

### Configuracion de Correo

Variables disponibles en `backend/.env.example`:

```text
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASS
SMTP_FROM
ADMIN_EMAIL
```

Para que los correos salgan realmente, estas variables deben configurarse en el entorno donde corre el backend.

### Panel Administrativo

El dashboard de `/admin` consulta:

```text
GET /api/admin/summary
```

Con esta informacion muestra solicitudes de hoy, leads activos, solicitudes de los ultimos 7 dias, actividad reciente y prioridades de seguimiento.

### Estructura Planeada

```text
backend/
|-- index.js
|-- Dockerfile
|-- data/
|-- routes/
|-- controllers/
|-- models/
|-- middleware/
|-- config/
`-- package.json
```

## Instalacion y Ejecucion

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Construccion para produccion:

```bash
npm run build
```

Vista previa de produccion:

```bash
npm run preview
```

### Backend

```bash
cd backend
npm install
npm run dev
```

API local:

```text
http://localhost:4000
```

## Docker

El proyecto incluye Docker para frontend y backend:

```text
docker-compose.yml
frontend/Dockerfile
frontend/nginx.conf
backend/Dockerfile
```

Levantar todo el proyecto:

```bash
docker compose up --build
```

Servicios expuestos:

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:4000`

Notas:

- El frontend usa rutas relativas `/api`.
- En desarrollo, Vite redirige `/api` hacia `http://localhost:4000`.
- En Docker, Nginx redirige `/api` hacia el servicio `backend:4000`.
- El backend permite CORS desde `http://localhost:8080` y `http://localhost:5173`.
- La informacion local del backend se guarda en el volumen `backend-data`.
- Docker Desktop debe estar iniciado antes de ejecutar `docker compose up --build`.

## Dependencias Frontend

Dependencias principales actuales:

- `react`
- `react-dom`
- `react-router-dom`
- `lucide-react`
- `axios`

Scripts principales:

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

## Roadmap Sugerido

### Sitio Publico

- Definir numero oficial de WhatsApp y actualizar el enlace.
- Crear paginas o modales reales para:
  - Terminos y condiciones.
  - Politica de privacidad.
  - Aviso legal.
- Sustituir enlaces temporales de redes sociales por URLs oficiales.
- Optimizar SEO: meta tags, Open Graph, descripcion y favicon final.
- Agregar formulario de contacto o integracion CRM.
- Definir precios, alcances y entregables para GiovSoft 360.

### Servicios

- Revisar copy final de cada servicio con acentos y tono comercial definitivo.
- Agregar testimonios, casos de uso o preguntas frecuentes por servicio.
- Evaluar componentes reutilizables para reducir crecimiento de `ServicePage.tsx`.

### Admin

- Implementar autenticacion.
- Crear modulos de usuarios, servicios, clientes o solicitudes.
- Agregar proteccion de ruta para `/admin`.

### Backend

- Agregar base de datos.
- Implementar autenticacion y autorizacion.
- Configurar variables de entorno.
- Agregar estados de seguimiento para solicitudes.

## Recomendaciones

- Mantener el sitio publico separado conceptualmente del admin.
- Evitar que nuevos estilos globales del admin afecten clases `site-*` y `service-*`.
- Documentar cada nueva ruta publica o administrativa.
- Crear componentes separados si `Website.tsx` o `ServicePage.tsx` siguen creciendo.
- Agregar pruebas basicas cuando se conecten formularios, autenticacion o pagos.

---

Ultima actualizacion: 3 de mayo de 2026.
