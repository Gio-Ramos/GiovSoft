import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Edit3,
  Filter,
  Home,
  KeyRound,
  LockKeyhole,
  MoreVertical,
  Plus,
  ReceiptText,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  ShieldX,
  UserCheck,
  UsersRound,
  FolderKanban,
  FileBarChart,
} from "lucide-react";
import { useCloseOnOutsideClick } from "../hooks/useCloseOnOutsideClick";

type PermissionAction = "view" | "create" | "edit" | "delete";

interface PermissionModule {
  key: string;
  name: string;
  description: string;
}

interface RoleItem {
  id: string;
  name: string;
  description: string;
  scope: string;
  status: "active" | "inactive";
  users: number;
  permissions: Record<string, PermissionAction[]>;
  createdAt: string;
}

interface RoleForm {
  name: string;
  description: string;
  scope: string;
  status: "active" | "inactive";
  permissions: Record<string, PermissionAction[]>;
}

const storageKey = "giovsoft-admin-roles-v2";

const permissionModules: PermissionModule[] = [
  { key: "businessLines", name: "Líneas de negocio", description: "Catálogo de líneas de negocio y su asignación a aplicaciones." },
  { key: "sales", name: "Ventas", description: "Órdenes e ingresos del checkout centralizado, globales y por línea." },
  { key: "dashboard", name: "Dashboard", description: "Resumen general y métricas del panel." },
  { key: "clients", name: "Clientes", description: "Consulta y administración de clientes." },
  { key: "users", name: "Usuarios", description: "Cuentas, accesos y contraseñas temporales." },
  { key: "companies", name: "Empresas", description: "Organizaciones, fiscal y contactos." },
  { key: "products", name: "Productos", description: "Catálogo comercial y operativo." },
  { key: "projects", name: "Proyectos", description: "Seguimiento de implementación y entregables." },
  { key: "billing", name: "Facturación", description: "Facturas, comprobantes y cobranza." },
  { key: "reports", name: "Reportes", description: "Indicadores, auditoría y exportaciones." },
  { key: "settings", name: "Configuración", description: "Ajustes del sistema e integraciones." },
];

const actionLabels: Record<PermissionAction, string> = {
  view: "Ver",
  create: "Crear",
  edit: "Editar",
  delete: "Eliminar",
};

const actionOrder: PermissionAction[] = ["view", "create", "edit", "delete"];

const permissionDetails: Record<string, { title: string; description: string; action: PermissionAction }[]> = {
  sales: [
    { title: "Ver ventas", description: "Permite consultar órdenes, ingresos y desgloses.", action: "view" },
    { title: "Confirmar pagos", description: "Permite marcar órdenes como pagadas (conciliación).", action: "create" },
    { title: "Reintentar notificaciones", description: "Permite reenviar webhooks a los productos.", action: "edit" },
    { title: "Exportar reportes", description: "Permite descargar la información de ventas.", action: "delete" },
  ],
  businessLines: [
    { title: "Ver líneas de negocio", description: "Permite consultar el catálogo y sus métricas.", action: "view" },
    { title: "Crear líneas", description: "Permite agregar nuevas líneas de negocio.", action: "create" },
    { title: "Editar líneas", description: "Permite renombrar, cambiar color y archivar líneas.", action: "edit" },
    { title: "Asignar aplicaciones", description: "Permite vincular aplicaciones a una línea.", action: "delete" },
  ],
  dashboard: [
    { title: "Ver dashboard", description: "Permite ver el panel principal del sistema.", action: "view" },
    { title: "Acceso a estadísticas", description: "Permite ver métricas y gráficos.", action: "create" },
    { title: "Configuración del panel", description: "Permite personalizar widgets y vista del panel.", action: "edit" },
    { title: "Ver actividades recientes", description: "Permite ver el historial de actividades.", action: "delete" },
  ],
  clients: [
    { title: "Ver clientes", description: "Permite consultar el listado y fichas de clientes.", action: "view" },
    { title: "Crear clientes", description: "Permite registrar nuevos clientes.", action: "create" },
    { title: "Editar clientes", description: "Permite actualizar información comercial y fiscal.", action: "edit" },
    { title: "Inhabilitar clientes", description: "Permite cambiar el estado del cliente.", action: "delete" },
  ],
  users: [
    { title: "Ver usuarios", description: "Permite consultar usuarios del sistema.", action: "view" },
    { title: "Crear usuarios", description: "Permite crear cuentas con contraseña temporal.", action: "create" },
    { title: "Editar usuarios", description: "Permite actualizar rol y estado.", action: "edit" },
    { title: "Restablecer accesos", description: "Permite restablecer contraseñas temporales.", action: "delete" },
  ],
  projects: [
    { title: "Ver proyectos", description: "Permite consultar seguimiento y entregables.", action: "view" },
    { title: "Crear proyectos", description: "Permite abrir nuevos proyectos.", action: "create" },
    { title: "Editar proyectos", description: "Permite actualizar avances y responsables.", action: "edit" },
    { title: "Cerrar proyectos", description: "Permite finalizar o pausar proyectos.", action: "delete" },
  ],
  billing: [
    { title: "Ver facturación", description: "Permite consultar facturas y comprobantes.", action: "view" },
    { title: "Emitir registros", description: "Permite crear operaciones de facturación.", action: "create" },
    { title: "Editar registros", description: "Permite actualizar datos administrativos.", action: "edit" },
    { title: "Cancelar registros", description: "Permite inhabilitar movimientos.", action: "delete" },
  ],
  reports: [
    { title: "Ver reportes", description: "Permite consultar indicadores del sistema.", action: "view" },
    { title: "Crear reportes", description: "Permite generar nuevos cortes de información.", action: "create" },
    { title: "Editar reportes", description: "Permite ajustar parámetros guardados.", action: "edit" },
    { title: "Exportar reportes", description: "Permite descargar información sensible.", action: "delete" },
  ],
  settings: [
    { title: "Ver configuración", description: "Permite consultar ajustes generales.", action: "view" },
    { title: "Crear integraciones", description: "Permite agregar conexiones del sistema.", action: "create" },
    { title: "Editar configuración", description: "Permite modificar ajustes globales.", action: "edit" },
    { title: "Eliminar integraciones", description: "Permite desactivar conexiones críticas.", action: "delete" },
  ],
};

const permissionPanelModules = [
  { key: "dashboard", name: "Acceso al panel", icon: Home },
  { key: "clients", name: "Gestión de clientes", icon: UsersRound },
  { key: "users", name: "Gestión de usuarios", icon: UserCheck },
  { key: "projects", name: "Gestión de proyectos", icon: FolderKanban },
  { key: "billing", name: "Facturación", icon: ReceiptText },
  { key: "reports", name: "Reportes", icon: FileBarChart },
  { key: "settings", name: "Configuración", icon: Settings2 },
];

const allPermissions = permissionModules.reduce<Record<string, PermissionAction[]>>((permissions, module) => {
  permissions[module.key] = [...actionOrder];
  return permissions;
}, {});

const emptyPermissions = permissionModules.reduce<Record<string, PermissionAction[]>>((permissions, module) => {
  permissions[module.key] = [];
  return permissions;
}, {});

const emptyForm: RoleForm = {
  name: "",
  description: "",
  scope: "",
  status: "active",
  permissions: emptyPermissions,
};

const demoRoles: RoleItem[] = [];

function permissionCount(permissions: Record<string, PermissionAction[]>) {
  return Object.values(permissions).reduce((total, actions) => total + actions.length, 0);
}

function clonePermissions(permissions: Record<string, PermissionAction[]>) {
  return permissionModules.reduce<Record<string, PermissionAction[]>>((next, module) => {
    next[module.key] = [...(permissions[module.key] || [])];
    return next;
  }, {});
}

function toForm(role: RoleItem): RoleForm {
  return {
    name: role.name,
    description: role.description,
    scope: role.scope,
    status: role.status,
    permissions: clonePermissions(role.permissions),
  };
}

export default function AdminRoles() {
  const [roles, setRoles] = useState<RoleItem[]>(() => {
    const stored = window.localStorage.getItem(storageKey);

    if (!stored) {
      return demoRoles;
    }

    try {
      return JSON.parse(stored) as RoleItem[];
    } catch (_error) {
      return demoRoles;
    }
  });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [scopeFilter, setScopeFilter] = useState("Todos");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [openMenu, setOpenMenu] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [permissionEditorOpen, setPermissionEditorOpen] = useState(false);
  const [permissionDraft, setPermissionDraft] = useState<Record<string, PermissionAction[]>>(clonePermissions(emptyPermissions));
  const [openPermissionModules, setOpenPermissionModules] = useState<string[]>(["dashboard"]);
  const [formMode, setFormMode] = useState<"closed" | "create" | "edit">("closed");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [message, setMessage] = useState("");

  useCloseOnOutsideClick(Boolean(openMenu), () => setOpenMenu(""));

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(roles));
  }, [roles]);

  const scopes = useMemo(() => Array.from(new Set(roles.map((role) => role.scope))).sort(), [roles]);

  const filteredRoles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return roles.filter((role) => {
      const matchesQuery =
        !normalizedQuery || `${role.name} ${role.description} ${role.scope}`.toLowerCase().includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "Todos" ||
        (statusFilter === "Activos" ? role.status === "active" : role.status === "inactive");
      const matchesScope = scopeFilter === "Todos" || role.scope === scopeFilter;

      return matchesQuery && matchesStatus && matchesScope;
    });
  }, [query, roles, scopeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / pageSize));
  const visibleRoles = filteredRoles.slice((page - 1) * pageSize, page * pageSize);
  const activeRoles = roles.filter((role) => role.status === "active").length;
  const inactiveRoles = roles.filter((role) => role.status === "inactive").length;
  const totalPermissions = roles.reduce((total, role) => total + permissionCount(role.permissions), 0);
  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  useEffect(() => {
    setPage(1);
  }, [pageSize, query, scopeFilter, statusFilter]);

  useEffect(() => {
    if (selectedRoleId && !roles.some((role) => role.id === selectedRoleId)) {
      setSelectedRoleId("");
      setPermissionEditorOpen(false);
    }
  }, [roles, selectedRoleId]);

  function closeForm() {
    setFormMode("closed");
    setEditingId("");
    setForm(emptyForm);
  }

  function openCreateForm() {
    setMessage("");
    setEditingId("");
    setForm({
      ...emptyForm,
      permissions: clonePermissions(emptyPermissions),
    });
    setFormMode("create");
  }

  function openEditForm(role: RoleItem) {
    setMessage("");
    setEditingId(role.id);
    setForm(toForm(role));
    setOpenMenu("");
    setFormMode("edit");
  }

  function openPermissionEditor(role: RoleItem) {
    setMessage("");
    setSelectedRoleId(role.id);
    setPermissionDraft(clonePermissions(role.permissions));
    setOpenPermissionModules(["dashboard"]);
    setOpenMenu("");
    setPermissionEditorOpen(true);
  }

  function updateForm(field: keyof Omit<RoleForm, "permissions">, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function togglePermission(moduleKey: string, action: PermissionAction) {
    setForm((current) => {
      const currentActions = current.permissions[moduleKey] || [];
      const hasAction = currentActions.includes(action);
      const nextActions = hasAction
        ? currentActions.filter((item) => item !== action)
        : [...currentActions, action].sort((a, b) => actionOrder.indexOf(a) - actionOrder.indexOf(b));

      return {
        ...current,
        permissions: {
          ...current.permissions,
          [moduleKey]: nextActions,
        },
      };
    });
  }

  function toggleModule(moduleKey: string) {
    setForm((current) => {
      const currentActions = current.permissions[moduleKey] || [];
      const isFull = currentActions.length === actionOrder.length;

      return {
        ...current,
        permissions: {
          ...current.permissions,
          [moduleKey]: isFull ? [] : [...actionOrder],
        },
      };
    });
  }

  function saveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name || !form.description || !form.scope) {
      setMessage("Completa los campos obligatorios del rol.");
      return;
    }

    const nextRole: RoleItem = {
      id: editingId || crypto.randomUUID(),
      name: form.name,
      description: form.description,
      scope: form.scope,
      status: form.status,
      users: roles.find((role) => role.id === editingId)?.users || 0,
      permissions: clonePermissions(form.permissions),
      createdAt: roles.find((role) => role.id === editingId)?.createdAt || new Date().toISOString(),
    };

    setRoles((current) =>
      editingId ? current.map((role) => (role.id === editingId ? nextRole : role)) : [nextRole, ...current],
    );
    setMessage(editingId ? "Rol actualizado correctamente." : "Rol registrado correctamente.");
    closeForm();
  }

  function toggleStatus(role: RoleItem) {
    const nextStatus = role.status === "inactive" ? "active" : "inactive";
    setRoles((current) => current.map((item) => (item.id === role.id ? { ...item, status: nextStatus } : item)));
    setMessage(`${role.name} ahora está ${nextStatus === "active" ? "activo" : "inactivo"}.`);
    setOpenMenu("");
  }

  function toggleDraftPermission(moduleKey: string, action: PermissionAction) {
    setPermissionDraft((current) => {
      const currentActions = current[moduleKey] || [];
      const hasAction = currentActions.includes(action);
      const nextActions = hasAction
        ? currentActions.filter((item) => item !== action)
        : [...currentActions, action].sort((a, b) => actionOrder.indexOf(a) - actionOrder.indexOf(b));

      return {
        ...current,
        [moduleKey]: nextActions,
      };
    });
  }

  function setDraftAllPermissions(checked: boolean) {
    setPermissionDraft(checked ? clonePermissions(allPermissions) : clonePermissions(emptyPermissions));
  }

  function togglePermissionModule(moduleKey: string) {
    setOpenPermissionModules((current) =>
      current.includes(moduleKey) ? current.filter((item) => item !== moduleKey) : [...current, moduleKey],
    );
  }

  function savePermissionChanges() {
    if (!selectedRole) {
      return;
    }

    setRoles((current) =>
      current.map((role) =>
        role.id === selectedRole.id
          ? {
              ...role,
              permissions: clonePermissions(permissionDraft),
            }
          : role,
      ),
    );
    setMessage(`Permisos de ${selectedRole.name} actualizados correctamente.`);
  }

  if (formMode !== "closed") {
    return (
      <form className="roles-register-shell" onSubmit={saveRole}>
        <section className="client-register-head">
          <div>
            <h2>{formMode === "edit" ? "Editar rol" : "Nuevo rol"}</h2>
            <p>Define el alcance, estado y permisos de acceso para este perfil del sistema.</p>
          </div>
          <div className="client-register-actions">
            <button className="client-register-cancel" onClick={closeForm} type="button">
              Cancelar
            </button>
            <button className="client-register-save" type="submit">
              <Save size={18} />
              Guardar rol
            </button>
          </div>
        </section>

        {message && <p className="admin-form-error">{message}</p>}

        <section className="roles-register-layout">
          <article className="client-register-card">
            <h3>Información del rol</h3>
            <div className="client-register-grid is-three">
              <label>
                <span className="client-register-label">Nombre del rol <b>*</b></span>
                <input
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="Ej. Coordinador"
                  value={form.name}
                />
              </label>
              <label>
                <span className="client-register-label">Alcance <b>*</b></span>
                <input
                  onChange={(event) => updateForm("scope", event.target.value)}
                  placeholder="Ej. Operación"
                  value={form.scope}
                />
              </label>
              <label>
                <span className="client-register-label">Estado</span>
                <select onChange={(event) => updateForm("status", event.target.value)} value={form.status}>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </label>
              <label className="client-register-wide">
                <span className="client-register-label">Descripción <b>*</b></span>
                <textarea
                  maxLength={260}
                  onChange={(event) => updateForm("description", event.target.value)}
                  placeholder="Describe qué puede hacer este rol dentro del panel..."
                  value={form.description}
                />
                <small>{form.description.length}/260</small>
              </label>
            </div>
          </article>

          <aside className="roles-register-summary">
            <div className="roles-summary-icon">
              <LockKeyhole size={35} />
            </div>
            <h3>Resumen de permisos</h3>
            <p>{permissionCount(form.permissions)} permisos activos distribuidos en {permissionModules.length} módulos.</p>
            <div>
              <span>Módulos con acceso</span>
              <strong>{permissionModules.filter((module) => (form.permissions[module.key] || []).length > 0).length}</strong>
            </div>
            <div>
              <span>Acciones críticas</span>
              <strong>
                {Object.values(form.permissions).filter((actions) => actions.includes("delete")).length}
              </strong>
            </div>
          </aside>
        </section>

        <article className="client-register-card">
          <h3>Matriz de permisos</h3>
          <div className="roles-permission-grid">
            {permissionModules.map((module) => {
              const selectedActions = form.permissions[module.key] || [];
              const moduleEnabled = selectedActions.length === actionOrder.length;

              return (
                <section className="roles-permission-card" key={module.key}>
                  <header>
                    <div>
                      <strong>{module.name}</strong>
                      <small>{module.description}</small>
                    </div>
                    <button
                      className={moduleEnabled ? "is-active" : ""}
                      onClick={() => toggleModule(module.key)}
                      type="button"
                    >
                      Todo
                    </button>
                  </header>
                  <div className="roles-permission-actions">
                    {actionOrder.map((action) => (
                      <button
                        className={selectedActions.includes(action) ? "is-active" : ""}
                        key={action}
                        onClick={() => togglePermission(module.key, action)}
                        type="button"
                      >
                        {actionLabels[action]}
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </article>
      </form>
    );
  }

  return (
    <section className="roles-module-shell">
      <div className="clients-page-head">
        <div>
          <h2>Roles y permisos</h2>
          <p>Administra perfiles de acceso, alcance operativo y permisos por módulo.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-primary-action" onClick={openCreateForm} type="button">
            <Plus size={20} />
            Nuevo rol
          </button>
          <button className="clients-action-caret" type="button">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {message && <p className="admin-form-success">{message}</p>}

      <div className="clients-stats-grid">
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-blue"><ShieldCheck size={27} /></span>
          <div><p>Roles totales</p><h3>{roles.length}</h3><small>Todos los roles del sistema</small></div>
        </article>
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-green"><UserCheck size={27} /></span>
          <div><p>Roles activos</p><h3>{activeRoles}</h3><small>Roles habilitados</small></div>
        </article>
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-orange"><ShieldX size={27} /></span>
          <div><p>Roles inactivos</p><h3>{inactiveRoles}</h3><small>Roles deshabilitados</small></div>
        </article>
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-blue"><KeyRound size={27} /></span>
          <div><p>Permisos totales</p><h3>{totalPermissions}</h3><small>Permisos disponibles</small></div>
        </article>
      </div>

      <section className={`roles-workspace-grid ${permissionEditorOpen ? "is-editor-open" : ""}`}>
        <article className="roles-list-card">
          <header className="roles-card-head">
            <div>
              <h3>Roles del sistema</h3>
              <p>Lista de roles con su descripción y estado.</p>
            </div>
            <div className="roles-card-tools">
              <label className="roles-search">
                <input
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar rol..."
                  value={query}
                />
                <Search size={17} />
              </label>
              <select className="roles-scope-filter" onChange={(event) => setScopeFilter(event.target.value)} value={scopeFilter}>
                <option>Todos</option>
                {scopes.map((scope) => <option key={scope}>{scope}</option>)}
              </select>
              <button
                className="roles-filter-button"
                onClick={() => setStatusFilter(statusFilter === "Todos" ? "Activos" : statusFilter === "Activos" ? "Inactivos" : "Todos")}
                type="button"
              >
                <Filter size={17} />
                Filtros
              </button>
            </div>
          </header>

          <div className="roles-list-table-wrap">
            <table className="roles-list-table">
              <thead>
                <tr>
                  <th>Rol</th>
                  <th>Descripción</th>
                  <th>Usuarios</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleRoles.map((role, index) => {
                  const isInactive = role.status === "inactive";
                  const isSelected = permissionEditorOpen && selectedRole?.id === role.id;

                  return (
                    <tr className={isSelected ? "is-selected" : ""} key={role.id}>
                      <td>
                        <span className="roles-name-cell">
                          <span className={`roles-role-icon roles-role-icon-${(index % 6) + 1}`}>
                            {role.name === "Administrador" ? <LockKeyhole size={20} /> : <UsersRound size={20} />}
                          </span>
                          <span>
                            <strong>{role.name}</strong>
                            <small>{role.scope}</small>
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="roles-description-cell">
                          <strong>{role.description}</strong>
                        </span>
                      </td>
                      <td>{role.users}</td>
                      <td>
                        <span className={`clients-status-badge is-${isInactive ? "inactive" : "active"}`}>
                          {isInactive ? "Inactivo" : "Activo"}
                        </span>
                      </td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <button
                          className="clients-row-action"
                          onClick={() => setOpenMenu(openMenu === role.id ? "" : role.id)}
                          type="button"
                        >
                          <MoreVertical size={20} />
                        </button>
                        <div className={`clients-action-menu ${openMenu === role.id ? "is-open" : ""}`}>
                          <button onClick={() => openPermissionEditor(role)} type="button"><Edit3 size={15} /> Editar</button>
                          <button onClick={() => toggleStatus(role)} type="button">
                            {isInactive ? <ShieldCheck size={15} /> : <ShieldX size={15} />}
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

          <footer className="roles-list-footer">
            <span>
              Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, filteredRoles.length)} de{" "}
              {filteredRoles.length} roles
            </span>
            <nav className="clients-pagination">
              <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">‹</button>
              {Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index + 1).map((item) => (
                <button className={page === item ? "is-active" : ""} key={item} onClick={() => setPage(item)} type="button">
                  {item}
                </button>
              ))}
              <button disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">›</button>
            </nav>
          </footer>
        </article>

        {permissionEditorOpen && selectedRole && (
          <article className="roles-permissions-panel">
            <header className="roles-card-head">
              <div>
                <h3>Permisos del rol</h3>
                <p>Edita los permisos de {selectedRole.name} y guarda los cambios.</p>
              </div>
              <div className="roles-panel-actions">
                <button onClick={() => openEditForm(selectedRole)} type="button">
                  <Edit3 size={16} />
                  Editar datos
                </button>
                <button onClick={() => setPermissionEditorOpen(false)} type="button">Cerrar</button>
              </div>
            </header>

            <div className="roles-selected-toolbar">
              <select
                onChange={(event) => {
                  const nextRole = roles.find((role) => role.id === event.target.value);
                  if (nextRole) {
                    openPermissionEditor(nextRole);
                  }
                }}
                value={selectedRole.id}
              >
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
              <label className="roles-select-all">
                Seleccionar todos
                <input
                  checked={permissionCount(permissionDraft) === permissionModules.length * actionOrder.length}
                  onChange={(event) => setDraftAllPermissions(event.target.checked)}
                  type="checkbox"
                />
              </label>
            </div>

            <div className="roles-accordion">
              {permissionPanelModules.map((module) => {
                const Icon = module.icon;
                const selectedActions = permissionDraft[module.key] || [];
                const details = permissionDetails[module.key] || [];
                const isOpen = openPermissionModules.includes(module.key);

                return (
                  <section className={`roles-accordion-group ${isOpen ? "is-open" : ""}`} key={module.key}>
                    <header onClick={() => togglePermissionModule(module.key)}>
                      <span className="roles-accordion-icon"><Icon size={17} /></span>
                      <strong>{module.name}</strong>
                      <span>{details.length} permisos</span>
                      <ChevronRight size={17} />
                    </header>
                    {isOpen && (
                      <div className="roles-accordion-body">
                        {details.map((detail) => {
                          const checked = selectedActions.includes(detail.action);

                          return (
                            <label className="roles-permission-check" key={detail.title}>
                              <input
                                checked={checked}
                                onChange={() => toggleDraftPermission(module.key, detail.action)}
                                type="checkbox"
                              />
                              <span>
                                <strong>{detail.title}</strong>
                                <small>{detail.description}</small>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>

            <footer className="roles-permissions-footer">
              <span>{permissionCount(permissionDraft)} permisos seleccionados</span>
              <button onClick={savePermissionChanges} type="button">
                <Save size={17} />
                Guardar cambios
              </button>
            </footer>
          </article>
        )}
      </section>
    </section>
  );
}
