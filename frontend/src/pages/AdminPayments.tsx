import type { FormEvent } from "react";
import {
  Copy,
  CreditCard,
  KeyRound,
  Landmark,
  PlugZap,
  Plus,
  Save,
  Webhook,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface ConnectedApplication {
  id: string;
  name: string;
  domain?: string;
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
  metrics: {
    total: number;
    systems: number;
    payments: number;
    subscriptions: number;
    revenue: number;
  };
}

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
    supportedEvents: [],
  },
  applications: [],
  metrics: { payments: 0, revenue: 0, subscriptions: 0, systems: 0, total: 0 },
};

type PaymentTab = "engine" | "provider" | "systems" | "webhooks";

function money(value: number) {
  return new Intl.NumberFormat("es-MX", { currency: "MXN", style: "currency" }).format(Number(value || 0));
}

function dateLabel(value?: string) {
  if (!value) return "Sin registro";
  return new Date(value).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Activo",
    pending: "Pendiente",
    production: "Producción",
    synced: "Sincronizado",
    test: "Pruebas",
  };

  return labels[status] || status || "Pendiente";
}

export default function AdminPayments() {
  const [state, setState] = useState<PaymentEngineState>(emptyPaymentState);
  const [activeTab, setActiveTab] = useState<PaymentTab>("engine");
  const [providerForm, setProviderForm] = useState(emptyPaymentState.provider);
  const [systemForm, setSystemForm] = useState({
    applicationId: "",
    connectedAccountId: "",
    connectMode: "express",
    flow: "checkout-subscriptions-connect",
    name: "",
    webhookMode: "stripe-and-internal",
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadPaymentState() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<PaymentEngineState>("/api/admin/payments/engine");
      setState(response.data);
      setProviderForm(response.data.provider);
    } catch {
      setError("No se pudo cargar el motor de pagos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPaymentState();
  }, []);

  function applyState(responseData: PaymentEngineState & { message?: string }) {
    setState({ ...emptyPaymentState, ...responseData });
    setProviderForm(responseData.provider);
    setMessage(responseData.message || "Cambios guardados.");
    setError("");
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
      const response = await api.put<PaymentEngineState & { message: string }>("/api/admin/payments/engine/provider", providerForm);
      applyState(response.data);
    } catch {
      setError("No se pudo guardar Stripe Connect.");
    }
  }

  async function connectSystem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const response = await api.post<PaymentEngineState & { message: string }>("/api/admin/payments/engine/systems", systemForm);
      applyState(response.data);
      setSystemForm({
        applicationId: "",
        connectedAccountId: "",
        connectMode: "express",
        flow: "checkout-subscriptions-connect",
        name: "",
        webhookMode: "stripe-and-internal",
      });
    } catch {
      setError("No se pudo conectar el sistema al motor de pagos.");
    }
  }

  return (
    <section className="billing-module-shell sat-billing-module payments-module">
      <div className="clients-page-head">
        <div>
          <h2>Payments</h2>
          <p>Motor de pagos separado para Stripe Connect, suscripciones, conciliación y webhooks consumibles por otros sistemas GiovSoft.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-secondary-action" onClick={() => setActiveTab("webhooks")} type="button">
            <Webhook size={20} /> Webhooks
          </button>
          <button className="clients-primary-action" onClick={() => setActiveTab("systems")} type="button">
            <Plus size={20} /> Conectar sistema
          </button>
        </div>
      </div>

      {message && <p className="admin-form-success">{message}</p>}
      {error && <p className="admin-form-error">{error}</p>}
      {loading && <p className="admin-form-success">Cargando motor de pagos...</p>}

      <div className="clients-stats-grid">
        <article className="clients-stat-card"><span className="clients-stat-icon is-blue"><CreditCard size={27} /></span><div><p>Pagos recibidos</p><h3>{state.metrics.payments}</h3><small>{money(state.metrics.revenue)} conciliado</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-purple"><PlugZap size={27} /></span><div><p>Sistemas conectados</p><h3>{state.metrics.systems}</h3><small>Stripe Connect + webhooks</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-green"><Landmark size={27} /></span><div><p>Suscripciones</p><h3>{state.metrics.subscriptions}</h3><small>Pagos recurrentes</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-orange"><Webhook size={27} /></span><div><p>Eventos</p><h3>{state.webhookEvents.length}</h3><small>Entradas normalizadas</small></div></article>
      </div>

      <article className="billing-table-card sat-workspace-card">
        <nav className="billing-tabs">
          <button className={activeTab === "engine" ? "is-active" : ""} onClick={() => setActiveTab("engine")} type="button">Motor</button>
          <button className={activeTab === "provider" ? "is-active" : ""} onClick={() => setActiveTab("provider")} type="button">Stripe Connect</button>
          <button className={activeTab === "systems" ? "is-active" : ""} onClick={() => setActiveTab("systems")} type="button">Sistemas</button>
          <button className={activeTab === "webhooks" ? "is-active" : ""} onClick={() => setActiveTab("webhooks")} type="button">Webhooks</button>
        </nav>

        {activeTab === "engine" && (
          <section className="sat-engine-panel payment-engine-panel">
            <div className="sat-engine-hero">
              <div>
                <span className="sat-engine-kicker">Motor interno de pagos</span>
                <h3>{state.engine.name}</h3>
                <p>
                  Capa propia para diseñar flujos de cobro, conectar cuentas Stripe, recibir eventos,
                  conciliar ingresos y notificar al motor de facturación cuando un CFDI sea requerido.
                </p>
              </div>
              <span className="billing-status is-valid">v{state.engine.version} · {state.engine.mode}</span>
            </div>
            <div className="sat-engine-grid">
              {state.engine.capabilities.map((capability) => (
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

        {activeTab === "provider" && (
          <form className="billing-entry-form sat-provider-form" onSubmit={saveProvider}>
            <label><span>Proveedor</span><input disabled value={providerForm.name} /></label>
            <label><span>Ambiente</span><select onChange={(event) => setProviderForm((current) => ({ ...current, environment: event.target.value as PaymentEngineState["provider"]["environment"] }))} value={providerForm.environment}><option value="test">Test</option><option value="live">Live</option></select></label>
            <label><span>Publishable key</span><input onChange={(event) => setProviderForm((current) => ({ ...current, publishableKey: event.target.value }))} placeholder="pk_test_..." value={providerForm.publishableKey} /></label>
            <label><span>Modo Connect</span><select onChange={(event) => setProviderForm((current) => ({ ...current, connectMode: event.target.value }))} value={providerForm.connectMode}><option value="express">Express</option><option value="standard">Standard</option><option value="custom">Custom</option></select></label>
            <label><span>Secret API</span><input onChange={(event) => setProviderForm((current) => ({ ...current, secretName: event.target.value }))} placeholder="stripe-secret-key" value={providerForm.secretName} /></label>
            <label><span>Secret webhook</span><input onChange={(event) => setProviderForm((current) => ({ ...current, webhookSecretName: event.target.value }))} placeholder="stripe-webhook-secret" value={providerForm.webhookSecretName} /></label>
            <div className="sat-validation-summary">
              <KeyRound size={28} />
              <strong>Secret Manager</strong>
              <p>Las llaves privadas se leen desde el backend. El navegador solo conserva la configuración visible.</p>
              <span>API secret: {state.provider.secretConfigured ? "configurado" : "pendiente"} · Webhook secret: {state.provider.webhookSecretConfigured ? "configurado" : "pendiente"}</span>
            </div>
            <div className="billing-entry-actions"><button onClick={loadPaymentState} type="button">Cancelar</button><button type="submit"><Save size={16} /> Guardar Stripe</button></div>
          </form>
        )}

        {activeTab === "systems" && (
          <>
            <section className="sat-api-panel">
              <div>
                <h3>Sistemas conectados a Payments</h3>
                <p>Cada aplicación puede usar su cuenta Stripe Connect, webhooks internos y flujos propios de cobro.</p>
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
              <label><span>Nombre visible</span><input onChange={(event) => setSystemForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Academy, Tienda, CRM" value={systemForm.name} /></label>
              <label><span>Cuenta conectada</span><input onChange={(event) => setSystemForm((current) => ({ ...current, connectedAccountId: event.target.value }))} placeholder="acct_..." value={systemForm.connectedAccountId} /></label>
              <label><span>Flujo</span><select onChange={(event) => setSystemForm((current) => ({ ...current, flow: event.target.value }))} value={systemForm.flow}><option value="checkout-subscriptions-connect">Checkout + suscripciones + Connect</option><option value="payment-intents">PaymentIntents</option><option value="subscriptions">Suscripciones</option><option value="terminal-or-external">Pagos externos conciliados</option></select></label>
              <label><span>Modo Connect</span><select onChange={(event) => setSystemForm((current) => ({ ...current, connectMode: event.target.value }))} value={systemForm.connectMode}><option value="express">Express</option><option value="standard">Standard</option><option value="custom">Custom</option></select></label>
              <label><span>Webhook</span><select onChange={(event) => setSystemForm((current) => ({ ...current, webhookMode: event.target.value }))} value={systemForm.webhookMode}><option value="stripe-and-internal">Stripe + interno</option><option value="stripe-only">Solo Stripe</option><option value="internal-only">Solo interno</option></select></label>
              <div className="billing-entry-actions">
                <button onClick={() => setSystemForm({ applicationId: "", connectedAccountId: "", connectMode: "express", flow: "checkout-subscriptions-connect", name: "", webhookMode: "stripe-and-internal" })} type="button">Limpiar</button>
                <button type="submit"><Plus size={16} /> Conectar pagos</button>
              </div>
            </form>
            <div className="clients-table-wrap sat-table-wrap">
              <table className="billing-data-table sat-systems-table">
                <thead><tr><th>Sistema</th><th>Connect</th><th>Flujo</th><th>Pagos</th><th>Suscripciones</th><th>Ingresos</th><th>Webhook</th><th>Estado</th></tr></thead>
                <tbody>
                  {state.connectedSystems.map((system) => (
                    <tr key={system.id}>
                      <td><strong>{system.name}</strong><small>{system.domain || "Sin dominio"}</small></td>
                      <td>{system.connectedAccountId || system.connectMode || "Pendiente"}</td>
                      <td>{system.flow}</td>
                      <td>{system.metrics?.payments || 0}</td>
                      <td>{system.metrics?.subscriptions || 0}</td>
                      <td>{money(system.metrics?.revenue || 0)}</td>
                      <td><button className="sat-copy-button" onClick={() => copyText(paymentWebhookUrl(system.id))} type="button"><Copy size={15} /> Copiar</button></td>
                      <td><span className={`billing-status is-${system.status}`}>{statusLabel(system.status)}</span></td>
                    </tr>
                  ))}
                  {!state.connectedSystems.length && <tr><td colSpan={8}>Aún no hay sistemas conectados al motor de pagos.</td></tr>}
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
                <h3>Webhook interno</h3>
                <p>Los sistemas GiovSoft envían eventos con <strong>{state.webhookSchema.inboundHeader}</strong>.</p>
              </article>
              <article>
                <KeyRound size={22} />
                <h3>Webhook Stripe</h3>
                <p>Stripe firma eventos con <strong>{state.webhookSchema.stripeSignatureHeader}</strong>.</p>
              </article>
            </div>
            <div className="sat-webhook-events">
              <h3>Eventos soportados</h3>
              <div>{state.webhookSchema.supportedEvents.map((eventType) => <span key={eventType}>{eventType}</span>)}</div>
            </div>
            <pre className="sat-webhook-code">{`# Webhook interno GiovSoft
curl -X POST ${state.connectedSystems[0] ? paymentWebhookUrl(state.connectedSystems[0].id) : "https://api.giovsoft.com/api/webhooks/payments/{systemId}"} \\
  -H "Content-Type: application/json" \\
  -H "${state.webhookSchema.inboundHeader}: <secret-del-sistema>" \\
  -d '{"eventType":"payments.payment.received","amount":14990,"currency":"MXN","externalId":"PAY-0001"}'

# Webhook Stripe
${state.connectedSystems[0] ? stripeWebhookUrl(state.connectedSystems[0].id) : "https://api.giovsoft.com/api/webhooks/payments/stripe/{systemId}"}`}</pre>
            <div className="clients-table-wrap sat-table-wrap">
              <table className="billing-data-table sat-webhooks-table">
                <thead><tr><th>Evento</th><th>Origen</th><th>Sistema</th><th>Referencia</th><th>Cuenta</th><th>Monto</th><th>Recibido</th></tr></thead>
                <tbody>
                  {state.webhookEvents.map((event) => (
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
                  {!state.webhookEvents.length && <tr><td colSpan={7}>Aún no hay eventos recibidos por el motor de pagos.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </article>
    </section>
  );
}
