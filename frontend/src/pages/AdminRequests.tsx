import { Mail, MessageCircle, PhoneCall, Save, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

interface RequestNote {
  id: string;
  body: string;
  status: string;
  statusLabel: string;
  createdAt: string;
}

interface ContactRequest {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  service?: string;
  message: string;
  status: string;
  statusLabel?: string;
  emailStatus?: string;
  notes?: RequestNote[];
  statusHistory?: Array<{
    status: string;
    label: string;
    note: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt?: string;
}

const statusOptions = [
  { value: "all", label: "Todas" },
  { value: "new", label: "Nuevas" },
  { value: "contacted", label: "Contactado" },
  { value: "in_progress", label: "En seguimiento" },
  { value: "info_only", label: "Solo información" },
  { value: "converted", label: "Cliente" },
  { value: "lost", label: "Perdidas" },
];

const editableStatuses = statusOptions.filter((status) => status.value !== "all");

function formatDate(value?: string) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusLabel(request: ContactRequest) {
  return request.statusLabel || statusOptions.find((status) => status.value === request.status)?.label || "Nueva";
}

export default function AdminRequests() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState("all");
  const [status, setStatus] = useState("new");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .get<{ requests: ContactRequest[] }>("/api/admin/contact-requests")
      .then((response) => {
        setRequests(response.data.requests);
        setSelectedId(response.data.requests[0]?.id || "");
      })
      .catch(() => setMessage("No se pudieron cargar las solicitudes."))
      .finally(() => setLoading(false));
  }, []);

  const filteredRequests = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter((request) => (request.status || "new") === filter);
  }, [filter, requests]);

  const selectedRequest = filteredRequests.find((request) => request.id === selectedId) || filteredRequests[0];

  useEffect(() => {
    if (selectedRequest) {
      setStatus(selectedRequest.status || "new");
      setNote("");
    }
  }, [selectedRequest?.id, selectedRequest?.status]);

  function selectRequest(request: ContactRequest) {
    setSelectedId(request.id);
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRequest) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await api.patch<{ request: ContactRequest }>(`/api/admin/contact-requests/${selectedRequest.id}`, {
        status,
        note,
      });

      setRequests((currentRequests) =>
        currentRequests.map((request) => (request.id === response.data.request.id ? response.data.request : request))
      );
      setNote("");
      setMessage("Expediente actualizado.");
    } catch {
      setMessage("No se pudo actualizar el expediente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-requests-shell">
      <section className="requests-toolbar surface-card">
        <div>
          <p className="eyebrow">Solicitudes</p>
          <h2>Seguimiento comercial</h2>
          <span>{requests.length} solicitudes registradas</span>
        </div>

        <div className="requests-filter">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              className={filter === option.value ? "is-active" : ""}
              onClick={() => setFilter(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="requests-workspace">
        <article className="requests-list surface-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Entrada</p>
              <h3>Solicitudes entrantes</h3>
            </div>
            <span className="live-badge">{loading ? "Cargando" : `${filteredRequests.length} visibles`}</span>
          </div>

          <div className="requests-list-body">
            {filteredRequests.length === 0 && (
              <div className="empty-state">
                <UserRound size={22} />
                <p>No hay solicitudes en este estado.</p>
              </div>
            )}

            {filteredRequests.map((request) => (
              <button
                key={request.id}
                className={`admin-request-row ${selectedRequest?.id === request.id ? "is-selected" : ""}`}
                onClick={() => selectRequest(request)}
                type="button"
              >
                <span className="request-row-avatar">
                  <UserRound size={18} />
                </span>
                <span className="request-row-copy">
                  <strong>{request.name}</strong>
                  <small>{request.service || "Servicio por definir"} · {formatDate(request.createdAt)}</small>
                  <em>{request.message}</em>
                </span>
                <span className={`request-stage is-${request.status || "new"}`}>{getStatusLabel(request)}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="request-file surface-card">
          {selectedRequest ? (
            <>
              <div className="request-file-head">
                <div>
                  <p className="eyebrow">Expediente</p>
                  <h3>{selectedRequest.name}</h3>
                  <span>{selectedRequest.company || "Empresa no especificada"}</span>
                </div>
                <span className={`request-stage is-${selectedRequest.status || "new"}`}>{getStatusLabel(selectedRequest)}</span>
              </div>

              <div className="request-file-grid">
                <a href={`mailto:${selectedRequest.email}`}>
                  <Mail size={17} />
                  {selectedRequest.email}
                </a>
                {selectedRequest.phone && (
                  <a href={`https://wa.me/52${selectedRequest.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                    <PhoneCall size={17} />
                    {selectedRequest.phone}
                  </a>
                )}
                <span>
                  <MessageCircle size={17} />
                  {selectedRequest.service || "Servicio por definir"}
                </span>
              </div>

              <div className="request-message-box">
                <strong>Mensaje inicial</strong>
                <p>{selectedRequest.message}</p>
              </div>

              <form className="request-followup-form" onSubmit={handleSubmit}>
                <label>
                  Estado del expediente
                  <select value={status} onChange={(event) => setStatus(event.target.value)}>
                    {editableStatuses.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Nota de seguimiento
                  <textarea
                    rows={5}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Ej. Se contacto por WhatsApp, esta revisando propuesta..."
                  />
                </label>

                <button className="primary-button request-save-button" disabled={saving} type="submit">
                  <Save size={16} />
                  {saving ? "Guardando" : "Guardar seguimiento"}
                </button>
              </form>

              {message && <p className="request-admin-message">{message}</p>}

              <div className="request-timeline">
                <p className="eyebrow">Historial</p>
                {(selectedRequest.statusHistory || []).length === 0 && <span>Sin movimientos registrados.</span>}
                {(selectedRequest.statusHistory || []).map((item, index) => (
                  <div key={`${item.createdAt}-${index}`} className="request-timeline-item">
                    <strong>{item.label}</strong>
                    <small>{formatDate(item.createdAt)}</small>
                    <p>{item.note}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <UserRound size={22} />
              <p>Selecciona una solicitud para abrir su expediente.</p>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
