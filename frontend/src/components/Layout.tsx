import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;

    return window.localStorage.getItem("giovsoft-admin-theme") === "dark";
  });

  useEffect(() => {
    window.localStorage.setItem("giovsoft-admin-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  function handleMenuButtonClick() {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches) {
      setMobileMenuOpen((current) => !current);
      return;
    }

    setCollapsed((current) => !current);
  }

  return (
    <div className={`app-shell ${darkMode ? "is-admin-dark" : ""} ${mobileMenuOpen ? "is-mobile-menu-open" : ""}`}>
      <button className="sidebar-mobile-backdrop" onClick={() => setMobileMenuOpen(false)} type="button" aria-label="Cerrar menu lateral" />
      <Sidebar collapsed={collapsed} darkMode={darkMode} mobileOpen={mobileMenuOpen} onNavigate={() => setMobileMenuOpen(false)} setDarkMode={setDarkMode} />
      <div className="app-content">
        <Header collapsed={collapsed} onMenuButtonClick={handleMenuButtonClick} />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
