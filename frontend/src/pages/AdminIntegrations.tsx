import { CheckCircle2, Cloud, DatabaseZap, KeyRound, Mail, MessageSquareText, MoreVertical, Plug, RefreshCw, Settings2, ShieldCheck, Webhook } from "lucide-react";
import { useMemo, useState } from "react";

type IntegrationStatus = "connected" | "pending" | "error" | "disabled";

interface IntegrationItem {
  id: string;
  name: string;
  description: string;
  category: string;
  status: IntegrationStatus;
  lastSync: string;
  icon: typeof Plug;
}

const integrationsSeed: IntegrationItem[] = [
  { id: "smtp", name: "SMTP correo", description: "Envía notificaciones administrativas y respuestas automáticas.", category: "Comunicación", status: "connected", lastSync: "Hoy, 10:20 AM", icon: Mail },
  { id: "whatsapp", name: "WhatsApp Business", description: "Seguimiento y alertas rápidas para soporte y ventas.", category: "Comunicación", status: "pending", lastSync: "Pendiente", icon: MessageSquareText },
  { id: "google", name: "Google Workspace", description: "Gestión de correos, Drive, Meet y cuentas corporativas.", category: "Productividad", status: "connected", lastSync: "Hoy, 09:12 AM", icon: Cloud },
  { id: "webhooks", name: "Webhooks", description: "Eventos para clientes, pagos, tickets y proyectos.", category: "Automatización", status: "disabled", lastSync: "Sin actividad", icon: Webhook },
  { id: "database", name: "Base de datos", description: "Conexión PostgreSQL o almacenamiento local JSON.", category: "Infraestructura", status: "connected", lastSync: "Operativo", icon: DatabaseZap },
  { id: "security", name: "Llaves API", description: "Administración de tokens externos y secretos de integración.", category: "Seguridad", status: "error", lastSync: "Revisión requerida", icon: KeyRound },
];

const statusLabels: Record<IntegrationStatus, string> = {
  connected: "Conectado",
  pending: "Pendiente",
  error: "Revisar",
  disabled: "Desactivado",
};

export default function AdminIntegrations() {
  const [integrations, setIntegrations] = useState(integrationsSeed);
  const [openMenu, setOpenMenu] = useState("");
  const connected = integrations.filter((item) => item.status === "connected").length;
  const pending = integrations.filter((item) => item.status === "pending").length;
  const errors = integrations.filter((item) => item.status === "error").length;

  const categories = useMemo(() => [...new Set(integrations.map((item) => item.category))], [integrations]);

  function updateIntegration(integration: IntegrationItem, status: IntegrationStatus) {
    setIntegrations((current) => current.map((item) => (item.id === integration.id ? { ...item, status, lastSync: status === "connected" ? "Ahora" : item.lastSync } : item)));
    setOpenMenu("");
  }

  return (
    <section className="integrations-module-shell">
      <div className="clients-page-head">
        <div>
          <h2>Integraciones</h2>
          <p>Conecta servicios externos, automatizaciones, correo y herramientas de operación.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-primary-action" type="button"><Plug size={20} /> Nueva integración</button>
        </div>
      </div>

      <div className="clients-stats-grid">
        <article className="clients-stat-card"><span className="clients-stat-icon is-blue"><Plug size={27} /></span><div><p>Integraciones</p><h3>{integrations.length}</h3><small>{categories.length} categorías activas</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-green"><CheckCircle2 size={27} /></span><div><p>Conectadas</p><h3>{connected}</h3><small>Sincronización activa</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-purple"><RefreshCw size={27} /></span><div><p>Pendientes</p><h3>{pending}</h3><small>Requieren configuración</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-orange"><ShieldCheck size={27} /></span><div><p>Alertas</p><h3>{errors}</h3><small>Validar credenciales</small></div></article>
      </div>

      <div className="integrations-grid">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          return (
            <article className="integration-card" key={integration.id}>
              <header>
                <span><Icon size={24} /></span>
                <button onClick={() => setOpenMenu(openMenu === integration.id ? "" : integration.id)} type="button"><MoreVertical size={20} /></button>
                <div className={`clients-action-menu ${openMenu === integration.id ? "is-open" : ""}`}>
                  <button onClick={() => updateIntegration(integration, "connected")} type="button">Conectar</button>
                  <button onClick={() => updateIntegration(integration, "pending")} type="button">Marcar pendiente</button>
                  <button onClick={() => updateIntegration(integration, "disabled")} type="button">Desactivar</button>
                </div>
              </header>
              <h3>{integration.name}</h3>
              <p>{integration.description}</p>
              <footer>
                <span className={`integration-status is-${integration.status}`}>{statusLabels[integration.status]}</span>
                <small>{integration.lastSync}</small>
              </footer>
              <button className="integration-config-button" type="button"><Settings2 size={17} /> Configurar</button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
