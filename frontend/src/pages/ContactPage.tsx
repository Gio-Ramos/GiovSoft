import {
  ArrowRight,
  AtSign,
  ChartNetwork,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Share2,
} from "lucide-react";
import axios from "axios";
import { useState } from "react";
import type { FormEvent } from "react";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { useSiteTheme } from "../hooks/useSiteTheme";
import { api } from "../lib/api";

const whatsappMessage = encodeURIComponent(
  "Hola GiovSoft, quiero informacion para iniciar un proyecto digital."
);
const whatsappUrl = `https://wa.me/525566042994?text=${whatsappMessage}`;

const contactChannels = [
  {
    label: "WhatsApp",
    value: "Enviar mensaje",
    href: whatsappUrl,
    icon: MessageCircle,
  },
  {
    label: "Correo",
    value: "contacto@giovsoft.com",
    href: "mailto:contacto@giovsoft.com",
    icon: Mail,
  },
  {
    label: "Telefono",
    value: "Disponible por WhatsApp",
    href: whatsappUrl,
    icon: Phone,
  },
];

const socialLinks = [
  { label: "Facebook", href: "https://facebook.com", icon: Share2 },
  { label: "Instagram", href: "https://instagram.com", icon: AtSign },
  { label: "LinkedIn", href: "https://linkedin.com", icon: ChartNetwork },
];

export default function ContactPage() {
  const { isDark, toggleTheme } = useSiteTheme();
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("sending");
    setStatusMessage("");

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("nombre") || ""),
      company: String(formData.get("empresa") || ""),
      email: String(formData.get("correo") || ""),
      phone: String(formData.get("telefono") || ""),
      service: String(formData.get("servicio") || ""),
      message: String(formData.get("mensaje") || ""),
    };

    try {
      await api.post("/api/contact-requests", payload);
      form.reset();
      setStatus("success");
      setStatusMessage("Solicitud enviada. Te contactaremos pronto.");
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : "Error inesperado";
      setStatus("error");
      setStatusMessage(`No pudimos enviar la solicitud. ${message}`);
    }
  };

  return (
    <div className={`service-page-shell ${isDark ? "is-dark" : ""}`}>
      <SiteHeader isDark={isDark} toggleTheme={toggleTheme} />

      <main className="contact-page">
        <section className="contact-hero">
          <div className="contact-copy">
            <p className="site-kicker">Contacto</p>
            <h1>Cuéntanos qué necesita tu negocio.</h1>
            <p>
              Podemos ayudarte con sitio web, ecommerce, dominios, correos,
              Google Workspace o un paquete GiovSoft 360 para avanzar con orden.
            </p>

            <div className="contact-actions">
              <a
                className="site-primary-button"
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
              >
                Enviar WhatsApp
                <ArrowRight size={17} />
              </a>
              <a className="site-secondary-button" href="mailto:contacto@giovsoft.com">
                contacto@giovsoft.com
                <Mail size={17} />
              </a>
            </div>
          </div>

          <form className="contact-form" onSubmit={handleSubmit}>
            <label>
              Nombre
              <input name="nombre" type="text" placeholder="Tu nombre" required />
            </label>
            <label>
              Empresa
              <input name="empresa" type="text" placeholder="Nombre de tu negocio" />
            </label>
            <label>
              Correo
              <input name="correo" type="email" placeholder="correo@empresa.com" required />
            </label>
            <label>
              WhatsApp
              <input name="telefono" type="tel" placeholder="55 6604 2994" />
            </label>
            <label>
              Servicio
              <select name="servicio" defaultValue="">
                <option value="" disabled>
                  Selecciona una opción
                </option>
                <option>GiovSoft 360</option>
                <option>Sitio web</option>
                <option>Ecommerce</option>
                <option>Dominios</option>
                <option>Correos corporativos</option>
                <option>Google Workspace</option>
              </select>
            </label>
            <label className="contact-form-wide">
              Mensaje
              <textarea
                name="mensaje"
                placeholder="Cuéntanos brevemente qué quieres construir."
                rows={5}
                required
              />
            </label>
            <button
              className="site-primary-button contact-submit"
              type="submit"
              disabled={status === "sending"}
            >
              {status === "sending" ? "Enviando..." : "Enviar solicitud"}
              <Send size={17} />
            </button>
            {statusMessage && (
              <p className={`contact-status ${status === "success" ? "is-success" : "is-error"}`}>
                {statusMessage}
              </p>
            )}
          </form>
        </section>

        <section className="contact-grid" aria-label="Canales de contacto">
          {contactChannels.map((channel) => {
            const Icon = channel.icon;

            return (
              <a
                key={channel.label}
                href={channel.href}
                target={channel.href.startsWith("http") ? "_blank" : undefined}
                rel={channel.href.startsWith("http") ? "noreferrer" : undefined}
              >
                <Icon size={22} />
                <span>{channel.label}</span>
                <strong>{channel.value}</strong>
              </a>
            );
          })}
        </section>

        <section className="contact-social">
          <div>
            <p className="site-kicker">Redes sociales</p>
            <h2>También puedes encontrarnos en redes.</h2>
          </div>
          <div className="contact-social-links">
            {socialLinks.map((social) => {
              const Icon = social.icon;

              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                >
                  <Icon size={20} />
                  {social.label}
                </a>
              );
            })}
          </div>
        </section>
      </main>

      <SiteFooter isDark={isDark} />
    </div>
  );
}
