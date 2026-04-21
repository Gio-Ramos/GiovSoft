# Documentación del Proyecto

## Introducción

Este proyecto es una aplicación web de dashboard desarrollada con una arquitectura frontend-backend. El frontend está completamente implementado utilizando React, Vite y TypeScript, proporcionando una interfaz de usuario moderna y responsiva para un dashboard administrativo. El backend está en una fase inicial, con solo la configuración base en Node.js, preparado para futuras implementaciones de API.

El proyecto se organiza en dos directorios principales:
- `frontend/`: Contiene la aplicación React completa.
- `backend/`: Contiene la configuración inicial del servidor Node.js.

## Arquitectura General

La aplicación sigue una arquitectura cliente-servidor separada:

- **Frontend**: Aplicación React single-page application (SPA) construida con Vite para desarrollo rápido y TypeScript para tipado fuerte. Incluye componentes reutilizables, estilos globales con CSS variables y un diseño responsivo.
- **Backend**: Servidor Node.js preparado para implementar una API REST o GraphQL. Actualmente vacío, pero configurado para añadir frameworks como Express.

Estado actual:
- Frontend: Completo y funcional.
- Backend: Solo configuración base, pendiente de implementación.

### Diagrama de Arquitectura

```
+-------------------+       +-------------------+
|     Frontend      |       |     Backend       |
|                   |       |                   |
| - React/Vite      | <-->  | - Node.js         |
| - TypeScript      |       | - (Express TBD)   |
| - CSS Variables   |       | - API Endpoints   |
| - Dashboard UI    |       |                   |
+-------------------+       +-------------------+
```

## Frontend

### Tecnologías Utilizadas
- **React**: Biblioteca para construir interfaces de usuario.
- **Vite**: Herramienta de desarrollo rápida para proyectos modernos.
- **TypeScript**: Superset de JavaScript con tipado estático.
- **CSS**: Estilos globales con variables CSS para temas consistentes.

### Estructura de Archivos
```
frontend/
├── src/
│   ├── App.tsx              # Componente principal de la aplicación
│   ├── main.tsx             # Punto de entrada de React
│   ├── index.css            # Estilos globales
│   ├── assets/              # Recursos estáticos
│   ├── components/          # Componentes reutilizables
│   │   ├── Header.tsx       # Barra de navegación superior
│   │   ├── Layout.tsx       # Layout general
│   │   └── Sidebar.tsx      # Barra lateral de navegación
│   └── pages/               # Páginas de la aplicación
│       └── Dashboard.tsx    # Página principal del dashboard
├── public/                  # Archivos públicos
├── package.json             # Dependencias y scripts
├── vite.config.ts           # Configuración de Vite
├── tsconfig.json            # Configuración de TypeScript
└── README.md                # Documentación específica del frontend
```

### Componentes Principales
- **Header**: Barra superior con navegación, búsqueda y perfil de usuario.
- **Sidebar**: Menú lateral colapsable con enlaces de navegación.
- **Dashboard**: Página principal con paneles de métricas, actividades y prioridades.

### Estilos
Los estilos se definen en `index.css` utilizando variables CSS para mantener consistencia:

```css
:root {
  --bg-page: #f5efe4;
  --text-main: #162132;
  --surface: rgba(255, 255, 255, 0.72);
  /* ... más variables */
}
```

El diseño es responsivo con media queries para diferentes tamaños de pantalla.

### Configuración
- **Vite**: Configurado en `vite.config.ts` para desarrollo y construcción.
- **TypeScript**: Configurado en `tsconfig.json` con opciones estrictas.

## Backend

### Tecnologías Utilizadas
- **Node.js**: Entorno de ejecución para JavaScript en servidor.
- **(Planeado) Express**: Framework web para Node.js.

### Estado Actual
El backend está en fase inicial con solo el archivo `package.json` configurado. No hay código fuente implementado, endpoints o base de datos.

### Estructura Pendiente
```
backend/
├── index.js                 # Punto de entrada del servidor
├── routes/                  # Definición de rutas API
├── controllers/             # Lógica de negocio
├── models/                  # Modelos de datos
├── middleware/              # Middleware personalizado
├── config/                  # Configuraciones
└── package.json             # Dependencias
```

### Tecnologías Planeadas
- Framework: Express.js para manejo de rutas y middleware.
- Base de datos: MongoDB o PostgreSQL (por determinar).
- Autenticación: JWT o similar.
- Validación: Librerías como Joi.

## Instalación y Ejecución

### Frontend
1. Navegar al directorio `frontend/`:
   ```bash
   cd frontend
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Ejecutar en modo desarrollo:
   ```bash
   npm run dev
   ```
4. Construir para producción:
   ```bash
   npm run build
   ```

### Backend
1. Navegar al directorio `backend/`:
   ```bash
   cd backend
   ```
2. Instalar dependencias (actualmente ninguna):
   ```bash
   npm install
   ```
3. Ejecutar (pendiente de implementación):
   ```bash
   npm start
   ```

Nota: El backend requiere implementación antes de poder ejecutarse.

## Dependencias y Configuraciones

### Frontend (package.json)
- **Dependencias principales**: react, react-dom, typescript.
- **Dependencias de desarrollo**: vite, eslint, typescript.
- **Scripts**: dev, build, lint, preview.

### Backend (package.json)
- Actualmente sin dependencias.
- Scripts: test (predeterminado).

### Variables CSS
Definidas en `frontend/src/index.css` para colores, sombras y espaciado.

### Configuraciones TypeScript
- `tsconfig.json`: Configuración estricta con soporte para JSX y módulos ES.

## Guía de Desarrollo

### Añadir Componentes
1. Crear archivo en `frontend/src/components/`.
2. Importar y usar en páginas o layouts.
3. Seguir convenciones de nomenclatura y tipado TypeScript.

### Modificar Estilos
- Usar variables CSS para consistencia.
- Añadir clases en `index.css` o archivos específicos.

### Implementar Backend
1. Instalar Express: `npm install express`.
2. Crear `index.js` con servidor básico.
3. Añadir rutas y conectar con frontend.

## Roadmap

### Fase 1: Backend Básico (1-2 semanas)
- Instalar Express y dependencias necesarias.
- Crear servidor básico con endpoint de prueba.
- Configurar variables de entorno (.env).

### Fase 2: API para Dashboard (2-3 semanas)
- Implementar endpoints para métricas, actividades y prioridades.
- Conectar frontend con backend via fetch/API calls.
- Añadir validación y manejo de errores.

### Fase 3: Autenticación y Seguridad (1 semana)
- Implementar login/logout.
- Añadir middleware de autenticación.
- Proteger rutas sensibles.

### Fase 4: Mejoras Frontend (2 semanas)
- Añadir más páginas (e.g., configuración, usuarios).
- Implementar estado global (Context o Redux).
- Optimizar rendimiento y accesibilidad.

### Fase 5: Despliegue (1 semana)
- Configurar CI/CD.
- Desplegar en servicios como Vercel/Netlify (frontend) y Heroku/AWS (backend).
- Añadir monitoreo y logging.

## Recomendaciones

- **Prioridades**: Enfocarse primero en implementar el backend básico para conectar el frontend existente.
- **Detalles en Roadmap**: Estimar plazos basados en complejidad; por ejemplo, backend básico en 1 semana, API completa en 3 semanas.
- **Diagramas Adicionales**: Considerar un diagrama de flujo de datos (e.g., usuario -> frontend -> API -> base de datos) y uno de componentes (e.g., árbol de componentes React).
- **Mejores Prácticas**: Usar ESLint y Prettier para código consistente; añadir tests unitarios con Jest.
- **Escalabilidad**: Planear para múltiples entornos (desarrollo, staging, producción).

---

Fecha de creación: 20 de abril de 2026