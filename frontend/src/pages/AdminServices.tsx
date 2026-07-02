import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Edit3,
  Filter,
  Globe2,
  Mail,
  MonitorSmartphone,
  MoreVertical,
  PackageCheck,
  Plus,
  Save,
  Search,
  ServerCog,
  ShoppingCart,
  Sparkles,
  ToggleLeft,
} from "lucide-react";
import { useCloseOnOutsideClick } from "../hooks/useCloseOnOutsideClick";

type PriceMode = "fixed" | "variable";
type BillingCycle = "Único" | "Mensual" | "Anual" | "Variable";

interface ServicePlan {
  id: string;
  name: string;
  description: string;
  priceMode: PriceMode;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  status: "active" | "inactive";
}

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  description: string;
  status: "active" | "inactive";
  variablePricing: boolean;
  plans: ServicePlan[];
}

interface ServiceForm {
  name: string;
  category: string;
  description: string;
  status: "active" | "inactive";
  variablePricing: boolean;
}

interface PlanForm {
  name: string;
  description: string;
  priceMode: PriceMode;
  price: string;
  currency: string;
  billingCycle: BillingCycle;
  status: "active" | "inactive";
}

const storageKey = "giovsoft-admin-services-v2";

const emptyPlanForm: PlanForm = {
  name: "",
  description: "",
  priceMode: "fixed",
  price: "",
  currency: "MXN",
  billingCycle: "Mensual",
  status: "active",
};

const emptyServiceForm: ServiceForm = {
  name: "",
  category: "",
  description: "",
  status: "active",
  variablePricing: false,
};

const demoServices: ServiceItem[] = [];

function serviceIcon(name: string) {
  if (name.includes("Dominio")) return Globe2;
  if (name.includes("Correo") || name.includes("Workspace")) return Mail;
  if (name.includes("Ecommerce")) return ShoppingCart;
  if (name.includes("Sitio")) return MonitorSmartphone;
  if (name.includes("360")) return Sparkles;
  return ServerCog;
}

function money(plan: ServicePlan) {
  if (plan.priceMode === "variable") {
    return "Variable";
  }

  return new Intl.NumberFormat("es-MX", {
    currency: plan.currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(plan.price);
}

export default function AdminServices() {
  const [services, setServices] = useState<ServiceItem[]>(() => {
    const stored = window.localStorage.getItem(storageKey);

    if (!stored) {
      return demoServices;
    }

    try {
      return JSON.parse(stored) as ServiceItem[];
    } catch (_error) {
      return demoServices;
    }
  });
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || "");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [openMenu, setOpenMenu] = useState("");
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState("");
  const [planForm, setPlanForm] = useState<PlanForm>(emptyPlanForm);
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm);
  const [message, setMessage] = useState("");

  useCloseOnOutsideClick(Boolean(openMenu), () => setOpenMenu(""));

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    if (!services.some((service) => service.id === selectedServiceId) && services[0]) {
      setSelectedServiceId(services[0].id);
    }
  }, [selectedServiceId, services]);

  const filteredServices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return services.filter((service) => {
      const matchesQuery =
        !normalizedQuery || `${service.name} ${service.category} ${service.description}`.toLowerCase().includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "Todos" ||
        (statusFilter === "Activos" ? service.status === "active" : service.status === "inactive");

      return matchesQuery && matchesStatus;
    });
  }, [query, services, statusFilter]);

  const selectedService = services.find((service) => service.id === selectedServiceId) || services[0];
  const totalPlans = services.reduce((total, service) => total + service.plans.length, 0);
  const activeServices = services.filter((service) => service.status === "active").length;
  const variableServices = services.filter((service) => service.variablePricing).length;
  const activePlans = services.flatMap((service) => service.plans).filter((plan) => plan.status === "active").length;

  function updatePlanForm(field: keyof PlanForm, value: string) {
    setPlanForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "priceMode" && value === "variable" ? { billingCycle: "Variable", price: "" } : {}),
    }));
  }

  function updateServiceForm(field: keyof ServiceForm, value: string | boolean) {
    setServiceForm((current) => ({ ...current, [field]: value }));
  }

  function openNewService() {
    setShowPlanForm(false);
    setOpenMenu("");
    setServiceForm(emptyServiceForm);
    setMessage("");
    setShowServiceForm(true);
  }

  function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!serviceForm.name || !serviceForm.category || !serviceForm.description) {
      setMessage("Completa nombre, categoría y descripción del servicio.");
      return;
    }

    const service: ServiceItem = {
      id: crypto.randomUUID(),
      name: serviceForm.name,
      category: serviceForm.category,
      description: serviceForm.description,
      status: serviceForm.status,
      variablePricing: serviceForm.variablePricing,
      plans: [],
    };

    setServices((current) => [service, ...current]);
    setSelectedServiceId(service.id);
    setServiceForm(emptyServiceForm);
    setShowServiceForm(false);
    setMessage("Servicio creado correctamente. Ahora puedes agregar sus planes o valores variables.");
  }

  function openNewPlan() {
    setEditingPlanId("");
    setPlanForm({
      ...emptyPlanForm,
      priceMode: selectedService?.variablePricing ? "variable" : "fixed",
      billingCycle: selectedService?.variablePricing ? "Variable" : "Mensual",
    });
    setMessage("");
    setShowPlanForm(true);
  }

  function openEditPlan(plan: ServicePlan) {
    setEditingPlanId(plan.id);
    setPlanForm({
      name: plan.name,
      description: plan.description,
      priceMode: plan.priceMode,
      price: plan.price ? String(plan.price) : "",
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      status: plan.status,
    });
    setMessage("");
    setOpenMenu("");
    setShowPlanForm(true);
  }

  function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedService || !planForm.name || !planForm.description) {
      setMessage("Completa nombre y descripción del plan.");
      return;
    }

    if (planForm.priceMode === "fixed" && !planForm.price) {
      setMessage("Agrega el precio fijo del plan.");
      return;
    }

    const nextPlan: ServicePlan = {
      id: editingPlanId || crypto.randomUUID(),
      name: planForm.name,
      description: planForm.description,
      priceMode: planForm.priceMode,
      price: planForm.priceMode === "variable" ? 0 : Number(planForm.price),
      currency: planForm.currency,
      billingCycle: planForm.priceMode === "variable" ? "Variable" : planForm.billingCycle,
      status: planForm.status,
    };

    setServices((current) =>
      current.map((service) =>
        service.id === selectedService.id
          ? {
              ...service,
              plans: editingPlanId
                ? service.plans.map((plan) => (plan.id === editingPlanId ? nextPlan : plan))
                : [nextPlan, ...service.plans],
              variablePricing: service.variablePricing || nextPlan.priceMode === "variable",
            }
          : service,
      ),
    );
    setMessage(editingPlanId ? "Plan actualizado correctamente." : "Plan agregado correctamente.");
    setShowPlanForm(false);
    setEditingPlanId("");
    setPlanForm(emptyPlanForm);
  }

  function toggleServiceStatus(service: ServiceItem) {
    const nextStatus = service.status === "active" ? "inactive" : "active";
    setServices((current) => current.map((item) => (item.id === service.id ? { ...item, status: nextStatus } : item)));
    setMessage(`${service.name} ahora está ${nextStatus === "active" ? "activo" : "inactivo"}.`);
  }

  function togglePlanStatus(plan: ServicePlan) {
    if (!selectedService) {
      return;
    }

    const nextStatus = plan.status === "active" ? "inactive" : "active";
    setServices((current) =>
      current.map((service) =>
        service.id === selectedService.id
          ? {
              ...service,
              plans: service.plans.map((item) => (item.id === plan.id ? { ...item, status: nextStatus } : item)),
            }
          : service,
      ),
    );
    setMessage(`${plan.name} ahora está ${nextStatus === "active" ? "activo" : "inactivo"}.`);
    setOpenMenu("");
  }

  return (
    <section className="services-admin-shell">
      <div className="clients-page-head">
        <div>
          <h2>Servicios</h2>
          <p>Administra el catálogo comercial, planes y precios variables por servicio.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-primary-action" onClick={openNewService} type="button">
            <Plus size={20} />
            Nuevo servicio
          </button>
          <button className="clients-action-caret" type="button">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {message && <p className={message.includes("Completa") || message.includes("Agrega") ? "admin-form-error" : "admin-form-success"}>{message}</p>}

      {showServiceForm && (
        <form className="services-new-form" onSubmit={saveService}>
          <header>
            <div>
              <h3>Nuevo servicio</h3>
              <p>Registra el servicio base; después agrega planes, precio fijo o valor variable.</p>
            </div>
            <div>
              <button className="client-register-cancel" onClick={() => setShowServiceForm(false)} type="button">Cancelar</button>
              <button className="client-register-save" type="submit"><Save size={17} /> Guardar servicio</button>
            </div>
          </header>
          <div className="services-new-grid">
            <label>
              <span>Nombre del servicio <b>*</b></span>
              <input onChange={(event) => updateServiceForm("name", event.target.value)} placeholder="Ej. Registro de dominio" value={serviceForm.name} />
            </label>
            <label>
              <span>Categoría <b>*</b></span>
              <select onChange={(event) => updateServiceForm("category", event.target.value)} value={serviceForm.category}>
                <option value="">Seleccionar categoría</option>
                <option>Web y ecommerce</option>
                <option>Dominios y DNS</option>
                <option>Correos y Workspace</option>
                <option>Infraestructura</option>
                <option>Consultoría</option>
              </select>
            </label>
            <label>
              <span>Estado</span>
              <select onChange={(event) => updateServiceForm("status", event.target.value)} value={serviceForm.status}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </label>
            <label className="services-new-check">
              <input
                checked={serviceForm.variablePricing}
                onChange={(event) => updateServiceForm("variablePricing", event.target.checked)}
                type="checkbox"
              />
              Permite valor variable
            </label>
            <label className="services-new-wide">
              <span>Descripción <b>*</b></span>
              <textarea
                onChange={(event) => updateServiceForm("description", event.target.value)}
                placeholder="Describe alcance, condiciones, datos necesarios o entregables principales..."
                value={serviceForm.description}
              />
            </label>
          </div>
        </form>
      )}

      <div className="clients-stats-grid">
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-blue"><PackageCheck size={27} /></span>
          <div><p>Servicios totales</p><h3>{services.length}</h3><small>Catálogo disponible</small></div>
        </article>
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-green"><ToggleLeft size={27} /></span>
          <div><p>Servicios activos</p><h3>{activeServices}</h3><small>Visibles para operación</small></div>
        </article>
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-purple"><Sparkles size={27} /></span>
          <div><p>Planes activos</p><h3>{activePlans}</h3><small>De {totalPlans} planes</small></div>
        </article>
        <article className="clients-stat-card">
          <span className="clients-stat-icon is-orange"><Globe2 size={27} /></span>
          <div><p>Valor variable</p><h3>{variableServices}</h3><small>Dominios y licencias</small></div>
        </article>
      </div>

      <section className="services-admin-grid">
        <article className="services-list-card">
          <header className="roles-card-head">
            <div>
              <h3>Catálogo de servicios</h3>
              <p>Selecciona un servicio para editar sus planes.</p>
            </div>
            <button className="roles-filter-button" onClick={() => setStatusFilter(statusFilter === "Todos" ? "Activos" : statusFilter === "Activos" ? "Inactivos" : "Todos")} type="button">
              <Filter size={17} />
              Filtros
            </button>
          </header>
          <label className="services-list-search">
            <Search size={17} />
            <input onChange={(event) => setQuery(event.target.value)} placeholder="Buscar servicio..." value={query} />
          </label>
          <div className="services-list">
            {filteredServices.map((service) => {
              const Icon = serviceIcon(service.name);
              const selected = selectedService?.id === service.id;

              return (
                <button
                  className={`services-list-item ${selected ? "is-selected" : ""}`}
                  key={service.id}
                  onClick={() => {
                    setSelectedServiceId(service.id);
                    setShowPlanForm(false);
                  }}
                  type="button"
                >
                  <span className="services-list-icon"><Icon size={21} /></span>
                  <span>
                    <strong>{service.name}</strong>
                    <small>{service.category}</small>
                  </span>
                  {service.variablePricing && <em>Variable</em>}
                </button>
              );
            })}
          </div>
        </article>

        {selectedService && (
          <article className="services-detail-card">
            <header className="services-detail-head">
              <div>
                <span className="services-detail-icon">{(() => {
                  const Icon = serviceIcon(selectedService.name);
                  return <Icon size={24} />;
                })()}</span>
                <div>
                  <h3>{selectedService.name}</h3>
                  <p>{selectedService.description}</p>
                </div>
              </div>
              <button className="services-status-button" onClick={() => toggleServiceStatus(selectedService)} type="button">
                {selectedService.status === "active" ? "Inhabilitar" : "Activar"}
              </button>
            </header>

            <div className="services-detail-meta">
              <span>{selectedService.category}</span>
              <span>{selectedService.plans.length} planes</span>
              <span>{selectedService.variablePricing ? "Acepta valor variable" : "Precios fijos"}</span>
            </div>

            {showPlanForm && (
              <form className="services-plan-form" onSubmit={savePlan}>
                <label>
                  <span>Nombre del plan <b>*</b></span>
                  <input onChange={(event) => updatePlanForm("name", event.target.value)} placeholder="Ej. Profesional" value={planForm.name} />
                </label>
                <label>
                  <span>Tipo de precio</span>
                  <select onChange={(event) => updatePlanForm("priceMode", event.target.value)} value={planForm.priceMode}>
                    <option value="fixed">Precio fijo</option>
                    <option value="variable">Valor variable</option>
                  </select>
                </label>
                <label>
                  <span>Precio</span>
                  <input
                    disabled={planForm.priceMode === "variable"}
                    min="0"
                    onChange={(event) => updatePlanForm("price", event.target.value)}
                    placeholder={planForm.priceMode === "variable" ? "Se cotiza según el caso" : "Ej. 14990"}
                    type="number"
                    value={planForm.price}
                  />
                </label>
                <label>
                  <span>Ciclo</span>
                  <select disabled={planForm.priceMode === "variable"} onChange={(event) => updatePlanForm("billingCycle", event.target.value)} value={planForm.billingCycle}>
                    <option>Único</option>
                    <option>Mensual</option>
                    <option>Anual</option>
                    <option>Variable</option>
                  </select>
                </label>
                <label className="services-plan-wide">
                  <span>Descripción <b>*</b></span>
                  <input onChange={(event) => updatePlanForm("description", event.target.value)} placeholder="Describe alcance, condiciones o entregables..." value={planForm.description} />
                </label>
                <div className="services-plan-actions">
                  <button onClick={() => setShowPlanForm(false)} type="button">Cancelar</button>
                  <button type="submit"><Save size={17} /> Guardar plan</button>
                </div>
              </form>
            )}

            <div className="services-plans-toolbar">
              <h3>Planes y precios</h3>
              <button onClick={openNewPlan} type="button"><Plus size={17} /> Agregar plan</button>
            </div>

            <div className="services-plans-wrap">
              <table className="services-plans-table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Descripción</th>
                    <th>Precio</th>
                    <th>Ciclo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedService.plans.map((plan) => (
                    <tr key={plan.id}>
                      <td><strong>{plan.name}</strong></td>
                      <td>{plan.description}</td>
                      <td><span className={`services-price-badge is-${plan.priceMode}`}>{money(plan)}</span></td>
                      <td>{plan.billingCycle}</td>
                      <td>
                        <span className={`clients-status-badge is-${plan.status === "active" ? "active" : "inactive"}`}>
                          {plan.status === "active" ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td>
                        <button className="clients-row-action" onClick={() => setOpenMenu(openMenu === plan.id ? "" : plan.id)} type="button">
                          <MoreVertical size={20} />
                        </button>
                        <div className={`clients-action-menu ${openMenu === plan.id ? "is-open" : ""}`}>
                          <button onClick={() => openEditPlan(plan)} type="button"><Edit3 size={15} /> Editar</button>
                          <button onClick={() => togglePlanStatus(plan)} type="button">
                            {plan.status === "active" ? "Inhabilitar" : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        )}
      </section>
    </section>
  );
}
