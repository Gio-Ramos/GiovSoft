import {
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  MessageCircle,
  ReceiptText,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

interface DashboardStat {
  label: string;
  value: string;
  change: string;
  tone: string;
}

interface ContactRequest {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  service?: string;
  message: string;
  emailStatus?: string;
  createdAt: string;
}

interface DashboardSummary {
  stats: DashboardStat[];
  recentRequests: ContactRequest[];
  priorities: string[];
}

const fallbackSummary: DashboardSummary = {
  stats: [
    { label: "Solicitudes hoy", value: "0", change: "sin nuevas", tone: "is-neutral" },
    { label: "Leads activos", value: "0", change: "por contactar", tone: "is-neutral" },
    { label: "Ultimos 7 dias", value: "0", change: "desde el sitio", tone: "is-critical" },
  ],
  recentRequests: [],
  priorities: [
    "Contactar solicitudes nuevas durante el mismo dia.",
    "Clasificar cada lead por servicio.",
    "Dar seguimiento a solicitudes sin respuesta.",
  ],
};

const revenueTrend = [
  { month: "Ene", value: 0 },
  { month: "Feb", value: 0 },
  { month: "Mar", value: 0 },
  { month: "Abr", value: 0 },
  { month: "May", value: 0 },
  { month: "Jun", value: 0 },
];

const activityItems: { id: string; title: string; detail: string; time: string; tone: string }[] = [];

const operationItems = [
  { label: "Proyectos activos", value: "0", progress: 0, icon: BriefcaseBusiness, tone: "is-blue", href: "/admin/proyectos" },
  { label: "Tickets abiertos", value: "0", progress: 0, icon: MessageCircle, tone: "is-orange", href: "/admin/tickets" },
  { label: "Facturas pendientes", value: "0", progress: 0, icon: ReceiptText, tone: "is-purple", href: "/admin/facturacion" },
];

const billingQueue: { client: string; concept: string; amount: string; due: string; status: string }[] = [];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary>(fallbackSummary);

  useEffect(() => {
    let isMounted = true;

    api
      .get<DashboardSummary>("/api/admin/summary")
      .then((response) => {
        if (isMounted) {
          setSummary(response.data);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  const leadStats = useMemo(() => {
    const today = summary.stats[0]?.value || "0";
    const active = summary.stats[1]?.value || "0";
    const week = summary.stats[2]?.value || "0";

    return { active, today, week };
  }, [summary.stats]);

  const mainStats = [
    { label: "Clientes activos", value: "0", change: "Sin registros", icon: UsersRound, tone: "is-blue" },
    { label: "Ingresos (MXN)", value: "$0", change: "Sin facturación", icon: WalletCards, tone: "is-green" },
    { label: "Facturas emitidas", value: "0", change: "Sin facturas", icon: FileText, tone: "is-purple" },
    { label: "Leads activos", value: leadStats.active, change: `${leadStats.today} hoy · ${leadStats.week} últimos 7 días`, icon: ClipboardList, tone: "is-orange" },
  ];

  return (
    <section className="dashboard-shell">
      <div className="dashboard-hero">
        <div>
          <span>Panel administrativo</span>
          <h2>Bienvenido, {user?.name?.split(" ")[0] || "Administrador"}</h2>
          <p>Resumen general de clientes, ingresos, facturación, proyectos y soporte.</p>
        </div>
        <div className="dashboard-hero-actions">
          <Link to="/admin/clientes"><UsersRound size={18} /> Clientes</Link>
          <Link to="/admin/proyectos"><BriefcaseBusiness size={18} /> Proyectos</Link>
        </div>
      </div>

      <div className="dashboard-stats-grid">
        {mainStats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article className="dashboard-stat-card" key={stat.label}>
              <span className={`dashboard-stat-icon ${stat.tone}`}><Icon size={27} /></span>
              <div>
                <p>{stat.label}</p>
                <h3>{stat.value}</h3>
                <small>{stat.change}</small>
              </div>
              <div className={`dashboard-mini-line ${stat.tone}`} />
            </article>
          );
        })}
      </div>

      <div className="dashboard-main-grid">
        <article className="dashboard-panel dashboard-revenue-panel">
          <header>
            <div>
              <h3>Ingresos en los últimos 6 meses</h3>
              <p>Facturación acumulada y tendencia mensual.</p>
            </div>
            <Link to="/admin/reportes">Ver reportes <ArrowUpRight size={16} /></Link>
          </header>
          <div className="dashboard-chart">
            {revenueTrend.map((item) => (
              <span key={item.month} style={{ "--bar-height": `${item.value / 1.45}%` } as CSSProperties}>
                <i />
                <small>{item.month}</small>
              </span>
            ))}
          </div>
        </article>

        <article className="dashboard-panel">
          <header>
            <div>
              <h3>Actividad reciente</h3>
              <p>Últimos movimientos relevantes.</p>
            </div>
            <Link to="/admin/auditoria">Ver todo <ArrowUpRight size={16} /></Link>
          </header>
          <div className="dashboard-activity-list">
            {activityItems.map((item) => (
              <section key={item.id}>
                <span className={item.tone}><CheckCircle2 size={18} /></span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </div>
                <time>{item.time}</time>
              </section>
            ))}
          </div>
        </article>

        <article className="dashboard-panel">
          <header>
            <div>
              <h3>Estado operativo</h3>
              <p>Avance actual por área crítica.</p>
            </div>
            <BarChart3 size={21} />
          </header>
          <div className="dashboard-operation-list">
            {operationItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link key={item.label} to={item.href}>
                  <span className={item.tone}><Icon size={19} /></span>
                  <div>
                    <strong>{item.label}</strong>
                    <i><b style={{ width: `${item.progress}%` }} /></i>
                  </div>
                  <em>{item.value}</em>
                </Link>
              );
            })}
          </div>
        </article>

        <article className="dashboard-panel">
          <header>
            <div>
              <h3>Cobranza próxima</h3>
              <p>Pagos recurrentes y saldos por atender.</p>
            </div>
            <Link to="/admin/facturacion">Cobranza <ArrowUpRight size={16} /></Link>
          </header>
          <div className="dashboard-billing-list">
            {billingQueue.map((item) => (
              <section key={`${item.client}-${item.concept}`}>
                <span><CalendarClock size={18} /></span>
                <div>
                  <strong>{item.client}</strong>
                  <small>{item.concept}</small>
                </div>
                <p>{item.amount}<small>{item.due}</small></p>
                <em>{item.status}</em>
              </section>
            ))}
          </div>
        </article>
      </div>

      <article className="dashboard-panel dashboard-leads-panel">
        <header>
          <div>
            <h3>Solicitudes recientes</h3>
            <p>Entrada rápida de leads capturados desde el sitio.</p>
          </div>
          <Link to="/admin/solicitudes">Gestionar solicitudes <ArrowUpRight size={16} /></Link>
        </header>
        <div className="dashboard-leads-list">
          {summary.recentRequests.length === 0 && (
            <section>
              <span><UserRound size={18} /></span>
              <div>
                <strong>Sin solicitudes recientes</strong>
                <small>Cuando llegue un formulario aparecerá aquí.</small>
              </div>
              <em>Pendiente</em>
            </section>
          )}

          {summary.recentRequests.slice(0, 4).map((request) => (
            <section key={request.id}>
              <span><UserRound size={18} /></span>
              <div>
                <strong>{request.name}</strong>
                <small>{request.service || "Servicio por definir"} · {formatDate(request.createdAt)}</small>
              </div>
              <p>{request.email}</p>
              <em>{request.emailStatus === "sent" ? "Correo enviado" : "Pendiente"}</em>
            </section>
          ))}
        </div>
      </article>
    </section>
  );
}
