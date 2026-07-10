import type { FormEvent } from "react";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  KeyRound,
  MoreVertical,
  Plus,
  RotateCw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useCloseOnOutsideClick } from "../hooks/useCloseOnOutsideClick";

type SatTab = "cfdi" | "provider" | "series" | "emitter" | "validation" | "catalogs";

interface Client {
  id: string;
  businessName: string;
  legalName?: string;
  rfc?: string;
  taxRegime?: string;
  cfdiUse?: string;
  fiscalAddress?: { postalCode?: string };
}

interface ProviderConfig {
  name: string;
  environment: "demo" | "production";
  username: string;
  secretName: string;
  demoEndpoint: string;
  productionEndpoint: string;
  demoCancelEndpoint: string;
  productionCancelEndpoint: string;
  configured: boolean;
  passwordConfigured?: boolean;
  lastVerifiedAt?: string;
}

interface EmitterConfig {
  legalName: string;
  rfc: string;
  taxRegime: string;
  postalCode: string;
  certificateStatus: string;
}

interface SatSeries {
  id: string;
  company: string;
  serie: string;
  nextFolio: number;
  documentType: string;
  status: string;
}

interface CfdiRecord {
  id: string;
  clientName: string;
  folio: string;
  provider: string;
  environment: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  uuid?: string;
  pdfBase64?: string;
  qrBase64?: string;
  xmlBase64?: string;
  createdAt: string;
}

interface BillingSatState {
  provider: ProviderConfig;
  emitter: EmitterConfig;
  series: SatSeries[];
  cfdis: CfdiRecord[];
  catalogs: {
    status: string;
    lastSyncAt: string;
    items: string[];
  };
  clients: Client[];
  metrics: {
    total: number;
    issued: number;
    cancelled: number;
    pending: number;
  };
}

const emptyState: BillingSatState = {
  provider: {
    name: "CSFacturacion",
    environment: "demo",
    username: "",
    secretName: "csfacturacion-password",
    demoEndpoint: "https://csplug.csfacturacion.com/demo/cfdi",
    productionEndpoint: "https://csplug.csfacturacion.com/cfdi",
    demoCancelEndpoint: "https://csplug.csfacturacion.com/demo/cfdi/cancelar",
    productionCancelEndpoint: "https://csplug.csfacturacion.com/cfdi/cancelar",
    configured: false,
    passwordConfigured: false,
  },
  emitter: {
    legalName: "GiovSoft Technologies, S.A.S.",
    rfc: "",
    taxRegime: "",
    postalCode: "",
    certificateStatus: "pending",
  },
  series: [],
  cfdis: [],
  catalogs: {
    status: "pending",
    lastSyncAt: "",
    items: ["RegimenFiscal", "UsoCFDI", "FormaPago", "MetodoPago", "Moneda", "TipoComprobante"],
  },
  clients: [],
  metrics: { cancelled: 0, issued: 0, pending: 0, total: 0 },
};

function money(value: number) {
  return new Intl.NumberFormat("es-MX", { currency: "MXN", style: "currency" }).format(Number(value || 0));
}

function dateLabel(value?: string) {
  if (!value) return "Sin registro";
  return new Date(value).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Activa",
    cancelled: "Cancelado",
    draft: "Preparado",
    issued: "Timbrado",
    pending: "Pendiente",
    production: "Producción",
    synced: "Sincronizado",
  };

  return labels[status] || status || "Pendiente";
}

export default function AdminBilling() {
  const [state, setState] = useState<BillingSatState>(emptyState);
  const [activeTab, setActiveTab] = useState<SatTab>("cfdi");
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [providerForm, setProviderForm] = useState(emptyState.provider);
  const [emitterForm, setEmitterForm] = useState(emptyState.emitter);
  const [seriesForm, setSeriesForm] = useState({ company: "", documentType: "Ingreso", nextFolio: "1", serie: "A", status: "active" });
  const [validationClientId, setValidationClientId] = useState("");
  const [validationResult, setValidationResult] = useState("");
  const [cfdiForm, setCfdiForm] = useState({
    amount: "",
    cfdiUse: "G03",
    clientId: "",
    concept: "",
    folio: "",
    paymentForm: "03",
    paymentMethod: "PUE",
    productServiceKey: "81112100",
    quantity: "1",
    series: "A",
    unit: "Servicio",
    unitKey: "E48",
  });

  useCloseOnOutsideClick(Boolean(openMenu), () => setOpenMenu(""));

  const filteredCfdis = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return state.cfdis.filter((cfdi) => !normalized || `${cfdi.folio} ${cfdi.clientName} ${cfdi.uuid || ""}`.toLowerCase().includes(normalized));
  }, [query, state.cfdis]);

  async function loadSatState() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<BillingSatState>("/api/admin/billing/sat");
      setState(response.data);
      setProviderForm(response.data.provider);
      setEmitterForm(response.data.emitter);
    } catch (requestError) {
      setError("No se pudo cargar la configuración SAT.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSatState();
  }, []);

  function applyState(responseData: BillingSatState & { message?: string }) {
    setState(responseData);
    setProviderForm(responseData.provider);
    setEmitterForm(responseData.emitter);
    setMessage(responseData.message || "Cambios guardados.");
    setError("");
  }

  async function saveProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const response = await api.put<BillingSatState & { message: string }>("/api/admin/billing/sat/provider", providerForm);
      applyState(response.data);
    } catch {
      setError("No se pudo guardar el proveedor.");
    }
  }

  async function saveEmitter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const response = await api.put<BillingSatState & { message: string }>("/api/admin/billing/sat/emitter", emitterForm);
      applyState(response.data);
    } catch {
      setError("No se pudieron guardar los datos fiscales del emisor.");
    }
  }

  async function addSeries(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const response = await api.post<BillingSatState & { message: string }>("/api/admin/billing/sat/series", {
        ...seriesForm,
        nextFolio: Number(seriesForm.nextFolio || 1),
      });
      applyState(response.data);
      setSeriesForm({ company: "", documentType: "Ingreso", nextFolio: "1", serie: "A", status: "active" });
    } catch {
      setError("No se pudo agregar la serie.");
    }
  }

  async function validateClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const response = await api.post<{ message: string; valid: boolean }>("/api/admin/billing/sat/validate-client", { clientId: validationClientId });
      setValidationResult(response.data.message);
      setMessage(response.data.valid ? "Validación fiscal aprobada." : "");
      setError(response.data.valid ? "" : response.data.message);
    } catch {
      setError("No se pudo validar el cliente.");
    }
  }

  async function issueCfdi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const response = await api.post<BillingSatState & { message: string }>("/api/admin/billing/sat/issue", {
        ...cfdiForm,
        amount: Number(cfdiForm.amount || 0),
        quantity: Number(cfdiForm.quantity || 1),
      });
      applyState(response.data);
      setCfdiForm((current) => ({ ...current, amount: "", concept: "", folio: "" }));
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || "No se pudo emitir/preparar el CFDI.");
    }
  }

  async function cancelCfdi(cfdi: CfdiRecord) {
    try {
      const response = await api.post<BillingSatState & { message: string }>(`/api/admin/billing/sat/${cfdi.id}/cancel`, { motive: "02" });
      applyState(response.data);
      setOpenMenu("");
    } catch {
      setError("No se pudo cancelar el CFDI.");
    }
  }

  async function openCfdiDocument(cfdi: CfdiRecord, type: "pdf" | "qr" | "xml") {
    try {
      const response = await api.get(`/api/admin/billing/sat/${cfdi.id}/document/${type}`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.target = type === "pdf" ? "_blank" : "_self";
      link.download = `${cfdi.folio}.${type === "qr" ? "png" : type}`;
      link.click();
      URL.revokeObjectURL(url);
      setOpenMenu("");
    } catch {
      setError("No se pudo abrir el documento CFDI.");
    }
  }

  async function syncCatalogs() {
    try {
      const response = await api.post<BillingSatState & { message: string }>("/api/admin/billing/sat/catalogs/sync");
      applyState(response.data);
    } catch {
      setError("No se pudieron sincronizar los catálogos SAT.");
    }
  }

  const canIssue = Boolean(state.provider.username && state.provider.passwordConfigured && state.emitter.rfc && state.emitter.taxRegime && state.emitter.postalCode);

  return (
    <section className="billing-module-shell sat-billing-module">
      <div className="clients-page-head">
        <div>
          <h2>Facturación SAT</h2>
          <p>Administra CSFacturación, series, datos fiscales, validación de clientes y emisión CFDI.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-primary-action" onClick={() => setActiveTab("cfdi")} type="button">
            <FileCheck2 size={20} /> Emitir CFDI
          </button>
        </div>
      </div>

      {message && <p className="admin-form-success">{message}</p>}
      {error && <p className="admin-form-error">{error}</p>}
      {loading && <p className="admin-form-success">Cargando configuración SAT...</p>}

      <div className="clients-stats-grid">
        <article className="clients-stat-card"><span className="clients-stat-icon is-blue"><FileText size={27} /></span><div><p>CFDI registrados</p><h3>{state.metrics.total}</h3><small>XML/PDF/QR por proveedor</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-green"><BadgeCheck size={27} /></span><div><p>Timbrados</p><h3>{state.metrics.issued}</h3><small>Emisiones confirmadas</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-purple"><KeyRound size={27} /></span><div><p>Proveedor</p><h3>{state.provider.passwordConfigured ? "Listo" : "Sin secret"}</h3><small>{state.provider.environment === "production" ? "Producción" : "Demo"} · {state.provider.name}</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-orange"><RotateCw size={27} /></span><div><p>Catálogos SAT</p><h3>{statusLabel(state.catalogs.status)}</h3><small>{dateLabel(state.catalogs.lastSyncAt)}</small></div></article>
      </div>

      <article className="billing-table-card sat-workspace-card">
        <nav className="billing-tabs">
          <button className={activeTab === "cfdi" ? "is-active" : ""} onClick={() => setActiveTab("cfdi")} type="button">Emisión CFDI</button>
          <button className={activeTab === "provider" ? "is-active" : ""} onClick={() => setActiveTab("provider")} type="button">Proveedor</button>
          <button className={activeTab === "series" ? "is-active" : ""} onClick={() => setActiveTab("series")} type="button">Series</button>
          <button className={activeTab === "emitter" ? "is-active" : ""} onClick={() => setActiveTab("emitter")} type="button">Emisor</button>
          <button className={activeTab === "validation" ? "is-active" : ""} onClick={() => setActiveTab("validation")} type="button">Validación fiscal</button>
          <button className={activeTab === "catalogs" ? "is-active" : ""} onClick={() => setActiveTab("catalogs")} type="button">Catálogos SAT</button>
        </nav>

        {activeTab === "cfdi" && (
          <>
            <section className="sat-api-panel">
              <div>
                <h3>Emitir CFDI desde pagos o facturas</h3>
                <p>El backend construye el JSON de CSFacturación y guarda la respuesta XML/PDF/QR devuelta por el proveedor.</p>
              </div>
              <span className={`billing-status is-${canIssue ? "valid" : "pending"}`}>{canIssue ? "Listo para emitir" : "Configuración pendiente"}</span>
            </section>
            <form className="billing-entry-form sat-cfdi-form" onSubmit={issueCfdi}>
              <label><span>Cliente <b>*</b></span><select onChange={(event) => setCfdiForm((current) => ({ ...current, clientId: event.target.value }))} value={cfdiForm.clientId}><option value="">Seleccionar cliente</option>{state.clients.map((client) => <option key={client.id} value={client.id}>{client.legalName || client.businessName}</option>)}</select></label>
              <label><span>Serie</span><select onChange={(event) => setCfdiForm((current) => ({ ...current, series: event.target.value }))} value={cfdiForm.series}>{state.series.length ? state.series.map((serie) => <option key={serie.id} value={serie.serie}>{serie.serie} · {serie.company}</option>) : <option>A</option>}</select></label>
              <label><span>Folio</span><input onChange={(event) => setCfdiForm((current) => ({ ...current, folio: event.target.value }))} placeholder="Opcional" value={cfdiForm.folio} /></label>
              <label><span>Monto sin IVA <b>*</b></span><input min="0" onChange={(event) => setCfdiForm((current) => ({ ...current, amount: event.target.value }))} placeholder="14990" type="number" value={cfdiForm.amount} /></label>
              <label className="billing-entry-wide"><span>Concepto <b>*</b></span><input onChange={(event) => setCfdiForm((current) => ({ ...current, concept: event.target.value }))} placeholder="Ej. Desarrollo de sitio web corporativo" value={cfdiForm.concept} /></label>
              <label><span>Clave SAT</span><input onChange={(event) => setCfdiForm((current) => ({ ...current, productServiceKey: event.target.value }))} value={cfdiForm.productServiceKey} /></label>
              <label><span>Uso CFDI</span><input onChange={(event) => setCfdiForm((current) => ({ ...current, cfdiUse: event.target.value }))} value={cfdiForm.cfdiUse} /></label>
              <label><span>Forma pago</span><input onChange={(event) => setCfdiForm((current) => ({ ...current, paymentForm: event.target.value }))} value={cfdiForm.paymentForm} /></label>
              <label><span>Método pago</span><select onChange={(event) => setCfdiForm((current) => ({ ...current, paymentMethod: event.target.value }))} value={cfdiForm.paymentMethod}><option value="PUE">PUE</option><option value="PPD">PPD</option></select></label>
              <div className="billing-entry-actions"><button onClick={loadSatState} type="button">Actualizar</button><button type="submit"><FileCheck2 size={16} /> Emitir / preparar</button></div>
            </form>
            <div className="billing-table-toolbar">
              <label className="clients-table-search"><Search size={19} /><input onChange={(event) => setQuery(event.target.value)} placeholder="Buscar folio, cliente o UUID..." value={query} /></label>
              <button className="clients-filter-button" type="button"><SlidersHorizontal size={18} /> Filtros</button>
              <button className="clients-download-button" type="button"><Download size={18} /></button>
            </div>
            <div className="clients-table-wrap sat-table-wrap">
              <table className="billing-data-table sat-cfdi-table">
                <thead><tr><th>Folio</th><th>Cliente</th><th>Proveedor</th><th>Ambiente</th><th>Subtotal</th><th>IVA</th><th>Total</th><th>UUID</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead>
                <tbody>
                  {filteredCfdis.map((cfdi) => (
                    <tr key={cfdi.id}>
                      <td><strong>{cfdi.folio}</strong></td>
                      <td>{cfdi.clientName}</td>
                      <td>{cfdi.provider}</td>
                      <td>{statusLabel(cfdi.environment)}</td>
                      <td>{money(cfdi.subtotal)}</td>
                      <td>{money(cfdi.tax)}</td>
                      <td>{money(cfdi.total)}</td>
                      <td>{cfdi.uuid || "Pendiente"}</td>
                      <td><span className={`billing-status is-${cfdi.status}`}>{statusLabel(cfdi.status)}</span></td>
                      <td>{dateLabel(cfdi.createdAt)}</td>
                      <td>
                        <button className="clients-row-action" onClick={() => setOpenMenu(openMenu === cfdi.id ? "" : cfdi.id)} type="button"><MoreVertical size={20} /></button>
                        <div className={`clients-action-menu ${openMenu === cfdi.id ? "is-open" : ""}`}>
                          <button disabled={!cfdi.uuid} type="button">Consultar estado</button>
                          <button disabled={!cfdi.xmlBase64} onClick={() => openCfdiDocument(cfdi, "xml")} type="button">Descargar XML</button>
                          <button disabled={!cfdi.pdfBase64} onClick={() => openCfdiDocument(cfdi, "pdf")} type="button">Descargar PDF</button>
                          <button disabled={!cfdi.qrBase64} onClick={() => openCfdiDocument(cfdi, "qr")} type="button">Ver QR</button>
                          <button disabled={cfdi.status === "cancelled"} onClick={() => cancelCfdi(cfdi)} type="button"><XCircle size={15} /> Cancelar CFDI</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredCfdis.length && <tr><td colSpan={11}>No hay CFDI con ese criterio.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "provider" && (
          <form className="billing-entry-form sat-provider-form" onSubmit={saveProvider}>
            <label><span>Proveedor</span><input disabled value={providerForm.name} /></label>
            <label><span>Ambiente</span><select onChange={(event) => setProviderForm((current) => ({ ...current, environment: event.target.value as ProviderConfig["environment"] }))} value={providerForm.environment}><option value="demo">Demo</option><option value="production">Producción</option></select></label>
            <label><span>Usuario API</span><input onChange={(event) => setProviderForm((current) => ({ ...current, username: event.target.value }))} placeholder="Usuario CSFacturación" value={providerForm.username} /></label>
            <label><span>Secret Manager</span><input onChange={(event) => setProviderForm((current) => ({ ...current, secretName: event.target.value }))} placeholder="csfacturacion-password" value={providerForm.secretName} /></label>
            <label className="billing-entry-wide"><span>Endpoint demo</span><input onChange={(event) => setProviderForm((current) => ({ ...current, demoEndpoint: event.target.value }))} value={providerForm.demoEndpoint} /></label>
            <label className="billing-entry-wide"><span>Endpoint producción</span><input onChange={(event) => setProviderForm((current) => ({ ...current, productionEndpoint: event.target.value }))} value={providerForm.productionEndpoint} /></label>
            <div className="billing-entry-actions"><button onClick={loadSatState} type="button">Cancelar</button><button type="submit"><Save size={16} /> Guardar proveedor</button></div>
          </form>
        )}

        {activeTab === "series" && (
          <>
            <form className="billing-entry-form" onSubmit={addSeries}>
              <label><span>Empresa <b>*</b></span><input onChange={(event) => setSeriesForm((current) => ({ ...current, company: event.target.value }))} placeholder="GiovSoft Technologies" value={seriesForm.company} /></label>
              <label><span>Serie <b>*</b></span><input onChange={(event) => setSeriesForm((current) => ({ ...current, serie: event.target.value }))} value={seriesForm.serie} /></label>
              <label><span>Siguiente folio</span><input min="1" onChange={(event) => setSeriesForm((current) => ({ ...current, nextFolio: event.target.value }))} type="number" value={seriesForm.nextFolio} /></label>
              <label><span>Tipo</span><select onChange={(event) => setSeriesForm((current) => ({ ...current, documentType: event.target.value }))} value={seriesForm.documentType}><option>Ingreso</option><option>Egreso</option><option>Pago</option></select></label>
              <div className="billing-entry-actions"><button type="button">Limpiar</button><button type="submit"><Plus size={16} /> Agregar serie</button></div>
            </form>
            <div className="clients-table-wrap sat-table-wrap">
              <table className="billing-data-table sat-series-table">
                <thead><tr><th>Empresa</th><th>Serie</th><th>Siguiente folio</th><th>Tipo</th><th>Estado</th></tr></thead>
                <tbody>{state.series.map((serie) => <tr key={serie.id}><td>{serie.company}</td><td><strong>{serie.serie}</strong></td><td>{serie.nextFolio}</td><td>{serie.documentType}</td><td><span className={`billing-status is-${serie.status}`}>{statusLabel(serie.status)}</span></td></tr>)}{!state.series.length && <tr><td colSpan={5}>Aún no hay series registradas.</td></tr>}</tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "emitter" && (
          <form className="billing-entry-form" onSubmit={saveEmitter}>
            <label className="billing-entry-wide"><span>Razón social <b>*</b></span><input onChange={(event) => setEmitterForm((current) => ({ ...current, legalName: event.target.value }))} value={emitterForm.legalName} /></label>
            <label><span>RFC <b>*</b></span><input onChange={(event) => setEmitterForm((current) => ({ ...current, rfc: event.target.value.toUpperCase() }))} placeholder="RFC emisor" value={emitterForm.rfc} /></label>
            <label><span>Régimen fiscal <b>*</b></span><input onChange={(event) => setEmitterForm((current) => ({ ...current, taxRegime: event.target.value }))} placeholder="Ej. 626" value={emitterForm.taxRegime} /></label>
            <label><span>Código postal <b>*</b></span><input onChange={(event) => setEmitterForm((current) => ({ ...current, postalCode: event.target.value }))} placeholder="Ej. 44100" value={emitterForm.postalCode} /></label>
            <label><span>CSD</span><select onChange={(event) => setEmitterForm((current) => ({ ...current, certificateStatus: event.target.value }))} value={emitterForm.certificateStatus}><option value="pending">Pendiente</option><option value="active">Activo</option><option value="expired">Vencido</option></select></label>
            <div className="billing-entry-actions"><button onClick={loadSatState} type="button">Cancelar</button><button type="submit"><Save size={16} /> Guardar emisor</button></div>
          </form>
        )}

        {activeTab === "validation" && (
          <form className="billing-entry-form sat-validation-form" onSubmit={validateClient}>
            <label className="billing-entry-wide"><span>Cliente</span><select onChange={(event) => setValidationClientId(event.target.value)} value={validationClientId}><option value="">Seleccionar cliente</option>{state.clients.map((client) => <option key={client.id} value={client.id}>{client.legalName || client.businessName}</option>)}</select></label>
            <div className="sat-validation-summary">
              <ShieldCheck size={28} />
              <strong>Validación fiscal previa</strong>
              <p>Revisa RFC, razón social, régimen, uso CFDI y código postal antes de enviar a CSFacturación.</p>
              {validationResult && <span>{validationResult}</span>}
            </div>
            <div className="billing-entry-actions"><button onClick={() => setValidationResult("")} type="button">Limpiar</button><button type="submit"><CheckCircle2 size={16} /> Validar cliente</button></div>
          </form>
        )}

        {activeTab === "catalogs" && (
          <section className="sat-catalogs-panel">
            <div>
              <h3>Catálogos SAT sincronizados</h3>
              <p>Base para validar régimen fiscal, uso CFDI, forma de pago, método de pago, monedas y tipos de comprobante.</p>
              <small>Última sincronización: {dateLabel(state.catalogs.lastSyncAt)}</small>
            </div>
            <button className="clients-primary-action" onClick={syncCatalogs} type="button"><RotateCw size={18} /> Sincronizar catálogos</button>
            <div className="sat-catalog-list">
              {state.catalogs.items.map((item) => <span key={item}><Building2 size={16} /> {item}</span>)}
            </div>
          </section>
        )}
      </article>
    </section>
  );
}
