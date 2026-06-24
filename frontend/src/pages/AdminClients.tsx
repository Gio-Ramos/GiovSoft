import {
  BellRing,
  BriefcaseBusiness,
  CalendarClock,
  CreditCard,
  FileSignature,
  FolderCheck,
  Globe2,
  HardDrive,
  Mail,
  PhoneCall,
  Plus,
  Save,
  Search,
  UserRound,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

interface ClientItem {
  id: string;
  businessName: string;
  legalName?: string;
  rfc?: string;
  status: string;
  segment?: string;
  website?: string;
  primaryService?: string;
  notes?: string;
  contacts: Record<string, string>[];
  services: Record<string, string>[];
  domains: Record<string, string>[];
  hosting: Record<string, string>[];
  payments: Record<string, string>[];
  reminders: Record<string, string>[];
  contracts: Record<string, string>[];
  documents: Record<string, string>[];
  activity: Record<string, string>[];
  createdAt: string;
  updatedAt: string;
}

interface ClientForm {
  businessName: string;
  legalName: string;
  rfc: string;
  status: string;
  segment: string;
  website: string;
  primaryService: string;
  notes: string;
  contacts: string;
  services: string;
  domains: string;
  hosting: string;
  payments: string;
  reminders: string;
  contracts: string;
  documents: string;
  activityNote: string;
}

const emptyForm: ClientForm = {
  businessName: "",
  legalName: "",
  rfc: "",
  status: "active",
  segment: "",
  website: "",
  primaryService: "",
  notes: "",
  contacts: "",
  services: "",
  domains: "",
  hosting: "",
  payments: "",
  reminders: "",
  contracts: "",
  documents: "",
  activityNote: "",
};

const statusOptions = [
  { value: "active", label: "Activo" },
  { value: "implementation", label: "Implementacion" },
  { value: "paused", label: "Pausado" },
  { value: "risk", label: "Riesgo" },
  { value: "inactive", label: "Inactivo" },
];

function parseLines(value: string, keys: string[]) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      return Object.fromEntries(keys.map((key, index) => [key, parts[index] || ""]));
    });
}

function formatLines(items: Record<string, string>[] = [], keys: string[]) {
  return items.map((item) => keys.map((key) => item[key] || "").join(" | ")).join("\n");
}

function clientToForm(client: ClientItem): ClientForm {
  return {
    businessName: client.businessName || "",
    legalName: client.legalName || "",
    rfc: client.rfc || "",
    status: client.status || "active",
    segment: client.segment || "",
    website: client.website || "",
    primaryService: client.primaryService || "",
    notes: client.notes || "",
    contacts: formatLines(client.contacts, ["name", "role", "email", "phone"]),
    services: formatLines(client.services, ["name", "status", "startDate", "renewalDate"]),
    domains: formatLines(client.domains, ["domain", "registrar", "expiresAt", "dnsStatus"]),
    hosting: formatLines(client.hosting, ["provider", "plan", "expiresAt", "access"]),
    payments: formatLines(client.payments, ["concept", "amount", "dueDate", "status"]),
    reminders: formatLines(client.reminders, ["date", "title", "owner"]),
    contracts: formatLines(client.contracts, ["name", "status", "signedAt", "url"]),
    documents: formatLines(client.documents, ["name", "type", "status", "url"]),
    activityNote: "",
  };
}

function formToPayload(form: ClientForm) {
  return {
    businessName: form.businessName,
    legalName: form.legalName,
    rfc: form.rfc,
    status: form.status,
    segment: form.segment,
    website: form.website,
    primaryService: form.primaryService,
    notes: form.notes,
    contacts: parseLines(form.contacts, ["name", "role", "email", "phone"]),
    services: parseLines(form.services, ["name", "status", "startDate", "renewalDate"]),
    domains: parseLines(form.domains, ["domain", "registrar", "expiresAt", "dnsStatus"]),
    hosting: parseLines(form.hosting, ["provider", "plan", "expiresAt", "access"]),
    payments: parseLines(form.payments, ["concept", "amount", "dueDate", "status"]),
    reminders: parseLines(form.reminders, ["date", "title", "owner"]),
    contracts: parseLines(form.contracts, ["name", "status", "signedAt", "url"]),
    documents: parseLines(form.documents, ["name", "type", "status", "url"]),
    activityNote: form.activityNote,
  };
}

function getStatusLabel(status: string) {
  return statusOptions.find((option) => option.value === status)?.label || "Activo";
}

function getPrimaryContact(client?: ClientItem) {
  return client?.contacts?.[0];
}

export default function AdminClients() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .get<{ clients: ClientItem[] }>("/api/admin/clients")
      .then((response) => {
        setClients(response.data.clients);
        const firstClient = response.data.clients[0];
        setSelectedId(firstClient?.id || "");
        setForm(firstClient ? clientToForm(firstClient) : emptyForm);
      })
      .catch(() => setMessage("No se pudieron cargar los clientes."))
      .finally(() => setLoading(false));
  }, []);

  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return clients;

    return clients.filter((client) => {
      return [client.businessName, client.legalName, client.rfc, client.primaryService, client.segment]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [clients, query]);

  const selectedClient = clients.find((client) => client.id === selectedId);
  const activeClients = clients.filter((client) => client.status !== "inactive").length;
  const pendingPayments = clients.reduce((count, client) => {
    return count + (client.payments || []).filter((payment) => payment.status !== "Pagado").length;
  }, 0);
  const openReminders = clients.reduce((count, client) => count + (client.reminders || []).length, 0);

  function updateForm<K extends keyof ClientForm>(key: K, value: ClientForm[K]) {
    setForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  function selectClient(client: ClientItem) {
    setSelectedId(client.id);
    setForm(clientToForm(client));
    setMessage("");
  }

  function startNewClient() {
    setSelectedId("");
    setForm(emptyForm);
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const payload = formToPayload(form);
      const response = selectedClient
        ? await api.patch<{ client: ClientItem }>(`/api/admin/clients/${selectedClient.id}`, payload)
        : await api.post<{ client: ClientItem }>("/api/admin/clients", payload);

      setClients((currentClients) => {
        const exists = currentClients.some((client) => client.id === response.data.client.id);
        if (exists) {
          return currentClients.map((client) => (client.id === response.data.client.id ? response.data.client : client));
        }
        return [response.data.client, ...currentClients];
      });
      setSelectedId(response.data.client.id);
      setForm(clientToForm(response.data.client));
      setMessage(selectedClient ? "Ficha de cliente actualizada." : "Cliente creado.");
    } catch {
      setMessage("No se pudo guardar el cliente.");
    } finally {
      setSaving(false);
    }
  }

  const primaryContact = getPrimaryContact(selectedClient);

  return (
    <div className="clients-crm-shell">
      <section className="requests-toolbar surface-card clients-hero">
        <div>
          <p className="eyebrow">Clientes</p>
          <h2>Centro de clientes</h2>
          <span>{clients.length} fichas con servicios, pagos, dominios y documentos.</span>
        </div>
        <button className="primary-button clients-new-button" onClick={startNewClient} type="button">
          <Plus size={17} />
          Nuevo cliente
        </button>
      </section>

      <section className="clients-metrics">
        <article className="metric-card">
          <p>Clientes activos</p>
          <div className="metric-row">
            <h3>{activeClients}</h3>
            <span className="metric-change is-positive">operando</span>
          </div>
        </article>
        <article className="metric-card">
          <p>Pagos por revisar</p>
          <div className="metric-row">
            <h3>{pendingPayments}</h3>
            <span className="metric-change is-neutral">abiertos</span>
          </div>
        </article>
        <article className="metric-card">
          <p>Recordatorios</p>
          <div className="metric-row">
            <h3>{openReminders}</h3>
            <span className="metric-change is-critical">pendientes</span>
          </div>
        </article>
      </section>

      <section className="clients-workspace">
        <aside className="clients-list surface-card">
          <div className="clients-search">
            <Search size={18} />
            <input
              aria-label="Buscar cliente"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar cliente, RFC o servicio"
              value={query}
            />
          </div>

          <div className="clients-list-body">
            {loading && <p className="admin-muted">Cargando clientes...</p>}

            {!loading && filteredClients.length === 0 && (
              <div className="empty-state">
                <UserRound size={22} />
                <p>No hay clientes con ese criterio.</p>
              </div>
            )}

            {filteredClients.map((client) => (
              <button
                className={`client-list-row ${client.id === selectedId ? "is-selected" : ""}`}
                key={client.id}
                onClick={() => selectClient(client)}
                type="button"
              >
                <span className="request-row-avatar">
                  <BriefcaseBusiness size={18} />
                </span>
                <span>
                  <strong>{client.businessName}</strong>
                  <small>{client.primaryService || "Servicio por definir"}</small>
                </span>
                <em>{getStatusLabel(client.status)}</em>
              </button>
            ))}
          </div>
        </aside>

        <article className="client-file surface-card">
          <div className="client-file-head">
            <div>
              <p className="eyebrow">{selectedClient ? "Ficha activa" : "Nueva ficha"}</p>
              <h3>{form.businessName || "Cliente sin nombre"}</h3>
              <span>{form.primaryService || "Define el servicio principal"}</span>
            </div>
            <span className={`request-stage is-${form.status}`}>{getStatusLabel(form.status)}</span>
          </div>

          {selectedClient && (
            <div className="client-quick-actions">
              {primaryContact?.email && (
                <a href={`mailto:${primaryContact.email}`}>
                  <Mail size={16} />
                  {primaryContact.email}
                </a>
              )}
              {primaryContact?.phone && (
                <a href={`https://wa.me/52${primaryContact.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                  <PhoneCall size={16} />
                  {primaryContact.phone}
                </a>
              )}
              {selectedClient.website && (
                <a href={selectedClient.website} target="_blank" rel="noreferrer">
                  <Globe2 size={16} />
                  Sitio web
                </a>
              )}
            </div>
          )}

          <form className="client-form" onSubmit={handleSubmit}>
            <div className="client-form-grid">
              <label>
                Nombre comercial
                <input value={form.businessName} onChange={(event) => updateForm("businessName", event.target.value)} />
              </label>
              <label>
                Razon social
                <input value={form.legalName} onChange={(event) => updateForm("legalName", event.target.value)} />
              </label>
              <label>
                RFC
                <input value={form.rfc} onChange={(event) => updateForm("rfc", event.target.value)} />
              </label>
              <label>
                Estado
                <select value={form.status} onChange={(event) => updateForm("status", event.target.value)}>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Segmento
                <input value={form.segment} onChange={(event) => updateForm("segment", event.target.value)} />
              </label>
              <label>
                Sitio web
                <input value={form.website} onChange={(event) => updateForm("website", event.target.value)} />
              </label>
              <label>
                Servicio principal
                <input value={form.primaryService} onChange={(event) => updateForm("primaryService", event.target.value)} />
              </label>
            </div>

            <label className="client-form-wide">
              Notas generales
              <textarea rows={3} value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} />
            </label>

            <div className="client-tracking-grid">
              <TrackingTextarea
                help="Nombre | Rol | Email | Telefono"
                icon={UserRound}
                label="Contactos"
                value={form.contacts}
                onChange={(value) => updateForm("contacts", value)}
              />
              <TrackingTextarea
                help="Servicio | Estado | Inicio | Renovacion"
                icon={BriefcaseBusiness}
                label="Servicios contratados"
                value={form.services}
                onChange={(value) => updateForm("services", value)}
              />
              <TrackingTextarea
                help="Dominio | Registrador | Vence | DNS"
                icon={Globe2}
                label="Dominios"
                value={form.domains}
                onChange={(value) => updateForm("domains", value)}
              />
              <TrackingTextarea
                help="Proveedor | Plan | Vence | Acceso"
                icon={HardDrive}
                label="Hosting"
                value={form.hosting}
                onChange={(value) => updateForm("hosting", value)}
              />
              <TrackingTextarea
                help="Concepto | Monto | Vence | Estado"
                icon={CreditCard}
                label="Pagos"
                value={form.payments}
                onChange={(value) => updateForm("payments", value)}
              />
              <TrackingTextarea
                help="Fecha | Asunto | Responsable"
                icon={BellRing}
                label="Recordatorios"
                value={form.reminders}
                onChange={(value) => updateForm("reminders", value)}
              />
              <TrackingTextarea
                help="Contrato | Estado | Firma | URL"
                icon={FileSignature}
                label="Contratos firmados"
                value={form.contracts}
                onChange={(value) => updateForm("contracts", value)}
              />
              <TrackingTextarea
                help="Documento | Tipo | Estado | URL"
                icon={FolderCheck}
                label="Documentos digitales"
                value={form.documents}
                onChange={(value) => updateForm("documents", value)}
              />
            </div>

            <label className="client-form-wide">
              Nota para historial
              <textarea
                rows={2}
                value={form.activityNote}
                onChange={(event) => updateForm("activityNote", event.target.value)}
                placeholder="Ej. Se agrego dominio nuevo, contrato firmado o pago registrado."
              />
            </label>

            {message && (
              <p className={`request-admin-message ${message.startsWith("No se") ? "is-error" : ""}`}>{message}</p>
            )}

            <button className="primary-button request-save-button" disabled={saving} type="submit">
              <Save size={16} />
              {saving ? "Guardando" : selectedClient ? "Guardar ficha" : "Crear cliente"}
            </button>
          </form>

          {selectedClient && (
            <section className="client-summary-panel">
              <ClientSection icon={CalendarClock} items={selectedClient.activity} label="Actividad" keys={["type", "detail", "createdAt"]} />
              <ClientSection icon={CreditCard} items={selectedClient.payments} label="Pagos" keys={["concept", "amount", "dueDate", "status"]} />
              <ClientSection icon={Globe2} items={selectedClient.domains} label="Dominios" keys={["domain", "registrar", "expiresAt", "dnsStatus"]} />
              <ClientSection icon={FolderCheck} items={selectedClient.documents} label="Documentos" keys={["name", "type", "status", "url"]} />
            </section>
          )}
        </article>
      </section>
    </div>
  );
}

function TrackingTextarea({
  help,
  icon: Icon,
  label,
  onChange,
  value,
}: {
  help: string;
  icon: typeof UserRound;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="tracking-textarea">
      <span>
        <Icon size={17} />
        {label}
      </span>
      <textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} placeholder={help} />
      <small>{help}</small>
    </label>
  );
}

function ClientSection({
  icon: Icon,
  items,
  keys,
  label,
}: {
  icon: typeof UserRound;
  items: Record<string, string>[];
  keys: string[];
  label: string;
}) {
  return (
    <article>
      <div className="section-head is-stacked">
        <div>
          <p className="eyebrow">{label}</p>
          <h3>{items.length} registros</h3>
        </div>
        <Icon size={19} />
      </div>
      <div className="client-mini-list">
        {items.length === 0 && <p className="admin-muted">Sin registros.</p>}
        {items.slice(0, 4).map((item, index) => (
          <div key={`${label}-${index}`}>
            <strong>{item[keys[0]] || "Sin titulo"}</strong>
            <span>{keys.slice(1).map((key) => item[key]).filter(Boolean).join(" · ")}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
