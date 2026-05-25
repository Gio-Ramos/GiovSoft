import { Mail, PhoneCall, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { formatAdminDate, getAdminRequests, type ContactRequest } from "../lib/adminRequests";

export default function AdminClients() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const clients = requests.filter((request) => request.status === "converted");

  useEffect(() => {
    getAdminRequests().then(setRequests).catch(() => setRequests([]));
  }, []);

  return (
    <div className="admin-module-shell">
      <section className="requests-toolbar surface-card">
        <div>
          <p className="eyebrow">Clientes</p>
          <h2>Empresas convertidas</h2>
          <span>{clients.length} clientes generados desde solicitudes</span>
        </div>
      </section>

      <section className="admin-card-grid">
        {clients.length === 0 && (
          <div className="empty-state surface-card">
            <UserRound size={24} />
            <p>Cuando una solicitud se marque como cliente, aparecerá aquí.</p>
          </div>
        )}

        {clients.map((client) => (
          <article className="surface-card admin-client-card" key={client.id}>
            <span className="request-row-avatar">
              <UserRound size={18} />
            </span>
            <div>
              <h3>{client.company || client.name}</h3>
              <p>{client.name}</p>
            </div>
            <span className="request-stage is-converted">Cliente</span>
            <div className="request-file-grid">
              <a href={`mailto:${client.email}`}>
                <Mail size={17} />
                {client.email}
              </a>
              {client.phone && (
                <a href={`https://wa.me/52${client.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                  <PhoneCall size={17} />
                  {client.phone}
                </a>
              )}
            </div>
            <small>Convertido desde: {client.service || "Servicio por definir"} · {formatAdminDate(client.updatedAt || client.createdAt)}</small>
          </article>
        ))}
      </section>
    </div>
  );
}
