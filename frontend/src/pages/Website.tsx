import {
  ArrowRight,
  BadgeCheck,
  Braces,
  Clock3,
  Cloud,
  Code2,
  Cpu,
  Globe2,
  Layers3,
  MessageCircle,
  Rocket,
  SearchCheck,
  Server,
  ShieldCheck,
  Store,
  TrendingUp,
  Wrench,
} from "lucide-react";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import heroImage from "../assets/hero.png";
import { serviceItems } from "../data/services";
import { useSiteTheme } from "../hooks/useSiteTheme";

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

const infrastructureStack = [
  {
    name: "Python para IA",
    copy: "Automatizaciones, procesamiento de datos y funciones inteligentes.",
    icon: Cpu,
  },
  {
    name: "React",
    copy: "Interfaces modernas, rapidas y preparadas para crecer.",
    icon: Layers3,
  },
  {
    name: "Node.js",
    copy: "Backend, APIs e integraciones para conectar servicios.",
    icon: Server,
  },
  {
    name: "Google Cloud",
    copy: "Infraestructura, despliegues y servicios cloud escalables.",
    icon: Cloud,
  },
  {
    name: "HTML",
    copy: "Estructura clara, semantica y compatible para la web.",
    icon: Code2,
  },
  {
    name: "CSS",
    copy: "Diseno responsive, animaciones y experiencia visual cuidada.",
    icon: Braces,
  },
];

const processSteps = [
  {
    number: "01",
    title: "Primer contacto",
    copy: "Escuchamos que necesita tu negocio, en que etapa esta y que objetivo quieres lograr.",
    icon: MessageCircle,
  },
  {
    number: "02",
    title: "Diagnostico",
    copy: "Revisamos tu presencia actual, canales, dominio, correos y oportunidades digitales.",
    icon: SearchCheck,
  },
  {
    number: "03",
    title: "Implementacion",
    copy: "Construimos y conectamos sitio, tienda, dominio, correos o Workspace segun el plan.",
    icon: Wrench,
  },
  {
    number: "04",
    title: "Lanzamiento y mejora",
    copy: "Publicamos, acompanamos el arranque y dejamos una ruta para seguir creciendo.",
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
            <p className="site-kicker">Tecnología para pequeñas empresas</p>
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
            <p className="site-kicker">Proceso con un nuevo cliente</p>
            <h2>Del primer mensaje a una base digital funcionando.</h2>
            <p>
              Acompanamos a cada nuevo cliente con un flujo claro:
              entendemos el negocio, definimos prioridades, implementamos
              y dejamos una base lista para operar.
            </p>
            <div className="process-proof">
              <span>01</span>
              <strong>Nos cuentas tu necesidad</strong>
              <span>02</span>
              <strong>Proponemos una ruta clara</strong>
              <span>03</span>
              <strong>Construimos y conectamos</strong>
              <span>04</span>
              <strong>Lanzamos y acompanamos</strong>
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

        <section className="site-section infrastructure-section">
          <div className="section-intro">
            <p className="site-kicker">Infraestructura y desarrollo</p>
            <h2>Construimos con tecnologias modernas y una base preparada para crecer.</h2>
          </div>

          <div className="infrastructure-layout">
            <div className="infrastructure-map" aria-hidden="true">
              <div className="infra-core">
                <Globe2 size={28} />
                <strong>GiovSoft Stack</strong>
                <span>web, cloud e IA</span>
              </div>
              <span className="infra-node node-python">Python IA</span>
              <span className="infra-node node-react">React</span>
              <span className="infra-node node-node">Node.js</span>
              <span className="infra-node node-cloud">Google Cloud</span>
              <span className="infra-node node-html">HTML</span>
              <span className="infra-node node-css">CSS</span>
            </div>

            <div className="infrastructure-grid">
              {infrastructureStack.map((item) => {
                const Icon = item.icon;

                return (
                  <article key={item.name}>
                    <Icon size={22} />
                    <h3>{item.name}</h3>
                    <p>{item.copy}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

      </main>

      <SiteFooter isDark={isDark} />
    </div>
  );
}
