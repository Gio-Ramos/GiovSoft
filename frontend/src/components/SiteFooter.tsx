import { AtSign, ChartNetwork, LockKeyhole, Share2 } from "lucide-react";
import { serviceItems } from "../data/services";

const footerSections = [
  {
    title: "Mapa del sitio",
    links: [
      { label: "Inicio", href: "/" },
      { label: "Servicios", href: "/#servicios" },
      { label: "Proceso", href: "/#proceso" },
      { label: "Aliado tecnológico", href: "/#aliado" },
    ],
  },
  {
    title: "Servicios",
    links: serviceItems.map((service) => ({
      label: service.title,
      href: `/servicios/${service.slug}`,
    })),
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

interface SiteFooterProps {
  isDark: boolean;
}

export default function SiteFooter({ isDark }: SiteFooterProps) {
  return (
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
  );
}
