import { AlertTriangle, Bell, BookOpenCheck, Bot, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, LifeBuoy, LogOut, Menu, UserRoundCog } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCloseOnOutsideClick } from "../hooks/useCloseOnOutsideClick";
import { useAuth } from "../lib/auth";

interface Props {
  collapsed: boolean;
  onMenuButtonClick: () => void;
}

export default function Header({ collapsed, onMenuButtonClick }: Props) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [activeMenu, setActiveMenu] = useState<"notifications" | "help" | "profile" | "">("");
  useCloseOnOutsideClick(Boolean(activeMenu), () => setActiveMenu(""));
  const sectionByPath: Record<string, { current: string; next?: string }> = {
    "/admin": { current: "Dashboard" },
    "/admin/solicitudes": { current: "Solicitudes" },
    "/admin/clientes": { current: "Clientes" },
    "/admin/seguimiento": { current: "Seguimiento" },
    "/admin/servicios": { current: "Servicios" },
    "/admin/reportes": { current: "Reportes" },
    "/admin/usuarios": { current: "Usuarios", next: "Nuevo usuario" },
    "/admin/ajustes": { current: "Ajustes" },
    "/admin/empresas": { current: "Empresas" },
    "/admin/roles-permisos": { current: "Roles y permisos" },
    "/admin/productos": { current: "Productos" },
    "/admin/proyectos": { current: "Proyectos" },
    "/admin/aplicaciones": { current: "Aplicaciones" },
    "/admin/planes": { current: "Planes" },
    "/admin/payments": { current: "Payments" },
    "/admin/facturacion": { current: "Facturación" },
    "/admin/cotizaciones": { current: "Cotizaciones" },
    "/admin/cotizaciones/nueva": { current: "Cotizaciones", next: "Nueva cotización" },
    "/admin/comprobantes": { current: "Comprobantes" },
    "/admin/tickets": { current: "Tickets" },
    "/admin/soporte": { current: "Soporte" },
    "/admin/integraciones": { current: "Integraciones" },
    "/admin/auditoria": { current: "Auditoría" },
    "/admin/perfil": { current: "Mi perfil" },
    "/admin/restablecer-contrasena": { current: "Restablecer contraseña" },
  };
  const breadcrumb =
    pathname.startsWith("/admin/cotizaciones/") && pathname.endsWith("/editar")
      ? { current: "Cotizaciones", next: "Editar cotización" }
      : sectionByPath[pathname] || { current: "Panel GiovSoft" };

  function toggleMenu(menu: "notifications" | "help" | "profile") {
    setActiveMenu((current) => (current === menu ? "" : menu));
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="header-shell">
      <div className="header-bar">
        <div className="header-main">
          <button
            onClick={onMenuButtonClick}
            className="header-menu-button"
            aria-label="Alternar menu lateral"
            aria-pressed={collapsed}
          >
            <Menu size={24} />
          </button>

          <nav className="header-breadcrumb" aria-label="Ruta actual">
            <span>{breadcrumb.current}</span>
            {breadcrumb.next && (
              <>
                <ChevronRight className="breadcrumb-separator" size={17} />
                <span>{breadcrumb.next}</span>
              </>
            )}
          </nav>
        </div>

        <div className="header-actions">
          <div className="header-menu-wrap">
            <button className="icon-button notification-button" aria-expanded={activeMenu === "notifications"} aria-label="Notificaciones" onClick={() => toggleMenu("notifications")} type="button">
              <Bell size={21} />
              <span className="notification-dot">3</span>
            </button>
            <div className={`header-dropdown header-notifications ${activeMenu === "notifications" ? "is-open" : ""}`}>
              <header>
                <strong>Notificaciones</strong>
                <span>3 pendientes</span>
              </header>
              <button type="button"><AlertTriangle size={17} /><span><strong>Pago vencido</strong><small>Hospital Central requiere seguimiento.</small></span></button>
              <button type="button"><LifeBuoy size={17} /><span><strong>Ticket urgente</strong><small>Formulario de contacto sin recepción.</small></span></button>
              <button type="button"><CheckCircle2 size={17} /><span><strong>Proyecto actualizado</strong><small>Nuevo entregable registrado.</small></span></button>
            </div>
          </div>

          <div className="header-menu-wrap">
            <button className="icon-button" aria-expanded={activeMenu === "help"} aria-label="Ayuda" onClick={() => toggleMenu("help")} type="button">
              <CircleHelp size={22} />
            </button>
            <div className={`header-dropdown header-help ${activeMenu === "help" ? "is-open" : ""}`}>
              <header>
                <strong>Ayuda</strong>
                <span>Centro de soporte</span>
              </header>
              <button onClick={() => navigate("/admin/soporte")} type="button"><LifeBuoy size={17} /><span><strong>Mesa de soporte</strong><small>Revisar cola y canales activos.</small></span></button>
              <button onClick={() => navigate("/admin/tickets")} type="button"><CircleHelp size={17} /><span><strong>Tickets</strong><small>Ver incidencias abiertas.</small></span></button>
              <button type="button"><BookOpenCheck size={17} /><span><strong>Base de conocimiento</strong><small>Guías y procesos frecuentes.</small></span></button>
            </div>
          </div>

          <div className="header-menu-wrap">
            <button className="profile-button" aria-expanded={activeMenu === "profile"} aria-label="Perfil" onClick={() => toggleMenu("profile")} type="button">
              <span className="profile-avatar">
                <Bot size={19} />
              </span>
              <span className="profile-copy">
                <strong>{user?.name || "GiovSoft"}</strong>
                <span>{user?.role || "Administrador"}</span>
              </span>
              <ChevronDown className="profile-chevron" size={16} />
            </button>
            <div className={`header-dropdown header-profile ${activeMenu === "profile" ? "is-open" : ""}`}>
              <header>
                <strong>{user?.name || "GiovSoft"}</strong>
                <span>{user?.email || "admin@giovsoft.com"}</span>
              </header>
              <button onClick={() => { setActiveMenu(""); navigate("/admin/perfil"); }} type="button"><UserRoundCog size={17} /><span><strong>Mi perfil</strong><small>Datos personales, foto y avatar.</small></span></button>
              <button className="is-danger" onClick={handleLogout} type="button"><LogOut size={17} /><span><strong>Cerrar sesión</strong><small>Salir del panel.</small></span></button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
