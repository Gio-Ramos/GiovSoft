import { BarChart3, CalendarDays, Download, FileBarChart, LineChart, PieChart, TrendingUp, WalletCards } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { getAdminRequests, type ContactRequest } from "../lib/adminRequests";

const monthlyRevenue = [
  { month: "Ene", value: 0 },
  { month: "Feb", value: 0 },
  { month: "Mar", value: 0 },
  { month: "Abr", value: 0 },
  { month: "May", value: 0 },
  { month: "Jun", value: 0 },
];

const reportCards = [
  { id: "sales", title: "Ventas y leads", description: "Solicitudes, conversión y fuentes de contacto.", updatedAt: "Sin generar" },
  { id: "billing", title: "Facturación", description: "Facturas, pagos recurrentes y cobranza.", updatedAt: "Sin generar" },
  { id: "projects", title: "Proyectos", description: "Avance, entregables y responsables.", updatedAt: "Sin generar" },
  { id: "support", title: "Soporte", description: "Tickets, SLA y carga por canal.", updatedAt: "Sin generar" },
];

function money(value: number) {
  return new Intl.NumberFormat("es-MX", { currency: "MXN", maximumFractionDigits: 0, style: "currency" }).format(value);
}

export default function AdminReports() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const report = useMemo(() => {
    const total = requests.length;
    const active = requests.filter((request) => ["new", "contacted", "in_progress"].includes(request.status || "new")).length;
    const converted = requests.filter((request) => request.status === "converted").length;
    const lost = requests.filter((request) => request.status === "lost").length;
    const sentEmails = requests.filter((request) => request.emailStatus === "sent").length;
    const conversion = total ? Math.round((converted / total) * 100) : 0;
    const revenue = monthlyRevenue.reduce((sum, item) => sum + item.value, 0);

    return { total, active, converted, lost, sentEmails, conversion, revenue };
  }, [requests]);

  useEffect(() => {
    getAdminRequests().then(setRequests).catch(() => setRequests([]));
  }, []);

  return (
    <section className="reports-module-shell">
      <div className="clients-page-head">
        <div>
          <h2>Reportes</h2>
          <p>Consulta indicadores comerciales, facturación, proyectos y soporte.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-primary-action" type="button"><Download size={20} /> Exportar reporte</button>
        </div>
      </div>

      <div className="clients-stats-grid">
        <article className="clients-stat-card"><span className="clients-stat-icon is-blue"><FileBarChart size={27} /></span><div><p>Solicitudes</p><h3>{report.total}</h3><small>{report.active} leads activos</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-green"><TrendingUp size={27} /></span><div><p>Conversión</p><h3>{report.conversion}%</h3><small>{report.converted} clientes ganados</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-purple"><WalletCards size={27} /></span><div><p>Ingresos 6 meses</p><h3>{money(report.revenue)}</h3><small>MXN acumulado</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-orange"><CalendarDays size={27} /></span><div><p>Correos enviados</p><h3>{report.sentEmails}</h3><small>{report.lost} solicitudes perdidas</small></div></article>
      </div>

      <div className="reports-grid">
        <article className="reports-panel reports-chart-panel">
          <header><div><h3>Ingresos en los últimos 6 meses</h3><p>Resumen visual de facturación mensual.</p></div><LineChart size={21} /></header>
          <div className="reports-bars">
            {monthlyRevenue.map((item) => (
              <span key={item.month} style={{ "--bar-height": `${Math.max(20, item.value / 1500)}%` } as CSSProperties}>
                <i />
                <small>{item.month}</small>
              </span>
            ))}
          </div>
        </article>

        <article className="reports-panel">
          <header><div><h3>Distribución operativa</h3><p>Lectura rápida por área de trabajo.</p></div><PieChart size={21} /></header>
          <div className="reports-distribution">
            <p><span className="is-blue" /> Ventas <strong>36%</strong></p>
            <p><span className="is-green" /> Proyectos <strong>28%</strong></p>
            <p><span className="is-purple" /> Soporte <strong>22%</strong></p>
            <p><span className="is-orange" /> Facturación <strong>14%</strong></p>
          </div>
        </article>

        <article className="reports-panel reports-wide">
          <header><div><h3>Reportes disponibles</h3><p>Plantillas preparadas para revisión o exportación.</p></div><BarChart3 size={21} /></header>
          <div className="reports-card-grid">
            {reportCards.map((card) => (
              <section className="reports-card" key={card.id}>
                <FileBarChart size={22} />
                <div>
                  <strong>{card.title}</strong>
                  <span>{card.description}</span>
                  <small>Actualizado {card.updatedAt}</small>
                </div>
                <button type="button"><Download size={16} /> Descargar</button>
              </section>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
