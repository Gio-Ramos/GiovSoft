import { useState } from "react";
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} />
      <div className="app-content">
        <Header collapsed={collapsed} setCollapsed={setCollapsed} />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
