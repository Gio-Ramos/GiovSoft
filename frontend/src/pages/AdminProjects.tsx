import type { ChangeEvent, FormEvent } from "react";
import {
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Download,
  FileUp,
  Filter,
  MessageSquareText,
  MoreVertical,
  Plus,
  Save,
  Search,
  TimerReset,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCloseOnOutsideClick } from "../hooks/useCloseOnOutsideClick";
import { api } from "../lib/api";

type ProjectStatus = "planning" | "in_progress" | "review" | "completed" | "paused";
type DeliverableStatus = "pending" | "in_progress" | "review" | "done";

interface Deliverable {
  id: string;
  title: string;
  owner: string;
  status: DeliverableStatus;
  dueDate: string;
  notes: string;
}

interface ProjectComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

interface ProjectAttachment {
  id: string;
  name: string;
  type: string;
  kind?: "image" | "pdf" | "file";
  previewUrl?: string;
  uploadedBy: string;
  createdAt: string;
}

interface ProjectItem {
  id: string;
  name: string;
  client: string;
  clientId?: string;
  service: string;
  manager: string;
  status: ProjectStatus;
  dueDate: string;
  budget: string;
  details: Record<string, string>;
  deliverables: Deliverable[];
  comments: ProjectComment[];
  attachments: ProjectAttachment[];
}

interface ProjectForm {
  name: string;
  client: string;
  clientId: string;
  service: string;
  manager: string;
  status: ProjectStatus;
  dueDate: string;
  budget: string;
  details: Record<string, string>;
}

interface ClientOption {
  id: string;
  businessName: string;
  legalName?: string;
  status: string;
}

interface ProjectField {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "number" | "date" | "select";
  options?: string[];
  required?: boolean;
}

interface DeliverableForm {
  title: string;
  owner: string;
  status: DeliverableStatus;
  dueDate: string;
  notes: string;
}

const statusLabels: Record<ProjectStatus, string> = {
  planning: "Planeación",
  in_progress: "En progreso",
  review: "En revisión",
  completed: "Completado",
  paused: "Pausado",
};

const deliverableLabels: Record<DeliverableStatus, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  review: "En revisión",
  done: "Completado",
};

const emptyProjectForm: ProjectForm = {
  name: "",
  client: "",
  clientId: "",
  service: "",
  manager: "",
  status: "planning",
  dueDate: "",
  budget: "",
  details: {},
};

const emptyDeliverableForm: DeliverableForm = {
  title: "",
  owner: "",
  status: "pending",
  dueDate: "",
  notes: "",
};

const defaultServiceOptions = ["GiovSoft 360", "Sitios web", "Ecommerce", "Dominios", "Correos corporativos", "Google Workspace"];
const projectStorageKey = "giovsoft-admin-projects-v2";
const servicesStorageKey = "giovsoft-admin-services-v2";

const projectFieldTemplates: Record<string, ProjectField[]> = {
  "Sitios web": [
    { key: "objective", label: "Objetivo del sitio", placeholder: "Ej. Captar prospectos para servicios médicos", required: true },
    { key: "pages", label: "Secciones estimadas", placeholder: "Ej. Inicio, servicios, nosotros, contacto", required: true },
    { key: "contentStatus", label: "Contenido", placeholder: "Seleccionar estado", type: "select", options: ["Lo entrega el cliente", "Lo redacta GiovSoft", "Mixto"], required: true },
    { key: "integrations", label: "Integraciones", placeholder: "Ej. WhatsApp, Analytics, CRM, formularios" },
    { key: "domainStatus", label: "Dominio", placeholder: "Ej. Ya existe / se debe registrar" },
    { key: "hostingRequirement", label: "Hosting", placeholder: "Ej. Incluido, externo, migración" },
  ],
  Ecommerce: [
    { key: "catalogSize", label: "Productos aproximados", placeholder: "Ej. 120", type: "number", required: true },
    { key: "paymentGateway", label: "Pasarela de pago", placeholder: "Ej. Stripe, Mercado Pago, Openpay", required: true },
    { key: "shippingMethod", label: "Envíos", placeholder: "Ej. Envia.com, Skydrop, paquetería manual" },
    { key: "inventorySource", label: "Inventario", placeholder: "Ej. Manual, Excel, ERP, API" },
    { key: "taxNeeds", label: "Facturación", placeholder: "Ej. Requiere CFDI / no aplica" },
  ],
  Dominios: [
    { key: "domainName", label: "Dominio solicitado", placeholder: "Ej. empresa.com", required: true },
    { key: "registrationYears", label: "Años de registro", placeholder: "Ej. 1", type: "number", required: true },
    { key: "dnsProvider", label: "DNS", placeholder: "Ej. Cloudflare, Google Domains, Registrar" },
    { key: "ownerEmail", label: "Correo titular", placeholder: "Ej. propietario@empresa.com", required: true },
    { key: "privacy", label: "Privacidad WHOIS", placeholder: "Seleccionar", type: "select", options: ["Incluida", "No incluida", "Por confirmar"] },
  ],
  "Correos corporativos": [
    { key: "domainName", label: "Dominio", placeholder: "Ej. empresa.com", required: true },
    { key: "mailboxCount", label: "Buzones", placeholder: "Ej. 8", type: "number", required: true },
    { key: "provider", label: "Proveedor", placeholder: "Ej. Google Workspace, Microsoft 365, hosting" },
    { key: "migration", label: "Migración", placeholder: "Seleccionar", type: "select", options: ["Sin migración", "Migración parcial", "Migración completa"] },
    { key: "aliases", label: "Alias requeridos", placeholder: "Ej. ventas@, soporte@, no-reply@" },
  ],
  "Google Workspace": [
    { key: "domainName", label: "Dominio", placeholder: "Ej. empresa.com", required: true },
    { key: "licenseCount", label: "Licencias", placeholder: "Ej. 12", type: "number", required: true },
    { key: "plan", label: "Plan", placeholder: "Seleccionar", type: "select", options: ["Business Starter", "Business Standard", "Business Plus", "Enterprise"] },
    { key: "migration", label: "Migración de correo", placeholder: "Seleccionar", type: "select", options: ["No", "Sí, desde Gmail", "Sí, desde Microsoft", "Sí, desde otro proveedor"] },
    { key: "adminContact", label: "Contacto administrador", placeholder: "Ej. nombre@empresa.com" },
  ],
  "GiovSoft 360": [
    { key: "businessGoal", label: "Objetivo del negocio", placeholder: "Ej. Digitalizar ventas y soporte", required: true },
    { key: "includedServices", label: "Servicios incluidos", placeholder: "Ej. Sitio, dominio, correos, Workspace, soporte", required: true },
    { key: "priority", label: "Prioridad", placeholder: "Seleccionar", type: "select", options: ["Alta", "Media", "Baja"] },
    { key: "currentStack", label: "Herramientas actuales", placeholder: "Ej. Gmail personal, hosting externo, Excel" },
    { key: "launchTarget", label: "Meta de lanzamiento", placeholder: "Ej. 30 días" },
  ],
};

const demoProjects: ProjectItem[] = [];

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-MX");
}

function calculateProgress(project: ProjectItem) {
  if (!project.deliverables.length) {
    return 0;
  }

  const weights: Record<DeliverableStatus, number> = {
    pending: 0,
    in_progress: 45,
    review: 80,
    done: 100,
  };

  return Math.round(project.deliverables.reduce((total, item) => total + weights[item.status], 0) / project.deliverables.length);
}

function statusFromProgress(project: ProjectItem): ProjectStatus {
  if (project.status === "paused") {
    return "paused";
  }

  const progress = calculateProgress(project);

  if (progress === 100) return "completed";
  if (project.deliverables.some((item) => item.status === "review")) return "review";
  if (progress > 0) return "in_progress";
  return "planning";
}

function todayIso() {
  return new Date().toISOString();
}

export default function AdminProjects() {
  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    const stored = window.localStorage.getItem(projectStorageKey);

    if (!stored) {
      return demoProjects;
    }

    try {
      return JSON.parse(stored) as ProjectItem[];
    } catch (_error) {
      return demoProjects;
    }
  });
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [openMenu, setOpenMenu] = useState("");
  const [editorMode, setEditorMode] = useState<"closed" | "project" | "tracking">("closed");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<ProjectForm>(emptyProjectForm);
  const [deliverableForm, setDeliverableForm] = useState<DeliverableForm>(emptyDeliverableForm);
  const [commentText, setCommentText] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  useCloseOnOutsideClick(Boolean(openMenu), () => setOpenMenu(""));

  useEffect(() => {
    window.localStorage.setItem(projectStorageKey, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    api
      .get<{ clients: ClientOption[] }>("/api/admin/clients")
      .then((response) => setClients(response.data.clients.filter((client) => client.status !== "inactive")))
      .catch(() => setClients([]));
  }, []);

  const projectsWithProgress = useMemo(
    () => projects.map((project) => ({ ...project, status: statusFromProgress(project), progress: calculateProgress(project) })),
    [projects],
  );

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return projectsWithProgress.filter((project) => {
      const matchesQuery =
        !normalizedQuery || `${project.name} ${project.client} ${project.service} ${project.manager}`.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "Todos" || statusLabels[project.status] === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [projectsWithProgress, query, statusFilter]);

  const serviceOptions = useMemo(() => {
    const storedServices = window.localStorage.getItem(servicesStorageKey);

    if (!storedServices) {
      return defaultServiceOptions;
    }

    try {
      const parsedServices = JSON.parse(storedServices) as Array<{ name?: string }>;
      const customServices = parsedServices.map((service) => service.name).filter(Boolean) as string[];
      return Array.from(new Set([...defaultServiceOptions, ...customServices]));
    } catch (_error) {
      return defaultServiceOptions;
    }
  }, []);

  const activeProjects = projectsWithProgress.filter((project) => ["planning", "in_progress", "review"].includes(project.status)).length;
  const completedProjects = projectsWithProgress.filter((project) => project.status === "completed").length;
  const averageProgress = projectsWithProgress.length
    ? Math.round(projectsWithProgress.reduce((total, project) => total + project.progress, 0) / projectsWithProgress.length)
    : 0;
  const selectedProject = projectsWithProgress.find((project) => project.id === editingId);
  const projectFields = projectFieldTemplates[form.service] || [];

  function toForm(project: ProjectItem): ProjectForm {
    const client = clients.find((item) => item.id === project.clientId || item.businessName === project.client);

    return {
      name: project.name,
      client: project.client,
      clientId: client?.id || "",
      service: project.service,
      manager: project.manager,
      status: project.status,
      dueDate: project.dueDate,
      budget: project.budget,
      details: project.details || {},
    };
  }

  function updateForm(field: keyof ProjectForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "service" ? { details: {} } : {}),
    }));
  }

  function updateClient(value: string) {
    const client = clients.find((item) => item.id === value);
    setForm((current) => ({
      ...current,
      clientId: value,
      client: client?.businessName || "",
    }));
  }

  function updateProjectDetail(key: string, value: string) {
    setForm((current) => ({
      ...current,
      details: {
        ...current.details,
        [key]: value,
      },
    }));
  }

  function updateDeliverableForm(field: keyof DeliverableForm, value: string) {
    setDeliverableForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateProject() {
    setMessage("");
    setOpenMenu("");
    setEditingId("");
    setForm(emptyProjectForm);
    setEditorMode("project");
  }

  function openEditProject(project: ProjectItem) {
    setMessage("");
    setOpenMenu("");
    setEditingId(project.id);
    setForm(toForm(project));
    setEditorMode("project");
  }

  function openTracking(project: ProjectItem) {
    setMessage("");
    setOpenMenu("");
    setEditingId(project.id);
    setDeliverableForm(emptyDeliverableForm);
    setCommentText("");
    setAttachmentName("");
    setSelectedFile(null);
    setEditorMode("tracking");
  }

  function closeEditor() {
    setEditorMode("closed");
    setEditingId("");
    setForm(emptyProjectForm);
    setDeliverableForm(emptyDeliverableForm);
    setCommentText("");
    setAttachmentName("");
    setSelectedFile(null);
  }

  function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name || !form.client || !form.service || !form.manager || !form.dueDate) {
      setMessage("Completa los campos obligatorios del proyecto.");
      return;
    }

    const missingDynamicField = (projectFieldTemplates[form.service] || []).find((field) => field.required && !form.details[field.key]);

    if (missingDynamicField) {
      setMessage(`Completa el campo requerido: ${missingDynamicField.label}.`);
      return;
    }

    const existing = projects.find((project) => project.id === editingId);
    const nextProject: ProjectItem = {
      id: editingId || crypto.randomUUID(),
      name: form.name,
      client: form.client,
      clientId: form.clientId,
      service: form.service,
      manager: form.manager,
      status: existing?.status || form.status,
      dueDate: form.dueDate,
      budget: form.budget || "Por definir",
      details: form.details,
      deliverables: existing?.deliverables || [],
      comments: existing?.comments || [],
      attachments: existing?.attachments || [],
    };

    setProjects((current) =>
      editingId
        ? current.map((project) => (project.id === editingId ? nextProject : project))
        : [nextProject, ...current],
    );
    setMessage(editingId ? "Proyecto actualizado correctamente." : "Proyecto creado correctamente.");
    closeEditor();
  }

  function addDeliverable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingId || !deliverableForm.title || !deliverableForm.owner || !deliverableForm.dueDate) {
      setMessage("Completa título, responsable y fecha del entregable.");
      return;
    }

    const deliverable: Deliverable = {
      id: crypto.randomUUID(),
      title: deliverableForm.title,
      owner: deliverableForm.owner,
      status: deliverableForm.status,
      dueDate: deliverableForm.dueDate,
      notes: deliverableForm.notes,
    };

    setProjects((current) =>
      current.map((project) =>
        project.id === editingId ? { ...project, deliverables: [...project.deliverables, deliverable] } : project,
      ),
    );
    setDeliverableForm(emptyDeliverableForm);
    setMessage("Entregable agregado. El avance se recalculó automáticamente.");
  }

  function updateDeliverableStatus(projectId: string, deliverableId: string, status: DeliverableStatus) {
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              deliverables: project.deliverables.map((item) => (item.id === deliverableId ? { ...item, status } : item)),
            }
          : project,
      ),
    );
    setMessage("Entregable actualizado. El avance se recalculó automáticamente.");
  }

  function addComment() {
    if (!editingId || !commentText.trim()) {
      return;
    }

    const comment: ProjectComment = {
      id: crypto.randomUUID(),
      author: "Giovanni Ramos",
      text: commentText.trim(),
      createdAt: todayIso(),
    };

    setProjects((current) =>
      current.map((project) => (project.id === editingId ? { ...project, comments: [comment, ...project.comments] } : project)),
    );
    setCommentText("");
    setMessage("Comentario agregado al seguimiento.");
  }

  function handleAttachmentSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setAttachmentName(file?.name || "");
  }

  function addAttachment() {
    if (!editingId || (!selectedFile && !attachmentName.trim())) {
      return;
    }

    const rawName = selectedFile?.name || attachmentName.trim();
    const fileType = selectedFile?.type || "";
    const attachment: ProjectAttachment = {
      id: crypto.randomUUID(),
      name: rawName,
      type: fileType.includes("pdf") ? "PDF" : fileType.startsWith("image/") ? "Imagen" : rawName.split(".").pop()?.toUpperCase() || "Archivo",
      kind: fileType.includes("pdf") ? "pdf" : fileType.startsWith("image/") ? "image" : "file",
      previewUrl: selectedFile && fileType.startsWith("image/") ? URL.createObjectURL(selectedFile) : "",
      uploadedBy: "Giovanni Ramos",
      createdAt: todayIso(),
    };

    setProjects((current) =>
      current.map((project) => (project.id === editingId ? { ...project, attachments: [attachment, ...project.attachments] } : project)),
    );
    setAttachmentName("");
    setSelectedFile(null);
    setMessage("Archivo registrado en el proyecto.");
  }

  if (editorMode === "project") {
    return (
      <section className="project-register-page">
        <form className="projects-editor-card is-register-view" onSubmit={saveProject}>
          <header>
            <div>
              <h3>{editingId ? "Editar proyecto" : "Nuevo proyecto"}</h3>
              <p>Selecciona el cliente y el tipo de servicio para solicitar solo los datos necesarios.</p>
            </div>
            <div>
              <button className="client-register-cancel" onClick={closeEditor} type="button">Cancelar</button>
              <button className="client-register-save" type="submit"><Save size={17} /> Guardar proyecto</button>
            </div>
          </header>

          {message && <p className={message.includes("Completa") ? "admin-form-error" : "admin-form-success"}>{message}</p>}

          <section className="project-register-section">
            <h4>Información general</h4>
            <div className="projects-editor-grid">
              <label>
                <span>Proyecto <b>*</b></span>
                <input onChange={(event) => updateForm("name", event.target.value)} placeholder="Ej. Portal web corporativo" value={form.name} />
              </label>
              <label>
                <span>Cliente <b>*</b></span>
                <select onChange={(event) => updateClient(event.target.value)} value={form.clientId}>
                  <option value="">Seleccionar cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.businessName || client.legalName}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Servicio <b>*</b></span>
                <select onChange={(event) => updateForm("service", event.target.value)} value={form.service}>
                  <option value="">Seleccionar servicio</option>
                  {serviceOptions.map((service) => <option key={service}>{service}</option>)}
                </select>
              </label>
              <label>
                <span>Responsable <b>*</b></span>
                <input onChange={(event) => updateForm("manager", event.target.value)} placeholder="Ej. Responsable interno" value={form.manager} />
              </label>
              <label>
                <span>Entrega <b>*</b></span>
                <input onChange={(event) => updateForm("dueDate", event.target.value)} type="date" value={form.dueDate} />
              </label>
              <label>
                <span>Presupuesto</span>
                <input onChange={(event) => updateForm("budget", event.target.value)} placeholder="Ej. $14,990 o Variable" value={form.budget} />
              </label>
              <label>
                <span>Estado</span>
                <select onChange={(event) => updateForm("status", event.target.value)} value={form.status}>
                  {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
          </section>

          {form.service && (
            <section className="project-register-section">
              <h4>Datos para {form.service}</h4>
              <div className="projects-editor-grid">
                {projectFields.map((field) => (
                  <label key={field.key}>
                    <span>{field.label} {field.required && <b>*</b>}</span>
                    {field.type === "select" ? (
                      <select onChange={(event) => updateProjectDetail(field.key, event.target.value)} value={form.details[field.key] || ""}>
                        <option value="">{field.placeholder}</option>
                        {(field.options || []).map((option) => <option key={option}>{option}</option>)}
                      </select>
                    ) : (
                      <input
                        onChange={(event) => updateProjectDetail(field.key, event.target.value)}
                        placeholder={field.placeholder}
                        type={field.type || "text"}
                        value={form.details[field.key] || ""}
                      />
                    )}
                  </label>
                ))}
              </div>
            </section>
          )}
        </form>
      </section>
    );
  }

  if (editorMode === "tracking" && selectedProject) {
    return (
      <section className="project-tracking-page">
        {message && <p className={message.includes("Completa") ? "admin-form-error" : "admin-form-success"}>{message}</p>}
        <section className="project-tracking-card is-full-page">
          <header>
            <div>
              <h3>Seguimiento de proyecto</h3>
              <p>{selectedProject.name} · {selectedProject.client}</p>
            </div>
            <button className="client-register-cancel" onClick={closeEditor} type="button">Cerrar</button>
          </header>

          <div className="project-tracking-summary">
            <span><strong>{selectedProject.progress}%</strong> avance automático</span>
            <span><strong>{selectedProject.deliverables.length}</strong> entregables</span>
            <span><strong>{selectedProject.comments.length}</strong> comentarios</span>
            <span><strong>{selectedProject.attachments.length}</strong> archivos</span>
          </div>

          <div className="project-tracking-grid">
            <article>
              <h4>Entregables</h4>
              <div className="project-deliverable-list">
                {selectedProject.deliverables.map((deliverable) => (
                  <section className="project-deliverable-item" key={deliverable.id}>
                    <div>
                      <strong>{deliverable.title}</strong>
                      <small>{deliverable.owner} · {formatDate(deliverable.dueDate)}</small>
                      {deliverable.notes && <p>{deliverable.notes}</p>}
                    </div>
                    <select
                      onChange={(event) => updateDeliverableStatus(selectedProject.id, deliverable.id, event.target.value as DeliverableStatus)}
                      value={deliverable.status}
                    >
                      {Object.entries(deliverableLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </section>
                ))}
              </div>

              <form className="project-deliverable-form" onSubmit={addDeliverable}>
                <label><span>Entregable <b>*</b></span><input onChange={(event) => updateDeliverableForm("title", event.target.value)} placeholder="Ej. Diseño responsive" value={deliverableForm.title} /></label>
                <label><span>Responsable <b>*</b></span><input onChange={(event) => updateDeliverableForm("owner", event.target.value)} placeholder="Ej. Carlos Hernández" value={deliverableForm.owner} /></label>
                <label><span>Fecha <b>*</b></span><input onChange={(event) => updateDeliverableForm("dueDate", event.target.value)} placeholder="2026-07-17" value={deliverableForm.dueDate} /></label>
                <label>
                  <span>Estado</span>
                  <select onChange={(event) => updateDeliverableForm("status", event.target.value as DeliverableStatus)} value={deliverableForm.status}>
                    {Object.entries(deliverableLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="project-deliverable-wide"><span>Notas</span><input onChange={(event) => updateDeliverableForm("notes", event.target.value)} placeholder="Notas, bloqueos o criterios de aceptación..." value={deliverableForm.notes} /></label>
                <button type="submit"><Plus size={16} /> Agregar entregable</button>
              </form>
            </article>

            <aside>
              <section className="project-side-panel">
                <h4><MessageSquareText size={17} /> Comentarios</h4>
                <div className="project-comment-box">
                  <textarea onChange={(event) => setCommentText(event.target.value)} placeholder="Agregar comentario de seguimiento..." value={commentText} />
                  <button onClick={addComment} type="button">Agregar comentario</button>
                </div>
                <div className="project-comment-list">
                  {selectedProject.comments.map((comment) => (
                    <p key={comment.id}><strong>{comment.author}</strong><span>{comment.text}</span></p>
                  ))}
                </div>
              </section>

              <section className="project-side-panel">
                <h4><FileUp size={17} /> Imágenes y PDF</h4>
                <div className="project-file-box">
                  <label className="project-file-upload">
                    <input accept="image/*,.pdf,application/pdf" onChange={handleAttachmentSelection} type="file" />
                    <span>{attachmentName || "Seleccionar imagen o PDF"}</span>
                  </label>
                  <button onClick={addAttachment} type="button">Agregar archivo</button>
                </div>
                <div className="project-file-list">
                  {selectedProject.attachments.map((attachment) => (
                    <p className={attachment.kind === "image" ? "is-image" : ""} key={attachment.id}>
                      {attachment.previewUrl && <img alt={attachment.name} src={attachment.previewUrl} />}
                      <strong>{attachment.name}</strong>
                      <span>{attachment.type} · {attachment.uploadedBy}</span>
                    </p>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className="projects-module-shell">
      <div className="clients-page-head">
        <div>
          <h2>Proyectos</h2>
          <p>Controla entregables, responsables, comentarios, archivos y avance automático.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-primary-action" onClick={openCreateProject} type="button">
            <Plus size={20} />
            Nuevo proyecto
          </button>
        </div>
      </div>

      {message && <p className={message.includes("Completa") ? "admin-form-error" : "admin-form-success"}>{message}</p>}

      <div className="clients-stats-grid">
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-blue"><BriefcaseBusiness size={27} /></span>
          <div><p>Proyectos totales</p><h3>{projects.length}</h3><small>Implementaciones registradas</small></div>
        </article>
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-green"><TimerReset size={27} /></span>
          <div><p>En curso</p><h3>{activeProjects}</h3><small>Planeación, ejecución y revisión</small></div>
        </article>
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-purple"><CheckCircle2 size={27} /></span>
          <div><p>Completados</p><h3>{completedProjects}</h3><small>Entregados al cliente</small></div>
        </article>
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-orange"><CalendarClock size={27} /></span>
          <div><p>Avance promedio</p><h3>{averageProgress}%</h3><small>Calculado por entregables</small></div>
        </article>
      </div>

      {editorMode === "tracking" && selectedProject && (
        <section className="project-tracking-card">
          <header>
            <div>
              <h3>Seguimiento de proyecto</h3>
              <p>{selectedProject.name} · {selectedProject.client}</p>
            </div>
            <button className="client-register-cancel" onClick={closeEditor} type="button">Cerrar</button>
          </header>

          <div className="project-tracking-summary">
            <span><strong>{selectedProject.progress}%</strong> avance automático</span>
            <span><strong>{selectedProject.deliverables.length}</strong> entregables</span>
            <span><strong>{selectedProject.comments.length}</strong> comentarios</span>
            <span><strong>{selectedProject.attachments.length}</strong> archivos</span>
          </div>

          <div className="project-tracking-grid">
            <article>
              <h4>Entregables</h4>
              <div className="project-deliverable-list">
                {selectedProject.deliverables.map((deliverable) => (
                  <section className="project-deliverable-item" key={deliverable.id}>
                    <div>
                      <strong>{deliverable.title}</strong>
                      <small>{deliverable.owner} · {formatDate(deliverable.dueDate)}</small>
                      {deliverable.notes && <p>{deliverable.notes}</p>}
                    </div>
                    <select
                      onChange={(event) => updateDeliverableStatus(selectedProject.id, deliverable.id, event.target.value as DeliverableStatus)}
                      value={deliverable.status}
                    >
                      {Object.entries(deliverableLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </section>
                ))}
              </div>

              <form className="project-deliverable-form" onSubmit={addDeliverable}>
                <label><span>Entregable <b>*</b></span><input onChange={(event) => updateDeliverableForm("title", event.target.value)} placeholder="Ej. Diseño responsive" value={deliverableForm.title} /></label>
                <label><span>Responsable <b>*</b></span><input onChange={(event) => updateDeliverableForm("owner", event.target.value)} placeholder="Ej. Carlos Hernández" value={deliverableForm.owner} /></label>
                <label><span>Fecha <b>*</b></span><input onChange={(event) => updateDeliverableForm("dueDate", event.target.value)} placeholder="2026-07-17" value={deliverableForm.dueDate} /></label>
                <label>
                  <span>Estado</span>
                  <select onChange={(event) => updateDeliverableForm("status", event.target.value as DeliverableStatus)} value={deliverableForm.status}>
                    {Object.entries(deliverableLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="project-deliverable-wide"><span>Notas</span><input onChange={(event) => updateDeliverableForm("notes", event.target.value)} placeholder="Notas, bloqueos o criterios de aceptación..." value={deliverableForm.notes} /></label>
                <button type="submit"><Plus size={16} /> Agregar entregable</button>
              </form>
            </article>

            <aside>
              <section className="project-side-panel">
                <h4><MessageSquareText size={17} /> Comentarios</h4>
                <div className="project-comment-box">
                  <textarea onChange={(event) => setCommentText(event.target.value)} placeholder="Agregar comentario de seguimiento..." value={commentText} />
                  <button onClick={addComment} type="button">Agregar comentario</button>
                </div>
                <div className="project-comment-list">
                  {selectedProject.comments.map((comment) => (
                    <p key={comment.id}><strong>{comment.author}</strong><span>{comment.text}</span></p>
                  ))}
                </div>
              </section>

              <section className="project-side-panel">
                <h4><FileUp size={17} /> Datos y archivos</h4>
                <div className="project-file-box">
                  <input onChange={(event) => setAttachmentName(event.target.value)} placeholder="Nombre del archivo o dato recibido" value={attachmentName} />
                  <button onClick={addAttachment} type="button">Registrar archivo</button>
                </div>
                <div className="project-file-list">
                  {selectedProject.attachments.map((attachment) => (
                    <p key={attachment.id}><strong>{attachment.name}</strong><span>{attachment.type} · {attachment.uploadedBy}</span></p>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </section>
      )}

      <article className="projects-table-card">
        <div className="projects-table-toolbar">
          <label className="clients-table-search">
            <Search size={19} />
            <input onChange={(event) => setQuery(event.target.value)} placeholder="Buscar proyecto, cliente o responsable..." value={query} />
          </label>
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
          <table className="projects-data-table">
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Responsable</th>
                <th>Avance</th>
                <th>Entrega</th>
                <th>Presupuesto</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id}>
                  <td><strong>{project.name}</strong></td>
                  <td>{project.client}</td>
                  <td>{project.service}</td>
                  <td><span className="project-manager"><UsersRound size={16} /> {project.manager}</span></td>
                  <td>
                    <span className="project-progress"><i style={{ width: `${project.progress}%` }} /></span>
                    <small className="project-progress-label">{project.progress}%</small>
                  </td>
                  <td>{formatDate(project.dueDate)}</td>
                  <td>{project.budget}</td>
                  <td><span className={`project-status is-${project.status}`}>{statusLabels[project.status]}</span></td>
                  <td>
                    <button className="clients-row-action" onClick={() => setOpenMenu(openMenu === project.id ? "" : project.id)} type="button">
                      <MoreVertical size={20} />
                    </button>
                    <div className={`clients-action-menu ${openMenu === project.id ? "is-open" : ""}`}>
                      <button onClick={() => openEditProject(project)} type="button">Editar</button>
                      <button onClick={() => openTracking(project)} type="button">Seguimiento</button>
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
