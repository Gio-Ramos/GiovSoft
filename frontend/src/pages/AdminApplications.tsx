import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Copy,
  DollarSign,
  KeyRound,
  MoreVertical,
  PlugZap,
  RefreshCw,
  Save,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useCloseOnOutsideClick } from "../hooks/useCloseOnOutsideClick";
import { api } from "../lib/api";

type ApplicationStatus = "active" | "pending" | "paused" | "error";

interface BusinessLine {
  id: string;
  slug: string;
  name: string;
  color: string;
  status: string;
}

interface ConnectedApplication {
  id: string;
  name: string;
  domain: string;
  apiBaseUrl: string;
  businessLineId: string;
  status: ApplicationStatus;
  ssoEnabled: boolean;
  webhookSecret: string;
  apiKey: string;
  outboundWebhookUrl: string;
  loginRedirectUrl: string;
  lastSync: string;
  config?: Record<string, boolean | string>;
  metrics: {
    events: number;
    invoices: number;
    payments: number;
    revenue: number;
    sales: number;
    users: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface ApplicationForm {
  name: string;
  domain: string;
  apiBaseUrl: string;
  businessLineId: string;
  outboundWebhookUrl: string;
  loginRedirectUrl: string;
  status: ApplicationStatus;
  ssoEnabled: boolean;
  syncUsers: boolean;
  syncSales: boolean;
  syncInvoices: boolean;
  syncPayments: boolean;
}

const emptyForm: ApplicationForm = {
  apiBaseUrl: "",
  businessLineId: "",
  outboundWebhookUrl: "",
  domain: "",
  loginRedirectUrl: "",
  name: "",
  ssoEnabled: true,
  status: "pending",
  syncInvoices: true,
  syncPayments: true,
  syncSales: true,
  syncUsers: true,
};

const statusLabels: Record<ApplicationStatus, string> = {
  active: "Activa",
  pending: "Pendiente",
  paused: "Pausada",
  error: "Revisar",
};

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value || 0);
}

function formatDate(value: string) {
  if (!value) return "Sin eventos";
  return new Date(value).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

function webhookUrl(applicationId: string) {
  const baseUrl = api.defaults.baseURL || window.location.origin;
  return `${String(baseUrl).replace(/\/$/, "")}/api/webhooks/applications/${applicationId}`;
}

export default function AdminApplications() {
  const [applications, setApplications] = useState<ConnectedApplication[]>([]);
  const [businessLines, setBusinessLines] = useState<BusinessLine[]>([]);
  const [form, setForm] = useState<ApplicationForm>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [openMenu, setOpenMenu] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useCloseOnOutsideClick(Boolean(openMenu), () => setOpenMenu(""));

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    setLoading(true);
    setMessage("");

    try {
      const [response, linesResponse] = await Promise.all([
        api.get("/api/admin/applications"),
        api.get("/api/admin/business-lines"),
      ]);
      setApplications(response.data.applications || []);
      setBusinessLines(linesResponse.data.businessLines || []);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "No se pudieron cargar las aplicaciones.");
    } finally {
      setLoading(false);
    }
  }

  const metrics = useMemo(() => {
    return applications.reduce(
      (totals, application) => ({
        active: totals.active + (application.status === "active" ? 1 : 0),
        events: totals.events + Number(application.metrics?.events || 0),
        invoices: totals.invoices + Number(application.metrics?.invoices || 0),
        revenue: totals.revenue + Number(application.metrics?.revenue || 0),
        users: totals.users + Number(application.metrics?.users || 0),
      }),
      { active: 0, events: 0, invoices: 0, revenue: 0, users: 0 },
    );
  }, [applications]);

  function openNewApplication() {
    setEditingId("");
    setForm(emptyForm);
    setShowForm(true);
    setMessage("");
  }

  function openEditApplication(application: ConnectedApplication) {
    setEditingId(application.id);
    setForm({
      apiBaseUrl: application.apiBaseUrl,
      businessLineId: application.businessLineId || "",
      outboundWebhookUrl: application.outboundWebhookUrl || "",
      domain: application.domain,
      loginRedirectUrl: application.loginRedirectUrl,
      name: application.name,
      ssoEnabled: application.ssoEnabled,
      status: application.status,
      syncInvoices: application.config?.syncInvoices !== false,
      syncPayments: application.config?.syncPayments !== false,
      syncSales: application.config?.syncSales !== false,
      syncUsers: application.config?.syncUsers !== false,
    } as ApplicationForm);
    setOpenMenu("");
    setShowForm(true);
    setMessage("");
  }

  async function saveApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const payload = {
        apiBaseUrl: form.apiBaseUrl,
        businessLineId: form.businessLineId,
        outboundWebhookUrl: form.outboundWebhookUrl,
        config: {
          syncInvoices: form.syncInvoices,
          syncPayments: form.syncPayments,
          syncSales: form.syncSales,
          syncUsers: form.syncUsers,
        },
        domain: form.domain,
        loginRedirectUrl: form.loginRedirectUrl,
        name: form.name,
        ssoEnabled: form.ssoEnabled,
        status: form.status,
      };
      const response = editingId
        ? await api.patch(`/api/admin/applications/${editingId}`, payload)
        : await api.post("/api/admin/applications", payload);
      const savedApplication = response.data.application as ConnectedApplication;

      setApplications((current) => {
        if (!editingId) {
          return [savedApplication, ...current];
        }

        return current.map((application) => (application.id === savedApplication.id ? savedApplication : application));
      });
      setShowForm(false);
      setEditingId("");
      setForm(emptyForm);
      setMessage(response.data.message || "Aplicación guardada.");
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "No se pudo guardar la aplicación.");
    }
  }

  async function updateStatus(application: ConnectedApplication, status: ApplicationStatus) {
    setOpenMenu("");
    try {
      const response = await api.patch(`/api/admin/applications/${application.id}`, { ...application, status });
      const updatedApplication = response.data.application as ConnectedApplication;
      setApplications((current) => current.map((item) => (item.id === updatedApplication.id ? updatedApplication : item)));
      setMessage(response.data.message || "Aplicación actualizada.");
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "No se pudo actualizar la aplicación.");
    }
  }

  async function regenerateApiKey(application: ConnectedApplication) {
    setOpenMenu("");
    try {
      const response = await api.post(`/api/admin/applications/${application.id}/api-key`);
      const apiKey = response.data.apiKey as string;
      setApplications((current) => current.map((item) => (item.id === application.id ? { ...item, apiKey } : item)));
      await navigator.clipboard.writeText(apiKey);
      setMessage("API key regenerada y copiada al portapapeles.");
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "No se pudo regenerar la API key.");
    }
  }

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
    setMessage("Dato copiado al portapapeles.");
  }

  return (
    <section className="applications-module-shell">
      <div className="clients-page-head">
        <div>
          <h2>Aplicaciones</h2>
          <p>Conecta sistemas GiovSoft, centraliza login y recibe analíticas por webhooks.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-primary-action" onClick={openNewApplication} type="button">
            <PlugZap size={20} /> Nueva aplicación
          </button>
        </div>
      </div>

      {message && <p className={message.includes("No se") || message.includes("requerid") ? "admin-form-error" : "admin-form-success"}>{message}</p>}

      <div className="clients-stats-grid">
        <article className="clients-stat-card"><span className="clients-stat-icon is-blue"><PlugZap size={27} /></span><div><p>Aplicaciones</p><h3>{applications.length}</h3><small>{loading ? "Cargando..." : `${metrics.active} activas`}</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-green"><DollarSign size={27} /></span><div><p>Ventas reportadas</p><h3>{money(metrics.revenue)}</h3><small>Por eventos recibidos</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-purple"><UsersRound size={27} /></span><div><p>Usuarios sincronizados</p><h3>{metrics.users}</h3><small>Alta o actualización</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-orange"><Activity size={27} /></span><div><p>Webhooks</p><h3>{metrics.events}</h3><small>{metrics.invoices} facturas reportadas</small></div></article>
      </div>

      <section className="applications-control-grid">
        <article className="applications-sso-card">
          <span><ShieldCheck size={24} /></span>
          <div>
            <h3>Login centralizado</h3>
            <p>GiovSoft será la fuente de identidad. Cada sistema conectado deberá validar usuarios contra nuestra API o aceptar tokens emitidos por el panel.</p>
          </div>
        </article>
        <article className="applications-sso-card">
          <span><RefreshCw size={24} /></span>
          <div>
            <h3>Webhooks operativos</h3>
            <p>El sistema externo enviará ventas, pagos, facturas y usuarios a GiovSoft en tiempo real usando el endpoint y secreto de cada aplicación.</p>
          </div>
        </article>
      </section>

      <article className="billing-table-card applications-card">
        {showForm && (
          <form className="applications-entry-form" onSubmit={saveApplication}>
            <label><span>Nombre <b>*</b></span><input onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. GiovSoft Commerce" value={form.name} /></label>
            <label><span>Dominio</span><input onChange={(event) => setForm((current) => ({ ...current, domain: event.target.value }))} placeholder="commerce.giovsoft.com" value={form.domain} /></label>
            <label><span>Línea de negocio</span><select onChange={(event) => setForm((current) => ({ ...current, businessLineId: event.target.value }))} value={form.businessLineId}><option value="">Sin asignar</option>{businessLines.filter((line) => line.status === "active").map((line) => <option key={line.id} value={line.id}>{line.name}</option>)}</select></label>
            <label><span>API Base URL <b>*</b></span><input onChange={(event) => setForm((current) => ({ ...current, apiBaseUrl: event.target.value }))} placeholder="https://api.sistema.com" value={form.apiBaseUrl} /></label>
            <label><span>Webhook saliente (pagos)</span><input onChange={(event) => setForm((current) => ({ ...current, outboundWebhookUrl: event.target.value }))} placeholder="https://api.sistema.com/api/payments/hub-webhook" value={form.outboundWebhookUrl} /></label>
            <label><span>URL retorno SSO</span><input onChange={(event) => setForm((current) => ({ ...current, loginRedirectUrl: event.target.value }))} placeholder="https://sistema.com/auth/giovsoft/callback" value={form.loginRedirectUrl} /></label>
            <label><span>Estado</span><select onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ApplicationStatus }))} value={form.status}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="billing-entry-check"><input checked={form.ssoEnabled} onChange={(event) => setForm((current) => ({ ...current, ssoEnabled: event.target.checked }))} type="checkbox" /><span>Login centralizado activo</span></label>
            <label className="billing-entry-check"><input checked={form.syncUsers} onChange={(event) => setForm((current) => ({ ...current, syncUsers: event.target.checked }))} type="checkbox" /><span>Usuarios</span></label>
            <label className="billing-entry-check"><input checked={form.syncSales} onChange={(event) => setForm((current) => ({ ...current, syncSales: event.target.checked }))} type="checkbox" /><span>Ventas</span></label>
            <label className="billing-entry-check"><input checked={form.syncInvoices} onChange={(event) => setForm((current) => ({ ...current, syncInvoices: event.target.checked }))} type="checkbox" /><span>Facturas</span></label>
            <label className="billing-entry-check"><input checked={form.syncPayments} onChange={(event) => setForm((current) => ({ ...current, syncPayments: event.target.checked }))} type="checkbox" /><span>Pagos</span></label>
            <div className="billing-entry-actions applications-entry-actions">
              <button onClick={() => setShowForm(false)} type="button">Cancelar</button>
              <button type="submit"><Save size={16} /> {editingId ? "Guardar cambios" : "Crear aplicación"}</button>
            </div>
          </form>
        )}

        <div className="clients-table-wrap">
          <table className="billing-data-table applications-data-table">
            <thead><tr><th>Aplicación</th><th>Línea</th><th>API</th><th>SSO</th><th>Ventas</th><th>Facturas</th><th>Usuarios</th><th>Último webhook</th><th>Estado</th><th>Conexión</th><th>Acciones</th></tr></thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id}>
                  <td><strong>{application.name}</strong><small>{application.domain || "Sin dominio"}</small></td>
                  <td>{(() => {
                    const line = businessLines.find((item) => item.id === application.businessLineId);
                    return line
                      ? <span className="business-line-chip" style={{ backgroundColor: `${line.color}22`, color: line.color }}>{line.name}</span>
                      : <small>Sin línea</small>;
                  })()}</td>
                  <td>{application.apiBaseUrl}</td>
                  <td>{application.ssoEnabled ? "Centralizado" : "Desactivado"}</td>
                  <td><strong>{money(application.metrics?.revenue || 0)}</strong></td>
                  <td>{application.metrics?.invoices || 0}</td>
                  <td>{application.metrics?.users || 0}</td>
                  <td>{formatDate(application.lastSync)}</td>
                  <td><span className={`billing-status is-${application.status}`}>{statusLabels[application.status]}</span></td>
                  <td>
                    <div className="application-connection-box">
                      <button onClick={() => copyText(webhookUrl(application.id))} type="button"><Copy size={14} /> Webhook</button>
                      <button onClick={() => copyText(application.webhookSecret)} type="button"><KeyRound size={14} /> Secreto</button>
                      <button onClick={() => copyText(application.apiKey)} type="button"><KeyRound size={14} /> API key</button>
                    </div>
                  </td>
                  <td>
                    <button className="clients-row-action" onClick={() => setOpenMenu(openMenu === application.id ? "" : application.id)} type="button"><MoreVertical size={20} /></button>
                    <div className={`clients-action-menu ${openMenu === application.id ? "is-open" : ""}`}>
                      <button onClick={() => openEditApplication(application)} type="button">Editar</button>
                      <button onClick={() => updateStatus(application, "active")} type="button"><CheckCircle2 size={15} /> Activar</button>
                      <button onClick={() => updateStatus(application, "paused")} type="button">Pausar</button>
                      <button onClick={() => updateStatus(application, "error")} type="button">Marcar revisión</button>
                      <button onClick={() => regenerateApiKey(application)} type="button">Regenerar API key</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && applications.length === 0 && (
                <tr>
                  <td className="quotes-empty-row" colSpan={11}>No hay aplicaciones conectadas todavía.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
