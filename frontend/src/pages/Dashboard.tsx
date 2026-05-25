import { ArrowRight, CheckCircle2, ExternalLink, Mail, MessageCircle, PhoneCall, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface DashboardStat {
  label: string;
  value: string;
  change: string;
  tone: string;
}

interface ContactRequest {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  service?: string;
  message: string;
  emailStatus?: string;
  createdAt: string;
}

interface DashboardSummary {
  stats: DashboardStat[];
  recentRequests: ContactRequest[];
  priorities: string[];
}

const fallbackSummary: DashboardSummary = {
  stats: [
    {
      label: "Solicitudes hoy",
      value: "0",
      change: "sin nuevas",
      tone: "is-neutral",
    },
    {
      label: "Leads activos",
      value: "0",
      change: "por contactar",
      tone: "is-neutral",
    },
    {
      label: "Ultimos 7 dias",
      value: "0",
      change: "desde el sitio",
      tone: "is-critical",
    },
  ],
  recentRequests: [],
  priorities: [
    "Contactar solicitudes nuevas durante el mismo dia.",
    "Clasificar cada lead por servicio.",
    "Dar seguimiento a solicitudes sin respuesta.",
  ],
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary>(fallbackSummary);

  useEffect(() => {
    let isMounted = true;

    api
      .get<DashboardSummary>("/api/admin/summary")
      .then((response) => {
        if (isMounted) {
          setSummary(response.data);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="dashboard-shell">
      <section className="stats-grid">
        {summary.stats.map((stat) => (
          <article key={stat.label} className="metric-card">
            <p>{stat.label}</p>
            <div className="metric-row">
              <h3>{stat.value}</h3>
              <span className={`metric-change ${stat.tone}`}>{stat.change}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="surface-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Solicitudes recientes</p>
              <h3>Bandeja de entrada</h3>
            </div>
            <span className="live-badge">API</span>
          </div>

          <div className="activity-list">
            {summary.recentRequests.length === 0 && (
              <div className="activity-item request-item">
                <div className="activity-icon">
                  <Mail size={18} />
                </div>
                <div>
                  <p>Sin solicitudes todavia</p>
                  <span>Cuando llegue un formulario aparecera aqui</span>
                </div>
              </div>
            )}

            {summary.recentRequests.map((request) => (
              <div key={request.id} className="activity-item request-item">
                <div className="activity-icon request-avatar">
                  <UserRound size={18} />
                </div>
                <div className="request-content">
                  <div className="request-title-row">
                    <p>{request.name}</p>
                    <span className={`request-status ${request.emailStatus === "sent" ? "is-sent" : ""}`}>
                      {request.emailStatus === "sent" ? "correo enviado" : "pendiente"}
                    </span>
                  </div>
                  <span>
                    {request.service || "Servicio por definir"} - {formatDate(request.createdAt)}
                  </span>
                  <small>{request.email}</small>
                  <em>{request.message}</em>
                  <div className="request-actions">
                    {request.phone && (
                      <a
                        href={`https://wa.me/52${request.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <PhoneCall size={15} />
                        WhatsApp
                      </a>
                    )}
                    <a href={`mailto:${request.email}`}>
                      <Mail size={15} />
                      Correo
                    </a>
                    <a href="/contacto">
                      <ExternalLink size={15} />
                      Formulario
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card">
          <div className="section-head is-stacked">
            <div>
              <p className="eyebrow">Prioridades</p>
              <h3>Flujo de seguimiento</h3>
            </div>
          </div>

          <div className="admin-pipeline">
            <div>
              <CheckCircle2 size={18} />
              <span>Nuevo lead</span>
            </div>
            <div>
              <MessageCircle size={18} />
              <span>Contacto</span>
            </div>
            <div>
              <ArrowRight size={18} />
              <span>Propuesta</span>
            </div>
          </div>

          <div className="priority-list">
            {summary.priorities.map((item, index) => (
              <div key={item} className="priority-item">
                <span className="priority-index">0{index + 1}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>

          <a
            className="admin-whatsapp-link"
            href="https://wa.me/525566042994"
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={17} />
            Contactar por WhatsApp
          </a>
        </article>
      </section>
    </div>
  );
}
