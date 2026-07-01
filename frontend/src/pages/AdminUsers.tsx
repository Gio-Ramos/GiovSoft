import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileBarChart,
  Filter,
  FolderKanban,
  ImagePlus,
  Info,
  KeyRound,
  Lock,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  ReceiptText,
  Save,
  Settings2,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UsersRound,
  UserX,
} from "lucide-react";
import { getAdminToken, readAdminUser, type AdminUser } from "../lib/adminSession";

const temporaryPassword = "123456";

const roleOptions = ["Administrador", "Gerente", "Editor", "Analista", "Soporte", "Invitado"];
const companyOptions = ["GiovSoft Technologies", "Cliente Externo", "Clínica Valle del Sol", "Hospital Central"];

const demoUsers: AdminUser[] = [
  {
    id: "demo-1",
    name: "Giovanni Ramos",
    email: "giovanni@giovsoft.com",
    role: "Administrador",
    status: "active",
    passwordChangeRequired: false,
    lastLoginAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    name: "María Fernanda López",
    email: "maria.lopez@giovsoft.com",
    role: "Gerente",
    status: "active",
    passwordChangeRequired: false,
    lastLoginAt: new Date().toISOString(),
  },
  {
    id: "demo-3",
    name: "Carlos Hernández",
    email: "carlos.hdz@giovsoft.com",
    role: "Editor",
    status: "active",
    passwordChangeRequired: true,
    lastLoginAt: "2026-06-28T16:21:00.000Z",
  },
  {
    id: "demo-4",
    name: "Ana Sofía Martínez",
    email: "ana.martinez@giovsoft.com",
    role: "Analista",
    status: "active",
    passwordChangeRequired: false,
    lastLoginAt: "2026-06-28T14:15:00.000Z",
  },
  {
    id: "demo-5",
    name: "Jorge Ramírez",
    email: "jorge.ramirez@giovsoft.com",
    role: "Soporte",
    status: "active",
    passwordChangeRequired: false,
    lastLoginAt: "2026-06-27T11:08:00.000Z",
  },
  {
    id: "demo-6",
    name: "Lucía Gómez",
    email: "lucia.gomez@giovsoft.com",
    role: "Editor",
    status: "inactive",
    passwordChangeRequired: true,
    lastLoginAt: "2026-05-15T10:00:00.000Z",
  },
  {
    id: "demo-7",
    name: "Ricardo Torres",
    email: "ricardo.torres@cliente.com",
    role: "Invitado",
    status: "inactive",
    passwordChangeRequired: true,
    lastLoginAt: "2026-05-10T09:00:00.000Z",
  },
  {
    id: "demo-8",
    name: "Valeria Castro",
    email: "valeria.castro@giovsoft.com",
    role: "Analista",
    status: "active",
    passwordChangeRequired: false,
    lastLoginAt: "2026-05-08T08:30:00.000Z",
  },
];

const initialUserForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  username: "",
  password: temporaryPassword,
  confirmPassword: temporaryPassword,
  role: "",
  company: "",
  status: "active",
  position: "",
  department: "",
  notes: "",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function roleClass(role: string) {
  return role
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function usernameFromEmail(email: string) {
  return email.split("@")[0] || "";
}

function userHandle(user: AdminUser) {
  return usernameFromEmail(user.email) || user.name.toLowerCase().replace(/\s+/g, ".");
}

function lastAccessLabel(value?: string) {
  if (!value) {
    return "Sin acceso";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin acceso";
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return `Hoy, ${date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`;
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return `Ayer, ${date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`;
  }

  return date.toLocaleDateString("es-MX");
}

function isDemoUser(user: AdminUser) {
  return user.id.startsWith("demo-");
}

export default function AdminUsers() {
  const currentUser = readAdminUser();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [demoUserState, setDemoUserState] = useState(demoUsers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [companyFilter, setCompanyFilter] = useState("Todas");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [openMenu, setOpenMenu] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialUserForm);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      return;
    }

    fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("No se pudieron cargar los usuarios.");
        }
        return response.json();
      })
      .then((data: { users: AdminUser[] }) => setUsers(data.users))
      .catch((requestError: Error) => setError(requestError.message));
  }, []);

  const sourceUsers = useMemo(() => {
    const realEmails = new Set(users.map((user) => user.email));
    const fallbackUsers = demoUserState.filter((user) => !realEmails.has(user.email));
    return [...users, ...fallbackUsers].slice(0, Math.max(8, users.length));
  }, [demoUserState, users]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sourceUsers.filter((user) => {
      const matchesQuery =
        !normalizedQuery ||
        `${user.name} ${user.email} ${userHandle(user)}`.toLowerCase().includes(normalizedQuery);
      const matchesRole = roleFilter === "Todos" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "Todos" ||
        (statusFilter === "Activos" ? user.status === "active" : user.status === "inactive");
      const matchesCompany = companyFilter === "Todas" || companyForUser(user) === companyFilter;

      return matchesQuery && matchesRole && matchesStatus && matchesCompany;
    });
  }, [companyFilter, query, roleFilter, sourceUsers, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const visibleUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);
  const activeUsers = sourceUsers.filter((user) => user.status === "active").length;
  const inactiveUsers = sourceUsers.filter((user) => user.status !== "active").length;
  const adminUsers = sourceUsers.filter((user) => user.role === "Administrador").length;

  useEffect(() => {
    setPage(1);
  }, [companyFilter, pageSize, query, roleFilter, statusFilter]);

  function companyForUser(user: AdminUser) {
    return user.email.includes("@cliente.com") ? "Cliente Externo" : "GiovSoft Technologies";
  }

  function updateForm(field: keyof typeof initialUserForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "email" && !current.username ? { username: usernameFromEmail(value) } : {}),
    }));
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setForm(initialUserForm);
    setError("");
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const token = getAdminToken();
    const name = `${form.firstName} ${form.lastName}`.trim();

    if (!name || !form.email || !form.username || !form.role || !form.company) {
      setError("Completa los campos obligatorios del usuario.");
      setSaving(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("La contraseña y la confirmación no coinciden.");
      setSaving(false);
      return;
    }

    try {
      if (!token) {
        throw new Error("No hay sesión administrativa activa.");
      }

      const response = await fetch("/api/admin/users", {
        body: JSON.stringify({ name, email: form.email, role: form.role }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "No se pudo crear el usuario.");
      }

      let createdUser = data.user as AdminUser;

      if (form.status !== "active") {
        const statusResponse = await fetch(`/api/admin/users/${createdUser.id}`, {
          body: JSON.stringify({ name: createdUser.name, role: createdUser.role, status: form.status }),
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          method: "PATCH",
        });
        const statusData = await statusResponse.json();

        if (!statusResponse.ok) {
          throw new Error(statusData.message || "El usuario se creó, pero no se pudo actualizar su estado.");
        }

        createdUser = statusData.user;
      }

      setUsers((current) => [createdUser, ...current.filter((user) => user.id !== createdUser.id)]);
      setMessage(`Usuario creado. Contraseña temporal: ${data.temporaryPassword || temporaryPassword}.`);
      closeCreateForm();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo crear el usuario.");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(user: AdminUser) {
    if (isDemoUser(user)) {
      setMessage(`Contraseña restablecida para ${user.name}. Temporal: ${temporaryPassword}.`);
      setOpenMenu("");
      return;
    }

    const token = getAdminToken();
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        headers: { Authorization: `Bearer ${token}` },
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "No se pudo restablecer la contraseña.");
      }

      setUsers((current) => current.map((item) => (item.id === user.id ? data.user : item)));
      setMessage(`Contraseña restablecida. Temporal: ${data.temporaryPassword || temporaryPassword}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo restablecer la contraseña.");
    } finally {
      setOpenMenu("");
    }
  }

  async function toggleUserStatus(user: AdminUser) {
    const nextStatus = user.status === "inactive" ? "active" : "inactive";
    setError("");
    setMessage("");

    if (isDemoUser(user)) {
      setDemoUserState((current) =>
        current.map((item) => (item.id === user.id ? { ...item, status: nextStatus } : item)),
      );
      setMessage(`${user.name} ahora está ${nextStatus === "active" ? "activo" : "inactivo"}.`);
      setOpenMenu("");
      return;
    }

    const token = getAdminToken();

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        body: JSON.stringify({ name: user.name, role: user.role, status: nextStatus }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "No se pudo actualizar el usuario.");
      }

      setUsers((current) => current.map((item) => (item.id === user.id ? data.user : item)));
      setMessage(`${user.name} ahora está ${nextStatus === "active" ? "activo" : "inactivo"}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo actualizar el usuario.");
    } finally {
      setOpenMenu("");
    }
  }

  if (showCreateForm) {
    return (
      <form className="user-register-shell" onSubmit={handleCreateUser}>
        <section className="user-register-head">
          <div>
            <h2>Nuevo usuario</h2>
            <p>Completa la información para crear una nueva cuenta de usuario.</p>
          </div>
          <div className="user-register-actions">
            <button className="user-register-cancel" onClick={closeCreateForm} type="button">
              Cancelar
            </button>
            <button className="user-register-save" disabled={saving} type="submit">
              <Save size={18} />
              Guardar usuario
            </button>
          </div>
        </section>

        {error && <p className="admin-form-error">{error}</p>}

        <section className="user-register-layout">
          <div className="user-register-main">
            <article className="user-register-card">
              <h3>Información personal</h3>
              <div className="user-register-grid is-two">
                <label>
                  <span className="user-register-label">Nombre(s) <b>*</b></span>
                  <input
                    onChange={(event) => updateForm("firstName", event.target.value)}
                    placeholder="Ej. María Fernanda"
                    value={form.firstName}
                  />
                </label>
                <label>
                  <span className="user-register-label">Apellido(s) <b>*</b></span>
                  <input
                    onChange={(event) => updateForm("lastName", event.target.value)}
                    placeholder="Ej. López García"
                    value={form.lastName}
                  />
                </label>
                <label>
                  <span className="user-register-label">Correo electrónico <b>*</b></span>
                  <span className="user-register-input-icon">
                    <Mail size={18} />
                    <input
                      onChange={(event) => updateForm("email", event.target.value)}
                      placeholder="Ej. maria.lopez@giovsoft.com"
                      type="email"
                      value={form.email}
                    />
                  </span>
                </label>
                <label>
                  <span className="user-register-label">Teléfono (opcional)</span>
                  <span className="user-register-input-icon">
                    <Phone size={18} />
                    <input
                      onChange={(event) => updateForm("phone", event.target.value)}
                      placeholder="Ej. +52 33 1234 5678"
                      value={form.phone}
                    />
                  </span>
                </label>
                <label className="user-register-wide">
                  <span className="user-register-label">Foto de perfil (opcional)</span>
                  <span className="user-photo-upload">
                    <span className="user-photo-icon"><ImagePlus size={24} /></span>
                    <span>
                      Arrastra una imagen aquí o
                      <button type="button">Seleccionar archivo</button>
                      <small>JPG, PNG o WEBP. Máx. 2MB</small>
                    </span>
                  </span>
                </label>
              </div>
            </article>

            <article className="user-register-card">
              <h3>Credenciales de acceso</h3>
              <div className="user-register-grid">
                <label>
                  <span className="user-register-label">Nombre de usuario <b>*</b></span>
                  <span className="user-register-input-icon">
                    <UserPlus size={18} />
                    <input
                      onChange={(event) => updateForm("username", event.target.value)}
                      placeholder="Ej. mlopez"
                      value={form.username}
                    />
                  </span>
                </label>
                <label>
                  <span className="user-register-label">Contraseña temporal <b>*</b></span>
                  <span className="user-register-input-icon">
                    <Lock size={18} />
                    <input
                      onChange={(event) => updateForm("password", event.target.value)}
                      type="password"
                      value={form.password}
                    />
                    <KeyRound size={18} />
                  </span>
                  <small>El usuario deberá cambiarla en su primer inicio de sesión.</small>
                </label>
                <label>
                  <span className="user-register-label">Confirmar contraseña <b>*</b></span>
                  <span className="user-register-input-icon">
                    <Lock size={18} />
                    <input
                      onChange={(event) => updateForm("confirmPassword", event.target.value)}
                      type="password"
                      value={form.confirmPassword}
                    />
                  </span>
                </label>
              </div>
            </article>

            <article className="user-register-card user-register-wide-card">
              <h3>Asignación y permisos</h3>
              <div className="user-register-grid is-three">
                <label>
                  <span className="user-register-label">Rol <b>*</b></span>
                  <select onChange={(event) => updateForm("role", event.target.value)} value={form.role}>
                    <option value="">Seleccionar rol</option>
                    {roleOptions.map((role) => <option key={role}>{role}</option>)}
                  </select>
                  <small>Define el rol que tendrá el usuario en el sistema.</small>
                </label>
                <label>
                  <span className="user-register-label">Empresa <b>*</b></span>
                  <select onChange={(event) => updateForm("company", event.target.value)} value={form.company}>
                    <option value="">Seleccionar empresa</option>
                    {companyOptions.map((company) => <option key={company}>{company}</option>)}
                  </select>
                  <small>La empresa determina el alcance de acceso del usuario.</small>
                </label>
                <label>
                  <span className="user-register-label">Estado de la cuenta <b>*</b></span>
                  <select onChange={(event) => updateForm("status", event.target.value)} value={form.status}>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                  <small>Puedes cambiar el estado en cualquier momento.</small>
                </label>
              </div>
            </article>

            <article className="user-register-card user-register-wide-card">
              <h3>Información adicional</h3>
              <div className="user-register-grid is-two">
                <label>
                  <span className="user-register-label">Puesto / Cargo</span>
                  <input
                    onChange={(event) => updateForm("position", event.target.value)}
                    placeholder="Ej. Analista de Sistemas"
                    value={form.position}
                  />
                </label>
                <label>
                  <span className="user-register-label">Departamento / Área</span>
                  <input
                    onChange={(event) => updateForm("department", event.target.value)}
                    placeholder="Ej. Tecnología"
                    value={form.department}
                  />
                </label>
                <label className="user-register-wide">
                  <span className="user-register-label">Observaciones (opcional)</span>
                  <textarea
                    maxLength={500}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    placeholder="Información adicional sobre el usuario..."
                    value={form.notes}
                  />
                  <small>{form.notes.length}/500</small>
                </label>
              </div>
            </article>
          </div>

          <aside className="user-role-side">
            <div className="user-role-icon"><ShieldCheck size={38} /></div>
            <p>El rol define los permisos y módulos que el usuario podrá visualizar y gestionar.</p>
            <hr />
            <h3>Permisos principales</h3>
            <ul className="user-permission-list">
              <li><ShieldCheck size={18} /> Acceso al panel</li>
              <li><UsersRound size={18} /> Gestión de clientes</li>
              <li><FolderKanban size={18} /> Gestión de proyectos</li>
              <li><ReceiptText size={18} /> Facturación</li>
              <li><FileBarChart size={18} /> Reportes</li>
              <li><Settings2 size={18} /> Configuración</li>
            </ul>
            <div className="user-role-note">
              <Info size={17} />
              Puedes administrar los roles y permisos desde el módulo “Roles y permisos”.
            </div>
          </aside>
        </section>
      </form>
    );
  }

  return (
    <section className="users-module-shell">
      <div className="users-page-head">
        <div>
          <h2>Usuarios</h2>
          <p>Administra las cuentas de usuario, roles y permisos del sistema.</p>
        </div>
        <div className="users-head-actions">
          <button className="users-primary-action" onClick={() => setShowCreateForm(true)} type="button">
            <Plus size={20} />
            Nuevo usuario
          </button>
          <button className="users-action-caret" type="button">
            <Plus size={18} />
          </button>
        </div>
      </div>

      {(message || error) && <p className={error ? "admin-form-error" : "admin-form-success"}>{error || message}</p>}

      <div className="users-stats-grid">
        <article className="users-stat-card">
          <span className="users-stat-icon is-blue"><UsersRound size={27} /></span>
          <div><p>Usuarios totales</p><h3>{sourceUsers.length}</h3><small className="is-positive">↑ 12.5% vs. mes anterior</small></div>
        </article>
        <article className="users-stat-card">
          <span className="users-stat-icon is-green"><ShieldCheck size={27} /></span>
          <div><p>Usuarios activos</p><h3>{activeUsers}</h3><small className="is-positive">↑ 8.3% vs. mes anterior</small></div>
        </article>
        <article className="users-stat-card">
          <span className="users-stat-icon is-purple"><UserCheck size={27} /></span>
          <div><p>Administradores</p><h3>{adminUsers}</h3><small className="is-neutral">↑ 0% vs. mes anterior</small></div>
        </article>
        <article className="users-stat-card">
          <span className="users-stat-icon is-orange"><UserX size={27} /></span>
          <div><p>Inactivos</p><h3>{inactiveUsers}</h3><small className="is-negative">↓ 4.7% vs. mes anterior</small></div>
        </article>
      </div>

      <article className="users-table-card">
        <div className="users-table-toolbar">
          <label className="users-table-search">
            <Filter size={19} />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, correo o usuario..."
              value={query}
            />
          </label>
          <label className="users-filter-field">
            Rol
            <select onChange={(event) => setRoleFilter(event.target.value)} value={roleFilter}>
              <option>Todos</option>
              {roleOptions.map((role) => <option key={role}>{role}</option>)}
            </select>
          </label>
          <label className="users-filter-field">
            Estado
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option>Todos</option>
              <option>Activos</option>
              <option>Inactivos</option>
            </select>
          </label>
          <label className="users-filter-field">
            Empresa
            <select onChange={(event) => setCompanyFilter(event.target.value)} value={companyFilter}>
              <option>Todas</option>
              {companyOptions.map((company) => <option key={company}>{company}</option>)}
            </select>
          </label>
          <button className="users-filter-button" type="button"><Filter size={18} /> Filtros</button>
          <button className="users-download-button" type="button"><Download size={18} /></button>
        </div>

        <div className="users-table-wrap">
          <table className="users-data-table">
            <thead>
              <tr>
                <th><input type="checkbox" /></th>
                <th>Usuario</th>
                <th>Correo electrónico</th>
                <th>Rol</th>
                <th>Empresa</th>
                <th>Estado</th>
                <th>Último acceso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user, index) => {
                const isCurrentUser = currentUser?.email === user.email;
                const isInactive = user.status === "inactive";

                return (
                  <tr key={user.id}>
                    <td><input type="checkbox" /></td>
                    <td>
                      <span className="users-name-cell">
                        <span className={`users-avatar users-avatar-${(index % 6) + 1}`}>{initials(user.name)}</span>
                        <span>
                          <strong>{user.name}{isCurrentUser && <em>Tú</em>}</strong>
                          <small>{userHandle(user)}</small>
                        </span>
                      </span>
                    </td>
                    <td>{user.email}</td>
                    <td><span className={`users-role-badge is-${roleClass(user.role)}`}>{user.role}</span></td>
                    <td>{companyForUser(user)}</td>
                    <td>
                      <span className={`users-status-badge is-${isInactive ? "inactive" : "active"}`}>
                        {isInactive ? "Inactivo" : "Activo"}
                      </span>
                    </td>
                    <td>{lastAccessLabel(user.lastLoginAt)}</td>
                    <td>
                      <button
                        className="users-row-action"
                        onClick={() => setOpenMenu(openMenu === user.id ? "" : user.id)}
                        type="button"
                      >
                        <MoreVertical size={20} />
                      </button>
                      <div className={`users-action-menu ${openMenu === user.id ? "is-open" : ""}`}>
                        <button onClick={() => resetPassword(user)} type="button">Restablecer contraseña</button>
                        <button disabled={isCurrentUser} onClick={() => toggleUserStatus(user)} type="button">
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

        <footer className="users-table-footer">
          <span>
            Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, filteredUsers.length)} de{" "}
            {filteredUsers.length} usuarios
          </span>
          <nav className="users-pagination">
            <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">
              ‹
            </button>
            {Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index + 1).map((item) => (
              <button
                className={page === item ? "is-active" : ""}
                key={item}
                onClick={() => setPage(item)}
                type="button"
              >
                {item}
              </button>
            ))}
            {totalPages > 3 && <span>+ ... +</span>}
            {totalPages > 3 && (
              <button className={page === totalPages ? "is-active" : ""} onClick={() => setPage(totalPages)} type="button">
                {totalPages}
              </button>
            )}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              type="button"
            >
              ›
            </button>
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
