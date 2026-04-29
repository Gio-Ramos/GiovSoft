import { useEffect, useState } from "react";
import {
  ArrowRight,
  AtSign,
  BadgeCheck,
  ChartNetwork,
  CheckCircle2,
  Clock3,
  Code2,
  Globe2,
  LockKeyhole,
  Mail,
  MonitorSmartphone,
  Moon,
  PanelsTopLeft,
  Rocket,
  SearchCheck,
  ShieldCheck,
  Share2,
  ShoppingCart,
  Store,
  Sun,
  TrendingUp,
} from "lucide-react";
import heroImage from "../assets/hero.png";

const services = [
  {
    title: "Sitios web",
    copy: "Páginas modernas, rápidas y claras para presentar tu negocio, captar clientes y transmitir confianza.",
    icon: MonitorSmartphone,
  },
  {
    title: "Ecommerce",
    copy: "Tiendas en línea para vender productos, recibir pedidos y abrir nuevos canales de venta.",
    icon: ShoppingCart,
  },
  {
    title: "Correos corporativos",
    copy: "Cuentas profesionales con tu dominio, configuración segura y una imagen más confiable ante tus clientes.",
    icon: Mail,
  },
  {
    title: "Google Workspace",
    copy: "Implementación de Gmail empresarial, Drive, Meet, Calendario y administración de usuarios para tu equipo.",
    icon: PanelsTopLeft,
  },
];

const stack = [
  "Web responsive",
  "Ecommerce",
  "Dominios",
  "Google Workspace",
  "Correo corporativo",
  "SEO inicial",
  "Soporte",
];

const benefits = [
  "Presencia digital profesional para negocios que quieren verse confiables.",
  "Acompañamiento cercano para elegir lo que realmente necesita cada empresa.",
  "Sitios preparados para celular, buscadores y futuras mejoras.",
  "Soluciones que pueden crecer hacia tienda, agenda, catálogo o panel administrativo.",
];

const metrics = [
  {
    value: "24/7",
    label: "tu negocio visible",
    detail: "Presencia digital activa todos los días.",
    icon: Clock3,
  },
  {
    value: "1",
    label: "marca con dominio propio",
    detail: "Web, correo y dominio trabajando juntos.",
    icon: BadgeCheck,
  },
  {
    value: "+",
    label: "canales para vender más",
    detail: "Sitio, tienda y herramientas para crecer.",
    icon: Store,
  },
];

const heroTags = ["Sitios web", "Tiendas en línea", "Google Workspace", "Dominios"];

const processSteps = [
  {
    number: "01",
    title: "Diagnóstico",
    copy: "Analizamos tu negocio, tus clientes y tus canales para identificar oportunidades clave.",
    icon: SearchCheck,
  },
  {
    number: "02",
    title: "Implementación",
    copy: "Creamos y configuramos las soluciones digitales que tu negocio necesita para operar mejor.",
    icon: Code2,
  },
  {
    number: "03",
    title: "Crecimiento",
    copy: "Optimizamos, medimos y evolucionamos tus canales digitales para que sigas creciendo.",
    icon: TrendingUp,
  },
];

const footerSections = [
  {
    title: "Mapa del sitio",
    links: [
      { label: "Inicio", href: "#inicio" },
      { label: "Servicios", href: "#servicios" },
      { label: "Proceso", href: "#proceso" },
      { label: "Aliado tecnológico", href: "#aliado" },
    ],
  },
  {
    title: "Servicios",
    links: [
      { label: "Sitios web", href: "#servicios" },
      { label: "Ecommerce", href: "#servicios" },
      { label: "Correos corporativos", href: "#servicios" },
      { label: "Google Workspace", href: "#servicios" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Términos y condiciones", href: "#terminos" },
      { label: "Política de privacidad", href: "#privacidad" },
      { label: "Aviso legal", href: "#aviso-legal" },
    ],
  },
];

const socialLinks = [
  { label: "Facebook", href: "https://facebook.com", icon: Share2 },
  { label: "Instagram", href: "https://instagram.com", icon: AtSign },
  { label: "LinkedIn", href: "https://linkedin.com", icon: ChartNetwork },
];

const whatsappMessage = encodeURIComponent(
  "Hola GiovSoft, quiero información sobre sus servicios digitales."
);

export default function Website() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const storedTheme = window.localStorage.getItem("site-theme");

    return storedTheme === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    window.localStorage.setItem("site-theme", theme);
  }, [theme]);

  const isDark = theme === "dark";
  const toggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => void;
    };

    if (transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(() => setTheme(nextTheme));
      return;
    }

    setTheme(nextTheme);
  };

  return (
    <div className={`site-shell ${isDark ? "is-dark" : ""}`}>
      <header className="site-header">
        <a className="site-brand" href="#inicio" aria-label="GiovSoft inicio">
          <img
            className="site-logo site-logo-light"
            src="/img/logo-white.svg"
            alt="GiovSoft"
          />
          <img
            className="site-logo site-logo-dark"
            src="/img/logo-black.svg"
            alt="GiovSoft"
            aria-hidden="true"
          />
        </a>

        <nav className="site-nav" aria-label="Navegación principal">
          <a href="#servicios">Servicios</a>
          <a href="#proceso">Proceso</a>
          <a href="#aliado">Aliado</a>
        </nav>

        <div className="site-header-actions">
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
            title={isDark ? "Modo claro" : "Modo oscuro"}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <a
            className="site-nav-action"
            href={`https://wa.me/?text=${whatsappMessage}`}
            target="_blank"
            rel="noreferrer"
          >
            Enviar mensaje
            <ArrowRight size={16} />
          </a>
        </div>
      </header>

      <main>
        <section id="inicio" className="site-hero">
          <div className="site-hero-copy">
            <p className="site-kicker">Aliado tecnológico para pequeñas empresas</p>
            <h1>Impulsa tu negocio con presencia digital profesional.</h1>
            <p>
              Creamos sitios web, tiendas en línea, dominios y correos corporativos
              para que tu empresa se vea profesional, llegue a más clientes y crezca
              con una base digital sólida.
            </p>

            <div className="hero-tags" aria-label="Servicios principales">
              {heroTags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>

            <div className="site-hero-actions">
              <a className="site-primary-button" href="#contacto">
                Empezar proyecto
                <Rocket size={17} />
              </a>
              <a className="site-secondary-button" href="#servicios">
                Ver servicios
              </a>
            </div>
          </div>

          <div className="site-hero-visual" aria-hidden="true">
            <div className="tech-grid" />
            <div className="product-orbit">
              <span><Code2 size={18} /></span>
              <span><ShieldCheck size={18} /></span>
              <span><Globe2 size={18} /></span>
            </div>
            <img src={heroImage} alt="" />
            <div className="hero-signal-card">
              <Globe2 size={18} />
              <span>Dominio activo</span>
            </div>
            <div className="hero-console">
              <span className="console-status" />
              <strong>Marca en línea</strong>
              <small>Web, dominio y correo listos para vender</small>
            </div>
          </div>
        </section>

        <section className="site-metrics" aria-label="Indicadores">
          <div className="metrics-inner">
            {metrics.map((metric) => {
              const Icon = metric.icon;

              return (
                <article key={metric.label}>
                  <div className="metric-icon">
                    <Icon size={20} />
                  </div>
                  <div>
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                    <p>{metric.detail}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="servicios" className="site-section">
          <div className="section-intro">
            <p className="site-kicker">Servicios</p>
            <h2>Todo lo básico para que tu negocio exista y venda en internet.</h2>
          </div>

          <div className="service-grid">
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <article key={service.title} className="service-card">
                  <div className="service-icon">
                    <Icon size={22} />
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.copy}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="proceso" className="site-band">
          <div className="site-band-copy">
            <p className="site-kicker">Nuestro Proceso</p>
            <h2>Convertimos necesidades en soluciones.</h2>
            <p>
              Acompañamos a tu negocio en cada etapa
              para construir soluciones digitales que
              generen impacto real.
            </p>
            <div className="process-proof">
              <span>01</span>
              <strong>Entendemos tu negocio</strong>
              <span>02</span>
              <strong>Ponemos en marcha la solución</strong>
              <span>03</span>
              <strong>Impulsamos tu crecimiento</strong>
            </div>
          </div>

          <div className="process-timeline">
            {processSteps.map((step) => {
              const Icon = step.icon;

              return (
                <article key={step.number} className="timeline-step">
                  <div className="timeline-node">
                    <span>{step.number}</span>
                    <Icon size={20} />
                  </div>
                  <div className="timeline-card">
                    <span>{step.number}</span>
                    <h3>{step.title}</h3>
                    <p>{step.copy}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="aliado" className="site-section tech-section">
          <div className="section-intro">
            <p className="site-kicker">Aliado tecnológico</p>
            <h2>Impulsamos empresas pequeñas con herramientas claras.</h2>
          </div>

          <div className="tech-layout">
            <div className="tech-panel">
              {stack.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>

            <div className="benefit-list">
              {benefits.map((benefit) => (
                <div key={benefit}>
                  <CheckCircle2 size={19} />
                  <p>{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer id="contacto" className="site-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <img
              src={isDark ? "/img/logo-black.svg" : "/img/logo-white.svg"}
              alt="GiovSoft"
            />
            <p>
              Aliado tecnológico para pequeñas empresas que quieren vender,
              comunicarse y crecer con una base digital profesional.
            </p>
            <a className="footer-contact" href="mailto:contacto@giovsoft.com">
              contacto@giovsoft.com
              <LockKeyhole size={15} />
            </a>
            <div className="footer-social" aria-label="Redes sociales">
              {socialLinks.map((social) => {
                const Icon = social.icon;

                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
          </div>

          <div className="footer-links">
            {footerSections.map((section) => (
              <nav key={section.title} aria-label={section.title}>
                <h3>{section.title}</h3>
                {section.links.map((link) => (
                  <a key={link.label} href={link.href}>
                    {link.label}
                  </a>
                ))}
              </nav>
            ))}
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 GiovSoft. Todos los derechos reservados.</span>
          <a href="/admin">Acceso administrativo</a>
        </div>
      </footer>
    </div>
  );
}
