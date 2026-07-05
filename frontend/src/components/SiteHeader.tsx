import { ArrowRight, Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import { serviceItems } from "../data/services";

const whatsappMessage = encodeURIComponent(
  "Hola GiovSoft, quiero información sobre sus servicios digitales."
);
const whatsappUrl = `https://wa.me/525566042994?text=${whatsappMessage}`;

interface SiteHeaderProps {
  isDark: boolean;
  toggleTheme: () => void;
}

export default function SiteHeader({ isDark, toggleTheme }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className={`site-header ${menuOpen ? "is-menu-open" : ""}`}>
      <a className="site-brand" href="/" aria-label="GiovSoft inicio" onClick={closeMenu}>
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

      <nav className={`site-nav ${menuOpen ? "is-open" : ""}`} aria-label="Navegación principal">
        <a href="/" onClick={closeMenu}>Inicio</a>
        <div className="nav-dropdown">
          <a href="/#servicios" className="nav-dropdown-trigger" onClick={closeMenu}>
            Servicios
          </a>
          <div className="services-menu">
            {serviceItems.map((service) => {
              const Icon = service.icon;

              return (
                <a key={service.slug} href={`/servicios/${service.slug}`} onClick={closeMenu}>
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
        <a href="/#proceso" onClick={closeMenu}>Proceso</a>
        <a href="/contacto" onClick={closeMenu}>Contacto</a>
        <a className="site-academy-link" href="https://academy.giovsoft.com" target="_blank" rel="noreferrer" onClick={closeMenu}>Academy</a>
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

        <button
          className="site-mobile-menu-button"
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <a
          className="site-nav-action"
          href={whatsappUrl}
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
