import type { FormEvent } from "react";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  FileCheck2,
  KeyRound,
  Landmark,
  MoreVertical,
  Plus,
  RotateCw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Webhook,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useCloseOnOutsideClick } from "../hooks/useCloseOnOutsideClick";

type SatTab =
  | "paymentsEngine"
  | "stripeProvider"
  | "paymentSystems"
  | "paymentWebhooks"
  | "engine"
  | "cfdi"
  | "systems"
  | "webhooks"
  | "provider"
  | "series"
  | "emitter"
  | "validation"
  | "catalogs";

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

interface ConnectedApplication {
  id: string;
  name: string;
  domain?: string;
}

interface BillingSystem {
  id: string;
  applicationId: string;
  name: string;
  domain?: string;
  flow: string;
  provider: string;
  presentationProfile: string;
  webhookMode: string;
  status: string;
  lastEventAt?: string;
  metrics?: {
    cfdiRequests?: number;
    events?: number;
    payments?: number;
    revenue?: number;
  };
}

interface BillingWebhookEvent {
  id: string;
  applicationId: string;
  systemId: string;
  systemName: string;
  eventType: string;
  amount: number;
  currency: string;
  externalId?: string;
  status: string;
  receivedAt: string;
}

interface PaymentSystem {
  id: string;
  applicationId: string;
  name: string;
  domain?: string;
  connectedAccountId?: string;
  flow: string;
  provider: string;
  connectMode: string;
  webhookMode: string;
  status: string;
  lastEventAt?: string;
  metrics?: {
    events?: number;
    payments?: number;
    revenue?: number;
    subscriptions?: number;
  };
}

interface PaymentWebhookEvent {
  id: string;
  applicationId: string;
  systemId: string;
  systemName: string;
  source: string;
  eventType: string;
  amount: number;
  currency: string;
  externalId?: string;
  connectedAccountId?: string;
  customerId?: string;
  status: string;
  receivedAt: string;
}

interface PaymentEngineState {
  engine: {
    name: string;
    version: string;
    mode: string;
    capabilities: string[];
  };
  provider: {
    name: string;
    environment: "test" | "live";
    publishableKey: string;
    secretName: string;
    webhookSecretName: string;
    connectMode: string;
    configured: boolean;
    secretConfigured?: boolean;
    webhookSecretConfigured?: boolean;
    lastVerifiedAt?: string;
  };
  connectedSystems: PaymentSystem[];
  webhookEvents: PaymentWebhookEvent[];
  payments: unknown[];
  subscriptions: unknown[];
  payouts: unknown[];
  webhookSchema: {
    inboundHeader: string;
    stripeSignatureHeader: string;
    supportedEvents: string[];
  };
  applications: ConnectedApplication[];
  clients: Client[];
  metrics: {
    total: number;
    systems: number;
    payments: number;
    subscriptions: number;
    revenue: number;
  };
}

interface BillingSatState {
  engine: {
    name: string;
    version: string;
    mode: string;
    capabilities: string[];
  };
  provider: ProviderConfig;
  emitter: EmitterConfig;
  series: SatSeries[];
  cfdis: CfdiRecord[];
  connectedSystems: BillingSystem[];
  webhookEvents: BillingWebhookEvent[];
  webhookSchema: {
    inboundHeader: string;
    outboundSignatureHeader: string;
    supportedEvents: string[];
  };
  applications: ConnectedApplication[];
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
    systems: number;
  };
}

const emptyState: BillingSatState = {
  engine: {
    name: "GiovSoft SAT Billing Engine",
    version: "1.0",
    mode: "centralized",
    capabilities: [
      "Emisión CFDI desde pagos y facturas internas",
      "Adaptador CSFacturación para timbrado y cancelación",
      "Presentación propia de XML, PDF y QR",
      "Validación fiscal previa del receptor",
      "Catálogos SAT sincronizados",
    ],
  },
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
  connectedSystems: [],
  webhookEvents: [],
  webhookSchema: {
    inboundHeader: "x-giovsoft-billing-secret",
    outboundSignatureHeader: "x-giovsoft-signature",
    supportedEvents: [
      "billing.invoice.requested",
      "billing.payment.received",
      "billing.subscription.renewed",
      "billing.cfdi.requested",
      "billing.cfdi.cancel.requested",
    ],
  },
  applications: [],
  catalogs: {
    status: "pending",
    lastSyncAt: "",
    items: ["RegimenFiscal", "UsoCFDI", "FormaPago", "MetodoPago", "Moneda", "TipoComprobante"],
  },
  clients: [],
  metrics: { cancelled: 0, issued: 0, pending: 0, systems: 0, total: 0 },
};

const emptyPaymentState: PaymentEngineState = {
  engine: {
    name: "GiovSoft Payment Engine",
    version: "1.0",
    mode: "stripe-connect",
    capabilities: [
      "Stripe Connect para cuentas conectadas por sistema",
      "PaymentIntents, Checkout y Stripe.js",
      "Pagos recurrentes, suscripciones y conciliación",
      "Webhooks propios para sistemas internos",
      "Eventos Stripe normalizados para facturación",
    ],
  },
  provider: {
    name: "Stripe Connect",
    environment: "test",
    publishableKey: "",
    secretName: "stripe-secret-key",
    webhookSecretName: "stripe-webhook-secret",
    connectMode: "express",
    configured: false,
    secretConfigured: false,
    webhookSecretConfigured: false,
  },
  connectedSystems: [],
  webhookEvents: [],
  payments: [],
  subscriptions: [],
  payouts: [],
  webhookSchema: {
    inboundHeader: "x-giovsoft-payments-secret",
    stripeSignatureHeader: "stripe-signature",
    supportedEvents: [
      "payment_intent.succeeded",
      "payment_intent.payment_failed",
      "checkout.session.completed",
      "invoice.paid",
      "invoice.payment_failed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "account.updated",
      "payments.payment.received",
      "payments.subscription.renewed",
    ],
  },
  applications: [],
  clients: [],
  metrics: { payments: 0, revenue: 0, subscriptions: 0, systems: 0, total: 0 },
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

interface UninvoicedOrder {
  id: string;
  concept: string;
  plan: string;
  subtotal: number;
  amount: number;
  externalRef: string;
  paidAt: string;
}

export default function AdminBilling() {
  const [state, setState] = useState<BillingSatState>(emptyState);
  const [paymentState, setPaymentState] = useState<PaymentEngineState>(emptyPaymentState);
  const [activeTab, setActiveTab] = useState<SatTab>("cfdi");
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [providerForm, setProviderForm] = useState(emptyState.provider);
  const [emitterForm, setEmitterForm] = useState(emptyState.emitter);
  const [seriesForm, setSeriesForm] = useState({ company: "", documentType: "Ingreso", nextFolio: "1", serie: "A", status: "active" });
  const [systemForm, setSystemForm] = useState({
    applicationId: "",
    flow: "cfdi-on-demand",
    name: "",
    presentationProfile: "giovsoft-standard",
    webhookMode: "inbound-outbound",
  });
  const [paymentProviderForm, setPaymentProviderForm] = useState(emptyPaymentState.provider);
  const [paymentSystemForm, setPaymentSystemForm] = useState({
    applicationId: "",
    connectedAccountId: "",
    connectMode: "express",
    flow: "checkout-subscriptions-connect",
    name: "",
    webhookMode: "stripe-and-internal",
  });
  const [validationClientId, setValidationClientId] = useState("");
  const [validationResult, setValidationResult] = useState("");
  const [uninvoicedOrders, setUninvoicedOrders] = useState<UninvoicedOrder[]>([]);
  const [cfdiForm, setCfdiForm] = useState({
    amount: "",
    cfdiUse: "G03",
    clientId: "",
    orderId: "",
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
      const [satResponse, paymentResponse] = await Promise.all([
        api.get<BillingSatState>("/api/admin/billing/sat"),
        api.get<PaymentEngineState>("/api/admin/payments/engine"),
      ]);
      setState(satResponse.data);
      setProviderForm(satResponse.data.provider);
      setEmitterForm(satResponse.data.emitter);
      setPaymentState(paymentResponse.data);
      setPaymentProviderForm(paymentResponse.data.provider);
    } catch (requestError) {
      setError("No se pudieron cargar los motores financieros.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSatState();
  }, []);

  useEffect(() => {
    api
      .get("/api/admin/orders", { params: { status: "paid", uninvoiced: "1", limit: 20 } })
      .then((response) => setUninvoicedOrders(response.data.orders || []))
      .catch(() => setUninvoicedOrders([]));
  }, []);

  function applyState(responseData: BillingSatState & { message?: string }) {
    setState(responseData);
    setProviderForm(responseData.provider);
    setEmitterForm(responseData.emitter);
    setMessage(responseData.message || "Cambios guardados.");
    setError("");
  }

  function applyPaymentState(responseData: PaymentEngineState & { message?: string }) {
    setPaymentState((current) => ({
      ...emptyPaymentState,
      ...current,
      ...responseData,
      applications: responseData.applications || current.applications,
      clients: responseData.clients || current.clients,
      metrics: responseData.metrics || current.metrics,
      provider: responseData.provider || current.provider,
    }));
    setPaymentProviderForm(responseData.provider || paymentProviderForm);
    setMessage(responseData.message || "Cambios guardados.");
    setError("");
  }

  function billingWebhookUrl(systemId: string) {
    const baseUrl = String(api.defaults.baseURL || window.location.origin).replace(/\/$/, "");
    return `${baseUrl}/api/webhooks/billing/${systemId}`;
  }

  function paymentWebhookUrl(systemId: string) {
    const baseUrl = String(api.defaults.baseURL || window.location.origin).replace(/\/$/, "");
    return `${baseUrl}/api/webhooks/payments/${systemId}`;
  }

  function stripeWebhookUrl(systemId: string) {
    const baseUrl = String(api.defaults.baseURL || window.location.origin).replace(/\/$/, "");
    return `${baseUrl}/api/webhooks/payments/stripe/${systemId}`;
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Dato copiado al portapapeles.");
      setError("");
    } catch {
      setError("No se pudo copiar el dato.");
    }
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

  async function savePaymentProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const response = await api.put<PaymentEngineState & { message: string }>("/api/admin/payments/engine/provider", paymentProviderForm);
      applyPaymentState(response.data);
    } catch {
      setError("No se pudo guardar el proveedor de pagos.");
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

  async function connectSystem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const response = await api.post<BillingSatState & { message: string }>("/api/admin/billing/sat/systems", systemForm);
      applyState(response.data);
      setSystemForm({
        applicationId: "",
        flow: "cfdi-on-demand",
        name: "",
        presentationProfile: "giovsoft-standard",
        webhookMode: "inbound-outbound",
      });
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || "No se pudo conectar el sistema.");
    }
  }

  async function connectPaymentSystem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const response = await api.post<PaymentEngineState & { message: string }>("/api/admin/payments/engine/systems", paymentSystemForm);
      applyPaymentState(response.data);
      setPaymentSystemForm({
        applicationId: "",
        connectedAccountId: "",
        connectMode: "express",
        flow: "checkout-subscriptions-connect",
        name: "",
        webhookMode: "stripe-and-internal",
      });
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || "No se pudo conectar el sistema de pagos.");
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
      if (cfdiForm.orderId) {
        setUninvoicedOrders((current) => current.filter((order) => order.id !== cfdiForm.orderId));
      }
      setCfdiForm((current) => ({ ...current, amount: "", concept: "", folio: "", orderId: "" }));
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
          <h2>Facturación</h2>
          <p>Centraliza lo vendido, revisa el historial fiscal y emite nuevos CFDI desde pagos o facturas internas.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-secondary-action" onClick={() => setActiveTab("validation")} type="button">
            <ShieldCheck size={20} /> Validar cliente
          </button>
          <button className="clients-primary-action" onClick={() => setActiveTab("cfdi")} type="button">
            <FileCheck2 size={20} /> Emitir CFDI
          </button>
        </div>
      </div>

      {message && <p className="admin-form-success">{message}</p>}
      {error && <p className="admin-form-error">{error}</p>}
      {loading && <p className="admin-form-success">Cargando facturación...</p>}

      <div className="clients-stats-grid">
        <article className="clients-stat-card"><span className="clients-stat-icon is-blue"><FileCheck2 size={27} /></span><div><p>CFDI registrados</p><h3>{state.metrics.total}</h3><small>Historial fiscal</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-green"><BadgeCheck size={27} /></span><div><p>Timbrados</p><h3>{state.metrics.issued}</h3><small>Emitidos correctamente</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-purple"><RotateCw size={27} /></span><div><p>Pendientes</p><h3>{state.metrics.pending}</h3><small>Por emitir o preparar</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-orange"><XCircle size={27} /></span><div><p>Cancelados</p><h3>{state.metrics.cancelled}</h3><small>CFDI sin efecto</small></div></article>
      </div>

      <article className="billing-table-card sat-workspace-card">
        <nav className="billing-tabs">
          <button className={activeTab === "cfdi" ? "is-active" : ""} onClick={() => setActiveTab("cfdi")} type="button">Emisión CFDI</button>
          <button className={activeTab === "validation" ? "is-active" : ""} onClick={() => setActiveTab("validation")} type="button">Validación fiscal</button>
        </nav>

        {activeTab === "paymentsEngine" && (
          <section className="sat-engine-panel payment-engine-panel">
            <div className="sat-engine-hero">
              <div>
                <span className="sat-engine-kicker">Motor separado de pagos</span>
                <h3>{paymentState.engine.name}</h3>
                <p>
                  Capa interna para cobrar con Stripe Connect, manejar suscripciones, recibir webhooks de Stripe
                  y enviar eventos normalizados a sistemas GiovSoft o al motor SAT cuando aplique facturación.
                </p>
              </div>
              <span className="billing-status is-valid">v{paymentState.engine.version} · {paymentState.engine.mode}</span>
            </div>
            <div className="sat-engine-grid">
              {paymentState.engine.capabilities.map((capability) => (
                <article key={capability}>
                  <CreditCard size={20} />
                  <strong>{capability}</strong>
                </article>
              ))}
            </div>
            <div className="sat-engine-flow payment-engine-flow">
              <span>Sistema GiovSoft</span>
              <span>Stripe.js / Checkout</span>
              <span>Stripe Connect</span>
              <span>Webhook pagos</span>
              <span>Conciliación / CFDI</span>
            </div>
          </section>
        )}

        {activeTab === "stripeProvider" && (
          <form className="billing-entry-form sat-provider-form" onSubmit={savePaymentProvider}>
            <label><span>Proveedor</span><input disabled value={paymentProviderForm.name} /></label>
            <label><span>Ambiente</span><select onChange={(event) => setPaymentProviderForm((current) => ({ ...current, environment: event.target.value as PaymentEngineState["provider"]["environment"] }))} value={paymentProviderForm.environment}><option value="test">Test</option><option value="live">Live</option></select></label>
            <label><span>Publishable key</span><input onChange={(event) => setPaymentProviderForm((current) => ({ ...current, publishableKey: event.target.value }))} placeholder="pk_test_..." value={paymentProviderForm.publishableKey} /></label>
            <label><span>Modo Connect</span><select onChange={(event) => setPaymentProviderForm((current) => ({ ...current, connectMode: event.target.value }))} value={paymentProviderForm.connectMode}><option value="express">Express</option><option value="standard">Standard</option><option value="custom">Custom</option></select></label>
            <label><span>Secret API</span><input onChange={(event) => setPaymentProviderForm((current) => ({ ...current, secretName: event.target.value }))} placeholder="stripe-secret-key" value={paymentProviderForm.secretName} /></label>
            <label><span>Secret webhook</span><input onChange={(event) => setPaymentProviderForm((current) => ({ ...current, webhookSecretName: event.target.value }))} placeholder="stripe-webhook-secret" value={paymentProviderForm.webhookSecretName} /></label>
            <div className="sat-validation-summary">
              <Landmark size={28} />
              <strong>Estado de secretos</strong>
              <p>La clave secreta y el webhook secret deben vivir en Secret Manager / variables del backend, no en el navegador.</p>
              <span>API secret: {paymentState.provider.secretConfigured ? "configurado" : "pendiente"} · Webhook secret: {paymentState.provider.webhookSecretConfigured ? "configurado" : "pendiente"}</span>
            </div>
            <div className="billing-entry-actions"><button onClick={loadSatState} type="button">Cancelar</button><button type="submit"><Save size={16} /> Guardar Stripe</button></div>
          </form>
        )}

        {activeTab === "paymentSystems" && (
          <>
            <section className="sat-api-panel">
              <div>
                <h3>Sistemas conectados a pagos</h3>
                <p>Cada aplicación puede enlazarse a Stripe Connect y enviar eventos propios al motor de pagos.</p>
              </div>
              <span className="billing-status is-active">{paymentState.connectedSystems.length} conectados</span>
            </section>
            <form className="billing-entry-form sat-system-form" onSubmit={connectPaymentSystem}>
              <label>
                <span>Aplicación <b>*</b></span>
                <select onChange={(event) => setPaymentSystemForm((current) => ({ ...current, applicationId: event.target.value }))} value={paymentSystemForm.applicationId}>
                  <option value="">Seleccionar aplicación</option>
                  {paymentState.applications.map((application) => (
                    <option key={application.id} value={application.id}>{application.name} {application.domain ? `· ${application.domain}` : ""}</option>
                  ))}
                </select>
              </label>
              <label><span>Nombre visible</span><input onChange={(event) => setPaymentSystemForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Academy, Tienda, CRM" value={paymentSystemForm.name} /></label>
              <label><span>Cuenta conectada</span><input onChange={(event) => setPaymentSystemForm((current) => ({ ...current, connectedAccountId: event.target.value }))} placeholder="acct_..." value={paymentSystemForm.connectedAccountId} /></label>
              <label><span>Flujo</span><select onChange={(event) => setPaymentSystemForm((current) => ({ ...current, flow: event.target.value }))} value={paymentSystemForm.flow}><option value="checkout-subscriptions-connect">Checkout + suscripciones + Connect</option><option value="payment-intents">PaymentIntents</option><option value="subscriptions">Suscripciones</option><option value="terminal-or-external">Pagos externos conciliados</option></select></label>
              <label><span>Modo Connect</span><select onChange={(event) => setPaymentSystemForm((current) => ({ ...current, connectMode: event.target.value }))} value={paymentSystemForm.connectMode}><option value="express">Express</option><option value="standard">Standard</option><option value="custom">Custom</option></select></label>
              <label><span>Webhook</span><select onChange={(event) => setPaymentSystemForm((current) => ({ ...current, webhookMode: event.target.value }))} value={paymentSystemForm.webhookMode}><option value="stripe-and-internal">Stripe + interno</option><option value="stripe-only">Solo Stripe</option><option value="internal-only">Solo interno</option></select></label>
              <div className="billing-entry-actions">
                <button onClick={() => setPaymentSystemForm({ applicationId: "", connectedAccountId: "", connectMode: "express", flow: "checkout-subscriptions-connect", name: "", webhookMode: "stripe-and-internal" })} type="button">Limpiar</button>
                <button type="submit"><Plus size={16} /> Conectar pagos</button>
              </div>
            </form>
            <div className="clients-table-wrap sat-table-wrap">
              <table className="billing-data-table sat-systems-table">
                <thead><tr><th>Sistema</th><th>Connect</th><th>Flujo</th><th>Pagos</th><th>Suscripciones</th><th>Ingresos</th><th>Webhook</th><th>Estado</th></tr></thead>
                <tbody>
                  {paymentState.connectedSystems.map((system) => (
                    <tr key={system.id}>
                      <td><strong>{system.name}</strong><small>{system.domain || "Sin dominio"}</small></td>
                      <td>{system.connectedAccountId || system.connectMode || "Pendiente"}</td>
                      <td>{system.flow}</td>
                      <td>{system.metrics?.payments || 0}</td>
                      <td>{system.metrics?.subscriptions || 0}</td>
                      <td>{money(system.metrics?.revenue || 0)}</td>
                      <td><button className="sat-copy-button" onClick={() => copyText(paymentWebhookUrl(system.id))} type="button"><Copy size={15} /> Interno</button></td>
                      <td><span className={`billing-status is-${system.status}`}>{statusLabel(system.status)}</span></td>
                    </tr>
                  ))}
                  {!paymentState.connectedSystems.length && <tr><td colSpan={8}>Aún no hay sistemas conectados al motor de pagos.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "paymentWebhooks" && (
          <section className="sat-webhooks-panel">
            <div className="sat-webhook-config">
              <article>
                <Webhook size={22} />
                <h3>Webhook interno</h3>
                <p>Los sistemas GiovSoft envían eventos al motor con <strong>{paymentState.webhookSchema.inboundHeader}</strong>.</p>
              </article>
              <article>
                <KeyRound size={22} />
                <h3>Webhook Stripe</h3>
                <p>Stripe firma eventos con <strong>{paymentState.webhookSchema.stripeSignatureHeader}</strong>; el backend valida el secreto si está configurado.</p>
              </article>
            </div>
            <div className="sat-webhook-events">
              <h3>Eventos soportados</h3>
              <div>{paymentState.webhookSchema.supportedEvents.map((eventType) => <span key={eventType}>{eventType}</span>)}</div>
            </div>
            <pre className="sat-webhook-code">{`# Webhook interno GiovSoft
curl -X POST ${paymentState.connectedSystems[0] ? paymentWebhookUrl(paymentState.connectedSystems[0].id) : "https://api.giovsoft.com/api/webhooks/payments/{systemId}"} \\
  -H "Content-Type: application/json" \\
  -H "${paymentState.webhookSchema.inboundHeader}: <secret-del-sistema>" \\
  -d '{"eventType":"payments.payment.received","amount":14990,"currency":"MXN","externalId":"PAY-0001"}'

# Webhook Stripe
${paymentState.connectedSystems[0] ? stripeWebhookUrl(paymentState.connectedSystems[0].id) : "https://api.giovsoft.com/api/webhooks/payments/stripe/{systemId}"}`}</pre>
            <div className="clients-table-wrap sat-table-wrap">
              <table className="billing-data-table sat-webhooks-table">
                <thead><tr><th>Evento</th><th>Origen</th><th>Sistema</th><th>Referencia</th><th>Cuenta</th><th>Monto</th><th>Recibido</th></tr></thead>
                <tbody>
                  {paymentState.webhookEvents.map((event) => (
                    <tr key={event.id}>
                      <td><strong>{event.eventType}</strong></td>
                      <td>{event.source}</td>
                      <td>{event.systemName}</td>
                      <td>{event.externalId || "Sin referencia"}</td>
                      <td>{event.connectedAccountId || "Global"}</td>
                      <td>{money(event.amount)} {event.currency}</td>
                      <td>{dateLabel(event.receivedAt)}</td>
                    </tr>
                  ))}
                  {!paymentState.webhookEvents.length && <tr><td colSpan={7}>Aún no hay eventos recibidos por el motor de pagos.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "engine" && (
          <section className="sat-engine-panel">
            <div className="sat-engine-hero">
              <div>
                <span className="sat-engine-kicker">Capa interna GiovSoft</span>
                <h3>{state.engine.name}</h3>
                <p>
                  Motor dedicado a timbrar, cancelar, consultar y guardar CFDI con CSFacturación. Consume pagos o facturas ya conciliadas,
                  valida datos fiscales y mantiene nuestra propia presentación de XML, PDF y QR.
                </p>
              </div>
              <span className="billing-status is-valid">v{state.engine.version} · {state.engine.mode}</span>
            </div>
            <div className="sat-engine-grid">
              {state.engine.capabilities.map((capability) => (
                <article key={capability}>
                  <ShieldCheck size={20} />
                  <strong>{capability}</strong>
                </article>
              ))}
            </div>
            <div className="sat-engine-flow">
              <span>Pago / factura</span>
              <span>Validación fiscal</span>
              <span>Motor SAT</span>
              <span>CSFacturación</span>
              <span>XML · PDF · QR · Estado</span>
            </div>
          </section>
        )}

        {activeTab === "systems" && (
          <>
            <section className="sat-api-panel">
              <div>
                <h3>Sistemas conectados al motor</h3>
                <p>Cada sistema usa su aplicación registrada y su secreto de webhook para enviar eventos de facturación al motor.</p>
              </div>
              <span className="billing-status is-active">{state.connectedSystems.length} conectados</span>
            </section>
            <form className="billing-entry-form sat-system-form" onSubmit={connectSystem}>
              <label>
                <span>Aplicación <b>*</b></span>
                <select onChange={(event) => setSystemForm((current) => ({ ...current, applicationId: event.target.value }))} value={systemForm.applicationId}>
                  <option value="">Seleccionar aplicación</option>
                  {state.applications.map((application) => (
                    <option key={application.id} value={application.id}>{application.name} {application.domain ? `· ${application.domain}` : ""}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Nombre visible</span>
                <input onChange={(event) => setSystemForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Academy, CRM, Tienda" value={systemForm.name} />
              </label>
              <label>
                <span>Flujo operativo</span>
                <select onChange={(event) => setSystemForm((current) => ({ ...current, flow: event.target.value }))} value={systemForm.flow}>
                  <option value="cfdi-on-demand">CFDI bajo demanda</option>
                  <option value="invoice-to-cfdi">Factura interna a CFDI</option>
                  <option value="payment-to-cfdi">Pago conciliado a CFDI</option>
                  <option value="cancel-and-status">Cancelación y consulta de estado</option>
                </select>
              </label>
              <label>
                <span>Presentación</span>
                <select onChange={(event) => setSystemForm((current) => ({ ...current, presentationProfile: event.target.value }))} value={systemForm.presentationProfile}>
                  <option value="giovsoft-standard">GiovSoft estándar</option>
                  <option value="academy">Academy</option>
                  <option value="white-label">Marca blanca</option>
                </select>
              </label>
              <label>
                <span>Modo webhook</span>
                <select onChange={(event) => setSystemForm((current) => ({ ...current, webhookMode: event.target.value }))} value={systemForm.webhookMode}>
                  <option value="inbound-outbound">Entrada y salida</option>
                  <option value="inbound">Solo entrada</option>
                  <option value="outbound">Solo salida</option>
                </select>
              </label>
              <div className="billing-entry-actions">
                <button onClick={() => setSystemForm({ applicationId: "", flow: "cfdi-on-demand", name: "", presentationProfile: "giovsoft-standard", webhookMode: "inbound-outbound" })} type="button">Limpiar</button>
                <button type="submit"><Plus size={16} /> Conectar sistema</button>
              </div>
            </form>
            <div className="clients-table-wrap sat-table-wrap">
              <table className="billing-data-table sat-systems-table">
                <thead><tr><th>Sistema</th><th>Aplicación</th><th>Flujo</th><th>Proveedor</th><th>Eventos</th><th>Ingresos</th><th>Webhook</th><th>Estado</th></tr></thead>
                <tbody>
                  {state.connectedSystems.map((system) => (
                    <tr key={system.id}>
                      <td><strong>{system.name}</strong><small>{system.domain || "Sin dominio"}</small></td>
                      <td>{system.applicationId || "Manual"}</td>
                      <td>{system.flow}</td>
                      <td>{system.provider}</td>
                      <td>{system.metrics?.events || 0}</td>
                      <td>{money(system.metrics?.revenue || 0)}</td>
                      <td><button className="sat-copy-button" onClick={() => copyText(billingWebhookUrl(system.id))} type="button"><Copy size={15} /> Copiar URL</button></td>
                      <td><span className={`billing-status is-${system.status}`}>{statusLabel(system.status)}</span></td>
                    </tr>
                  ))}
                  {!state.connectedSystems.length && <tr><td colSpan={8}>Aún no hay sistemas conectados al motor.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "webhooks" && (
          <section className="sat-webhooks-panel">
            <div className="sat-webhook-config">
              <article>
                <Webhook size={22} />
                <h3>Webhook de entrada</h3>
                <p>Los sistemas internos envían eventos al motor usando el header <strong>{state.webhookSchema.inboundHeader}</strong>.</p>
              </article>
              <article>
                <KeyRound size={22} />
                <h3>Firma de salida</h3>
                <p>Las respuestas o notificaciones del motor deben firmarse con <strong>{state.webhookSchema.outboundSignatureHeader}</strong>.</p>
              </article>
            </div>
            <div className="sat-webhook-events">
              <h3>Eventos soportados</h3>
              <div>{state.webhookSchema.supportedEvents.map((eventType) => <span key={eventType}>{eventType}</span>)}</div>
            </div>
            <pre className="sat-webhook-code">{`curl -X POST ${state.connectedSystems[0] ? billingWebhookUrl(state.connectedSystems[0].id) : "https://api.giovsoft.com/api/webhooks/billing/{systemId}"} \\
  -H "Content-Type: application/json" \\
  -H "${state.webhookSchema.inboundHeader}: <secret-del-sistema>" \\
  -d '{"eventType":"billing.payment.received","amount":14990,"currency":"MXN","externalId":"PAY-0001"}'`}</pre>
            <div className="clients-table-wrap sat-table-wrap">
              <table className="billing-data-table sat-webhooks-table">
                <thead><tr><th>Evento</th><th>Sistema</th><th>Referencia</th><th>Monto</th><th>Estado</th><th>Recibido</th></tr></thead>
                <tbody>
                  {state.webhookEvents.map((event) => (
                    <tr key={event.id}>
                      <td><strong>{event.eventType}</strong></td>
                      <td>{event.systemName}</td>
                      <td>{event.externalId || "Sin referencia"}</td>
                      <td>{money(event.amount)} {event.currency}</td>
                      <td><span className={`billing-status is-${event.status}`}>{statusLabel(event.status)}</span></td>
                      <td>{dateLabel(event.receivedAt)}</td>
                    </tr>
                  ))}
                  {!state.webhookEvents.length && <tr><td colSpan={6}>Aún no hay eventos recibidos por el motor.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "cfdi" && (
          <>
            <section className="sat-api-panel">
              <div>
                <h3>Emitir CFDI desde pagos o facturas</h3>
                <p>El backend construye el JSON de CSFacturación y guarda la respuesta XML/PDF/QR devuelta por el proveedor.</p>
              </div>
              <span className={`billing-status is-${canIssue ? "valid" : "pending"}`}>{canIssue ? "Listo para emitir" : "Configuración pendiente"}</span>
            </section>
            {uninvoicedOrders.length > 0 && (
              <section className="sat-uninvoiced-panel">
                <h4>Órdenes pagadas sin factura ({uninvoicedOrders.length})</h4>
                <div className="sat-uninvoiced-list">
                  {uninvoicedOrders.map((order) => (
                    <div className={`sat-uninvoiced-row ${cfdiForm.orderId === order.id ? "is-selected" : ""}`} key={order.id}>
                      <div>
                        <strong>{order.concept}</strong>
                        <small>{order.externalRef} · pagada {order.paidAt ? new Date(order.paidAt).toLocaleDateString("es-MX") : ""}</small>
                      </div>
                      <span>{new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(order.amount)}</span>
                      <button
                        onClick={() =>
                          setCfdiForm((current) => ({
                            ...current,
                            orderId: order.id,
                            concept: order.concept,
                            amount: String(order.subtotal),
                          }))
                        }
                        type="button"
                      >
                        Facturar
                      </button>
                    </div>
                  ))}
                </div>
                {cfdiForm.orderId && <p className="sat-uninvoiced-note">Se vinculará el CFDI a la orden seleccionada. Elige el cliente fiscal y emite.</p>}
              </section>
            )}
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
