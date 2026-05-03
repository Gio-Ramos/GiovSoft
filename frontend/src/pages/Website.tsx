import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Code2,
  Globe2,
  Rocket,
  SearchCheck,
  ShieldCheck,
  Store,
  TrendingUp,
} from "lucide-react";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import heroImage from "../assets/hero.png";
import { serviceItems } from "../data/services";
import { useSiteTheme } from "../hooks/useSiteTheme";

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

export default function Website() {
  const { isDark, toggleTheme } = useSiteTheme();

  return (
    <div className={`site-shell ${isDark ? "is-dark" : ""}`}>
      <SiteHeader isDark={isDark} toggleTheme={toggleTheme} />

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
            {serviceItems.map((service) => {
              const Icon = service.icon;

              return (
                <article key={service.title} className="service-card">
                  <div className="service-icon">
                    <Icon size={22} />
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.copy}</p>
                  <a className="service-link" href={`/servicios/${service.slug}`}>
                    Ver servicio
                    <ArrowRight size={15} />
                  </a>
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

      <SiteFooter isDark={isDark} />
    </div>
  );
}
