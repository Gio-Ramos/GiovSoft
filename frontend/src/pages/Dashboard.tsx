import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  PackageCheck,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";

const stats = [
  {
    label: "Ventas hoy",
    value: "$14,500",
    change: "+18.2%",
    tone: "is-positive",
  },
  {
    label: "Pedidos activos",
    value: "32",
    change: "8 por surtir",
    tone: "is-neutral",
  },
  {
    label: "Inventario bajo",
    value: "8",
    change: "2 urgentes",
    tone: "is-critical",
  },
];

const activity = [
  {
    title: "Pedido #1048 confirmado",
    detail: "Sucursal Centro - hace 8 min",
    icon: ShoppingBag,
  },
  {
    title: "Reabastecimiento en ruta",
    detail: "Lote de empaques - hace 22 min",
    icon: PackageCheck,
  },
  {
    title: "Pico de ventas detectado",
    detail: "Categoria bebidas - hace 45 min",
    icon: TrendingUp,
  },
];

const priorities = [
  "Repon inventario de productos con cobertura menor a 2 dias.",
  "Confirma los 8 pedidos con promesa de entrega antes de las 16:00.",
  "Revisa la sucursal Norte: cayo 12% frente al promedio semanal.",
];

export default function Dashboard() {
  return (
    <div className="dashboard-shell">
      <section className="hero-panel">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow is-light">Operacion del dia</p>
            <h2>Visibilidad clara para decidir rapido y sin friccion.</h2>
            <p>
              Reorganice el dashboard para que las prioridades, metricas y
              actividad reciente se entiendan de un vistazo.
            </p>

            <div className="hero-actions">
              <button className="primary-button">
                Ver pedidos criticos
                <ArrowRight size={16} />
              </button>
              <button className="ghost-button">Descargar reporte</button>
            </div>
          </div>

          <div className="hero-side">
            <div className="hero-mini-card">
              <div className="hero-mini-label">
                <Clock3 size={18} />
                <span>Siguiente revision</span>
              </div>
              <strong>15:30</strong>
              <p>Corte operativo de entregas</p>
            </div>

            <div className="hero-mini-card">
              <div className="hero-mini-label">
                <AlertTriangle size={18} />
                <span>Atencion inmediata</span>
              </div>
              <strong>2 alertas</strong>
              <p>Productos con rotacion alta y stock critico</p>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        {stats.map((stat) => (
          <article key={stat.label} className="metric-card">
            <p>{stat.label}</p>
            <div className="metric-row">
              <h3>{stat.value}</h3>
              <span className={`metric-change ${stat.tone}`}>{stat.change}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="surface-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Actividad reciente</p>
              <h3>Movimiento de la operacion</h3>
            </div>
            <span className="live-badge">En vivo</span>
          </div>

          <div className="activity-list">
            {activity.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="activity-item">
                  <div className="activity-icon">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p>{item.title}</p>
                    <span>{item.detail}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="surface-card">
          <div className="section-head is-stacked">
            <div>
              <p className="eyebrow">Prioridades</p>
              <h3>Que atender ahora</h3>
            </div>
          </div>

          <div className="priority-list">
            {priorities.map((item, index) => (
              <div key={item} className="priority-item">
                <span className="priority-index">0{index + 1}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
