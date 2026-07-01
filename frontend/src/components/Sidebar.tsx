import {
  Boxes,
  BriefcaseBusiness,
  Building2,
  CircleHelp,
  Clock3,
  FileBarChart,
  FileCheck2,
  Home,
  MessageCircle,
  Moon,
  Plug,
  ReceiptText,
  Settings2,
  ShieldCheck,
  UserCog,
  UsersRound,
} from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { NavLink } from "react-router-dom";

const dashboardItem = { name: "Dashboard", icon: Home, path: "/admin" };

const menuSections = [
  {
    title: "Gestión",
    items: [
      { name: "Clientes", icon: UsersRound, path: "/admin/clientes" },
      { name: "Usuarios", icon: UserCog, path: "/admin/usuarios" },
      { name: "Empresas", icon: Building2, path: "/admin/empresas" },
      { name: "Roles y permisos", icon: ShieldCheck, path: "/admin/roles-permisos" },
    ],
  },
  {
    title: "Productos",
    items: [
      { name: "Servicios", icon: Boxes, path: "/admin/servicios" },
      { name: "Proyectos", icon: BriefcaseBusiness, path: "/admin/proyectos" },
    ],
  },
  {
    title: "Operaciones",
    items: [
      { name: "Facturación", icon: ReceiptText, path: "/admin/facturacion" },
      { name: "Comprobantes", icon: FileCheck2, path: "/admin/comprobantes" },
      { name: "Tickets", icon: MessageCircle, path: "/admin/tickets" },
      { name: "Soporte", icon: CircleHelp, path: "/admin/soporte" },
    ],
  },
  {
    title: "Configuración",
    items: [
      { name: "Ajustes", icon: Settings2, path: "/admin/ajustes" },
      { name: "Integraciones", icon: Plug, path: "/admin/integraciones" },
      { name: "Auditoría", icon: Clock3, path: "/admin/auditoria" },
      { name: "Reportes", icon: FileBarChart, path: "/admin/reportes" },
    ],
  },
];

interface Props {
  collapsed: boolean;
  darkMode: boolean;
  setDarkMode: Dispatch<SetStateAction<boolean>>;
}

export default function Sidebar({ collapsed, darkMode, setDarkMode }: Props) {
  const DashboardIcon = dashboardItem.icon;

  return (
    <aside className={`sidebar-shell ${collapsed ? "is-collapsed" : ""}`}>
      <div className="sidebar-brand">
        <span className="sidebar-brand-logo">
          <img src={collapsed ? "/img/logo-icon.svg" : "/img/logo-black.svg"} alt="GiovSoft" />
        </span>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          className={({ isActive }) => `sidebar-link sidebar-dashboard-link ${isActive ? "is-active" : ""}`}
          end
          to={dashboardItem.path}
        >
          <DashboardIcon size={20} />
          {!collapsed && <span>{dashboardItem.name}</span>}
        </NavLink>

        {menuSections.map((section) => (
          <div className="sidebar-section" key={section.title}>
            {!collapsed && <p className="sidebar-section-title">{section.title}</p>}

            {section.items.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.name}
                  className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}
                  end={item.path === "/admin"}
                  to={item.path}
                >
                  <Icon size={20} />
                  {!collapsed && <span>{item.name}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {!collapsed && (
        <button
          className={`sidebar-theme-toggle ${darkMode ? "is-active" : ""}`}
          type="button"
          onClick={() => setDarkMode((current) => !current)}
          aria-pressed={darkMode}
        >
          <span>
            <Moon size={18} />
            Modo oscuro
          </span>
          <i aria-hidden="true" />
        </button>
      )}
    </aside>
  );
}
