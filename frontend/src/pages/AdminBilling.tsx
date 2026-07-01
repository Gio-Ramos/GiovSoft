import { CalendarClock, CreditCard, Download, FileText, Filter, MoreVertical, Plus, Search, Send, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { useCloseOnOutsideClick } from "../hooks/useCloseOnOutsideClick";

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
type BillingTab = "invoices" | "recurring" | "collections";
type RecurringStatus = "active" | "paused" | "overdue" | "cancelled";
type CollectionStatus = "pending" | "paid" | "partial" | "overdue";

interface InvoiceItem {
  id: string;
  folio: string;
  client: string;
  concept: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
  issuedAt: string;
}

interface RecurringPayment {
  id: string;
  client: string;
  service: string;
  plan: string;
  amount: number;
  frequency: string;
  paymentDay: number;
  nextCharge: string;
  method: string;
  status: RecurringStatus;
  owner: string;
}

interface CollectionItem {
  id: string;
  client: string;
  concept: string;
  expectedAmount: number;
  paidAmount: number;
  dueDate: string;
  lastContact: string;
  nextFollowUp: string;
  status: CollectionStatus;
  notes: string;
}

const invoicesSeed: InvoiceItem[] = [];
const recurringSeed: RecurringPayment[] = [];
const collectionsSeed: CollectionItem[] = [];

const statusLabels: Record<InvoiceStatus, string> = {
  draft: "Borrador",
  sent: "Emitida",
  paid: "Pagada",
  overdue: "Vencida",
  cancelled: "Cancelada",
};

const recurringLabels: Record<RecurringStatus, string> = {
  active: "Activo",
  paused: "Pausado",
  overdue: "Vencido",
  cancelled: "Cancelado",
};

const collectionLabels: Record<CollectionStatus, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  partial: "Parcial",
  overdue: "Vencido",
};

function money(value: number) {
  return new Intl.NumberFormat("es-MX", { currency: "MXN", maximumFractionDigits: 0, style: "currency" }).format(value);
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-MX");
}

export default function AdminBilling() {
  const [invoices, setInvoices] = useState(invoicesSeed);
  const [recurringPayments, setRecurringPayments] = useState(recurringSeed);
  const [collections, setCollections] = useState(collectionsSeed);
  const [activeTab, setActiveTab] = useState<BillingTab>("invoices");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [openMenu, setOpenMenu] = useState("");

  useCloseOnOutsideClick(Boolean(openMenu), () => setOpenMenu(""));

  const filteredInvoices = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesQuery = !normalized || `${invoice.folio} ${invoice.client} ${invoice.concept}`.toLowerCase().includes(normalized);
      const matchesStatus = statusFilter === "Todos" || statusLabels[invoice.status] === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [invoices, query, statusFilter]);

  const filteredRecurringPayments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return recurringPayments.filter((payment) => {
      const matchesQuery = !normalized || `${payment.client} ${payment.service} ${payment.plan} ${payment.method} ${payment.owner}`.toLowerCase().includes(normalized);
      const matchesStatus = statusFilter === "Todos" || recurringLabels[payment.status] === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, recurringPayments, statusFilter]);

  const filteredCollections = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return collections.filter((collection) => {
      const matchesQuery = !normalized || `${collection.client} ${collection.concept} ${collection.notes}`.toLowerCase().includes(normalized);
      const matchesStatus = statusFilter === "Todos" || collectionLabels[collection.status] === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [collections, query, statusFilter]);

  const totalBilled = invoices.filter((invoice) => invoice.status !== "cancelled").reduce((total, invoice) => total + invoice.amount, 0);
  const totalPaid = invoices.filter((invoice) => invoice.status === "paid").reduce((total, invoice) => total + invoice.amount, 0);
  const overdue = invoices.filter((invoice) => invoice.status === "overdue").length;
  const monthlyRecurring = recurringPayments.filter((item) => item.status === "active").reduce((total, item) => total + item.amount, 0);
  const nextCharges = recurringPayments.filter((item) => item.status === "active" || item.status === "overdue").length;
  const collectionPending = collections.filter((item) => item.status !== "paid").reduce((total, item) => total + (item.expectedAmount - item.paidAmount), 0);

  function updateStatus(invoice: InvoiceItem, status: InvoiceStatus) {
    setInvoices((current) => current.map((item) => (item.id === invoice.id ? { ...item, status } : item)));
    setOpenMenu("");
  }

  function updateRecurringStatus(payment: RecurringPayment, status: RecurringStatus) {
    setRecurringPayments((current) => current.map((item) => (item.id === payment.id ? { ...item, status } : item)));
    setOpenMenu("");
  }

  function updateCollectionStatus(collection: CollectionItem, status: CollectionStatus) {
    setCollections((current) => current.map((item) => (item.id === collection.id ? { ...item, status, paidAmount: status === "paid" ? item.expectedAmount : item.paidAmount } : item)));
    setOpenMenu("");
  }

  function changeTab(tab: BillingTab) {
    setActiveTab(tab);
    setStatusFilter("Todos");
    setOpenMenu("");
  }

  const activeStatusOptions =
    activeTab === "recurring"
      ? Object.values(recurringLabels)
      : activeTab === "collections"
        ? Object.values(collectionLabels)
        : Object.values(statusLabels);

  return (
    <section className="billing-module-shell">
      <div className="clients-page-head">
        <div>
          <h2>Facturación</h2>
          <p>Gestiona facturas, cobranza, vencimientos y seguimiento administrativo.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-primary-action" type="button"><Plus size={20} /> Nueva factura</button>
        </div>
      </div>

      <div className="clients-stats-grid">
        <article className="clients-stat-card"><span className="clients-stat-icon is-blue"><FileText size={27} /></span><div><p>Total facturado</p><h3>{money(totalBilled)}</h3><small>Facturas no canceladas</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-green"><CreditCard size={27} /></span><div><p>Cobrado</p><h3>{money(totalPaid)}</h3><small>Pagos confirmados</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-purple"><WalletCards size={27} /></span><div><p>Recurrente mensual</p><h3>{money(monthlyRecurring)}</h3><small>{nextCharges} cobros activos</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-orange"><CalendarClock size={27} /></span><div><p>Por cobrar</p><h3>{money(collectionPending)}</h3><small>{overdue} facturas vencidas</small></div></article>
      </div>

      <article className="billing-table-card">
        <nav className="billing-tabs">
          <button className={activeTab === "invoices" ? "is-active" : ""} onClick={() => changeTab("invoices")} type="button">Facturas</button>
          <button className={activeTab === "recurring" ? "is-active" : ""} onClick={() => changeTab("recurring")} type="button">Pagos recurrentes</button>
          <button className={activeTab === "collections" ? "is-active" : ""} onClick={() => changeTab("collections")} type="button">Cobranza</button>
        </nav>
        <div className="billing-table-toolbar">
          <label className="clients-table-search"><Search size={19} /><input onChange={(event) => setQuery(event.target.value)} placeholder="Buscar folio, cliente o concepto..." value={query} /></label>
          <label className="clients-filter-field">
            Estado
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option>Todos</option>
              {activeStatusOptions.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <button className="clients-filter-button" type="button"><Filter size={18} /> Filtros</button>
          <button className="clients-download-button" type="button"><Download size={18} /></button>
        </div>
        <div className="clients-table-wrap">
          {activeTab === "invoices" && (
            <table className="billing-data-table">
              <thead><tr><th>Folio</th><th>Cliente</th><th>Concepto</th><th>Monto</th><th>Emisión</th><th>Vencimiento</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td><strong>{invoice.folio}</strong></td>
                    <td>{invoice.client}</td>
                    <td>{invoice.concept}</td>
                    <td>{money(invoice.amount)}</td>
                    <td>{formatDate(invoice.issuedAt)}</td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td><span className={`billing-status is-${invoice.status}`}>{statusLabels[invoice.status]}</span></td>
                    <td>
                      <button className="clients-row-action" onClick={() => setOpenMenu(openMenu === invoice.id ? "" : invoice.id)} type="button"><MoreVertical size={20} /></button>
                      <div className={`clients-action-menu ${openMenu === invoice.id ? "is-open" : ""}`}>
                        <button onClick={() => updateStatus(invoice, "sent")} type="button"><Send size={15} /> Emitir</button>
                        <button onClick={() => updateStatus(invoice, "paid")} type="button">Marcar pagada</button>
                        <button onClick={() => updateStatus(invoice, "cancelled")} type="button">Cancelar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "recurring" && (
            <table className="billing-data-table">
              <thead><tr><th>Cliente</th><th>Servicio</th><th>Plan</th><th>Monto</th><th>Periodicidad</th><th>Próximo cobro</th><th>Método</th><th>Responsable</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {filteredRecurringPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td><strong>{payment.client}</strong></td>
                    <td>{payment.service}</td>
                    <td>{payment.plan}</td>
                    <td>{money(payment.amount)}</td>
                    <td>{payment.frequency} · día {payment.paymentDay}</td>
                    <td>{formatDate(payment.nextCharge)}</td>
                    <td>{payment.method}</td>
                    <td>{payment.owner}</td>
                    <td><span className={`billing-status is-${payment.status}`}>{recurringLabels[payment.status]}</span></td>
                    <td>
                      <button className="clients-row-action" onClick={() => setOpenMenu(openMenu === payment.id ? "" : payment.id)} type="button"><MoreVertical size={20} /></button>
                      <div className={`clients-action-menu ${openMenu === payment.id ? "is-open" : ""}`}>
                        <button onClick={() => updateRecurringStatus(payment, "active")} type="button">Activar</button>
                        <button onClick={() => updateRecurringStatus(payment, "paused")} type="button">Pausar</button>
                        <button onClick={() => updateRecurringStatus(payment, "cancelled")} type="button">Cancelar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === "collections" && (
            <table className="billing-data-table">
              <thead><tr><th>Cliente</th><th>Concepto</th><th>Esperado</th><th>Pagado</th><th>Saldo</th><th>Vencimiento</th><th>Último contacto</th><th>Próximo seguimiento</th><th>Estado</th><th>Notas</th><th>Acciones</th></tr></thead>
              <tbody>
                {filteredCollections.map((collection) => (
                  <tr key={collection.id}>
                    <td><strong>{collection.client}</strong></td>
                    <td>{collection.concept}</td>
                    <td>{money(collection.expectedAmount)}</td>
                    <td>{money(collection.paidAmount)}</td>
                    <td>{money(collection.expectedAmount - collection.paidAmount)}</td>
                    <td>{formatDate(collection.dueDate)}</td>
                    <td>{formatDate(collection.lastContact)}</td>
                    <td>{formatDate(collection.nextFollowUp)}</td>
                    <td><span className={`billing-status is-${collection.status}`}>{collectionLabels[collection.status]}</span></td>
                    <td>{collection.notes}</td>
                    <td>
                      <button className="clients-row-action" onClick={() => setOpenMenu(openMenu === collection.id ? "" : collection.id)} type="button"><MoreVertical size={20} /></button>
                      <div className={`clients-action-menu ${openMenu === collection.id ? "is-open" : ""}`}>
                        <button onClick={() => updateCollectionStatus(collection, "paid")} type="button">Registrar pago</button>
                        <button onClick={() => updateCollectionStatus(collection, "partial")} type="button">Pago parcial</button>
                        <button onClick={() => updateCollectionStatus(collection, "overdue")} type="button">Marcar vencido</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </article>
    </section>
  );
}
