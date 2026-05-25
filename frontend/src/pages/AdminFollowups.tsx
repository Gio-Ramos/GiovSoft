import { MessageCircle, PhoneCall, TimerReset } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatAdminDate, getAdminRequests, getStatusLabel, type ContactRequest } from "../lib/adminRequests";

const columns = [
  { status: "new", title: "Nuevo lead" },
  { status: "contacted", title: "Contactado" },
  { status: "in_progress", title: "En seguimiento" },
];

export default function AdminFollowups() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const activeRequests = useMemo(
    () => requests.filter((request) => columns.some((column) => column.status === (request.status || "new"))),
    [requests]
  );

  useEffect(() => {
    getAdminRequests().then(setRequests).catch(() => setRequests([]));
  }, []);

  return (
    <div className="admin-module-shell">
      <section className="requests-toolbar surface-card">
        <div>
          <p className="eyebrow">Seguimiento</p>
          <h2>Pipeline de oportunidades</h2>
          <span>{activeRequests.length} solicitudes necesitan seguimiento</span>
        </div>
      </section>

      <section className="followup-board">
        {columns.map((column) => {
          const items = activeRequests.filter((request) => (request.status || "new") === column.status);

          return (
            <article className="surface-card followup-column" key={column.status}>
              <div className="section-head">
                <div>
                  <p className="eyebrow">{items.length} leads</p>
                  <h3>{column.title}</h3>
                </div>
                <TimerReset size={19} />
              </div>

              <div className="followup-items">
                {items.length === 0 && <p className="admin-muted">Sin leads en esta etapa.</p>}
                {items.map((request) => (
                  <div className="followup-card" key={request.id}>
                    <span className={`request-stage is-${request.status || "new"}`}>{getStatusLabel(request)}</span>
                    <h4>{request.company || request.name}</h4>
                    <p>{request.service || "Servicio por definir"}</p>
                    <small>{formatAdminDate(request.updatedAt || request.createdAt)}</small>
                    <div className="request-actions">
                      {request.phone && (
                        <a href={`https://wa.me/52${request.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                          <PhoneCall size={15} />
                          WhatsApp
                        </a>
                      )}
                      <a href="/admin/solicitudes">
                        <MessageCircle size={15} />
                        Expediente
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
