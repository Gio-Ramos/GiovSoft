import { AlertTriangle, CheckCircle2, Clock3, Download, Eye, Filter, KeyRound, Search, ShieldAlert, ShieldCheck, UserRoundCheck } from "lucide-react";
import { useMemo, useState } from "react";

type AuditLevel = "info" | "success" | "warning" | "critical";

interface AuditEvent {
  id: string;
  date: string;
  user: string;
  module: string;
  action: string;
  level: AuditLevel;
  ip: string;
}

const auditSeed: AuditEvent[] = [];

const levelLabels: Record<AuditLevel, string> = {
  info: "Informativo",
  success: "Correcto",
  warning: "Advertencia",
  critical: "Crítico",
};

export default function AdminAudit() {
  const [events] = useState(auditSeed);
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("Todos");

  const filteredEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesQuery = !normalized || `${event.user} ${event.module} ${event.action} ${event.ip}`.toLowerCase().includes(normalized);
      const matchesLevel = levelFilter === "Todos" || levelLabels[event.level] === levelFilter;
      return matchesQuery && matchesLevel;
    });
  }, [events, levelFilter, query]);

  const critical = events.filter((event) => event.level === "critical").length;
  const warnings = events.filter((event) => event.level === "warning").length;
  const successes = events.filter((event) => event.level === "success").length;

  return (
    <section className="audit-module-shell">
      <div className="clients-page-head">
        <div>
          <h2>Auditoría</h2>
          <p>Consulta actividad administrativa, accesos, cambios críticos y eventos del sistema.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-primary-action" type="button"><Download size={20} /> Exportar bitácora</button>
        </div>
      </div>

      <div className="clients-stats-grid">
        <article className="clients-stat-card"><span className="clients-stat-icon is-blue"><Eye size={27} /></span><div><p>Eventos</p><h3>{events.length}</h3><small>Última actividad registrada</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-green"><CheckCircle2 size={27} /></span><div><p>Correctos</p><h3>{successes}</h3><small>Acciones completadas</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-purple"><AlertTriangle size={27} /></span><div><p>Advertencias</p><h3>{warnings}</h3><small>Requieren seguimiento</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-orange"><ShieldAlert size={27} /></span><div><p>Críticos</p><h3>{critical}</h3><small>Validar configuración</small></div></article>
      </div>

      <article className="billing-table-card">
        <div className="billing-table-toolbar">
          <label className="clients-table-search"><Search size={19} /><input onChange={(event) => setQuery(event.target.value)} placeholder="Buscar usuario, módulo, acción o IP..." value={query} /></label>
          <label className="clients-filter-field">
            Nivel
            <select onChange={(event) => setLevelFilter(event.target.value)} value={levelFilter}>
              <option>Todos</option>
              {Object.values(levelLabels).map((level) => <option key={level}>{level}</option>)}
            </select>
          </label>
          <button className="clients-filter-button" type="button"><Filter size={18} /> Filtros</button>
          <button className="clients-download-button" type="button"><Download size={18} /></button>
        </div>
        <div className="clients-table-wrap">
          <table className="billing-data-table audit-data-table">
            <thead><tr><th>Fecha</th><th>Usuario</th><th>Módulo</th><th>Acción</th><th>Nivel</th><th>IP / origen</th><th>Control</th></tr></thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id}>
                  <td><span className="receipt-file-name"><Clock3 size={15} /> {event.date}</span></td>
                  <td><span className="receipt-file-name"><UserRoundCheck size={15} /> {event.user}</span></td>
                  <td>{event.module}</td>
                  <td>{event.action}</td>
                  <td><span className={`audit-level is-${event.level}`}>{levelLabels[event.level]}</span></td>
                  <td>{event.ip}</td>
                  <td><span className="receipt-file-name"><ShieldCheck size={15} /> Registrado</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <div className="audit-security-grid">
        <article><KeyRound size={20} /><strong>Accesos</strong><span>Inicio de sesión, tokens y sesiones administrativas.</span></article>
        <article><ShieldCheck size={20} /><strong>Cambios críticos</strong><span>Usuarios, roles, integraciones y configuración.</span></article>
        <article><Clock3 size={20} /><strong>Retención</strong><span>Bitácora lista para retención histórica y exportación.</span></article>
      </div>
    </section>
  );
}
