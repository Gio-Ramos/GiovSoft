import {
  BellRing,
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  FileSignature,
  Filter,
  FolderCheck,
  Globe2,
  HardDrive,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Save,
  Search,
  UserPlus,
  X,
  UserRound,
  UsersRound,
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

const genericPublicRfc = "XAXX010101000";
const defaultTaxRegime = "616 - Sin obligaciones fiscales";
const defaultCfdiUse = "S01 - Sin efectos fiscales";

const statusOptions = [
  { value: "active", label: "Activo" },
  { value: "implementation", label: "Implementacion" },
  { value: "paused", label: "Pausado" },
  { value: "risk", label: "Riesgo" },
  { value: "inactive", label: "Inactivo" },
];

const clientFormSteps = [
  {
    eyebrow: "Paso 1",
    title: "Empresa",
    description: "Datos principales para identificar al cliente dentro de la plataforma.",
  },
  {
    eyebrow: "Paso 2",
    title: "Contacto y servicio",
    description: "Responsables, canal principal y servicio contratado o por implementar.",
  },
  {
    eyebrow: "Paso 3",
    title: "Infraestructura",
    description: "Dominios, hosting y accesos operativos del cliente.",
  },
  {
    eyebrow: "Paso 4",
    title: "Pagos y documentos",
    description: "Control administrativo, contratos, archivos digitales y recordatorios.",
  },
  {
    eyebrow: "Paso 5",
    title: "Revision",
    description: "Resumen final antes de crear la ficha del cliente.",
  },
];

const demoClients: ClientItem[] = [
  {
    id: "demo-1",
    businessName: "Clínica Valle del Sol",
    legalName: "Clínica Valle del Sol",
    rfc: "CVS850101123",
    status: "active",
    segment: "clínica",
    primaryService: "Profesional",
    contacts: [{ name: "Dra. Ana Martínez", role: "Directora General", email: "ana.martinez@valledelsol.com", phone: "+52 33 1234 5678" }],
    services: [],
    domains: [],
    hosting: [],
    payments: [],
    reminders: [],
    contracts: [],
    documents: [],
    activity: [],
    createdAt: "2026-05-28T10:00:00.000Z",
    updatedAt: "2026-05-28T10:00:00.000Z",
  },
  {
    id: "demo-2",
    businessName: "Instituto Médico San Lucas",
    legalName: "Instituto Médico San Lucas",
    rfc: "IMS9802034K1",
    status: "active",
    segment: "clínica",
    primaryService: "Avanzado",
    contacts: [{ name: "Lic. Carlos Herrera", role: "Administrador", email: "c.herrera@imsl.com", phone: "+52 33 2345 6789" }],
    services: [],
    domains: [],
    hosting: [],
    payments: [],
    reminders: [],
    contracts: [],
    documents: [],
    activity: [],
    createdAt: "2026-05-25T10:00:00.000Z",
    updatedAt: "2026-05-25T10:00:00.000Z",
  },
  {
    id: "demo-3",
    businessName: "Dermatología & Belleza",
    legalName: "Dermatología & Belleza",
    rfc: "DBE9004158Z2",
    status: "active",
    segment: "clínica",
    primaryService: "Profesional",
    contacts: [{ name: "Dra. Laura Gómez", role: "Directora", email: "laura.gomez@dlyb.com", phone: "+52 33 3456 7890" }],
    services: [],
    domains: [],
    hosting: [],
    payments: [],
    reminders: [],
    contracts: [],
    documents: [],
    activity: [],
    createdAt: "2026-05-22T10:00:00.000Z",
    updatedAt: "2026-05-22T10:00:00.000Z",
  },
  {
    id: "demo-4",
    businessName: "Hospital Central",
    legalName: "Hospital Central",
    rfc: "HCE7708123A5",
    status: "active",
    segment: "empresa",
    primaryService: "Business",
    contacts: [{ name: "Ing. Pedro Ramírez", role: "TI Manager", email: "pedro.ramirez@central.com", phone: "+52 33 4567 8901" }],
    services: [],
    domains: [],
    hosting: [],
    payments: [],
    reminders: [],
    contracts: [],
    documents: [],
    activity: [],
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-18T10:00:00.000Z",
  },
  {
    id: "demo-5",
    businessName: "Laboratorio Clínico",
    legalName: "Laboratorio Clínico",
    rfc: "LCL9109055P6",
    status: "inactive",
    segment: "empresa",
    primaryService: "Básico",
    contacts: [{ name: "QFB. Mariana López", role: "Gerente", email: "mariana.lopez@labclinico.com", phone: "+52 33 5678 9012" }],
    services: [],
    domains: [],
    hosting: [],
    payments: [],
    reminders: [],
    contracts: [],
    documents: [],
    activity: [],
    createdAt: "2026-05-15T10:00:00.000Z",
    updatedAt: "2026-05-15T10:00:00.000Z",
  },
  {
    id: "demo-6",
    businessName: "OptiSalud",
    legalName: "OptiSalud",
    rfc: "OPS8811227Q7",
    status: "active",
    segment: "retail",
    primaryService: "Profesional",
    contacts: [{ name: "Lic. Ricardo Torres", role: "Admin. General", email: "ricardo.torres@optisalud.com", phone: "+52 33 6789 0123" }],
    services: [],
    domains: [],
    hosting: [],
    payments: [],
    reminders: [],
    contracts: [],
    documents: [],
    activity: [],
    createdAt: "2026-05-12T10:00:00.000Z",
    updatedAt: "2026-05-12T10:00:00.000Z",
  },
  {
    id: "demo-7",
    businessName: "Nova Farma",
    legalName: "Nova Farma",
    rfc: "NFA9403031B2",
    status: "active",
    segment: "retail",
    primaryService: "Avanzado",
    contacts: [{ name: "Lic. Sofía Núñez", role: "Directora", email: "sofia.nunez@novafarma.com", phone: "+52 33 7890 1234" }],
    services: [],
    domains: [],
    hosting: [],
    payments: [],
    reminders: [],
    contracts: [],
    documents: [],
    activity: [],
    createdAt: "2026-05-10T10:00:00.000Z",
    updatedAt: "2026-05-10T10:00:00.000Z",
  },
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
    legalName: client.legalName || client.businessName || "",
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

function withFiscalDocument(form: ClientForm, taxRegime: string, cfdiUse: string) {
  return {
    ...form,
    rfc: form.rfc.trim() || genericPublicRfc,
    documents: [
      form.documents,
      `Datos fiscales | Fiscal | Régimen: ${taxRegime || "Sin régimen"} | Uso CFDI: ${cfdiUse || "Sin uso CFDI"}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function getStatusLabel(status: string) {
  return statusOptions.find((option) => option.value === status)?.label || "Activo";
}

function getPrimaryContact(client?: ClientItem) {
  return client?.contacts?.[0];
}

function getClientInitials(client: ClientItem) {
  return client.businessName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function formatClientDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getPlanLabel(client: ClientItem) {
  return client.primaryService || client.segment || "Básico";
}

export default function AdminClients() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [demoClientState, setDemoClientState] = useState<ClientItem[]>(demoClients);
  const [modalForm, setModalForm] = useState<ClientForm>(emptyForm);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState("");
  const [actionClientId, setActionClientId] = useState("");
  const [modalStep, setModalStep] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [taxRegime, setTaxRegime] = useState(defaultTaxRegime);
  const [cfdiUse, setCfdiUse] = useState(defaultCfdiUse);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .get<{ clients: ClientItem[] }>("/api/admin/clients")
      .then((response) => {
        setClients(response.data.clients);
      })
      .catch(() => setMessage("No se pudieron cargar los clientes."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, planFilter, query, statusFilter, typeFilter]);

  const filteredClients = useMemo(() => {
    const sourceClients = clients.length > 0 ? clients : demoClientState;
    const normalizedQuery = query.trim().toLowerCase();

    return sourceClients.filter((client) => {
      const matchesQuery = !normalizedQuery || [client.businessName, client.legalName, client.rfc, client.primaryService, client.segment]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));

      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      const matchesType = typeFilter === "all" || (client.segment || "").toLowerCase() === typeFilter;
      const matchesPlan = planFilter === "all" || getPlanLabel(client).toLowerCase() === planFilter;

      return matchesQuery && matchesStatus && matchesType && matchesPlan;
    });
  }, [clients, demoClientState, planFilter, query, statusFilter, typeFilter]);

  const totalClientCount = clients.length > 0 ? clients.length : 1248;
  const totalPages = Math.max(1, Math.ceil((clients.length > 0 ? filteredClients.length : totalClientCount) / pageSize));
  const normalizedPage = Math.min(currentPage, totalPages);
  const paginatedClients =
    clients.length > 0 ? filteredClients.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize) : filteredClients.slice(0, pageSize);

  const activeClients = clients.length > 0 ? clients.filter((client) => client.status !== "inactive").length : 1058;
  const inactiveClients = clients.length > 0 ? clients.filter((client) => client.status === "inactive").length : 190;
  const newThisMonth = clients.length > 0 ? clients.filter((client) => {
    const createdAt = new Date(client.createdAt);
    const now = new Date();
    return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
  }).length : 86;
  function updateModalForm<K extends keyof ClientForm>(key: K, value: ClientForm[K]) {
    setModalForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  function getModalContactParts() {
    const [name = "", role = "", email = "", phone = ""] = modalForm.contacts.split("|").map((part) => part.trim());
    return { name, role, email, phone };
  }

  function updateModalContact(key: "name" | "role" | "email" | "phone", value: string) {
    const contact = getModalContactParts();
    const nextContact = { ...contact, [key]: value };
    updateModalForm("contacts", `${nextContact.name} | ${nextContact.role} | ${nextContact.email} | ${nextContact.phone}`);
  }

  function selectClient(client: ClientItem) {
    setMessage(`Cliente seleccionado: ${client.businessName}`);
  }

  function startNewClient() {
    setModalForm(emptyForm);
    setTaxRegime(defaultTaxRegime);
    setCfdiUse(defaultCfdiUse);
    setEditingClientId("");
    setActionClientId("");
    setModalStep(0);
    setIsClientModalOpen(true);
    setMessage("");
  }

  function startEditClient(client: ClientItem) {
    setModalForm(clientToForm(client));
    setTaxRegime(defaultTaxRegime);
    setCfdiUse(defaultCfdiUse);
    setEditingClientId(client.id);
    setActionClientId("");
    setModalStep(0);
    setIsClientModalOpen(true);
    setMessage("");
  }

  function closeClientModal(force = false) {
    if (saving && !force) return;
    setIsClientModalOpen(false);
    setEditingClientId("");
    setModalStep(0);
    setModalForm(emptyForm);
  }

  async function disableClient(client: ClientItem) {
    setActionClientId("");
    setSaving(true);
    setMessage("");

    if (client.id.startsWith("demo-")) {
      setDemoClientState((currentClients) =>
        currentClients.map((item) => (item.id === client.id ? { ...item, status: "inactive", updatedAt: new Date().toISOString() } : item))
      );
      setSaving(false);
      setMessage("Cliente inhabilitado.");
      return;
    }

    try {
      const payload = formToPayload({ ...clientToForm(client), status: "inactive" });
      const response = await api.patch<{ client: ClientItem }>(`/api/admin/clients/${client.id}`, payload);
      setClients((currentClients) => currentClients.map((item) => (item.id === client.id ? response.data.client : item)));
      setMessage("Cliente inhabilitado.");
    } catch {
      setMessage("No se pudo inhabilitar el cliente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleModalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (modalStep < clientFormSteps.length - 1) {
      setModalStep((currentStep) => Math.min(currentStep + 1, clientFormSteps.length - 1));
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const payload = formToPayload(withFiscalDocument(modalForm, taxRegime, cfdiUse));
      const response = await api.post<{ client: ClientItem }>("/api/admin/clients", payload);

      setClients((currentClients) => [response.data.client, ...currentClients]);
      setMessage("Cliente creado.");
      closeClientModal(true);
    } catch {
      setMessage("No se pudo guardar el cliente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const payload = formToPayload(withFiscalDocument(modalForm, taxRegime, cfdiUse));

      if (editingClientId.startsWith("demo-")) {
        const now = new Date().toISOString();
        setDemoClientState((currentClients) =>
          currentClients.map((client) =>
            client.id === editingClientId
              ? {
                  ...client,
                  ...payload,
                  contacts: payload.contacts,
                  services: payload.services,
                  domains: payload.domains,
                  hosting: payload.hosting,
                  payments: payload.payments,
                  reminders: payload.reminders,
                  contracts: payload.contracts,
                  documents: payload.documents,
                  updatedAt: now,
                }
              : client
          )
        );
        setMessage("Cliente actualizado.");
        closeClientModal(true);
        return;
      }

      const response = editingClientId
        ? await api.patch<{ client: ClientItem }>(`/api/admin/clients/${editingClientId}`, payload)
        : await api.post<{ client: ClientItem }>("/api/admin/clients", payload);

      setClients((currentClients) => {
        if (editingClientId) {
          return currentClients.map((client) => (client.id === editingClientId ? response.data.client : client));
        }
        return [response.data.client, ...currentClients];
      });
      setMessage(editingClientId ? "Cliente actualizado." : "Cliente creado.");
      closeClientModal(true);
    } catch {
      setMessage("No se pudo guardar el cliente.");
    } finally {
      setSaving(false);
    }
  }

  const canMoveForward = modalStep !== 0 || Boolean(modalForm.businessName.trim());
  const modalContact = getModalContactParts();

  if (isClientModalOpen) {
    return (
      <form className="client-register-shell" onSubmit={handleRegisterSubmit}>
        <section className="client-register-head">
          <div>
            <h2>{editingClientId ? "Editar cliente" : "Nuevo cliente"}</h2>
            <p>
              {editingClientId
                ? "Actualiza la información del cliente seleccionado."
                : "Completa la información para registrar un nuevo cliente en el sistema."}
            </p>
          </div>
          <div className="client-register-actions">
            <button className="client-register-cancel" onClick={() => closeClientModal()} type="button">
              Cancelar
            </button>
            <button className="client-register-save" disabled={saving} type="submit">
              <Save size={18} />
              {saving ? "Guardando" : editingClientId ? "Actualizar cliente" : "Guardar cliente"}
            </button>
          </div>
        </section>

        <section className="client-register-card">
          <h3>Información general</h3>
          <div className="client-register-grid is-three">
            <label>
              <span className="client-register-label">Tipo de cliente <b>*</b></span>
              <select required value={modalForm.segment} onChange={(event) => updateModalForm("segment", event.target.value)}>
                <option value="">Seleccionar tipo</option>
                <option value="clínica">Clínica</option>
                <option value="empresa">Empresa</option>
                <option value="retail">Retail</option>
              </select>
            </label>
            <label>
              <span className="client-register-label">Nombre comercial / Razón social <b>*</b></span>
              <input
                required
                placeholder="Ej. Clínica Valle del Sol"
                value={modalForm.businessName}
                onChange={(event) => {
                  updateModalForm("businessName", event.target.value);
                  updateModalForm("legalName", event.target.value);
                }}
              />
            </label>
            <label>
              RFC
              <input
                placeholder={genericPublicRfc}
                value={modalForm.rfc}
                onChange={(event) => updateModalForm("rfc", event.target.value.toUpperCase())}
              />
            </label>
            <label>
              <span className="client-register-label">Nombre del contacto principal <b>*</b></span>
              <input
                required
                placeholder="Ej. Dra. Ana Martínez"
                value={modalContact.name}
                onChange={(event) => updateModalContact("name", event.target.value)}
              />
            </label>
            <label>
              Puesto / Cargo
              <input placeholder="Ej. Directora General" value={modalContact.role} onChange={(event) => updateModalContact("role", event.target.value)} />
            </label>
            <label>
              <span className="client-register-label">Correo electrónico <b>*</b></span>
              <span className="client-register-input-icon">
                <Mail size={17} />
                <input
                  required
                  placeholder="ejemplo@dominio.com"
                  type="email"
                  value={modalContact.email}
                  onChange={(event) => updateModalContact("email", event.target.value)}
                />
              </span>
            </label>
            <label>
              <span className="client-register-label">Teléfono principal <b>*</b></span>
              <span className="client-register-input-icon">
                <Phone size={17} />
                <input
                  required
                  placeholder="Ej. +52 33 1234 5678"
                  value={modalContact.phone}
                  onChange={(event) => updateModalContact("phone", event.target.value)}
                />
              </span>
            </label>
            <label>
              Teléfono secundario
              <span className="client-register-input-icon">
                <Phone size={17} />
                <input placeholder="Ej. +52 33 8765 4321" />
              </span>
            </label>
            <label>
              Sitio web
              <span className="client-register-input-icon">
                <Globe2 size={17} />
                <input placeholder="Ej. www.ejemplo.com" value={modalForm.website} onChange={(event) => updateModalForm("website", event.target.value)} />
              </span>
            </label>
          </div>
        </section>

        <section className="client-register-card">
          <h3>Dirección fiscal</h3>
          <div className="client-register-grid is-four">
            <label>
              <span className="client-register-label">País <b>*</b></span>
              <select defaultValue="México">
                <option>México</option>
              </select>
            </label>
            <label>
              <span className="client-register-label">Código postal <b>*</b></span>
              <input placeholder="Ej. 44100" />
            </label>
            <label>
              <span className="client-register-label">Estado <b>*</b></span>
              <select defaultValue="">
                <option value="">Seleccionar estado</option>
                <option>Jalisco</option>
                <option>Ciudad de México</option>
                <option>Nuevo León</option>
              </select>
            </label>
            <label>
              <span className="client-register-label">Ciudad <b>*</b></span>
              <input placeholder="Ej. Guadalajara" />
            </label>
            <label>
              Colonia
              <input placeholder="Ej. Providencia" />
            </label>
            <label>
              <span className="client-register-label">Calle <b>*</b></span>
              <input placeholder="Ej. Av. México" />
            </label>
            <label>
              <span className="client-register-label">Número exterior <b>*</b></span>
              <input placeholder="Ej. 1234" />
            </label>
            <label>
              Número interior
              <input placeholder="Ej. 5A" />
            </label>
            <label>
              Referencia
              <input placeholder="Ej. Entre calle 1 y calle 2" />
            </label>
            <label>
              <span className="client-register-label">Régimen fiscal <b>*</b></span>
              <select required value={taxRegime} onChange={(event) => setTaxRegime(event.target.value)}>
                <option value="">Seleccionar régimen</option>
                <option value="601 - General de Ley Personas Morales">601 - General de Ley Personas Morales</option>
                <option value="603 - Personas Morales con Fines no Lucrativos">603 - Personas Morales con Fines no Lucrativos</option>
                <option value="612 - Personas Físicas con Actividades Empresariales y Profesionales">
                  612 - Personas Físicas con Actividades Empresariales y Profesionales
                </option>
                <option value="616 - Sin obligaciones fiscales">616 - Sin obligaciones fiscales</option>
                <option value="621 - Incorporación Fiscal">621 - Incorporación Fiscal</option>
                <option value="626 - Régimen Simplificado de Confianza">626 - Régimen Simplificado de Confianza</option>
              </select>
            </label>
            <label>
              <span className="client-register-label">Uso de CFDI <b>*</b></span>
              <select required value={cfdiUse} onChange={(event) => setCfdiUse(event.target.value)}>
                <option value="">Seleccionar uso</option>
                <option value="G01 - Adquisición de mercancías">G01 - Adquisición de mercancías</option>
                <option value="G03 - Gastos en general">G03 - Gastos en general</option>
                <option value="I01 - Construcciones">I01 - Construcciones</option>
                <option value="P01 - Por definir">P01 - Por definir</option>
                <option value="S01 - Sin efectos fiscales">S01 - Sin efectos fiscales</option>
              </select>
            </label>
          </div>
        </section>

        <section className="client-register-bottom-grid">
          <article className="client-register-card">
            <h3>Información adicional</h3>
            <div className="client-register-grid is-two">
              <label>
                Tipo de industria
                <select defaultValue="">
                  <option value="">Seleccionar industria</option>
                  <option>Salud</option>
                  <option>Servicios</option>
                  <option>Retail</option>
                </select>
              </label>
              <label>
                Tamaño de empresa
                <select defaultValue="">
                  <option value="">Seleccionar tamaño</option>
                  <option>1-10</option>
                  <option>11-50</option>
                  <option>51-200</option>
                </select>
              </label>
              <label className="client-register-wide">
                Observaciones
                <textarea
                  maxLength={500}
                  placeholder="Información adicional relevante sobre el cliente..."
                  rows={5}
                  value={modalForm.notes}
                  onChange={(event) => updateModalForm("notes", event.target.value)}
                />
                <small>{modalForm.notes.length}/500</small>
              </label>
            </div>
          </article>

          <article className="client-register-card">
            <h3>Configuración del cliente</h3>
            <div className="client-register-grid is-two">
              <label>
                Asignar ejecutivo
                <select defaultValue="">
                  <option value="">Seleccionar ejecutivo</option>
                  <option>Giovanni Ramos</option>
                </select>
              </label>
              <label>
                Grupo / Categoría
                <select defaultValue="">
                  <option value="">Seleccionar grupo</option>
                  <option>Premium</option>
                  <option>Operativo</option>
                </select>
              </label>
              <label>
                Plan asignado
                <select value={modalForm.primaryService} onChange={(event) => updateModalForm("primaryService", event.target.value)}>
                  <option value="">Seleccionar plan</option>
                  <option value="Básico">Básico</option>
                  <option value="Profesional">Profesional</option>
                  <option value="Avanzado">Avanzado</option>
                  <option value="Business">Business</option>
                </select>
              </label>
              <label>
                Estado del cliente
                <select value={modalForm.status} onChange={(event) => updateModalForm("status", event.target.value)}>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="paused">Pausado</option>
                </select>
              </label>
              <label className="client-register-check">
                <input type="checkbox" />
                Enviar correo de bienvenida al registrar el cliente
              </label>
            </div>
          </article>
        </section>

        {message && <p className={`request-admin-message ${message.startsWith("No se") ? "is-error" : ""}`}>{message}</p>}
      </form>
    );
  }

  return (
    <div className="clients-crm-shell">
      <section className="clients-page-head">
        <div>
          <h2>Clientes</h2>
          <p>Administra y consulta la información de todos tus clientes.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-primary-action" onClick={startNewClient} type="button">
            <Plus size={18} />
            Nuevo cliente
          </button>
          <button className="clients-action-caret" type="button" aria-label="Más acciones de cliente">
            <ChevronRight size={17} />
          </button>
        </div>
      </section>

      <section className="clients-stats-grid">
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-blue">
            <UsersRound size={26} />
          </span>
          <div>
            <p>Clientes totales</p>
            <h3>{totalClientCount}</h3>
            <small className="is-positive">↑ 12.5% vs. mes anterior</small>
          </div>
        </article>
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-green">
            <Building2 size={26} />
          </span>
          <div>
            <p>Clientes activos</p>
            <h3>{activeClients}</h3>
            <small className="is-positive">↑ 8.3% vs. mes anterior</small>
          </div>
        </article>
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-purple">
            <UserPlus size={26} />
          </span>
          <div>
            <p>Nuevos este mes</p>
            <h3>{newThisMonth}</h3>
            <small className="is-positive">↑ 15.2% vs. mes anterior</small>
          </div>
        </article>
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-orange">
            <UserPlus size={26} />
          </span>
          <div>
            <p>Inactivos</p>
            <h3>{inactiveClients}</h3>
            <small className="is-negative">↓ 4.7% vs. mes anterior</small>
          </div>
        </article>
      </section>

      <section className="clients-table-card">
        <div className="clients-table-toolbar">
          <label className="clients-table-search">
            <Search size={21} />
            <input
              aria-label="Buscar cliente"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar cliente por nombre, correo o RFC..."
              value={query}
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda">
                <X size={18} />
              </button>
            )}
          </label>

          <label className="clients-filter-field">
            Estado
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Todos</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="clients-filter-field">
            Tipo de cliente
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">Todos</option>
              <option value="empresa">Empresa</option>
              <option value="clínica">Clínica</option>
              <option value="retail">Retail</option>
            </select>
          </label>

          <label className="clients-filter-field">
            Plan
            <select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)}>
              <option value="all">Todos</option>
              <option value="básico">Básico</option>
              <option value="profesional">Profesional</option>
              <option value="avanzado">Avanzado</option>
              <option value="business">Business</option>
            </select>
          </label>

          <button className="clients-filter-button" type="button">
            <Filter size={18} />
            Filtros
          </button>
          <button className="clients-download-button" type="button" aria-label="Descargar clientes">
            <Download size={19} />
          </button>
        </div>

        <div className="clients-table-wrap">
          <table className="clients-data-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" aria-label="Seleccionar todos los clientes" />
                </th>
                <th>Cliente</th>
                <th>Empresa</th>
                <th>Contacto</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th>Plan</th>
                <th>Estado</th>
                <th>Fecha de registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10}>Cargando clientes...</td>
                </tr>
              )}

              {!loading && filteredClients.length === 0 && (
                <tr>
                  <td colSpan={10}>No hay clientes con ese criterio.</td>
                </tr>
              )}

              {!loading &&
                paginatedClients.map((client, index) => {
                  const contact = getPrimaryContact(client);
                  const plan = getPlanLabel(client);
                  const isInactive = client.status === "inactive";

                  return (
                    <tr key={client.id}>
                      <td>
                        <input type="checkbox" aria-label={`Seleccionar ${client.businessName}`} />
                      </td>
                      <td>
                        <button className="clients-name-cell" onClick={() => selectClient(client)} type="button">
                          <span className={`clients-avatar clients-avatar-${(index % 6) + 1}`}>
                            {getClientInitials(client)}
                          </span>
                          <span>
                            <strong>{client.businessName}</strong>
                            <small>RFC: {client.rfc || "Sin RFC"}</small>
                          </span>
                        </button>
                      </td>
                      <td>{client.legalName || client.businessName}</td>
                      <td>
                        <span className="clients-contact-cell">
                          <strong>{contact?.name || "Sin contacto"}</strong>
                          <small>{contact?.role || "Responsable"}</small>
                        </span>
                      </td>
                      <td>{contact?.email || "sin-correo@giovsoft.com"}</td>
                      <td>{contact?.phone || "Sin teléfono"}</td>
                      <td>
                        <span className={`clients-plan-badge is-${plan.toLowerCase().replace(/\s+/g, "-")}`}>
                          {plan}
                        </span>
                      </td>
                      <td>
                        <span className={`clients-status-badge ${isInactive ? "is-inactive" : "is-active"}`}>
                          {isInactive ? "Inactivo" : "Activo"}
                        </span>
                      </td>
                      <td>{formatClientDate(client.createdAt)}</td>
                      <td>
                        <button
                          className="clients-row-action"
                          type="button"
                          aria-label={`Acciones para ${client.businessName}`}
                          onClick={() => setActionClientId((currentId) => (currentId === client.id ? "" : client.id))}
                        >
                          <MoreVertical size={19} />
                        </button>
                        <div className={`clients-action-menu ${actionClientId === client.id ? "is-open" : ""}`}>
                          <button type="button" onClick={() => startEditClient(client)}>
                            Editar
                          </button>
                          <button type="button" onClick={() => disableClient(client)} disabled={client.status === "inactive" || saving}>
                            Inhabilitar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <footer className="clients-table-footer">
          <span>
            Mostrando {filteredClients.length === 0 ? 0 : (normalizedPage - 1) * pageSize + 1} a{" "}
            {Math.min(normalizedPage * pageSize, filteredClients.length)} de {totalClientCount} clientes
          </span>
          <div className="clients-pagination">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={normalizedPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index + 1).map((page) => (
              <button
                className={page === normalizedPage ? "is-active" : ""}
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            {totalPages > 4 && <span>...</span>}
            {totalPages > 3 && (
              <button
                className={totalPages === normalizedPage ? "is-active" : ""}
                type="button"
                onClick={() => setCurrentPage(totalPages)}
              >
                {totalPages}
              </button>
            )}
            <button
              type="button"
              aria-label="Página siguiente"
              disabled={normalizedPage === totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <select
            aria-label="Clientes por página"
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
          >
            <option value="10">10 por página</option>
            <option value="25">25 por página</option>
            <option value="50">50 por página</option>
          </select>
        </footer>
      </section>

      {message && (
        <p className={`request-admin-message ${message.startsWith("No se") ? "is-error" : ""}`}>{message}</p>
      )}

      {isClientModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section aria-modal="true" className="client-modal" role="dialog">
            <header className="client-modal-head">
              <div>
                <p className="eyebrow">Nuevo cliente</p>
                <h3>{clientFormSteps[modalStep].title}</h3>
                <span>{clientFormSteps[modalStep].description}</span>
              </div>
              <button aria-label="Cerrar modal" className="icon-button" onClick={() => closeClientModal()} type="button">
                <X size={19} />
              </button>
            </header>

            <div className="client-stepper" aria-label="Etapas del formulario">
              {clientFormSteps.map((step, index) => (
                <button
                  className={`client-step ${index === modalStep ? "is-current" : ""} ${index < modalStep ? "is-done" : ""}`}
                  key={step.title}
                  onClick={() => setModalStep(index)}
                  type="button"
                >
                  <span>{index + 1}</span>
                  <strong>{step.title}</strong>
                </button>
              ))}
            </div>

            <form className="client-modal-form" onSubmit={handleModalSubmit}>
              <div className="client-step-panel">
                <p className="eyebrow">{clientFormSteps[modalStep].eyebrow}</p>

                {modalStep === 0 && (
                  <>
                    <div className="client-form-grid">
                      <label>
                        Nombre comercial
                        <input
                          autoFocus
                          required
                          value={modalForm.businessName}
                          onChange={(event) => updateModalForm("businessName", event.target.value)}
                        />
                      </label>
                      <label>
                        Razon social
                        <input value={modalForm.legalName} onChange={(event) => updateModalForm("legalName", event.target.value)} />
                      </label>
                      <label>
                        RFC
                        <input value={modalForm.rfc} onChange={(event) => updateModalForm("rfc", event.target.value)} />
                      </label>
                      <label>
                        Estado
                        <select value={modalForm.status} onChange={(event) => updateModalForm("status", event.target.value)}>
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Segmento
                        <input value={modalForm.segment} onChange={(event) => updateModalForm("segment", event.target.value)} />
                      </label>
                      <label>
                        Sitio web
                        <input value={modalForm.website} onChange={(event) => updateModalForm("website", event.target.value)} />
                      </label>
                    </div>
                    <label className="client-form-wide">
                      Notas generales
                      <textarea rows={3} value={modalForm.notes} onChange={(event) => updateModalForm("notes", event.target.value)} />
                    </label>
                  </>
                )}

                {modalStep === 1 && (
                  <div className="client-tracking-grid">
                    <label>
                      Servicio principal
                      <input
                        value={modalForm.primaryService}
                        onChange={(event) => updateModalForm("primaryService", event.target.value)}
                      />
                    </label>
                    <TrackingTextarea
                      help="Nombre | Rol | Email | Telefono"
                      icon={UserRound}
                      label="Contactos"
                      value={modalForm.contacts}
                      onChange={(value) => updateModalForm("contacts", value)}
                    />
                    <TrackingTextarea
                      help="Servicio | Estado | Inicio | Renovacion"
                      icon={BriefcaseBusiness}
                      label="Servicios contratados"
                      value={modalForm.services}
                      onChange={(value) => updateModalForm("services", value)}
                    />
                  </div>
                )}

                {modalStep === 2 && (
                  <div className="client-tracking-grid">
                    <TrackingTextarea
                      help="Dominio | Registrador | Vence | DNS"
                      icon={Globe2}
                      label="Dominios"
                      value={modalForm.domains}
                      onChange={(value) => updateModalForm("domains", value)}
                    />
                    <TrackingTextarea
                      help="Proveedor | Plan | Vence | Acceso"
                      icon={HardDrive}
                      label="Hosting"
                      value={modalForm.hosting}
                      onChange={(value) => updateModalForm("hosting", value)}
                    />
                  </div>
                )}

                {modalStep === 3 && (
                  <div className="client-tracking-grid">
                    <TrackingTextarea
                      help="Concepto | Monto | Vence | Estado"
                      icon={CreditCard}
                      label="Pagos"
                      value={modalForm.payments}
                      onChange={(value) => updateModalForm("payments", value)}
                    />
                    <TrackingTextarea
                      help="Fecha | Asunto | Responsable"
                      icon={BellRing}
                      label="Recordatorios"
                      value={modalForm.reminders}
                      onChange={(value) => updateModalForm("reminders", value)}
                    />
                    <TrackingTextarea
                      help="Contrato | Estado | Firma | URL"
                      icon={FileSignature}
                      label="Contratos firmados"
                      value={modalForm.contracts}
                      onChange={(value) => updateModalForm("contracts", value)}
                    />
                    <TrackingTextarea
                      help="Documento | Tipo | Estado | URL"
                      icon={FolderCheck}
                      label="Documentos digitales"
                      value={modalForm.documents}
                      onChange={(value) => updateModalForm("documents", value)}
                    />
                  </div>
                )}

                {modalStep === 4 && (
                  <div className="client-review-grid">
                    <ReviewItem label="Empresa" value={modalForm.businessName || "Sin nombre"} />
                    <ReviewItem label="Servicio" value={modalForm.primaryService || "Sin servicio principal"} />
                    <ReviewItem label="Estado" value={getStatusLabel(modalForm.status)} />
                    <ReviewItem label="Contactos" value={`${parseLines(modalForm.contacts, ["name"]).length} registros`} />
                    <ReviewItem label="Dominios" value={`${parseLines(modalForm.domains, ["domain"]).length} registros`} />
                    <ReviewItem label="Pagos" value={`${parseLines(modalForm.payments, ["concept"]).length} registros`} />
                    <label className="client-form-wide">
                      Nota inicial para historial
                      <textarea
                        rows={3}
                        value={modalForm.activityNote}
                        onChange={(event) => updateModalForm("activityNote", event.target.value)}
                        placeholder="Ej. Cliente agregado desde reunion inicial."
                      />
                    </label>
                  </div>
                )}
              </div>

              {message && (
                <p className={`request-admin-message ${message.startsWith("No se") ? "is-error" : ""}`}>{message}</p>
              )}

              <footer className="client-modal-actions">
                <button className="secondary-button" onClick={() => closeClientModal()} type="button">
                  Cancelar
                </button>
                <div>
                  <button
                    className="secondary-button"
                    disabled={modalStep === 0 || saving}
                    onClick={() => setModalStep((currentStep) => Math.max(currentStep - 1, 0))}
                    type="button"
                  >
                    <ChevronLeft size={16} />
                    Atras
                  </button>
                  <button className="primary-button" disabled={!canMoveForward || saving} type="submit">
                    {modalStep === clientFormSteps.length - 1 ? (
                      <>
                        <Save size={16} />
                        {saving ? "Guardando" : "Crear cliente"}
                      </>
                    ) : (
                      <>
                        Siguiente
                        <ChevronRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <article className="client-review-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
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
