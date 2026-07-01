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
import { useMemo, useState } from "react";

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
  service: string;
  manager: string;
  status: ProjectStatus;
  dueDate: string;
  budget: string;
  deliverables: Deliverable[];
  comments: ProjectComment[];
  attachments: ProjectAttachment[];
}

interface ProjectForm {
  name: string;
  client: string;
  service: string;
  manager: string;
  status: ProjectStatus;
  dueDate: string;
  budget: string;
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
  service: "",
  manager: "",
  status: "planning",
  dueDate: "",
  budget: "",
};

const emptyDeliverableForm: DeliverableForm = {
  title: "",
  owner: "",
  status: "pending",
  dueDate: "",
  notes: "",
};

const serviceOptions = ["GiovSoft 360", "Sitios web", "Ecommerce", "Dominios", "Correos corporativos", "Google Workspace"];

const demoProjects: ProjectItem[] = [
  {
    id: "prj-1",
    name: "Portal web corporativo",
    client: "Clínica Valle del Sol",
    service: "Sitios web",
    manager: "Ana Sofía Martínez",
    status: "in_progress",
    dueDate: "2026-07-18",
    budget: "$14,990",
    deliverables: [
      { id: "del-1", title: "Arquitectura del sitio", owner: "Ana Sofía Martínez", status: "done", dueDate: "2026-07-02", notes: "Mapa aprobado por cliente." },
      { id: "del-2", title: "Diseño UI", owner: "Carlos Hernández", status: "review", dueDate: "2026-07-08", notes: "Pendiente validación final." },
      { id: "del-3", title: "Desarrollo frontend", owner: "Jorge Ramírez", status: "in_progress", dueDate: "2026-07-14", notes: "Home y contacto en construcción." },
      { id: "del-4", title: "Publicación", owner: "Lucía Gómez", status: "pending", dueDate: "2026-07-18", notes: "Depende de DNS." },
    ],
    comments: [{ id: "com-1", author: "Ana Sofía Martínez", text: "Cliente aprobó estructura y contenidos principales.", createdAt: "2026-06-29T15:20:00.000Z" }],
    attachments: [{ id: "att-1", name: "brief-clinica-valle.pdf", type: "PDF", uploadedBy: "Ana Sofía Martínez", createdAt: "2026-06-28T11:00:00.000Z" }],
  },
  {
    id: "prj-2",
    name: "Tienda en línea",
    client: "Nova Farma",
    service: "Ecommerce",
    manager: "Carlos Hernández",
    status: "planning",
    dueDate: "2026-08-05",
    budget: "$39,990",
    deliverables: [
      { id: "del-5", title: "Catálogo inicial", owner: "Carlos Hernández", status: "in_progress", dueDate: "2026-07-10", notes: "Importando SKUs base." },
      { id: "del-6", title: "Checkout", owner: "Jorge Ramírez", status: "pending", dueDate: "2026-07-22", notes: "Pendiente pasarela." },
    ],
    comments: [],
    attachments: [],
  },
  {
    id: "prj-3",
    name: "Configuración Google Workspace",
    client: "Hospital Central",
    service: "Google Workspace",
    manager: "Jorge Ramírez",
    status: "review",
    dueDate: "2026-07-08",
    budget: "$3,490",
    deliverables: [
      { id: "del-7", title: "Alta de usuarios", owner: "Jorge Ramírez", status: "done", dueDate: "2026-07-02", notes: "20 usuarios creados." },
      { id: "del-8", title: "DNS y seguridad", owner: "Lucía Gómez", status: "done", dueDate: "2026-07-04", notes: "SPF/DKIM configurado." },
      { id: "del-9", title: "Capacitación", owner: "Valeria Castro", status: "review", dueDate: "2026-07-08", notes: "Sesión agendada." },
    ],
    comments: [{ id: "com-2", author: "Jorge Ramírez", text: "Falta evidencia de capacitación para cierre.", createdAt: "2026-06-30T10:10:00.000Z" }],
    attachments: [],
  },
  {
    id: "prj-4",
    name: "Migración de correos",
    client: "OptiSalud",
    service: "Correos corporativos",
    manager: "Lucía Gómez",
    status: "completed",
    dueDate: "2026-06-22",
    budget: "$1,490",
    deliverables: [
      { id: "del-10", title: "Migración de buzones", owner: "Lucía Gómez", status: "done", dueDate: "2026-06-20", notes: "Completado." },
      { id: "del-11", title: "Validación final", owner: "Ricardo Torres", status: "done", dueDate: "2026-06-22", notes: "Cliente validó." },
    ],
    comments: [],
    attachments: [],
  },
  {
    id: "prj-5",
    name: "Administración DNS",
    client: "Laboratorio Clínico",
    service: "Dominios",
    manager: "Ricardo Torres",
    status: "paused",
    dueDate: "2026-07-30",
    budget: "Variable",
    deliverables: [
      { id: "del-12", title: "Acceso al registrador", owner: "Ricardo Torres", status: "pending", dueDate: "2026-07-05", notes: "Esperando credenciales del cliente." },
      { id: "del-13", title: "Configuración DNS", owner: "Ricardo Torres", status: "pending", dueDate: "2026-07-10", notes: "Bloqueado." },
    ],
    comments: [{ id: "com-3", author: "Ricardo Torres", text: "Proyecto pausado hasta recibir acceso al dominio.", createdAt: "2026-06-30T09:30:00.000Z" }],
    attachments: [],
  },
];

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
  const [projects, setProjects] = useState(demoProjects);
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

  const activeProjects = projectsWithProgress.filter((project) => ["planning", "in_progress", "review"].includes(project.status)).length;
  const completedProjects = projectsWithProgress.filter((project) => project.status === "completed").length;
  const averageProgress = Math.round(projectsWithProgress.reduce((total, project) => total + project.progress, 0) / projectsWithProgress.length);
  const selectedProject = projectsWithProgress.find((project) => project.id === editingId);

  function toForm(project: ProjectItem): ProjectForm {
    return {
      name: project.name,
      client: project.client,
      service: project.service,
      manager: project.manager,
      status: project.status,
      dueDate: project.dueDate,
      budget: project.budget,
    };
  }

  function updateForm(field: keyof ProjectForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
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

    const existing = projects.find((project) => project.id === editingId);
    const nextProject: ProjectItem = {
      id: editingId || crypto.randomUUID(),
      name: form.name,
      client: form.client,
      service: form.service,
      manager: form.manager,
      status: existing?.status || form.status,
      dueDate: form.dueDate,
      budget: form.budget || "Por definir",
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

      {editorMode === "project" && (
        <form className="projects-editor-card" onSubmit={saveProject}>
          <header>
            <div>
              <h3>{editingId ? "Editar proyecto" : "Nuevo proyecto"}</h3>
              <p>Completa los datos generales; el avance se calculará con los entregables.</p>
            </div>
            <div>
              <button className="client-register-cancel" onClick={closeEditor} type="button">Cancelar</button>
              <button className="client-register-save" type="submit"><Save size={17} /> Guardar</button>
            </div>
          </header>
          <div className="projects-editor-grid">
            <label><span>Proyecto <b>*</b></span><input onChange={(event) => updateForm("name", event.target.value)} placeholder="Ej. Portal web corporativo" value={form.name} /></label>
            <label><span>Cliente <b>*</b></span><input onChange={(event) => updateForm("client", event.target.value)} placeholder="Ej. Clínica Valle del Sol" value={form.client} /></label>
            <label>
              <span>Servicio <b>*</b></span>
              <select onChange={(event) => updateForm("service", event.target.value)} value={form.service}>
                <option value="">Seleccionar servicio</option>
                {serviceOptions.map((service) => <option key={service}>{service}</option>)}
              </select>
            </label>
            <label><span>Responsable <b>*</b></span><input onChange={(event) => updateForm("manager", event.target.value)} placeholder="Ej. Ana Sofía Martínez" value={form.manager} /></label>
            <label><span>Entrega <b>*</b></span><input onChange={(event) => updateForm("dueDate", event.target.value)} type="date" value={form.dueDate} /></label>
            <label><span>Presupuesto</span><input onChange={(event) => updateForm("budget", event.target.value)} placeholder="Ej. $14,990 o Variable" value={form.budget} /></label>
            <label>
              <span>Estado</span>
              <select onChange={(event) => updateForm("status", event.target.value)} value={form.status}>
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
        </form>
      )}

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
