import { CheckCircle2, Database, Mail, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface AdminSettingsData {
  adminEmail: string;
  smtpConfigured: boolean;
  smtpUser: string;
  frontendOrigins: string[];
  dataStore: string;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<AdminSettingsData | null>(null);

  useEffect(() => {
    api.get<AdminSettingsData>("/api/admin/settings").then((response) => setSettings(response.data)).catch(() => setSettings(null));
  }, []);

  return (
    <div className="admin-module-shell">
      <section className="requests-toolbar surface-card">
        <div>
          <p className="eyebrow">Ajustes</p>
          <h2>Configuración del panel</h2>
          <span>Estado operativo del backend, correo y almacenamiento</span>
        </div>
      </section>

      <section className="admin-card-grid">
        <article className="surface-card admin-setting-card">
          <Mail size={22} />
          <h3>Correo administrativo</h3>
          <p>{settings?.adminEmail || "No disponible"}</p>
          <span className={`request-stage ${settings?.smtpConfigured ? "is-converted" : "is-lost"}`}>
            {settings?.smtpConfigured ? "SMTP activo" : "SMTP pendiente"}
          </span>
        </article>

        <article className="surface-card admin-setting-card">
          <Database size={22} />
          <h3>Almacenamiento</h3>
          <p>{settings?.dataStore || "JSON local"}</p>
          <span className="request-stage is-contacted">Operativo</span>
        </article>

        <article className="surface-card admin-setting-card">
          <Settings2 size={22} />
          <h3>Orígenes permitidos</h3>
          <p>{settings?.frontendOrigins?.join(", ") || "Sin información"}</p>
          <span className="request-stage is-contacted">CORS</span>
        </article>

        <article className="surface-card admin-setting-card">
          <CheckCircle2 size={22} />
          <h3>Cuenta SMTP</h3>
          <p>{settings?.smtpUser || "Sin cuenta configurada"}</p>
          <span className="request-stage is-converted">Listo</span>
        </article>
      </section>
    </div>
  );
}
