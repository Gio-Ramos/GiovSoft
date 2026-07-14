import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, DollarSign, Layers, MoreVertical, PlugZap, Save, TrendingUp } from "lucide-react";
import { useCloseOnOutsideClick } from "../hooks/useCloseOnOutsideClick";
import { api } from "../lib/api";

interface BusinessLineApplication {
  id: string;
  name: string;
  status: string;
}

interface BusinessLine {
  id: string;
  slug: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  status: "active" | "archived";
  metrics: {
    applications: number;
    events: number;
    payments: number;
    revenue: number;
  };
  applications: BusinessLineApplication[];
  createdAt: string;
  updatedAt: string;
}

interface BusinessLineForm {
  name: string;
  slug: string;
  description: string;
  color: string;
}

const emptyForm: BusinessLineForm = {
  color: "#B08D57",
  description: "",
  name: "",
  slug: "",
};

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value || 0);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminBusinessLines() {
  const [businessLines, setBusinessLines] = useState<BusinessLine[]>([]);
  const [form, setForm] = useState<BusinessLineForm>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [openMenu, setOpenMenu] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useCloseOnOutsideClick(Boolean(openMenu), () => setOpenMenu(""));

  useEffect(() => {
    loadBusinessLines();
  }, []);

  async function loadBusinessLines() {
    setLoading(true);
    setMessage("");

    try {
      const response = await api.get("/api/admin/business-lines");
      setBusinessLines(response.data.businessLines || []);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "No se pudieron cargar las líneas de negocio.");
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    return businessLines.reduce(
      (accumulated, line) => ({
        active: accumulated.active + (line.status === "active" ? 1 : 0),
        applications: accumulated.applications + Number(line.metrics?.applications || 0),
        revenue: accumulated.revenue + Number(line.metrics?.revenue || 0),
      }),
      { active: 0, applications: 0, revenue: 0 },
    );
  }, [businessLines]);

  const topLine = useMemo(() => {
    return businessLines.reduce<BusinessLine | null>(
      (best, line) => (Number(line.metrics?.revenue || 0) > Number(best?.metrics?.revenue || 0) ? line : best),
      null,
    );
  }, [businessLines]);

  function openNewLine() {
    setEditingId("");
    setForm(emptyForm);
    setShowForm(true);
    setMessage("");
  }

  function openEditLine(line: BusinessLine) {
    setEditingId(line.id);
    setForm({ color: line.color || "#B08D57", description: line.description, name: line.name, slug: line.slug });
    setOpenMenu("");
    setShowForm(true);
    setMessage("");
  }

  async function saveLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const payload = { color: form.color, description: form.description, name: form.name, slug: form.slug };
      const response = editingId
        ? await api.patch(`/api/admin/business-lines/${editingId}`, payload)
        : await api.post("/api/admin/business-lines", payload);

      setShowForm(false);
      setEditingId("");
      setForm(emptyForm);
      setMessage(response.data.message || "Línea de negocio guardada.");
      await loadBusinessLines();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "No se pudo guardar la línea de negocio.");
    }
  }

  async function updateStatus(line: BusinessLine, status: "active" | "archived") {
    setOpenMenu("");
    try {
      const response = await api.patch(`/api/admin/business-lines/${line.id}`, { status });
      setMessage(response.data.message || "Línea actualizada.");
      await loadBusinessLines();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "No se pudo actualizar la línea.");
    }
  }

  return (
    <section className="applications-module-shell">
      <div className="clients-page-head">
        <div>
          <h2>Líneas de negocio</h2>
          <p>Organiza los productos de GiovSoft y consolida ventas globales y por línea.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-primary-action" onClick={openNewLine} type="button">
            <Layers size={20} /> Nueva línea
          </button>
        </div>
      </div>

      {message && <p className={message.includes("No se") || message.includes("Ya existe") ? "admin-form-error" : "admin-form-success"}>{message}</p>}

      <div className="clients-stats-grid">
        <article className="clients-stat-card"><span className="clients-stat-icon is-blue"><Layers size={27} /></span><div><p>Líneas</p><h3>{businessLines.length}</h3><small>{loading ? "Cargando..." : `${totals.active} activas`}</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-green"><DollarSign size={27} /></span><div><p>Ingresos globales</p><h3>{money(totals.revenue)}</h3><small>Todas las líneas</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-purple"><PlugZap size={27} /></span><div><p>Aplicaciones</p><h3>{totals.applications}</h3><small>Conectadas a una línea</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-orange"><TrendingUp size={27} /></span><div><p>Línea top</p><h3>{topLine && topLine.metrics.revenue > 0 ? topLine.name : "—"}</h3><small>{topLine && topLine.metrics.revenue > 0 ? money(topLine.metrics.revenue) : "Sin ventas aún"}</small></div></article>
      </div>

      <article className="billing-table-card applications-card">
        {showForm && (
          <form className="applications-entry-form" onSubmit={saveLine}>
            <label>
              <span>Nombre <b>*</b></span>
              <input
                onChange={(event) => {
                  const name = event.target.value;
                  setForm((current) => ({
                    ...current,
                    name,
                    slug: editingId ? current.slug : slugify(name),
                  }));
                }}
                placeholder="Ej. Gesove"
                value={form.name}
              />
            </label>
            <label>
              <span>Identificador (slug) {editingId ? "" : <b>*</b>}</span>
              <input
                disabled={Boolean(editingId)}
                onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))}
                placeholder="gesove"
                value={form.slug}
              />
            </label>
            <label><span>Color</span><input onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} type="color" value={form.color} /></label>
            <label className="billing-entry-wide"><span>Descripción</span><input onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Invitaciones digitales para eventos" value={form.description} /></label>
            <div className="billing-entry-actions applications-entry-actions">
              <button onClick={() => setShowForm(false)} type="button">Cancelar</button>
              <button type="submit"><Save size={16} /> {editingId ? "Guardar cambios" : "Crear línea"}</button>
            </div>
          </form>
        )}

        <div className="clients-table-wrap">
          <table className="billing-data-table applications-data-table">
            <thead><tr><th>Línea</th><th>Identificador</th><th>Aplicaciones</th><th>Eventos</th><th>Ingresos</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {businessLines.map((line) => (
                <tr key={line.id}>
                  <td>
                    <span className="business-line-chip" style={{ backgroundColor: `${line.color || "#B08D57"}22`, color: line.color || "#B08D57" }}>{line.name}</span>
                    <small>{line.description || "Sin descripción"}</small>
                  </td>
                  <td><code>{line.slug}</code></td>
                  <td>
                    <strong>{line.metrics?.applications || 0}</strong>
                    {line.applications.length > 0 && <small>{line.applications.map((app) => app.name).join(", ")}</small>}
                  </td>
                  <td>{line.metrics?.events || 0}</td>
                  <td><strong>{money(line.metrics?.revenue || 0)}</strong></td>
                  <td><span className={`billing-status is-${line.status === "active" ? "active" : "paused"}`}>{line.status === "active" ? "Activa" : "Archivada"}</span></td>
                  <td>
                    <button className="clients-row-action" onClick={() => setOpenMenu(openMenu === line.id ? "" : line.id)} type="button"><MoreVertical size={20} /></button>
                    <div className={`clients-action-menu ${openMenu === line.id ? "is-open" : ""}`}>
                      <button onClick={() => openEditLine(line)} type="button">Editar</button>
                      {line.status === "active" ? (
                        <button onClick={() => updateStatus(line, "archived")} type="button"><Archive size={15} /> Archivar</button>
                      ) : (
                        <button onClick={() => updateStatus(line, "active")} type="button"><CheckCircle2 size={15} /> Reactivar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && businessLines.length === 0 && (
                <tr>
                  <td className="quotes-empty-row" colSpan={7}>No hay líneas de negocio registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
