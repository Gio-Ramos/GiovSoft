import { ClipboardList, FileBarChart, Home, MessageCircle, Settings2, Sparkles, UsersRound } from "lucide-react";
import { NavLink } from "react-router-dom";

const menu = [
  { name: "Resumen", icon: Home, path: "/admin" },
  { name: "Solicitudes", icon: ClipboardList, path: "/admin/solicitudes" },
  { name: "Clientes", icon: UsersRound, path: "/admin/clientes" },
  { name: "Seguimiento", icon: MessageCircle, path: "/admin/seguimiento" },
  { name: "Servicios", icon: Sparkles, path: "/admin/servicios" },
  { name: "Reportes", icon: FileBarChart, path: "/admin/reportes" },
  { name: "Ajustes", icon: Settings2, path: "/admin/ajustes" },
];

interface Props {
  collapsed: boolean;
}

export default function Sidebar({ collapsed }: Props) {
  return (
    <aside className={`sidebar-shell ${collapsed ? "is-collapsed" : ""}`}>
      <div className="sidebar-brand">
        <span className="sidebar-brand-logo">
          <img src={collapsed ? "/img/logo-icon.svg" : "/img/logo-black.svg"} alt="GiovSoft" />
        </span>
      </div>

      <nav className="sidebar-nav">
        {menu.map((item) => {
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
      </nav>
    </aside>
  );
}
