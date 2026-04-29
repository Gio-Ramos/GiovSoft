# Documentación del Proyecto

## Introducción

GiovSoft es una aplicación web con arquitectura frontend-backend. El frontend está construido con React, Vite y TypeScript, e incluye dos experiencias principales:

- Un sitio web público para promocionar servicios tecnológicos para pequeñas empresas.
- Un panel administrativo interno disponible en una ruta separada.

El backend se mantiene en fase inicial con configuración base en Node.js, preparado para futuras APIs.

El proyecto se organiza en dos directorios principales:

- `frontend/`: Contiene la aplicación React completa.
- `backend/`: Contiene la configuración inicial del servidor Node.js.

## Arquitectura General

La aplicación sigue una arquitectura cliente-servidor separada:

- **Frontend**: SPA en React con Vite, TypeScript, React Router, `lucide-react` y estilos globales en CSS.
- **Backend**: Proyecto Node.js preparado para implementar una API REST o GraphQL.

Estado actual:

- Frontend: Sitio público y dashboard administrativo funcionales.
- Backend: Configuración base, pendiente de implementación.

### Rutas Principales

- `/`: Sitio web público de GiovSoft.
- `/admin`: Panel administrativo interno.
- `*`: Redirección al sitio público.

### Diagrama de Arquitectura

```text
+-----------------------------+       +-------------------+
|          Frontend           |       |      Backend      |
|                             |       |                   |
| - React / Vite              | <---> | - Node.js         |
| - TypeScript                |       | - API futura      |
| - React Router              |       | - Express TBD     |
| - Sitio público             |       | - Endpoints TBD   |
| - Panel admin               |       |                   |
+-----------------------------+       +-------------------+
```

## Frontend

### Tecnologías Utilizadas

- **React**: Biblioteca para construir interfaces de usuario.
- **Vite**: Herramienta de desarrollo y build.
- **TypeScript**: Tipado estático.
- **React Router DOM**: Rutas públicas y administrativas.
- **Lucide React**: Iconografía.
- **CSS global**: Variables, modo claro/oscuro, responsive design y animaciones.

### Estructura de Archivos

```text
frontend/
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   └── img/
│       ├── logo-black.svg
│       └── logo-white.svg
├── src/
│   ├── App.tsx              # Configuración de rutas
│   ├── main.tsx             # Punto de entrada de React
│   ├── index.css            # Estilos globales del sitio y admin
│   ├── assets/
│   │   └── hero.png         # Visual principal del sitio
│   ├── components/
│   │   ├── Header.tsx       # Header del panel administrativo
│   │   ├── Layout.tsx       # Layout del panel administrativo
│   │   └── Sidebar.tsx      # Sidebar del panel administrativo
│   └── pages/
│       ├── Dashboard.tsx    # Panel administrativo
│       └── Website.tsx      # Sitio web público
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Sitio Web Público

El sitio público está implementado en `frontend/src/pages/Website.tsx` y se sirve desde `/`.

### Objetivo Comercial

Promocionar a GiovSoft como aliado tecnológico para pequeñas empresas, con enfoque en:

- Sitios web.
- Ecommerce.
- Correos corporativos.
- Google Workspace.
- Dominios.
- Presencia digital profesional.

### Secciones Implementadas

- **Header público**: Logo adaptable a modo claro/oscuro, navegación, cambio de tema y CTA a WhatsApp.
- **Hero**: Propuesta de valor, chips de servicios, visual tecnológico animado y CTA.
- **Métricas**: Cards compactas con iconos y beneficios comerciales.
- **Servicios**: Cards de servicios con iconos y hover.
- **Proceso**: Timeline vertical animado con nodos, línea de progreso y cards tecnológicas.
- **Aliado tecnológico**: Beneficios y stack de capacidades.
- **Footer compacto**: Logo, contacto, redes sociales, mapa del sitio, servicios, legales y acceso administrativo.

### Modo Claro/Oscuro

El sitio público incluye cambio de tema:

- Estado local en `Website.tsx`.
- Persistencia en `localStorage` bajo la clave `site-theme`.
- Logos separados para cada modo:
  - `public/img/logo-white.svg`
  - `public/img/logo-black.svg`
- Transición visual usando `document.startViewTransition` cuando el navegador lo soporta.
- Fallback con transiciones CSS.

### WhatsApp

El CTA principal del header dice **Enviar mensaje** y abre WhatsApp con un mensaje prellenado:

```text
Hola GiovSoft, quiero información sobre sus servicios digitales.
```

Actualmente usa un enlace genérico de WhatsApp. Cuando se defina el número oficial, debe actualizarse al formato:

```text
https://wa.me/52XXXXXXXXXX?text=...
```

## Panel Administrativo

El panel administrativo está disponible en `/admin`.

### Componentes Principales

- **Layout**: Estructura general del admin.
- **Sidebar**: Menú lateral colapsable.
- **Header**: Barra superior del panel.
- **Dashboard**: Vista inicial con métricas, actividad reciente y prioridades.

### Estado Actual

El admin sigue siendo una maqueta funcional de dashboard. No está conectado a backend ni autenticación.

## Estilos

Los estilos se concentran en `frontend/src/index.css`.

Incluyen:

- Variables CSS para tema administrativo.
- Variables CSS específicas del sitio público.
- Modo claro/oscuro del sitio.
- Animaciones de hero, timeline, cards y cambio de tema.
- Diseño responsive.
- Estilos del footer, servicios, métricas y proceso.

### Consideraciones de Diseño

- El sitio público prioriza una estética tecnológica, limpia y orientada a pequeñas empresas.
- El panel admin conserva su diseño operativo.
- El sitio público y el admin comparten archivo CSS, pero usan clases diferenciadas (`site-*`, `footer-*`, `timeline-*`, etc.) para reducir interferencias.

## Backend

### Tecnologías Utilizadas

- **Node.js**: Entorno de ejecución.
- **Express**: Planeado para futuras rutas API.

### Estado Actual

El backend está en fase inicial. No hay endpoints, base de datos ni autenticación implementados.

### Estructura Planeada

```text
backend/
├── index.js
├── routes/
├── controllers/
├── models/
├── middleware/
├── config/
└── package.json
```

## Instalación y Ejecución

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Construcción para producción:

```bash
npm run build
```

Vista previa de producción:

```bash
npm run preview
```

### Backend

```bash
cd backend
npm install
```

La ejecución del backend queda pendiente hasta implementar el servidor.

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

### Sitio Público

- Definir número oficial de WhatsApp y actualizar el enlace.
- Crear páginas o modales reales para:
  - Términos y condiciones.
  - Política de privacidad.
  - Aviso legal.
- Sustituir enlaces temporales de redes sociales por URLs oficiales.
- Optimizar SEO: meta tags, Open Graph, descripción y favicon final.
- Agregar formulario de contacto o integración CRM.

### Admin

- Implementar autenticación.
- Conectar métricas a backend real.
- Crear módulos de usuarios, servicios, clientes o solicitudes.
- Agregar protección de ruta para `/admin`.

### Backend

- Instalar y configurar Express.
- Crear endpoints base.
- Agregar base de datos.
- Implementar autenticación y autorización.
- Configurar variables de entorno.

## Recomendaciones

- Mantener el sitio público separado conceptualmente del admin.
- Evitar que nuevos estilos globales del admin afecten clases `site-*`.
- Documentar cada nueva ruta pública o administrativa.
- Crear componentes separados si `Website.tsx` sigue creciendo.
- Agregar pruebas básicas cuando se conecten formularios, autenticación o pagos.

---

Última actualización: 29 de abril de 2026.
