import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Cloud,
  Code2,
  CreditCard,
  DatabaseZap,
  FolderOpen,
  Gauge,
  Globe2,
  Inbox,
  LockKeyhole,
  MailCheck,
  MonitorSmartphone,
  Package,
  PanelsTopLeft,
  SearchCheck,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Truck,
  UsersRound,
  Video,
  Wifi,
} from "lucide-react";
import type { CSSProperties } from "react";
import { Navigate, useParams } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { serviceItems } from "../data/services";
import { useSiteTheme } from "../hooks/useSiteTheme";

const whatsappMessage = encodeURIComponent(
  "Hola GiovSoft, quiero información sobre sus servicios digitales."
);

const websiteQuality = [
  {
    title: "Desarrollo de calidad",
    copy: "Código ordenado, componentes reutilizables y una base preparada para crecer sin rehacer todo después.",
    icon: Code2,
  },
  {
    title: "SEO inicial",
    copy: "Estructura, contenido, títulos y rendimiento pensados para que Google entienda mejor tu sitio.",
    icon: SearchCheck,
  },
  {
    title: "Carga rápida",
    copy: "Optimizamos imágenes, estilos y estructura para que tus visitantes no esperen de más.",
    icon: Gauge,
  },
  {
    title: "Responsive real",
    copy: "Diseño cuidado para celular, tablet y escritorio, con textos y botones cómodos de usar.",
    icon: Smartphone,
  },
];

const ecommerceHighlights = [
  {
    title: "Catalogo ordenado",
    copy: "Productos, categorias, variantes e informacion clara para que el cliente encuentre rapido lo que busca.",
    icon: Package,
  },
  {
    title: "Compra simple",
    copy: "Flujo de carrito pensado para reducir friccion y llevar al cliente del interes al pedido.",
    icon: ShoppingBag,
  },
  {
    title: "Pagos y contacto",
    copy: "Preparamos la tienda para conectar medios de pago, WhatsApp o el flujo que tu negocio necesite.",
    icon: CreditCard,
  },
  {
    title: "Operacion medible",
    copy: "Base lista para revisar pedidos, productos y oportunidades de crecimiento con mas claridad.",
    icon: BarChart3,
  },
];

const mailHighlights = [
  {
    title: "Dominio propio",
    copy: "Cuentas con el nombre de tu empresa para que cada mensaje transmita confianza.",
    icon: Globe2,
  },
  {
    title: "Configuracion segura",
    copy: "Ajustamos accesos, registros y buenas practicas basicas para proteger la comunicacion.",
    icon: ShieldCheck,
  },
  {
    title: "Uso en dispositivos",
    copy: "Dejamos el correo listo para trabajar desde computadora, celular o navegador.",
    icon: Smartphone,
  },
  {
    title: "Imagen profesional",
    copy: "Ordenamos la presentacion de tu negocio desde el primer contacto con clientes.",
    icon: MailCheck,
  },
];

const domainHighlights = [
  {
    title: "Nombre de marca",
    copy: "Buscamos una direccion clara, facil de recordar y alineada con tu negocio.",
    icon: Globe2,
  },
  {
    title: "DNS configurado",
    copy: "Conectamos registros para web, correo y servicios digitales sin dejar piezas sueltas.",
    icon: DatabaseZap,
  },
  {
    title: "Conexion completa",
    copy: "Tu dominio queda listo para sitio web, ecommerce, correos corporativos o Workspace.",
    icon: Wifi,
  },
  {
    title: "Continuidad",
    copy: "Te acompanamos para cuidar renovaciones, accesos y configuracion basica del dominio.",
    icon: ShieldCheck,
  },
];

const workspaceHighlights = [
  {
    title: "Gmail empresarial",
    copy: "Correo profesional con dominio propio y configuracion lista para tu equipo.",
    icon: MailCheck,
  },
  {
    title: "Drive organizado",
    copy: "Estructura inicial para documentos, carpetas y permisos de trabajo.",
    icon: FolderOpen,
  },
  {
    title: "Reuniones y agenda",
    copy: "Meet y Calendario preparados para coordinar citas, equipo y clientes.",
    icon: CalendarDays,
  },
  {
    title: "Usuarios y permisos",
    copy: "Alta de cuentas, accesos y administracion basica para operar con control.",
    icon: UsersRound,
  },
];

const giovsoft360Highlights = [
  {
    title: "Ruta clara",
    copy: "Definimos que necesita tu negocio, que va primero y como construir sin perder tiempo.",
    icon: SearchCheck,
  },
  {
    title: "Base digital completa",
    copy: "Integramos sitio o tienda, dominio, correo y herramientas de trabajo en un mismo paquete.",
    icon: PanelsTopLeft,
  },
  {
    title: "Acompanamiento",
    copy: "Te guiamos durante la implementacion y despues del lanzamiento para seguir mejorando.",
    icon: UsersRound,
  },
  {
    title: "Evolucion continua",
    copy: "Medimos, ajustamos y preparamos nuevas funciones conforme crece tu operacion.",
    icon: Settings2,
  },
];

const codeLines = [
  "<head>",
  "  <title>Tu negocio</title>",
  "  <meta name=\"description\" />",
  "</head>",
];

export default function ServicePage() {
  const { slug } = useParams();
  const { isDark, toggleTheme } = useSiteTheme();
  const service = serviceItems.find((item) => item.slug === slug);

  if (!service) {
    return <Navigate to="/" replace />;
  }

  const Icon = service.icon;
  const isWebsiteService = service.slug === "sitios-web";
  const isEcommerceService = service.slug === "ecommerce";
  const isMailService = service.slug === "correos-corporativos";
  const isDomainService = service.slug === "dominios";
  const isWorkspaceService = service.slug === "google-workspace";
  const isGiovsoft360Service = service.slug === "giovsoft-360";

  return (
    <div className={`service-page-shell ${isDark ? "is-dark" : ""}`}>
      <SiteHeader isDark={isDark} toggleTheme={toggleTheme} />

      <main className="service-detail">
        <section className="service-detail-hero">
          <div>
            <p className="site-kicker">Servicio GiovSoft</p>
            <h1>{service.title}</h1>
            <p>{service.detail}</p>

            <div className="service-detail-actions">
              <a
                className="site-primary-button"
                href={`https://wa.me/?text=${whatsappMessage}`}
                target="_blank"
                rel="noreferrer"
              >
                Enviar mensaje
                <ArrowRight size={17} />
              </a>
              <a className="site-secondary-button" href="mailto:contacto@giovsoft.com">
                contacto@giovsoft.com
                <LockKeyhole size={17} />
              </a>
            </div>
          </div>

          <div className="service-detail-card" aria-hidden="true">
            <Icon size={42} />
            <strong>{service.outcome}</strong>
          </div>
        </section>

        {isWebsiteService && (
          <section className="website-showcase">
            <div className="website-showcase-copy">
              <p className="site-kicker">Sitios web de calidad</p>
              <h2>Diseñamos para que tu negocio se vea bien y funcione mejor.</h2>
              <p>
                No se trata solo de publicar una página: cuidamos estructura,
                velocidad, claridad visual y SEO inicial para construir una presencia
                digital que genere confianza desde el primer clic.
              </p>
            </div>

            <div className="website-web-preview" aria-hidden="true">
              <div className="web-preview-bar">
                <span />
                <span />
                <span />
              </div>
              <div className="web-preview-body">
                <div className="web-preview-sidebar">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="web-preview-content">
                  <span className="web-preview-title" />
                  <span />
                  <span />
                  <div className="web-preview-grid">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              </div>
              <div className="web-preview-badges">
                <strong>SEO</strong>
                <strong>98</strong>
                <strong>Mobile</strong>
              </div>
            </div>

            <div className="website-tech-panel" aria-hidden="true">
              <div className="browser-topbar">
                <span />
                <span />
                <span />
              </div>
              <div className="browser-content">
                <div className="browser-code">
                  {codeLines.map((line) => (
                    <span key={line} style={{ "--characters": line.length } as CSSProperties}>
                      {line}
                    </span>
                  ))}
                </div>
                <div className="quality-radar">
                  <Globe2 size={24} />
                  <strong>SEO + Performance</strong>
                </div>
              </div>
            </div>

            <div className="website-quality-grid">
              {websiteQuality.map((item) => {
                const QualityIcon = item.icon;

                return (
                  <article key={item.title}>
                    <QualityIcon size={22} />
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </article>
                );
              })}
            </div>

          </section>
        )}

        {isEcommerceService && (
          <section className="commerce-showcase">
            <div className="commerce-showcase-copy">
              <p className="site-kicker">Ecommerce para pequenas empresas</p>
              <h2>Convierte tus productos en una experiencia de compra clara.</h2>
              <p>
                Disenamos tiendas en linea que ayudan a vender con orden:
                catalogo facil de navegar, carrito claro, contacto rapido y una
                base lista para crecer conforme tu operacion avance.
              </p>
            </div>

            <div className="commerce-dashboard" aria-hidden="true">
              <div className="commerce-dashboard-header">
                <span />
                <span />
                <strong>Tienda activa</strong>
              </div>

              <div className="commerce-storefront">
                <div className="commerce-product-card commerce-product-card-featured">
                  <Store size={22} />
                  <span>Producto destacado</span>
                  <strong>$ 899</strong>
                </div>
                <div className="commerce-product-card">
                  <span />
                  <strong>$ 349</strong>
                </div>
                <div className="commerce-product-card">
                  <span />
                  <strong>$ 520</strong>
                </div>
              </div>

              <div className="commerce-order-flow">
                <div>
                  <ShoppingBag size={20} />
                  <span>Carrito</span>
                </div>
                <i />
                <div>
                  <CreditCard size={20} />
                  <span>Pago</span>
                </div>
                <i />
                <div>
                  <Truck size={20} />
                  <span>Entrega</span>
                </div>
              </div>
            </div>

            <div className="commerce-metrics" aria-hidden="true">
              <article>
                <strong>24/7</strong>
                <span>ventas disponibles</span>
              </article>
              <article>
                <strong>+ canales</strong>
                <span>web, redes y WhatsApp</span>
              </article>
              <article>
                <strong>Pedidos</strong>
                <span>mas orden para operar</span>
              </article>
            </div>

            <div className="commerce-quality-grid">
              {ecommerceHighlights.map((item) => {
                const HighlightIcon = item.icon;

                return (
                  <article key={item.title}>
                    <HighlightIcon size={22} />
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {isMailService && (
          <section className="mail-showcase">
            <div className="mail-showcase-copy">
              <p className="site-kicker">Correos corporativos</p>
              <h2>Comunica tu negocio con una identidad profesional.</h2>
              <p>
                Configuramos correos con dominio propio para que tu empresa se
                vea confiable, mantenga conversaciones ordenadas y pueda operar
                desde los dispositivos que usa todos los dias.
              </p>
            </div>

            <div className="mail-inbox-panel" aria-hidden="true">
              <div className="mail-inbox-top">
                <Inbox size={22} />
                <strong>contacto@tuempresa.com</strong>
                <span>Seguro</span>
              </div>

              <div className="mail-message-list">
                <article className="is-active">
                  <span />
                  <div>
                    <strong>Nuevo cliente</strong>
                    <small>Solicitud recibida desde tu sitio web</small>
                  </div>
                  <CheckCircle2 size={18} />
                </article>
                <article>
                  <span />
                  <div>
                    <strong>Proveedor</strong>
                    <small>Cotizacion y seguimiento</small>
                  </div>
                </article>
                <article>
                  <span />
                  <div>
                    <strong>Equipo interno</strong>
                    <small>Operacion y pendientes</small>
                  </div>
                </article>
              </div>

              <div className="mail-domain-card">
                <Globe2 size={22} />
                <div>
                  <strong>@tuempresa.com</strong>
                  <span>Dominio conectado</span>
                </div>
              </div>
            </div>

            <div className="mail-security-stack" aria-hidden="true">
              <article>
                <ShieldCheck size={22} />
                <strong>SPF</strong>
                <span>Verificado</span>
              </article>
              <article>
                <LockKeyhole size={22} />
                <strong>DKIM</strong>
                <span>Activo</span>
              </article>
              <article>
                <MailCheck size={22} />
                <strong>MX</strong>
                <span>Configurado</span>
              </article>
            </div>

            <div className="mail-quality-grid">
              {mailHighlights.map((item) => {
                const HighlightIcon = item.icon;

                return (
                  <article key={item.title}>
                    <HighlightIcon size={22} />
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {isDomainService && (
          <section className="domain-showcase">
            <div className="domain-showcase-copy">
              <p className="site-kicker">Dominios para tu marca</p>
              <h2>El punto de partida para que tu negocio exista en internet.</h2>
              <p>
                Un buen dominio hace que tus clientes te encuentren, te recuerden
                y confien mas en tu marca. Lo registramos y configuramos para que
                funcione con tu web, correos y servicios digitales.
              </p>
            </div>

            <div className="domain-orbit-panel" aria-hidden="true">
              <div className="domain-search-bar">
                <Globe2 size={20} />
                <span>tunegocio.com</span>
                <strong>Disponible</strong>
              </div>

              <div className="domain-orbit">
                <div className="domain-core">
                  <strong>.com</strong>
                  <span>marca propia</span>
                </div>
                <i className="domain-node domain-node-web">Web</i>
                <i className="domain-node domain-node-mail">Mail</i>
                <i className="domain-node domain-node-store">Shop</i>
              </div>

              <div className="domain-records">
                <article>
                  <span>A</span>
                  <strong>Sitio web</strong>
                </article>
                <article>
                  <span>MX</span>
                  <strong>Correo</strong>
                </article>
                <article>
                  <span>TXT</span>
                  <strong>Verificacion</strong>
                </article>
              </div>
            </div>

            <div className="domain-timeline" aria-hidden="true">
              <article>
                <span>01</span>
                <strong>Buscamos</strong>
              </article>
              <article>
                <span>02</span>
                <strong>Registramos</strong>
              </article>
              <article>
                <span>03</span>
                <strong>Conectamos</strong>
              </article>
            </div>

            <div className="domain-quality-grid">
              {domainHighlights.map((item) => {
                const HighlightIcon = item.icon;

                return (
                  <article key={item.title}>
                    <HighlightIcon size={22} />
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {isWorkspaceService && (
          <section className="workspace-showcase">
            <div className="workspace-showcase-copy">
              <p className="site-kicker">Google Workspace</p>
              <h2>Un espacio digital para que tu equipo trabaje con orden.</h2>
              <p>
                Configuramos Gmail empresarial, Drive, Meet, Calendario y usuarios
                para que tu empresa pueda comunicarse, compartir archivos y coordinar
                actividades desde una base profesional.
              </p>
            </div>

            <div className="workspace-command-center" aria-hidden="true">
              <div className="workspace-app-rail">
                <span className="workspace-app-dot app-mail" />
                <span className="workspace-app-dot app-drive" />
                <span className="workspace-app-dot app-meet" />
                <span className="workspace-app-dot app-calendar" />
              </div>

              <div className="workspace-panel">
                <div className="workspace-panel-top">
                  <Cloud size={21} />
                  <strong>Equipo GiovSoft</strong>
                  <span>Activo</span>
                </div>

                <div className="workspace-board">
                  <article>
                    <MailCheck size={20} />
                    <strong>Gmail</strong>
                    <span>contacto@empresa.com</span>
                  </article>
                  <article>
                    <FolderOpen size={20} />
                    <strong>Drive</strong>
                    <span>Carpetas y permisos</span>
                  </article>
                  <article>
                    <Video size={20} />
                    <strong>Meet</strong>
                    <span>Reuniones listas</span>
                  </article>
                  <article>
                    <CalendarDays size={20} />
                    <strong>Calendario</strong>
                    <span>Agenda compartida</span>
                  </article>
                </div>
              </div>
            </div>

            <div className="workspace-admin-stack" aria-hidden="true">
              <article>
                <UsersRound size={22} />
                <strong>Usuarios</strong>
                <span>Alta y permisos</span>
              </article>
              <article>
                <ShieldCheck size={22} />
                <strong>Seguridad</strong>
                <span>Accesos cuidados</span>
              </article>
              <article>
                <Cloud size={22} />
                <strong>Colaboracion</strong>
                <span>Archivos y reuniones</span>
              </article>
            </div>

            <div className="workspace-quality-grid">
              {workspaceHighlights.map((item) => {
                const HighlightIcon = item.icon;

                return (
                  <article key={item.title}>
                    <HighlightIcon size={22} />
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {isGiovsoft360Service && (
          <section className="suite-showcase">
            <div className="suite-showcase-copy">
              <p className="site-kicker">GiovSoft 360</p>
              <h2>Todo tu ecosistema digital acompanado por un aliado.</h2>
              <p>
                Creamos el paquete digital que tu empresa necesita para iniciar
                o crecer: presencia web, ventas, dominio, correo, herramientas
                de trabajo y soporte para avanzar con orden.
              </p>
            </div>

            <div className="suite-hub-panel" aria-hidden="true">
              <div className="suite-hub-core">
                <strong>360</strong>
                <span>acompanamiento</span>
              </div>
              <article className="suite-hub-node node-web">
                <MonitorSmartphone size={20} />
                <span>Sitio web</span>
              </article>
              <article className="suite-hub-node node-shop">
                <ShoppingBag size={20} />
                <span>Ecommerce</span>
              </article>
              <article className="suite-hub-node node-domain">
                <Globe2 size={20} />
                <span>Dominio</span>
              </article>
              <article className="suite-hub-node node-mail">
                <MailCheck size={20} />
                <span>Correos</span>
              </article>
              <article className="suite-hub-node node-workspace">
                <Cloud size={20} />
                <span>Workspace</span>
              </article>
            </div>

            <div className="suite-roadmap" aria-hidden="true">
              <article>
                <span>01</span>
                <strong>Diagnostico</strong>
              </article>
              <article>
                <span>02</span>
                <strong>Implementacion</strong>
              </article>
              <article>
                <span>03</span>
                <strong>Lanzamiento</strong>
              </article>
              <article>
                <span>04</span>
                <strong>Mejora continua</strong>
              </article>
            </div>

            <div className="suite-quality-grid">
              {giovsoft360Highlights.map((item) => {
                const HighlightIcon = item.icon;

                return (
                  <article key={item.title}>
                    <HighlightIcon size={22} />
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <SiteFooter isDark={isDark} />
    </div>
  );
}
