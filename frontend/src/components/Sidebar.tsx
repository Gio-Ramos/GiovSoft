import {
  CircleHelp,
  DollarSign,
  Home,
  Package,
  Settings2,
  ShieldCheck,
} from "lucide-react";

const menu = [
  { name: "Dashboard", icon: Home, active: true },
  { name: "Inventario", icon: Package },
  { name: "Ventas", icon: DollarSign },
  { name: "Seguridad", icon: ShieldCheck },
  { name: "Ajustes", icon: Settings2 },
];

interface Props {
  collapsed: boolean;
}

export default function Sidebar({ collapsed }: Props) {
  return (
    <aside className={`sidebar-shell ${collapsed ? "is-collapsed" : ""}`}>
      <div className="sidebar-brand">
        {!collapsed && (
          <div className="sidebar-brand-copy">
            <p className="eyebrow">Panel interno</p>
            <h2>GiovSoft</h2>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {menu.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.name}
              className={`sidebar-link ${item.active ? "is-active" : ""}`}
              aria-current={item.active ? "page" : undefined}
            >
              <Icon size={20} />
              {!collapsed && <span>{item.name}</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-support">
        <div className="sidebar-support-icon">
          <CircleHelp size={18} />
        </div>
        {!collapsed && (
          <div>
            <p>Soporte operativo</p>
            <span>Respuesta promedio de 5 min</span>
          </div>
        )}
      </div>
    </aside>
  );
}
