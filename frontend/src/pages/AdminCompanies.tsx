import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronRight,
  Download,
  Edit3,
  Filter,
  Globe2,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Store,
  UserCheck,
  UsersRound,
} from "lucide-react";

interface CompanyItem {
  id: string;
  commercialName: string;
  legalName: string;
  rfc: string;
  industry: string;
  status: "active" | "inactive";
  plan: string;
  contactName: string;
  contactRole: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  state: string;
  address: string;
  employees: string;
  createdAt: string;
}

interface CompanyForm {
  commercialName: string;
  legalName: string;
  rfc: string;
  industry: string;
  plan: string;
  status: "active" | "inactive";
  contactName: string;
  contactRole: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  state: string;
  address: string;
  employees: string;
  notes: string;
}

const storageKey = "giovsoft-admin-companies-v2";

const emptyForm: CompanyForm = {
  commercialName: "",
  legalName: "",
  rfc: "",
  industry: "",
  plan: "",
  status: "active",
  contactName: "",
  contactRole: "",
  email: "",
  phone: "",
  website: "",
  city: "",
  state: "",
  address: "",
  employees: "",
  notes: "",
};

const demoCompanies: CompanyItem[] = [];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function planClass(plan: string) {
  return plan
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-MX");
}

function toForm(company: CompanyItem): CompanyForm {
  return {
    commercialName: company.commercialName,
    legalName: company.legalName,
    rfc: company.rfc,
    industry: company.industry,
    plan: company.plan,
    status: company.status,
    contactName: company.contactName,
    contactRole: company.contactRole,
    email: company.email,
    phone: company.phone,
    website: company.website,
    city: company.city,
    state: company.state,
    address: company.address,
    employees: company.employees,
    notes: "",
  };
}

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<CompanyItem[]>(() => {
    const stored = window.localStorage.getItem(storageKey);

    if (!stored) {
      return demoCompanies;
    }

    try {
      return JSON.parse(stored) as CompanyItem[];
    } catch (_error) {
      return demoCompanies;
    }
  });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [industryFilter, setIndustryFilter] = useState("Todas");
  const [planFilter, setPlanFilter] = useState("Todos");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openMenu, setOpenMenu] = useState("");
  const [formMode, setFormMode] = useState<"closed" | "create" | "edit">("closed");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [message, setMessage] = useState("");

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(companies));
  }, [companies]);

  const industries = useMemo(() => Array.from(new Set(companies.map((company) => company.industry))).sort(), [companies]);
  const plans = useMemo(() => Array.from(new Set(companies.map((company) => company.plan))).sort(), [companies]);

  const filteredCompanies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return companies.filter((company) => {
      const matchesQuery =
        !normalizedQuery ||
        `${company.commercialName} ${company.legalName} ${company.rfc} ${company.email}`.toLowerCase().includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "Todos" ||
        (statusFilter === "Activas" ? company.status === "active" : company.status === "inactive");
      const matchesIndustry = industryFilter === "Todas" || company.industry === industryFilter;
      const matchesPlan = planFilter === "Todos" || company.plan === planFilter;

      return matchesQuery && matchesStatus && matchesIndustry && matchesPlan;
    });
  }, [companies, industryFilter, planFilter, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / pageSize));
  const visibleCompanies = filteredCompanies.slice((page - 1) * pageSize, page * pageSize);
  const activeCompanies = companies.filter((company) => company.status === "active").length;
  const inactiveCompanies = companies.filter((company) => company.status === "inactive").length;
  const enterprisePlans = companies.filter((company) => company.plan === "Business").length;

  useEffect(() => {
    setPage(1);
  }, [industryFilter, pageSize, planFilter, query, statusFilter]);

  function updateForm(field: keyof CompanyForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function closeForm() {
    setFormMode("closed");
    setEditingId("");
    setForm(emptyForm);
  }

  function openCreateForm() {
    setMessage("");
    setForm(emptyForm);
    setEditingId("");
    setFormMode("create");
  }

  function openEditForm(company: CompanyItem) {
    setMessage("");
    setForm(toForm(company));
    setEditingId(company.id);
    setOpenMenu("");
    setFormMode("edit");
  }

  function saveCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.commercialName || !form.legalName || !form.rfc || !form.contactName || !form.email) {
      setMessage("Completa los campos obligatorios de la empresa.");
      return;
    }

    const nextCompany: CompanyItem = {
      id: editingId || crypto.randomUUID(),
      commercialName: form.commercialName,
      legalName: form.legalName,
      rfc: form.rfc.toUpperCase(),
      industry: form.industry || "General",
      status: form.status,
      plan: form.plan || "Básico",
      contactName: form.contactName,
      contactRole: form.contactRole,
      email: form.email,
      phone: form.phone,
      website: form.website,
      city: form.city,
      state: form.state,
      address: form.address,
      employees: form.employees,
      createdAt: companies.find((company) => company.id === editingId)?.createdAt || new Date().toISOString(),
    };

    setCompanies((current) =>
      editingId
        ? current.map((company) => (company.id === editingId ? nextCompany : company))
        : [nextCompany, ...current],
    );
    setMessage(editingId ? "Empresa actualizada correctamente." : "Empresa registrada correctamente.");
    closeForm();
  }

  function toggleStatus(company: CompanyItem) {
    const nextStatus = company.status === "inactive" ? "active" : "inactive";
    setCompanies((current) =>
      current.map((item) => (item.id === company.id ? { ...item, status: nextStatus } : item)),
    );
    setMessage(`${company.commercialName} ahora está ${nextStatus === "active" ? "activa" : "inactiva"}.`);
    setOpenMenu("");
  }

  if (formMode !== "closed") {
    return (
      <form className="company-register-shell" onSubmit={saveCompany}>
        <section className="client-register-head">
          <div>
            <h2>{formMode === "edit" ? "Editar empresa" : "Nueva empresa"}</h2>
            <p>Registra los datos fiscales, operativos y de contacto de la empresa.</p>
          </div>
          <div className="client-register-actions">
            <button className="client-register-cancel" onClick={closeForm} type="button">
              Cancelar
            </button>
            <button className="client-register-save" type="submit">
              <Save size={18} />
              Guardar empresa
            </button>
          </div>
        </section>

        {message && <p className="admin-form-error">{message}</p>}

        <section className="company-register-layout">
          <article className="client-register-card">
            <h3>Información general</h3>
            <div className="client-register-grid is-three">
              <label>
                <span className="client-register-label">Nombre comercial <b>*</b></span>
                <input
                  onChange={(event) => updateForm("commercialName", event.target.value)}
                  placeholder="Ej. Empresa demo"
                  value={form.commercialName}
                />
              </label>
              <label>
                <span className="client-register-label">Razón social <b>*</b></span>
                <input
                  onChange={(event) => updateForm("legalName", event.target.value)}
                  placeholder="Ej. Empresa demo S.C."
                  value={form.legalName}
                />
              </label>
              <label>
                <span className="client-register-label">RFC <b>*</b></span>
                <input
                  onChange={(event) => updateForm("rfc", event.target.value)}
                  placeholder="Ej. CVS850101123"
                  value={form.rfc}
                />
              </label>
              <label>
                <span className="client-register-label">Industria</span>
                <input
                  onChange={(event) => updateForm("industry", event.target.value)}
                  placeholder="Ej. Salud"
                  value={form.industry}
                />
              </label>
              <label>
                <span className="client-register-label">Tamaño de empresa</span>
                <select onChange={(event) => updateForm("employees", event.target.value)} value={form.employees}>
                  <option value="">Seleccionar tamaño</option>
                  <option>1-10</option>
                  <option>11-50</option>
                  <option>51-200</option>
                  <option>201-500</option>
                  <option>500+</option>
                </select>
              </label>
              <label>
                <span className="client-register-label">Sitio web</span>
                <span className="client-register-input-icon">
                  <Globe2 size={18} />
                  <input
                    onChange={(event) => updateForm("website", event.target.value)}
                    placeholder="Ej. www.empresa.com"
                    value={form.website}
                  />
                </span>
              </label>
            </div>
          </article>

          <article className="client-register-card">
            <h3>Contacto principal</h3>
            <div className="client-register-grid is-three">
              <label>
                <span className="client-register-label">Nombre del contacto <b>*</b></span>
                <input
                  onChange={(event) => updateForm("contactName", event.target.value)}
                  placeholder="Ej. Dra. Ana Martínez"
                  value={form.contactName}
                />
              </label>
              <label>
                <span className="client-register-label">Puesto / Cargo</span>
                <input
                  onChange={(event) => updateForm("contactRole", event.target.value)}
                  placeholder="Ej. Directora General"
                  value={form.contactRole}
                />
              </label>
              <label>
                <span className="client-register-label">Correo electrónico <b>*</b></span>
                <span className="client-register-input-icon">
                  <Mail size={18} />
                  <input
                    onChange={(event) => updateForm("email", event.target.value)}
                    placeholder="ejemplo@dominio.com"
                    type="email"
                    value={form.email}
                  />
                </span>
              </label>
              <label>
                <span className="client-register-label">Teléfono</span>
                <span className="client-register-input-icon">
                  <Phone size={18} />
                  <input
                    onChange={(event) => updateForm("phone", event.target.value)}
                    placeholder="+52 33 1234 5678"
                    value={form.phone}
                  />
                </span>
              </label>
              <label>
                <span className="client-register-label">Plan asignado</span>
                <select onChange={(event) => updateForm("plan", event.target.value)} value={form.plan}>
                  <option value="">Seleccionar plan</option>
                  <option>Básico</option>
                  <option>Profesional</option>
                  <option>Avanzado</option>
                  <option>Business</option>
                </select>
              </label>
              <label>
                <span className="client-register-label">Estado</span>
                <select onChange={(event) => updateForm("status", event.target.value)} value={form.status}>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </label>
            </div>
          </article>

          <section className="client-register-bottom-grid">
            <article className="client-register-card">
              <h3>Ubicación</h3>
              <div className="client-register-grid is-two">
                <label>
                  <span className="client-register-label">Estado</span>
                  <input onChange={(event) => updateForm("state", event.target.value)} placeholder="Ej. Jalisco" value={form.state} />
                </label>
                <label>
                  <span className="client-register-label">Ciudad</span>
                  <input onChange={(event) => updateForm("city", event.target.value)} placeholder="Ej. Guadalajara" value={form.city} />
                </label>
                <label className="client-register-wide">
                  <span className="client-register-label">Dirección fiscal</span>
                  <input
                    onChange={(event) => updateForm("address", event.target.value)}
                    placeholder="Ej. Av. México 1234"
                    value={form.address}
                  />
                </label>
              </div>
            </article>
            <article className="client-register-card">
              <h3>Información adicional</h3>
              <div className="client-register-grid">
                <label className="client-register-wide">
                  <span className="client-register-label">Observaciones</span>
                  <textarea
                    maxLength={500}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    placeholder="Notas operativas de la empresa..."
                    value={form.notes}
                  />
                  <small>{form.notes.length}/500</small>
                </label>
              </div>
            </article>
          </section>
        </section>
      </form>
    );
  }

  return (
    <section className="companies-module-shell">
      <div className="clients-page-head">
        <div>
          <h2>Empresas</h2>
          <p>Administra las organizaciones, contactos fiscales y cuentas asociadas al sistema.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-primary-action" onClick={openCreateForm} type="button">
            <Plus size={20} />
            Nueva empresa
          </button>
          <button className="clients-action-caret" type="button">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {message && <p className="admin-form-success">{message}</p>}

      <div className="clients-stats-grid">
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-blue"><Building2 size={27} /></span>
          <div><p>Empresas totales</p><h3>{companies.length}</h3><small className="is-positive">↑ 12.5% vs. mes anterior</small></div>
        </article>
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-green"><ShieldCheck size={27} /></span>
          <div><p>Empresas activas</p><h3>{activeCompanies}</h3><small className="is-positive">↑ 8.3% vs. mes anterior</small></div>
        </article>
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-purple"><Store size={27} /></span>
          <div><p>Planes Business</p><h3>{enterprisePlans}</h3><small className="is-neutral">↑ 0% vs. mes anterior</small></div>
        </article>
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-orange"><UsersRound size={27} /></span>
          <div><p>Inactivas</p><h3>{inactiveCompanies}</h3><small className="is-negative">↓ 4.7% vs. mes anterior</small></div>
        </article>
      </div>

      <article className="companies-table-card">
        <div className="companies-table-toolbar">
          <label className="clients-table-search">
            <Search size={19} />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar empresa por nombre, RFC o correo..."
              value={query}
            />
          </label>
          <label className="clients-filter-field">
            Estado
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option>Todos</option>
              <option>Activas</option>
              <option>Inactivas</option>
            </select>
          </label>
          <label className="clients-filter-field">
            Industria
            <select onChange={(event) => setIndustryFilter(event.target.value)} value={industryFilter}>
              <option>Todas</option>
              {industries.map((industry) => <option key={industry}>{industry}</option>)}
            </select>
          </label>
          <label className="clients-filter-field">
            Plan
            <select onChange={(event) => setPlanFilter(event.target.value)} value={planFilter}>
              <option>Todos</option>
              {plans.map((plan) => <option key={plan}>{plan}</option>)}
            </select>
          </label>
          <button className="clients-filter-button" type="button"><Filter size={18} /> Filtros</button>
          <button className="clients-download-button" type="button"><Download size={18} /></button>
        </div>

        <div className="clients-table-wrap">
          <table className="companies-data-table">
            <thead>
              <tr>
                <th><input type="checkbox" /></th>
                <th>Empresa</th>
                <th>RFC</th>
                <th>Contacto</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th>Ubicación</th>
                <th>Plan</th>
                <th>Estado</th>
                <th>Fecha de registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibleCompanies.map((company, index) => {
                const isInactive = company.status === "inactive";

                return (
                  <tr key={company.id}>
                    <td><input type="checkbox" /></td>
                    <td>
                      <span className="clients-name-cell">
                        <span className={`clients-avatar clients-avatar-${(index % 6) + 1}`}>{initials(company.commercialName)}</span>
                        <span>
                          <strong>{company.commercialName}</strong>
                          <small>{company.legalName}</small>
                        </span>
                      </span>
                    </td>
                    <td>{company.rfc}</td>
                    <td>
                      <span className="clients-contact-cell">
                        <strong>{company.contactName}</strong>
                        <small>{company.contactRole || company.industry}</small>
                      </span>
                    </td>
                    <td>{company.email}</td>
                    <td>{company.phone}</td>
                    <td>
                      <span className="company-location-cell">
                        <MapPin size={16} />
                        {company.city}, {company.state}
                      </span>
                    </td>
                    <td><span className={`clients-plan-badge is-${planClass(company.plan)}`}>{company.plan}</span></td>
                    <td>
                      <span className={`clients-status-badge is-${isInactive ? "inactive" : "active"}`}>
                        {isInactive ? "Inactiva" : "Activa"}
                      </span>
                    </td>
                    <td>{formatDate(company.createdAt)}</td>
                    <td>
                      <button
                        className="clients-row-action"
                        onClick={() => setOpenMenu(openMenu === company.id ? "" : company.id)}
                        type="button"
                      >
                        <MoreVertical size={20} />
                      </button>
                      <div className={`clients-action-menu ${openMenu === company.id ? "is-open" : ""}`}>
                        <button onClick={() => openEditForm(company)} type="button"><Edit3 size={15} /> Editar</button>
                        <button onClick={() => toggleStatus(company)} type="button">
                          <UserCheck size={15} />
                          {isInactive ? "Activar" : "Inhabilitar"}
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
            Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, filteredCompanies.length)} de{" "}
            {filteredCompanies.length} empresas
          </span>
          <nav className="clients-pagination">
            <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">‹</button>
            {Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index + 1).map((item) => (
              <button className={page === item ? "is-active" : ""} key={item} onClick={() => setPage(item)} type="button">
                {item}
              </button>
            ))}
            {totalPages > 3 && <span>+ ... +</span>}
            {totalPages > 3 && <button onClick={() => setPage(totalPages)} type="button">{totalPages}</button>}
            <button disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">›</button>
          </nav>
          <select onChange={(event) => setPageSize(Number(event.target.value))} value={pageSize}>
            <option value={10}>10 por página</option>
            <option value={25}>25 por página</option>
            <option value={50}>50 por página</option>
          </select>
        </footer>
      </article>
    </section>
  );
}
