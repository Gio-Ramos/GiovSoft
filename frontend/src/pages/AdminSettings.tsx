import { BellRing, CheckCircle2, Clock3, Database, Globe2, KeyRound, Mail, Save, Settings2, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface AdminSettingsData {
  adminEmail: string;
  smtpConfigured: boolean;
  smtpUser: string;
  frontendOrigins: string[];
  dataStore: string;
}

const systemPreferences = [
  { id: "force-password", label: "Forzar cambio de contraseña temporal", enabled: true },
  { id: "ticket-alerts", label: "Notificar tickets urgentes por correo", enabled: true },
  { id: "billing-alerts", label: "Recordatorios de pagos recurrentes", enabled: true },
  { id: "audit-log", label: "Registrar acciones críticas del panel", enabled: true },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<AdminSettingsData | null>(null);
  const [preferences, setPreferences] = useState(systemPreferences);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get<AdminSettingsData>("/api/admin/settings").then((response) => setSettings(response.data)).catch(() => setSettings(null));
  }, []);

  function togglePreference(id: string) {
    setPreferences((current) => current.map((preference) => (preference.id === id ? { ...preference, enabled: !preference.enabled } : preference)));
  }

  function saveSettings() {
    setMessage("Ajustes guardados para esta sesión.");
    window.setTimeout(() => setMessage(""), 2200);
  }

  return (
    <section className="settings-module-shell">
      <div className="clients-page-head">
        <div>
          <h2>Ajustes</h2>
          <p>Administra la configuración operativa, seguridad y preferencias del panel.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-primary-action" onClick={saveSettings} type="button"><Save size={20} /> Guardar ajustes</button>
        </div>
      </div>

      {message && <p className="admin-form-success">{message}</p>}

      <div className="clients-stats-grid">
        <article className="clients-stat-card"><span className="clients-stat-icon is-blue"><Mail size={27} /></span><div><p>Correo admin</p><h3>{settings?.smtpConfigured ? "Activo" : "Pendiente"}</h3><small>{settings?.adminEmail || "Sin información"}</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-green"><Database size={27} /></span><div><p>Datos</p><h3>{settings?.dataStore || "JSON"}</h3><small>Almacenamiento operativo</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-purple"><ShieldCheck size={27} /></span><div><p>Seguridad</p><h3>12h</h3><small>Duración de sesión</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-orange"><Globe2 size={27} /></span><div><p>Orígenes</p><h3>{settings?.frontendOrigins?.length || 0}</h3><small>CORS configurado</small></div></article>
      </div>

      <div className="settings-grid">
        <article className="settings-panel">
          <header><div><h3>Configuración general</h3><p>Datos base del panel y operación administrativa.</p></div><Settings2 size={21} /></header>
          <div className="settings-form-grid">
            <label><span>Correo administrativo</span><input value={settings?.adminEmail || "contacto@giovsoft.com"} readOnly /></label>
            <label><span>Cuenta SMTP</span><input value={settings?.smtpUser || "Sin cuenta configurada"} readOnly /></label>
            <label><span>Almacenamiento</span><input value={settings?.dataStore || "JSON local"} readOnly /></label>
            <label><span>Zona horaria</span><input defaultValue="America/Mexico_City" /></label>
          </div>
        </article>

        <article className="settings-panel">
          <header><div><h3>Seguridad</h3><p>Control de acceso, contraseñas y sesiones.</p></div><KeyRound size={21} /></header>
          <div className="settings-security-list">
            <span><ShieldCheck size={18} /> Usuario master oculto del listado operativo</span>
            <span><Clock3 size={18} /> Tokens administrativos con expiración</span>
            <span><CheckCircle2 size={18} /> Contraseña temporal obligatoria para usuarios nuevos</span>
          </div>
        </article>

        <article className="settings-panel">
          <header><div><h3>Preferencias del sistema</h3><p>Reglas recomendadas para operación diaria.</p></div><SlidersHorizontal size={21} /></header>
          <div className="settings-toggle-list">
            {preferences.map((preference) => (
              <button className={preference.enabled ? "is-active" : ""} key={preference.id} onClick={() => togglePreference(preference.id)} type="button">
                <span>{preference.label}</span>
                <i />
              </button>
            ))}
          </div>
        </article>

        <article className="settings-panel">
          <header><div><h3>Notificaciones</h3><p>Eventos que deben alertar al equipo administrativo.</p></div><BellRing size={21} /></header>
          <div className="settings-notification-list">
            <p><strong>Tickets urgentes</strong><span>Correo y notificación en panel</span></p>
            <p><strong>Pagos vencidos</strong><span>Recordatorio interno de cobranza</span></p>
            <p><strong>Nuevos clientes</strong><span>Registro en actividad y seguimiento</span></p>
          </div>
        </article>
      </div>
    </section>
  );
}
