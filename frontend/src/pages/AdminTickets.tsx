import { AlertTriangle, CheckCircle2, Clock3, Download, Filter, MessageCircle, MoreVertical, Plus, Search, UserRoundCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useCloseOnOutsideClick } from "../hooks/useCloseOnOutsideClick";

type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";

interface TicketItem {
  id: string;
  folio: string;
  client: string;
  subject: string;
  channel: string;
  priority: TicketPriority;
  status: TicketStatus;
  owner: string;
  createdAt: string;
  slaDue: string;
  lastUpdate: string;
}

const ticketsSeed: TicketItem[] = [];

const statusLabels: Record<TicketStatus, string> = {
  open: "Abierto",
  in_progress: "En atención",
  waiting: "En espera",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const priorityLabels: Record<TicketPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-MX");
}

export default function AdminTickets() {
  const [tickets, setTickets] = useState(ticketsSeed);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [openMenu, setOpenMenu] = useState("");

  useCloseOnOutsideClick(Boolean(openMenu), () => setOpenMenu(""));

  const filteredTickets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesQuery = !normalized || `${ticket.folio} ${ticket.client} ${ticket.subject} ${ticket.owner}`.toLowerCase().includes(normalized);
      const matchesStatus = statusFilter === "Todos" || statusLabels[ticket.status] === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter, tickets]);

  const openTickets = tickets.filter((ticket) => ticket.status === "open").length;
  const activeTickets = tickets.filter((ticket) => ticket.status === "open" || ticket.status === "in_progress").length;
  const urgentTickets = tickets.filter((ticket) => ticket.priority === "urgent" || ticket.priority === "high").length;
  const resolvedTickets = tickets.filter((ticket) => ticket.status === "resolved" || ticket.status === "closed").length;

  function updateTicket(ticket: TicketItem, status: TicketStatus) {
    setTickets((current) => current.map((item) => (item.id === ticket.id ? { ...item, status, lastUpdate: "Ahora" } : item)));
    setOpenMenu("");
  }

  function createTicket() {
    setTickets((current) => [
      {
        id: crypto.randomUUID(),
        folio: `TK-2026-${String(current.length + 1).padStart(4, "0")}`,
        client: "Cliente por asignar",
        subject: "Nuevo ticket de soporte",
        channel: "Panel",
        priority: "medium",
        status: "open",
        owner: "Sin asignar",
        createdAt: new Date().toISOString().slice(0, 10),
        slaDue: "Hoy, 07:00 PM",
        lastUpdate: "Ahora",
      },
      ...current,
    ]);
  }

  return (
    <section className="tickets-module-shell">
      <div className="clients-page-head">
        <div>
          <h2>Tickets</h2>
          <p>Controla incidencias, prioridades, SLA y responsables de atención.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-primary-action" onClick={createTicket} type="button"><Plus size={20} /> Nuevo ticket</button>
        </div>
      </div>

      <div className="clients-stats-grid">
        <article className="clients-stat-card"><span className="clients-stat-icon is-blue"><MessageCircle size={27} /></span><div><p>Tickets abiertos</p><h3>{openTickets}</h3><small>Entrada pendiente</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-purple"><UserRoundCheck size={27} /></span><div><p>En atención</p><h3>{activeTickets}</h3><small>Con responsable activo</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-orange"><AlertTriangle size={27} /></span><div><p>Prioridad alta</p><h3>{urgentTickets}</h3><small>Requieren seguimiento</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-green"><CheckCircle2 size={27} /></span><div><p>Resueltos</p><h3>{resolvedTickets}</h3><small>Cerrados o completados</small></div></article>
      </div>

      <article className="billing-table-card">
        <div className="billing-table-toolbar">
          <label className="clients-table-search"><Search size={19} /><input onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ticket, cliente, asunto o responsable..." value={query} /></label>
          <label className="clients-filter-field">
            Estado
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option>Todos</option>
              {Object.values(statusLabels).map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <button className="clients-filter-button" type="button"><Filter size={18} /> Filtros</button>
          <button className="clients-download-button" type="button"><Download size={18} /></button>
        </div>
        <div className="clients-table-wrap">
          <table className="billing-data-table tickets-data-table">
            <thead><tr><th>Ticket</th><th>Cliente</th><th>Asunto</th><th>Canal</th><th>Prioridad</th><th>Estado</th><th>Responsable</th><th>Creación</th><th>SLA</th><th>Última actividad</th><th>Acciones</th></tr></thead>
            <tbody>
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td><strong>{ticket.folio}</strong></td>
                  <td>{ticket.client}</td>
                  <td>{ticket.subject}</td>
                  <td>{ticket.channel}</td>
                  <td><span className={`ticket-priority is-${ticket.priority}`}>{priorityLabels[ticket.priority]}</span></td>
                  <td><span className={`billing-status is-${ticket.status}`}>{statusLabels[ticket.status]}</span></td>
                  <td>{ticket.owner}</td>
                  <td>{formatDate(ticket.createdAt)}</td>
                  <td><span className="receipt-file-name"><Clock3 size={15} /> {ticket.slaDue}</span></td>
                  <td>{ticket.lastUpdate}</td>
                  <td>
                    <button className="clients-row-action" onClick={() => setOpenMenu(openMenu === ticket.id ? "" : ticket.id)} type="button"><MoreVertical size={20} /></button>
                    <div className={`clients-action-menu ${openMenu === ticket.id ? "is-open" : ""}`}>
                      <button onClick={() => updateTicket(ticket, "in_progress")} type="button">Tomar ticket</button>
                      <button onClick={() => updateTicket(ticket, "waiting")} type="button">Marcar en espera</button>
                      <button onClick={() => updateTicket(ticket, "resolved")} type="button">Resolver</button>
                      <button onClick={() => updateTicket(ticket, "closed")} type="button">Cerrar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
