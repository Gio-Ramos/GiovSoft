import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;

    return window.localStorage.getItem("giovsoft-admin-theme") === "dark";
  });

  useEffect(() => {
    window.localStorage.setItem("giovsoft-admin-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <div className={`app-shell ${darkMode ? "is-admin-dark" : ""}`}>
      <Sidebar collapsed={collapsed} darkMode={darkMode} setDarkMode={setDarkMode} />
      <div className="app-content">
        <Header collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
