import { BarChart3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getAdminRequests, type ContactRequest } from "../lib/adminRequests";

export default function AdminReports() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const report = useMemo(() => {
    const total = requests.length;
    const active = requests.filter((request) => ["new", "contacted", "in_progress"].includes(request.status || "new")).length;
    const converted = requests.filter((request) => request.status === "converted").length;
    const lost = requests.filter((request) => request.status === "lost").length;
    const sentEmails = requests.filter((request) => request.emailStatus === "sent").length;
    const conversion = total ? Math.round((converted / total) * 100) : 0;

    return { total, active, converted, lost, sentEmails, conversion };
  }, [requests]);

  useEffect(() => {
    getAdminRequests().then(setRequests).catch(() => setRequests([]));
  }, []);

  return (
    <div className="admin-module-shell">
      <section className="requests-toolbar surface-card">
        <div>
          <p className="eyebrow">Reportes</p>
          <h2>Rendimiento comercial</h2>
          <span>Lectura rápida de solicitudes y conversión</span>
        </div>
      </section>

      <section className="stats-grid">
        <article className="metric-card">
          <p>Total solicitudes</p>
          <div className="metric-row">
            <h3>{report.total}</h3>
            <span className="metric-change is-neutral">histórico</span>
          </div>
        </article>
        <article className="metric-card">
          <p>Leads activos</p>
          <div className="metric-row">
            <h3>{report.active}</h3>
            <span className="metric-change is-positive">seguimiento</span>
          </div>
        </article>
        <article className="metric-card">
          <p>Conversión</p>
          <div className="metric-row">
            <h3>{report.conversion}%</h3>
            <span className="metric-change is-positive">{report.converted} clientes</span>
          </div>
        </article>
        <article className="metric-card">
          <p>Correos enviados</p>
          <div className="metric-row">
            <h3>{report.sentEmails}</h3>
            <span className="metric-change is-neutral">SMTP</span>
          </div>
        </article>
      </section>

      <section className="surface-card report-panel">
        <BarChart3 size={22} />
        <h3>Resumen</h3>
        <p>{report.lost} solicitudes perdidas y {report.converted} convertidas. Usa el módulo de seguimiento para mover leads activos.</p>
      </section>
    </div>
  );
}
