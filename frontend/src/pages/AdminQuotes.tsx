import type { FormEvent, MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSignature,
  Filter,
  Eye,
  Mail,
  MoreVertical,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useCloseOnOutsideClick } from "../hooks/useCloseOnOutsideClick";
import { api } from "../lib/api";

type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired" | "cancelled";

interface ClientOption {
  id: string;
  businessName: string;
  contacts?: Record<string, string>[];
}

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal?: number;
  tax?: number;
  total?: number;
}

interface Quote {
  id: string;
  folio: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  validUntil: string;
  currency: string;
  status: QuoteStatus;
  subtotal: number;
  tax: number;
  total: number;
  items: QuoteItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface QuoteForm {
  folio: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  validUntil: string;
  currency: string;
  status: QuoteStatus;
  notes: string;
  items: QuoteItem[];
}

const statusLabels: Record<QuoteStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Vencida",
  cancelled: "Cancelada",
};

const emptyLine = (): QuoteItem => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: 1,
  taxRate: 16,
  unitPrice: 0,
});

const emptyForm = (): QuoteForm => ({
  folio: "",
  clientId: "",
  clientName: "",
  clientEmail: "",
  currency: "MXN",
  items: [emptyLine()],
  notes: "",
  status: "draft",
  validUntil: "",
});

function money(value: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  if (!value) return "Sin vigencia";
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("es-MX");
}

function calculateTotals(items: QuoteItem[]) {
  return items.reduce(
    (totals, item) => {
      const subtotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);
      const tax = subtotal * (Number(item.taxRate || 0) / 100);
      return {
        subtotal: totals.subtotal + subtotal,
        tax: totals.tax + tax,
        total: totals.total + subtotal + tax,
      };
    },
    { subtotal: 0, tax: 0, total: 0 },
  );
}

export default function AdminQuotes() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { quoteId } = useParams();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [showFilters, setShowFilters] = useState(false);
  const [validFromFilter, setValidFromFilter] = useState("");
  const [validToFilter, setValidToFilter] = useState("");
  const [minTotalFilter, setMinTotalFilter] = useState("");
  const [maxTotalFilter, setMaxTotalFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [openMenu, setOpenMenu] = useState("");
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<QuoteForm>(() => emptyForm());
  const [loadedFormId, setLoadedFormId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewPdfUrl, setPreviewPdfUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const isFormView = pathname === "/admin/cotizaciones/nueva" || Boolean(quoteId);

  useCloseOnOutsideClick(Boolean(openMenu), () => setOpenMenu(""));

  useEffect(() => {
    loadQuotes();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setOpenMenu("");
    setMenuPosition(null);
  }, [maxTotalFilter, minTotalFilter, pageSize, query, statusFilter, validFromFilter, validToFilter]);

  useEffect(() => {
    if (!openMenu) {
      setMenuPosition(null);
    }
  }, [openMenu]);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    function closeFloatingMenu() {
      setOpenMenu("");
      setMenuPosition(null);
    }

    window.addEventListener("resize", closeFloatingMenu);
    window.addEventListener("scroll", closeFloatingMenu, true);

    return () => {
      window.removeEventListener("resize", closeFloatingMenu);
      window.removeEventListener("scroll", closeFloatingMenu, true);
    };
  }, [openMenu]);

  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

  useEffect(() => {
    if (pathname === "/admin/cotizaciones/nueva" && loadedFormId !== "new") {
      setEditingId("");
      setForm(emptyForm());
      setLoadedFormId("new");
      setMessage("");
    }

    if (quoteId && quotes.length > 0 && loadedFormId !== quoteId) {
      const quote = quotes.find((item) => item.id === quoteId);

      if (quote) {
        setEditingId(quote.id);
        setForm({
          clientEmail: quote.clientEmail || "",
          clientId: quote.clientId || "",
          clientName: quote.clientName,
          currency: quote.currency || "MXN",
          folio: quote.folio,
          items: quote.items.length ? quote.items : [emptyLine()],
          notes: quote.notes || "",
          status: quote.status,
          validUntil: quote.validUntil || "",
        });
        setLoadedFormId(quoteId);
      }
    }
  }, [loadedFormId, pathname, quoteId, quotes]);

  async function loadQuotes() {
    setLoading(true);
    setMessage("");

    try {
      const response = await api.get("/api/admin/quotes");
      setQuotes(response.data.quotes || []);
      setClients(response.data.clients || []);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "No se pudieron cargar las cotizaciones.");
    } finally {
      setLoading(false);
    }
  }

  const filteredQuotes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return quotes.filter((quote) => {
      const matchesQuery =
        !normalized ||
        `${quote.folio} ${quote.clientName} ${quote.clientEmail} ${quote.notes}`.toLowerCase().includes(normalized);
      const matchesStatus = statusFilter === "Todos" || statusLabels[quote.status] === statusFilter;
      const quoteDate = quote.validUntil ? quote.validUntil.slice(0, 10) : "";
      const matchesValidFrom = !validFromFilter || (quoteDate && quoteDate >= validFromFilter);
      const matchesValidTo = !validToFilter || (quoteDate && quoteDate <= validToFilter);
      const matchesMinTotal = !minTotalFilter || Number(quote.total || 0) >= Number(minTotalFilter);
      const matchesMaxTotal = !maxTotalFilter || Number(quote.total || 0) <= Number(maxTotalFilter);
      return matchesQuery && matchesStatus && matchesValidFrom && matchesValidTo && matchesMinTotal && matchesMaxTotal;
    });
  }, [maxTotalFilter, minTotalFilter, query, quotes, statusFilter, validFromFilter, validToFilter]);

  const totals = useMemo(() => calculateTotals(form.items), [form.items]);
  const quotedAmount = quotes.filter((quote) => quote.status !== "cancelled").reduce((total, quote) => total + quote.total, 0);
  const acceptedAmount = quotes.filter((quote) => quote.status === "accepted").reduce((total, quote) => total + quote.total, 0);
  const sentQuotes = quotes.filter((quote) => quote.status === "sent").length;
  const acceptedQuotes = quotes.filter((quote) => quote.status === "accepted").length;
  const totalPages = Math.max(1, Math.ceil(filteredQuotes.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const pageStart = (activePage - 1) * pageSize;
  const paginatedQuotes = filteredQuotes.slice(pageStart, pageStart + pageSize);
  const displayStart = filteredQuotes.length === 0 ? 0 : pageStart + 1;
  const displayEnd = Math.min(pageStart + paginatedQuotes.length, filteredQuotes.length);
  const openMenuQuote = openMenu ? quotes.find((quote) => quote.id === openMenu) : undefined;

  function toggleQuoteMenu(event: MouseEvent<HTMLButtonElement>, quoteId: string) {
    if (openMenu === quoteId) {
      setOpenMenu("");
      setMenuPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 230;
    const menuHeight = 360;
    const viewportPadding = 12;
    const left = Math.min(window.innerWidth - menuWidth - viewportPadding, Math.max(viewportPadding, rect.right - menuWidth));
    const belowTop = rect.bottom + 8;
    const top =
      belowTop + menuHeight > window.innerHeight - viewportPadding
        ? Math.max(viewportPadding, rect.top - menuHeight - 8)
        : belowTop;

    setMenuPosition({ left, top });
    setOpenMenu(quoteId);
  }

  function selectClient(clientId: string) {
    const selectedClient = clients.find((client) => client.id === clientId);
    const firstContact = selectedClient?.contacts?.[0] || {};

    setForm((current) => ({
      ...current,
      clientEmail: firstContact.email || current.clientEmail,
      clientId,
      clientName: selectedClient?.businessName || current.clientName,
    }));
  }

  function updateLine(id: string, field: keyof QuoteItem, value: string) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === "description" ? value : Number(value),
            }
          : item,
      ),
    }));
  }

  function removeLine(id: string) {
    setForm((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((item) => item.id !== id),
    }));
  }

  function openCreateForm() {
    navigate("/admin/cotizaciones/nueva");
  }

  function openEditForm(quote: Quote) {
    setOpenMenu("");
    navigate(`/admin/cotizaciones/${quote.id}/editar`);
  }

  async function saveQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const payload = {
        ...form,
        items: form.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity || 0),
          taxRate: Number(item.taxRate || 0),
          unitPrice: Number(item.unitPrice || 0),
        })),
        sendEmail: false,
      };
      const response = editingId
        ? await api.patch(`/api/admin/quotes/${editingId}`, payload)
        : await api.post("/api/admin/quotes", payload);
      const savedQuote = response.data.quote as Quote;

      setQuotes((current) => {
        if (!editingId) {
          return [savedQuote, ...current];
        }

        return current.map((quote) => (quote.id === savedQuote.id ? savedQuote : quote));
      });
      setEditingId("");
      setForm(emptyForm());
      setMessage(response.data.message || "Cotización guardada como borrador.");
      navigate("/admin/cotizaciones");
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "No se pudo guardar la cotización.");
    }
  }

  async function updateQuoteStatus(quote: Quote, status: QuoteStatus) {
    setOpenMenu("");
    try {
      const response = await api.patch(`/api/admin/quotes/${quote.id}`, { ...quote, status });
      const updatedQuote = response.data.quote as Quote;
      setQuotes((current) => current.map((item) => (item.id === updatedQuote.id ? updatedQuote : item)));
      setMessage(response.data.message || "Cotización actualizada.");
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "No se pudo actualizar la cotización.");
    }
  }

  function duplicateQuote(quote: Quote) {
    setEditingId("");
    setForm({
      clientEmail: quote.clientEmail || "",
      clientId: quote.clientId || "",
      clientName: quote.clientName,
      currency: quote.currency || "MXN",
      folio: "",
      items: quote.items.map((item) => ({ ...item, id: crypto.randomUUID() })),
      notes: quote.notes || "",
      status: "draft",
      validUntil: "",
    });
    setOpenMenu("");
    setLoadedFormId("duplicate");
    navigate("/admin/cotizaciones/nueva");
  }

  async function sendQuote(quote: Quote) {
    setOpenMenu("");
    try {
      const response = await api.post(`/api/admin/quotes/${quote.id}/send`);
      const updatedQuote = response.data.quote as Quote;
      setQuotes((current) => current.map((item) => (item.id === updatedQuote.id ? updatedQuote : item)));
      setMessage(response.data.message || "Cotización enviada al cliente.");
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "No se pudo enviar la cotización.");
    }
  }

  async function openPdfPreview(quote: Quote) {
    setOpenMenu("");
    try {
      const response = await api.get(`/api/admin/quotes/${quote.id}/pdf`, { responseType: "blob" });
      const nextUrl = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));

      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }

      setPreviewPdfUrl(nextUrl);
      setPreviewTitle(`${quote.folio} · ${quote.clientName}`);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "No se pudo generar la vista previa del PDF.");
    }
  }

  async function downloadPdf(quote: Quote) {
    setOpenMenu("");
    try {
      const response = await api.get(`/api/admin/quotes/${quote.id}/pdf?download=1`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${quote.folio}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "No se pudo descargar el PDF.");
    }
  }

  function closePdfPreview() {
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
    }

    setPreviewPdfUrl("");
    setPreviewTitle("");
  }

  if (isFormView) {
    return (
      <section className="billing-module-shell quotes-module-shell">
        <div className="clients-page-head">
          <div>
            <h2>{editingId ? "Editar cotización" : "Nueva cotización"}</h2>
            <p>Completa la propuesta comercial. Guárdala como borrador para previsualizar el PDF antes de enviarlo.</p>
          </div>
          <div className="clients-head-actions">
            <button className="clients-secondary-action" onClick={() => navigate("/admin/cotizaciones")} type="button">
              Cancelar
            </button>
            <button className="clients-primary-action" form="quote-form" type="submit">
              <Save size={20} /> {editingId ? "Guardar cambios" : "Guardar borrador"}
            </button>
          </div>
        </div>

        {message && <p className={message.includes("No se") || message.includes("Agrega") || message.includes("Selecciona") ? "admin-form-error" : "admin-form-success"}>{message}</p>}

        <form className="quote-detail-page" id="quote-form" onSubmit={saveQuote}>
          <article className="billing-table-card quotes-form-panel">
            <div className="quotes-form-head">
              <div>
                <strong>Datos de la cotización</strong>
                <span>El folio puede quedarse vacío para generarse automáticamente.</span>
              </div>
            </div>
            <div className="billing-entry-form quotes-entry-grid">
              <label><span>Folio</span><input onChange={(event) => setForm((current) => ({ ...current, folio: event.target.value }))} placeholder="Automático si se deja vacío" value={form.folio} /></label>
              <label><span>Cliente <b>*</b></span><select onChange={(event) => selectClient(event.target.value)} value={form.clientId}><option value="">Seleccionar cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.businessName}</option>)}</select></label>
              <label><span>Cliente manual</span><input onChange={(event) => setForm((current) => ({ ...current, clientName: event.target.value, clientId: "" }))} placeholder="Ej. Clínica Valle del Sol" value={form.clientName} /></label>
              <label><span>Correo <b>*</b></span><input onChange={(event) => setForm((current) => ({ ...current, clientEmail: event.target.value }))} placeholder="contacto@cliente.com" value={form.clientEmail} /></label>
              <label><span>Vigencia</span><input onChange={(event) => setForm((current) => ({ ...current, validUntil: event.target.value }))} type="date" value={form.validUntil} /></label>
              <label><span>Moneda</span><select onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} value={form.currency}><option>MXN</option><option>USD</option></select></label>
              <label><span>Estado</span><select onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as QuoteStatus }))} value={form.status}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="billing-entry-wide"><span>Notas</span><input onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Condiciones, alcance, tiempos de entrega o forma de pago..." value={form.notes} /></label>
            </div>
          </article>

          <article className="quotes-lines-card quote-detail-lines">
            <div className="quotes-lines-head">
              <strong>Partidas</strong>
              <button onClick={() => setForm((current) => ({ ...current, items: [...current.items, emptyLine()] }))} type="button"><Plus size={16} /> Agregar partida</button>
            </div>
            <div className="quotes-lines-list">
              {form.items.map((item) => (
                <div className="quote-line-grid" key={item.id}>
                  <label><span>Concepto <b>*</b></span><input onChange={(event) => updateLine(item.id, "description", event.target.value)} placeholder="Ej. Diseño y desarrollo web" value={item.description} /></label>
                  <label><span>Cant. <b>*</b></span><input min="0" onChange={(event) => updateLine(item.id, "quantity", event.target.value)} type="number" value={item.quantity} /></label>
                  <label><span>Precio <b>*</b></span><input min="0" onChange={(event) => updateLine(item.id, "unitPrice", event.target.value)} type="number" value={item.unitPrice} /></label>
                  <label><span>IVA %</span><input min="0" onChange={(event) => updateLine(item.id, "taxRate", event.target.value)} type="number" value={item.taxRate} /></label>
                  <button className="quote-line-remove" onClick={() => removeLine(item.id)} type="button" aria-label="Eliminar partida"><Trash2 size={17} /></button>
                </div>
              ))}
            </div>
            <aside className="quote-total-box">
              <span>Subtotal <strong>{money(totals.subtotal, form.currency)}</strong></span>
              <span>IVA <strong>{money(totals.tax, form.currency)}</strong></span>
              <span>Total <strong>{money(totals.total, form.currency)}</strong></span>
            </aside>
          </article>

          <article className="quote-email-card">
            <span><Mail size={21} /></span>
            <div>
              <strong>Revisión antes de enviar</strong>
              <p>Después de guardar podrás abrir la vista previa del PDF, descargarlo y enviarlo a {form.clientEmail || "el correo del cliente"} desde el listado.</p>
            </div>
          </article>
        </form>
      </section>
    );
  }

  return (
    <section className="billing-module-shell quotes-module-shell">
      <div className="clients-page-head">
        <div>
          <h2>Cotizaciones</h2>
          <p>Genera propuestas comerciales con partidas, impuestos, vigencia y seguimiento por estado.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-primary-action" onClick={openCreateForm} type="button">
            <Plus size={20} /> Nueva cotización
          </button>
        </div>
      </div>

      {message && <p className={message.includes("No se") || message.includes("Agrega") || message.includes("Selecciona") ? "admin-form-error" : "admin-form-success"}>{message}</p>}

      <div className="clients-stats-grid">
        <article className="clients-stat-card"><span className="clients-stat-icon is-blue"><FileSignature size={27} /></span><div><p>Cotizaciones</p><h3>{quotes.length}</h3><small>{loading ? "Cargando..." : "Registros generados"}</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-purple"><Send size={27} /></span><div><p>Enviadas</p><h3>{sentQuotes}</h3><small>En seguimiento comercial</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-green"><CheckCircle2 size={27} /></span><div><p>Aceptadas</p><h3>{acceptedQuotes}</h3><small>{money(acceptedAmount)} aprobados</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-orange"><Calculator size={27} /></span><div><p>Importe cotizado</p><h3>{money(quotedAmount)}</h3><small>No cancelado</small></div></article>
      </div>

      <article className="billing-table-card quotes-card">
        <div className="billing-table-toolbar">
          <label className="clients-table-search"><Search size={19} /><input onChange={(event) => setQuery(event.target.value)} placeholder="Buscar folio, cliente o correo..." value={query} /></label>
          <label className="clients-filter-field">
            Estado
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option>Todos</option>
              {Object.values(statusLabels).map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <button className={`clients-filter-button ${showFilters ? "is-active" : ""}`} onClick={() => setShowFilters((current) => !current)} type="button"><Filter size={18} /> Filtros</button>
          <button className="clients-download-button" type="button"><Download size={18} /></button>
        </div>
        {showFilters && (
          <div className="quotes-advanced-filters">
            <label>
              Vigencia desde
              <input onChange={(event) => setValidFromFilter(event.target.value)} type="date" value={validFromFilter} />
            </label>
            <label>
              Vigencia hasta
              <input onChange={(event) => setValidToFilter(event.target.value)} type="date" value={validToFilter} />
            </label>
            <label>
              Total mínimo
              <input min="0" onChange={(event) => setMinTotalFilter(event.target.value)} placeholder="$0.00" type="number" value={minTotalFilter} />
            </label>
            <label>
              Total máximo
              <input min="0" onChange={(event) => setMaxTotalFilter(event.target.value)} placeholder="$0.00" type="number" value={maxTotalFilter} />
            </label>
            <button
              className="quotes-clear-filters"
              onClick={() => {
                setValidFromFilter("");
                setValidToFilter("");
                setMinTotalFilter("");
                setMaxTotalFilter("");
                setStatusFilter("Todos");
              }}
              type="button"
            >
              Limpiar filtros
            </button>
          </div>
        )}
        <div className="clients-table-wrap quotes-table-wrap">
          <table className="billing-data-table quotes-data-table">
            <thead><tr><th>Folio</th><th>Cliente</th><th>Correo</th><th>Partidas</th><th>Subtotal</th><th>IVA</th><th>Total</th><th>Vigencia</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {paginatedQuotes.map((quote) => (
                <tr key={quote.id}>
                  <td><strong>{quote.folio}</strong></td>
                  <td>{quote.clientName}</td>
                  <td>{quote.clientEmail || "Sin correo"}</td>
                  <td>{quote.items.length}</td>
                  <td>{money(quote.subtotal, quote.currency)}</td>
                  <td>{money(quote.tax, quote.currency)}</td>
                  <td><strong>{money(quote.total, quote.currency)}</strong></td>
                  <td>{formatDate(quote.validUntil)}</td>
                  <td><span className={`billing-status is-${quote.status}`}>{statusLabels[quote.status]}</span></td>
                  <td>
                    <div className="quotes-row-actions">
                      <button aria-label={`Vista previa de ${quote.folio}`} className="quotes-row-action-button" onClick={() => openPdfPreview(quote)} type="button"><Eye size={17} /></button>
                      <button aria-label={`Descargar ${quote.folio}`} className="quotes-row-action-button" onClick={() => downloadPdf(quote)} type="button"><Download size={17} /></button>
                      <button aria-label={`Mas acciones de ${quote.folio}`} className="clients-row-action" onClick={(event) => toggleQuoteMenu(event, quote.id)} type="button"><MoreVertical size={20} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredQuotes.length === 0 && (
                <tr>
                  <td className="quotes-empty-row" colSpan={10}>No hay cotizaciones con ese criterio.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {openMenuQuote && menuPosition && (
          <div
            className="clients-action-menu quotes-floating-action-menu is-open"
            style={{ left: menuPosition.left, top: menuPosition.top }}
          >
            <button onClick={() => openEditForm(openMenuQuote)} type="button">Editar</button>
            <button onClick={() => openPdfPreview(openMenuQuote)} type="button"><Eye size={15} /> Vista previa</button>
            <button onClick={() => downloadPdf(openMenuQuote)} type="button"><Download size={15} /> Descargar PDF</button>
            <button onClick={() => sendQuote(openMenuQuote)} type="button"><Mail size={15} /> Enviar PDF</button>
            <button onClick={() => updateQuoteStatus(openMenuQuote, "sent")} type="button">Marcar enviada</button>
            <button onClick={() => updateQuoteStatus(openMenuQuote, "accepted")} type="button">Marcar aceptada</button>
            <button onClick={() => duplicateQuote(openMenuQuote)} type="button">Duplicar</button>
            <button onClick={() => updateQuoteStatus(openMenuQuote, "cancelled")} type="button">Cancelar</button>
          </div>
        )}
        <footer className="quotes-pagination">
          <span>Mostrando {displayStart} a {displayEnd} de {filteredQuotes.length} cotizaciones</span>
          <div className="quotes-pagination-controls">
            <button aria-label="Pagina anterior" disabled={activePage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} type="button">
              <ChevronLeft size={18} />
            </button>
            <strong>{activePage}</strong>
            <span>de {totalPages}</span>
            <button aria-label="Pagina siguiente" disabled={activePage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} type="button">
              <ChevronRight size={18} />
            </button>
            <select
              aria-label="Registros por pagina"
              onChange={(event) => setPageSize(Number(event.target.value))}
              value={pageSize}
            >
              <option value={20}>20 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
            </select>
          </div>
        </footer>
      </article>

      {previewPdfUrl && (
        <div className="quote-preview-modal" role="dialog" aria-modal="true" aria-label="Vista previa de cotización">
          <div className="quote-preview-backdrop" onClick={closePdfPreview} />
          <section className="quote-preview-panel">
            <header>
              <div>
                <strong>Vista previa</strong>
                <span>{previewTitle}</span>
              </div>
              <button onClick={closePdfPreview} type="button" aria-label="Cerrar vista previa"><X size={20} /></button>
            </header>
            <iframe src={previewPdfUrl} title="Vista previa de cotización" />
          </section>
        </div>
      )}
    </section>
  );
}
