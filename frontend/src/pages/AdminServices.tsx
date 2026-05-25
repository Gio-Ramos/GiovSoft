import { CheckCircle2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getAdminRequests, type ContactRequest } from "../lib/adminRequests";

const serviceCatalog = ["GiovSoft 360", "Sitio web", "Ecommerce", "Dominios", "Correos corporativos", "Google Workspace"];

export default function AdminServices() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const services = useMemo(
    () =>
      serviceCatalog.map((service) => {
        const serviceRequests = requests.filter((request) => request.service === service);
        return {
          service,
          total: serviceRequests.length,
          converted: serviceRequests.filter((request) => request.status === "converted").length,
          active: serviceRequests.filter((request) => ["new", "contacted", "in_progress"].includes(request.status || "new")).length,
        };
      }),
    [requests]
  );

  useEffect(() => {
    getAdminRequests().then(setRequests).catch(() => setRequests([]));
  }, []);

  return (
    <div className="admin-module-shell">
      <section className="requests-toolbar surface-card">
        <div>
          <p className="eyebrow">Servicios</p>
          <h2>Catálogo comercial</h2>
          <span>Demanda y conversión por servicio ofrecido</span>
        </div>
      </section>

      <section className="admin-card-grid">
        {services.map((item) => (
          <article className="surface-card admin-service-card" key={item.service}>
            <Sparkles size={22} />
            <h3>{item.service}</h3>
            <p>Solicitudes: {item.total}</p>
            <div className="service-mini-stats">
              <span>{item.active} activas</span>
              <span>{item.converted} clientes</span>
            </div>
            <small>
              <CheckCircle2 size={14} />
              Disponible en formulario y seguimiento
            </small>
          </article>
        ))}
      </section>
    </div>
  );
}
