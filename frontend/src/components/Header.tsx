import type { Dispatch, SetStateAction } from "react";
import { Bell, Menu, Search, Sparkles, User } from "lucide-react";

interface Props {
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
}

export default function Header({ collapsed, setCollapsed }: Props) {
  return (
    <header className="header-shell">
      <div className="header-bar">
        <div className="header-main">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="icon-button"
            aria-label="Alternar menu lateral"
          >
            <Menu size={18} />
          </button>

          <div className="header-copy">
            <p className="eyebrow">Centro operativo</p>
            <h1>Dashboard</h1>
          </div>
        </div>

        <div className="header-actions">

          <button className="icon-button notification-button" aria-label="Notificaciones">
            <Bell size={18} />
            <span className="notification-dot" />
          </button>

          <button className="profile-button" aria-label="Perfil">
            <span className="profile-avatar">
              <User size={16} />
            </span>
            <span className="profile-copy">
              <strong>Giovanni Ramos</strong>
              <span>Soporte</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
