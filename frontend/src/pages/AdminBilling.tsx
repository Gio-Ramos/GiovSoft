import type { FormEvent } from "react";
import { CalendarClock, CreditCard, Download, FileText, Filter, MoreVertical, Plus, Save, Search, Send, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  subscriptionName: string;
  client: string;
  service: string;
  plan: string;
  amount: number;
  frequency: string;
  paymentDay: number;
  startedAt: string;
  nextCharge: string;
  renewalDate: string;
  method: string;
  autoInvoice: boolean;
  status: RecurringStatus;
  owner: string;
  notes: string;
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

interface InvoiceForm {
  folio: string;
  client: string;
  concept: string;
  amount: string;
  issuedAt: string;
  dueDate: string;
  status: InvoiceStatus;
}

interface RecurringForm {
  subscriptionName: string;
  client: string;
  service: string;
  plan: string;
  amount: string;
  frequency: string;
  paymentDay: string;
  startedAt: string;
  nextCharge: string;
  renewalDate: string;
  method: string;
  autoInvoice: boolean;
  status: RecurringStatus;
  owner: string;
  notes: string;
}

interface CollectionForm {
  client: string;
  concept: string;
  expectedAmount: string;
  paidAmount: string;
  dueDate: string;
  lastContact: string;
  nextFollowUp: string;
  status: CollectionStatus;
  notes: string;
}

const invoicesSeed: InvoiceItem[] = [];
const recurringSeed: RecurringPayment[] = [];
const collectionsSeed: CollectionItem[] = [];
const invoicesStorageKey = "giovsoft-admin-invoices-v2";
const recurringStorageKey = "giovsoft-admin-recurring-v2";
const collectionsStorageKey = "giovsoft-admin-collections-v2";

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

const emptyInvoiceForm: InvoiceForm = {
  folio: "",
  client: "",
  concept: "",
  amount: "",
  issuedAt: new Date().toISOString().slice(0, 10),
  dueDate: "",
  status: "draft",
};

const emptyRecurringForm: RecurringForm = {
  subscriptionName: "",
  client: "",
  service: "",
  plan: "",
  amount: "",
  frequency: "Mensual",
  paymentDay: "1",
  startedAt: new Date().toISOString().slice(0, 10),
  nextCharge: "",
  renewalDate: "",
  method: "",
  autoInvoice: true,
  status: "active",
  owner: "",
  notes: "",
};

const emptyCollectionForm: CollectionForm = {
  client: "",
  concept: "",
  expectedAmount: "",
  paidAmount: "0",
  dueDate: "",
  lastContact: new Date().toISOString().slice(0, 10),
  nextFollowUp: "",
  status: "pending",
  notes: "",
};

function readStoredList<T>(key: string, fallback: T[]) {
  const stored = window.localStorage.getItem(key);

  if (!stored) {
    return fallback;
  }

  try {
    return JSON.parse(stored) as T[];
  } catch (_error) {
    return fallback;
  }
}

function money(value: number) {
  return new Intl.NumberFormat("es-MX", { currency: "MXN", maximumFractionDigits: 0, style: "currency" }).format(value);
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-MX");
}

export default function AdminBilling() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>(() => readStoredList(invoicesStorageKey, invoicesSeed));
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>(() => readStoredList(recurringStorageKey, recurringSeed));
  const [collections, setCollections] = useState<CollectionItem[]>(() => readStoredList(collectionsStorageKey, collectionsSeed));
  const [activeTab, setActiveTab] = useState<BillingTab>("invoices");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [openMenu, setOpenMenu] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>(emptyInvoiceForm);
  const [recurringForm, setRecurringForm] = useState<RecurringForm>(emptyRecurringForm);
  const [collectionForm, setCollectionForm] = useState<CollectionForm>(emptyCollectionForm);
  const [message, setMessage] = useState("");

  useCloseOnOutsideClick(Boolean(openMenu), () => setOpenMenu(""));

  useEffect(() => {
    window.localStorage.setItem(invoicesStorageKey, JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    window.localStorage.setItem(recurringStorageKey, JSON.stringify(recurringPayments));
  }, [recurringPayments]);

  useEffect(() => {
    window.localStorage.setItem(collectionsStorageKey, JSON.stringify(collections));
  }, [collections]);

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
      const matchesQuery =
        !normalized ||
        `${payment.subscriptionName ?? ""} ${payment.client} ${payment.service} ${payment.plan} ${payment.method} ${payment.owner} ${payment.notes ?? ""}`.toLowerCase().includes(normalized);
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

  function createInvoiceFromSubscription(payment: RecurringPayment) {
    const invoice: InvoiceItem = {
      id: crypto.randomUUID(),
      folio: `FAC-${String(invoices.length + 1).padStart(5, "0")}`,
      client: payment.client,
      concept: `${payment.subscriptionName || payment.service} · ${payment.plan}`,
      amount: payment.amount,
      status: "sent",
      dueDate: payment.nextCharge,
      issuedAt: new Date().toISOString().slice(0, 10),
    };

    setInvoices((current) => [invoice, ...current]);
    setOpenMenu("");
    setActiveTab("invoices");
    setMessage("Factura generada desde la suscripción.");
  }

  function createCollectionFromSubscription(payment: RecurringPayment) {
    const collection: CollectionItem = {
      id: crypto.randomUUID(),
      client: payment.client,
      concept: `${payment.subscriptionName || payment.service} · ${payment.plan}`,
      expectedAmount: payment.amount,
      paidAmount: 0,
      dueDate: payment.nextCharge,
      lastContact: new Date().toISOString().slice(0, 10),
      nextFollowUp: payment.nextCharge,
      status: "pending",
      notes: payment.notes || "Cobranza creada desde suscripción.",
    };

    setCollections((current) => [collection, ...current]);
    setOpenMenu("");
    setActiveTab("collections");
    setMessage("Cobranza creada desde la suscripción.");
  }

  function updateCollectionStatus(collection: CollectionItem, status: CollectionStatus) {
    setCollections((current) => current.map((item) => (item.id === collection.id ? { ...item, status, paidAmount: status === "paid" ? item.expectedAmount : item.paidAmount } : item)));
    setOpenMenu("");
  }

  function changeTab(tab: BillingTab) {
    setActiveTab(tab);
    setStatusFilter("Todos");
    setOpenMenu("");
    setShowForm(false);
    setMessage("");
  }

  function openCreateForm(tab = activeTab) {
    setActiveTab(tab);
    setOpenMenu("");
    setMessage("");
    setShowForm(true);
  }

  function saveInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!invoiceForm.client || !invoiceForm.concept || !invoiceForm.amount || !invoiceForm.dueDate) {
      setMessage("Completa cliente, concepto, monto y vencimiento de la factura.");
      return;
    }

    const invoice: InvoiceItem = {
      id: crypto.randomUUID(),
      folio: invoiceForm.folio || `FAC-${String(invoices.length + 1).padStart(5, "0")}`,
      client: invoiceForm.client,
      concept: invoiceForm.concept,
      amount: Number(invoiceForm.amount),
      status: invoiceForm.status,
      dueDate: invoiceForm.dueDate,
      issuedAt: invoiceForm.issuedAt,
    };

    setInvoices((current) => [invoice, ...current]);
    setInvoiceForm({ ...emptyInvoiceForm, issuedAt: new Date().toISOString().slice(0, 10) });
    setShowForm(false);
    setMessage("Factura agregada correctamente.");
  }

  function saveRecurring(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!recurringForm.client || !recurringForm.subscriptionName || !recurringForm.service || !recurringForm.amount || !recurringForm.nextCharge) {
      setMessage("Completa cliente, suscripción, servicio, monto y próximo cobro.");
      return;
    }

    const payment: RecurringPayment = {
      id: crypto.randomUUID(),
      subscriptionName: recurringForm.subscriptionName,
      client: recurringForm.client,
      service: recurringForm.service,
      plan: recurringForm.plan || "Sin plan",
      amount: Number(recurringForm.amount),
      frequency: recurringForm.frequency,
      paymentDay: Number(recurringForm.paymentDay || 1),
      startedAt: recurringForm.startedAt || new Date().toISOString().slice(0, 10),
      nextCharge: recurringForm.nextCharge,
      renewalDate: recurringForm.renewalDate || recurringForm.nextCharge,
      method: recurringForm.method || "Por definir",
      autoInvoice: recurringForm.autoInvoice,
      status: recurringForm.status,
      owner: recurringForm.owner || "Administración",
      notes: recurringForm.notes,
    };

    setRecurringPayments((current) => [payment, ...current]);
    setRecurringForm({ ...emptyRecurringForm, startedAt: new Date().toISOString().slice(0, 10) });
    setShowForm(false);
    setMessage("Suscripción agregada correctamente.");
  }

  function saveCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!collectionForm.client || !collectionForm.concept || !collectionForm.expectedAmount || !collectionForm.dueDate) {
      setMessage("Completa cliente, concepto, monto esperado y vencimiento de cobranza.");
      return;
    }

    const collection: CollectionItem = {
      id: crypto.randomUUID(),
      client: collectionForm.client,
      concept: collectionForm.concept,
      expectedAmount: Number(collectionForm.expectedAmount),
      paidAmount: Number(collectionForm.paidAmount || 0),
      dueDate: collectionForm.dueDate,
      lastContact: collectionForm.lastContact || new Date().toISOString().slice(0, 10),
      nextFollowUp: collectionForm.nextFollowUp || collectionForm.dueDate,
      status: collectionForm.status,
      notes: collectionForm.notes,
    };

    setCollections((current) => [collection, ...current]);
    setCollectionForm({ ...emptyCollectionForm, lastContact: new Date().toISOString().slice(0, 10) });
    setShowForm(false);
    setMessage("Registro de cobranza agregado correctamente.");
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
          <button className="clients-primary-action" onClick={() => openCreateForm("invoices")} type="button"><Plus size={20} /> Nueva factura</button>
        </div>
      </div>

      {message && <p className={message.includes("Completa") ? "admin-form-error" : "admin-form-success"}>{message}</p>}

      <section className="billing-action-grid">
        <button onClick={() => openCreateForm("invoices")} type="button">
          <span><FileText size={21} /></span>
          <strong>Agregar factura</strong>
          <small>Folio, cliente, concepto, monto y vencimiento.</small>
        </button>
        <button onClick={() => openCreateForm("recurring")} type="button">
          <span><WalletCards size={21} /></span>
          <strong>Suscripción recurrente</strong>
          <small>Planes, renovación, auto-facturación y próximo cobro.</small>
        </button>
        <button onClick={() => openCreateForm("collections")} type="button">
          <span><CalendarClock size={21} /></span>
          <strong>Cobranza</strong>
          <small>Saldo pendiente, contacto y seguimiento.</small>
        </button>
      </section>

      <div className="clients-stats-grid">
        <article className="clients-stat-card"><span className="clients-stat-icon is-blue"><FileText size={27} /></span><div><p>Total facturado</p><h3>{money(totalBilled)}</h3><small>Facturas no canceladas</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-green"><CreditCard size={27} /></span><div><p>Cobrado</p><h3>{money(totalPaid)}</h3><small>Pagos confirmados</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-purple"><WalletCards size={27} /></span><div><p>Recurrente mensual</p><h3>{money(monthlyRecurring)}</h3><small>{nextCharges} cobros activos</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-orange"><CalendarClock size={27} /></span><div><p>Por cobrar</p><h3>{money(collectionPending)}</h3><small>{overdue} facturas vencidas</small></div></article>
      </div>

      <article className="billing-table-card">
        <nav className="billing-tabs">
          <button className={activeTab === "invoices" ? "is-active" : ""} onClick={() => changeTab("invoices")} type="button">Facturas</button>
          <button className={activeTab === "recurring" ? "is-active" : ""} onClick={() => changeTab("recurring")} type="button">Suscripciones</button>
          <button className={activeTab === "collections" ? "is-active" : ""} onClick={() => changeTab("collections")} type="button">Cobranza</button>
        </nav>
        {showForm && activeTab === "invoices" && (
          <form className="billing-entry-form" onSubmit={saveInvoice}>
            <label><span>Folio</span><input onChange={(event) => setInvoiceForm((current) => ({ ...current, folio: event.target.value }))} placeholder="Ej. FAC-00001" value={invoiceForm.folio} /></label>
            <label><span>Cliente <b>*</b></span><input onChange={(event) => setInvoiceForm((current) => ({ ...current, client: event.target.value }))} placeholder="Ej. Clínica Valle del Sol" value={invoiceForm.client} /></label>
            <label><span>Concepto <b>*</b></span><input onChange={(event) => setInvoiceForm((current) => ({ ...current, concept: event.target.value }))} placeholder="Ej. Desarrollo web" value={invoiceForm.concept} /></label>
            <label><span>Monto <b>*</b></span><input min="0" onChange={(event) => setInvoiceForm((current) => ({ ...current, amount: event.target.value }))} placeholder="14990" type="number" value={invoiceForm.amount} /></label>
            <label><span>Emisión</span><input onChange={(event) => setInvoiceForm((current) => ({ ...current, issuedAt: event.target.value }))} type="date" value={invoiceForm.issuedAt} /></label>
            <label><span>Vencimiento <b>*</b></span><input onChange={(event) => setInvoiceForm((current) => ({ ...current, dueDate: event.target.value }))} type="date" value={invoiceForm.dueDate} /></label>
            <label><span>Estado</span><select onChange={(event) => setInvoiceForm((current) => ({ ...current, status: event.target.value as InvoiceStatus }))} value={invoiceForm.status}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <div className="billing-entry-actions"><button onClick={() => setShowForm(false)} type="button">Cancelar</button><button type="submit"><Save size={16} /> Guardar factura</button></div>
          </form>
        )}

        {showForm && activeTab === "recurring" && (
          <form className="billing-entry-form is-recurring" onSubmit={saveRecurring}>
            <label><span>Suscripción <b>*</b></span><input onChange={(event) => setRecurringForm((current) => ({ ...current, subscriptionName: event.target.value }))} placeholder="Ej. Workspace mensual" value={recurringForm.subscriptionName} /></label>
            <label><span>Cliente <b>*</b></span><input onChange={(event) => setRecurringForm((current) => ({ ...current, client: event.target.value }))} placeholder="Ej. Clínica Valle del Sol" value={recurringForm.client} /></label>
            <label><span>Servicio <b>*</b></span><input onChange={(event) => setRecurringForm((current) => ({ ...current, service: event.target.value }))} placeholder="Ej. Google Workspace" value={recurringForm.service} /></label>
            <label><span>Plan</span><input onChange={(event) => setRecurringForm((current) => ({ ...current, plan: event.target.value }))} placeholder="Ej. Business Standard" value={recurringForm.plan} /></label>
            <label><span>Monto <b>*</b></span><input min="0" onChange={(event) => setRecurringForm((current) => ({ ...current, amount: event.target.value }))} type="number" value={recurringForm.amount} /></label>
            <label><span>Frecuencia</span><select onChange={(event) => setRecurringForm((current) => ({ ...current, frequency: event.target.value }))} value={recurringForm.frequency}><option>Mensual</option><option>Anual</option><option>Trimestral</option><option>Semestral</option></select></label>
            <label><span>Día de cobro</span><input max="31" min="1" onChange={(event) => setRecurringForm((current) => ({ ...current, paymentDay: event.target.value }))} type="number" value={recurringForm.paymentDay} /></label>
            <label><span>Inicio</span><input onChange={(event) => setRecurringForm((current) => ({ ...current, startedAt: event.target.value }))} type="date" value={recurringForm.startedAt} /></label>
            <label><span>Próximo cobro <b>*</b></span><input onChange={(event) => setRecurringForm((current) => ({ ...current, nextCharge: event.target.value }))} type="date" value={recurringForm.nextCharge} /></label>
            <label><span>Renovación</span><input onChange={(event) => setRecurringForm((current) => ({ ...current, renewalDate: event.target.value }))} type="date" value={recurringForm.renewalDate} /></label>
            <label><span>Método</span><input onChange={(event) => setRecurringForm((current) => ({ ...current, method: event.target.value }))} placeholder="Ej. Transferencia, tarjeta" value={recurringForm.method} /></label>
            <label><span>Responsable</span><input onChange={(event) => setRecurringForm((current) => ({ ...current, owner: event.target.value }))} placeholder="Ej. Administración" value={recurringForm.owner} /></label>
            <label><span>Estado</span><select onChange={(event) => setRecurringForm((current) => ({ ...current, status: event.target.value as RecurringStatus }))} value={recurringForm.status}>{Object.entries(recurringLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="billing-entry-check"><input checked={recurringForm.autoInvoice} onChange={(event) => setRecurringForm((current) => ({ ...current, autoInvoice: event.target.checked }))} type="checkbox" /> <span>Generar factura automáticamente</span></label>
            <label className="billing-entry-wide"><span>Notas</span><input onChange={(event) => setRecurringForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Condiciones, recordatorios o datos de renovación..." value={recurringForm.notes} /></label>
            <div className="billing-entry-actions"><button onClick={() => setShowForm(false)} type="button">Cancelar</button><button type="submit"><Save size={16} /> Guardar suscripción</button></div>
          </form>
        )}

        {showForm && activeTab === "collections" && (
          <form className="billing-entry-form is-collection" onSubmit={saveCollection}>
            <label><span>Cliente <b>*</b></span><input onChange={(event) => setCollectionForm((current) => ({ ...current, client: event.target.value }))} placeholder="Ej. Clínica Valle del Sol" value={collectionForm.client} /></label>
            <label><span>Concepto <b>*</b></span><input onChange={(event) => setCollectionForm((current) => ({ ...current, concept: event.target.value }))} placeholder="Ej. Renovación anual" value={collectionForm.concept} /></label>
            <label><span>Monto esperado <b>*</b></span><input min="0" onChange={(event) => setCollectionForm((current) => ({ ...current, expectedAmount: event.target.value }))} type="number" value={collectionForm.expectedAmount} /></label>
            <label><span>Pagado</span><input min="0" onChange={(event) => setCollectionForm((current) => ({ ...current, paidAmount: event.target.value }))} type="number" value={collectionForm.paidAmount} /></label>
            <label><span>Vencimiento <b>*</b></span><input onChange={(event) => setCollectionForm((current) => ({ ...current, dueDate: event.target.value }))} type="date" value={collectionForm.dueDate} /></label>
            <label><span>Último contacto</span><input onChange={(event) => setCollectionForm((current) => ({ ...current, lastContact: event.target.value }))} type="date" value={collectionForm.lastContact} /></label>
            <label><span>Próximo seguimiento</span><input onChange={(event) => setCollectionForm((current) => ({ ...current, nextFollowUp: event.target.value }))} type="date" value={collectionForm.nextFollowUp} /></label>
            <label><span>Estado</span><select onChange={(event) => setCollectionForm((current) => ({ ...current, status: event.target.value as CollectionStatus }))} value={collectionForm.status}>{Object.entries(collectionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="billing-entry-wide"><span>Notas</span><input onChange={(event) => setCollectionForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Acuerdos, recordatorios o datos de seguimiento..." value={collectionForm.notes} /></label>
            <div className="billing-entry-actions"><button onClick={() => setShowForm(false)} type="button">Cancelar</button><button type="submit"><Save size={16} /> Guardar cobranza</button></div>
          </form>
        )}
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
              <thead><tr><th>Suscripción</th><th>Cliente</th><th>Servicio</th><th>Plan</th><th>Monto</th><th>Periodicidad</th><th>Inicio</th><th>Próximo cobro</th><th>Renovación</th><th>Auto factura</th><th>Método</th><th>Responsable</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {filteredRecurringPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td><strong>{payment.subscriptionName || payment.service}</strong></td>
                    <td><strong>{payment.client}</strong></td>
                    <td>{payment.service}</td>
                    <td>{payment.plan}</td>
                    <td>{money(payment.amount)}</td>
                    <td>{payment.frequency} · día {payment.paymentDay}</td>
                    <td>{formatDate(payment.startedAt || payment.nextCharge)}</td>
                    <td>{formatDate(payment.nextCharge)}</td>
                    <td>{formatDate(payment.renewalDate || payment.nextCharge)}</td>
                    <td>{payment.autoInvoice === false ? "Manual" : "Automática"}</td>
                    <td>{payment.method}</td>
                    <td>{payment.owner}</td>
                    <td><span className={`billing-status is-${payment.status}`}>{recurringLabels[payment.status]}</span></td>
                    <td>
                      <button className="clients-row-action" onClick={() => setOpenMenu(openMenu === payment.id ? "" : payment.id)} type="button"><MoreVertical size={20} /></button>
                      <div className={`clients-action-menu ${openMenu === payment.id ? "is-open" : ""}`}>
                        <button onClick={() => createInvoiceFromSubscription(payment)} type="button">Generar factura</button>
                        <button onClick={() => createCollectionFromSubscription(payment)} type="button">Crear cobranza</button>
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
