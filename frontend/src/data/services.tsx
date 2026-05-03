import {
  Globe2,
  Mail,
  MonitorSmartphone,
  PanelsTopLeft,
  ShoppingCart,
} from "lucide-react";

export const serviceItems = [
  {
    slug: "giovsoft-360",
    title: "GiovSoft 360",
    copy: "Acompanamiento integral para crear, conectar y mantener la base digital de tu negocio en un solo paquete.",
    detail:
      "Unimos sitio web o ecommerce, dominio, correos corporativos, Google Workspace y acompanamiento continuo para que tu empresa avance con una estrategia digital ordenada.",
    outcome: "Un aliado tecnologico que acompana tu crecimiento digital de punta a punta.",
    features: [
      "Diagnostico inicial y ruta de implementacion.",
      "Sitio web o tienda en linea segun las necesidades del negocio.",
      "Dominio, correos corporativos y herramientas de trabajo conectadas.",
      "Acompanamiento para mejoras, soporte y evolucion del paquete.",
    ],
    icon: PanelsTopLeft,
  },
  {
    slug: "sitios-web",
    title: "Sitios web",
    copy: "Páginas modernas, rápidas y claras para presentar tu negocio, captar clientes y transmitir confianza.",
    detail:
      "Creamos sitios web profesionales pensados para pequeñas empresas que necesitan verse confiables, explicar sus servicios y recibir nuevos contactos.",
    outcome: "Tu negocio disponible en internet con una imagen clara y profesional.",
    features: [
      "Diseño adaptable a celular, tablet y escritorio.",
      "Secciones para servicios, contacto, ubicación y propuesta de valor.",
      "Optimización inicial para buscadores y carga rápida.",
      "Base preparada para crecer hacia catálogo, agenda o panel administrativo.",
    ],
    icon: MonitorSmartphone,
  },
  {
    slug: "ecommerce",
    title: "Ecommerce",
    copy: "Tiendas en línea para vender productos, recibir pedidos y abrir nuevos canales de venta.",
    detail:
      "Implementamos tiendas en línea para que puedas mostrar productos, recibir pedidos y empezar a vender con una operación más ordenada.",
    outcome: "Un canal de venta digital listo para atender clientes más allá del mostrador.",
    features: [
      "Catálogo de productos organizado por categorías.",
      "Carrito, flujo de compra y pedidos.",
      "Integración con medios de contacto o pago según la etapa del negocio.",
      "Panel o flujo operativo para administrar ventas.",
    ],
    icon: ShoppingCart,
  },
  {
    slug: "correos-corporativos",
    title: "Correos corporativos",
    copy: "Cuentas profesionales con tu dominio, configuración segura y una imagen más confiable ante tus clientes.",
    detail:
      "Configuramos correos con dominio propio para mejorar la presentación de tu empresa y ordenar la comunicación con clientes y proveedores.",
    outcome: "Correos profesionales que transmiten confianza desde el primer mensaje.",
    features: [
      "Alta y configuración de cuentas empresariales.",
      "Conexión con dominio propio.",
      "Configuración de seguridad básica y acceso en dispositivos.",
      "Acompañamiento para migrar o iniciar desde cero.",
    ],
    icon: Mail,
  },
  {
    slug: "dominios",
    title: "Dominios",
    copy: "Registro, configuracion y conexion de dominios para que tu marca tenga una direccion profesional en internet.",
    detail:
      "Te ayudamos a elegir, registrar y configurar el dominio de tu negocio para conectarlo con tu sitio web, correos corporativos y servicios digitales.",
    outcome: "Tu marca con una direccion propia, clara y lista para operar en internet.",
    features: [
      "Busqueda y seleccion de dominio disponible.",
      "Configuracion de DNS para web, correo y servicios externos.",
      "Conexion con sitio web, tienda en linea o correos corporativos.",
      "Acompanamiento para renovaciones y administracion basica.",
    ],
    icon: Globe2,
  },
  {
    slug: "google-workspace",
    title: "Google Workspace",
    copy: "Implementación de Gmail empresarial, Drive, Meet, Calendario y administración de usuarios para tu equipo.",
    detail:
      "Ayudamos a tu equipo a trabajar con herramientas de Google Workspace configuradas correctamente para colaborar, reunirse y administrar información.",
    outcome: "Un espacio de trabajo digital para operar con más orden y colaboración.",
    features: [
      "Configuración de Gmail empresarial.",
      "Administración de usuarios y permisos.",
      "Organización inicial de Drive, Calendario y Meet.",
      "Soporte para adopción y buenas prácticas de uso.",
    ],
    icon: PanelsTopLeft,
  },
];

export type ServiceItem = (typeof serviceItems)[number];
