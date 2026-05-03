import { ArrowRight, Moon, Sun } from "lucide-react";
import { serviceItems } from "../data/services";

const whatsappMessage = encodeURIComponent(
  "Hola GiovSoft, quiero información sobre sus servicios digitales."
);

interface SiteHeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
}

export default function SiteHeader({ isDark, toggleTheme }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <a className="site-brand" href="/" aria-label="GiovSoft inicio">
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
        <a href="/">Inicio</a>
        <div className="nav-dropdown">
          <a href="/#servicios" className="nav-dropdown-trigger">
            Servicios
          </a>
          <div className="services-menu">
            {serviceItems.map((service) => {
              const Icon = service.icon;

              return (
                <a key={service.slug} href={`/servicios/${service.slug}`}>
                  <Icon size={18} />
                  <span>
                    <strong>{service.title}</strong>
                    <small>{service.copy}</small>
                  </span>
                </a>
              );
            })}
          </div>
        </div>
        <a href="/#proceso">Proceso</a>
        <a href="/#aliado">Aliado</a>
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
  );
}
