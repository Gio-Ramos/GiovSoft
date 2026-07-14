import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  CircleDollarSign,
  Clock3,
  CreditCard,
  RefreshCw,
  Send,
  TrendingUp,
  X,
} from "lucide-react";
import { api } from "../lib/api";

type OrderStatus = "draft" | "pending" | "paid" | "failed" | "expired" | "refunded";

interface BusinessLine {
  id: string;
  slug: string;
  name: string;
  color: string;
  status: string;
}

interface Order {
  id: string;
  applicationId: string;
  businessLineId: string;
  sku: string;
  plan: string;
  concept: string;
  amount: number;
  subtotal: number;
  tax: number;
  currency: string;
  status: OrderStatus;
  stripeSessionId: string;
  stripePaymentIntentId: string;
  externalRef: string;
  customer: { name?: string; email?: string };
  cfdiId: string;
  paidAt: string;
  createdAt: string;
}

interface Delivery {
  id: string;
  eventType: string;
  status: string;
  attempts: number;
  targetUrl: string;
  lastStatusCode: number | null;
  lastError: string;
  nextAttemptAt: string;
  deliveredAt: string;
}

interface SalesSummary {
  kpis: {
    revenueTotal: number;
    revenueThisMonth: number;
    paidOrders: number;
    avgTicket: number;
    pendingOrders: number;
    refundedAmount: number;
  };
  monthlyRevenue: { month: string; revenue: number; orders: number }[];
  byLine: { businessLineId: string; slug: string; name: string; color: string; revenue: number; orders: number }[];
  byApplication: { applicationId: string; name: string; revenue: number; orders: number }[];
}

const statusLabels: Record<OrderStatus, string> = {
  draft: "Borrador",
  pending: "Pendiente",
  paid: "Pagada",
  failed: "Fallida",
  expired: "Expirada",
  refunded: "Reembolsada",
};

const statusTones: Record<OrderStatus, string> = {
  draft: "is-paused",
  pending: "is-pending",
  paid: "is-active",
  failed: "is-error",
  expired: "is-paused",
  refunded: "is-error",
};

const monthShortNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function money(value: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value || 0);
}

function shortDate(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminSales() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [businessLines, setBusinessLines] = useState<BusinessLine[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const lineSlug = searchParams.get("line") || "";
  const currentLine = businessLines.find((line) => line.slug === lineSlug) || null;

  useEffect(() => {
    api
      .get("/api/admin/business-lines")
      .then((response) => setBusinessLines(response.data.businessLines || []))
      .catch(() => setBusinessLines([]));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const lineId = currentLine?.id || "";
      const [summaryResponse, ordersResponse] = await Promise.all([
        api.get("/api/admin/sales/summary", { params: { businessLineId: lineId || undefined, months: 6 } }),
        api.get("/api/admin/orders", {
          params: {
            businessLineId: lineId || undefined,
            status: statusFilter || undefined,
            q: search || undefined,
            limit: 50,
          },
        }),
      ]);
      setSummary(summaryResponse.data);
      setOrders(ordersResponse.data.orders || []);
      setTotalOrders(ordersResponse.data.total || 0);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "No se pudo cargar la información de ventas.");
    } finally {
      setLoading(false);
    }
  }, [currentLine?.id, statusFilter, search]);

  useEffect(() => {
    if (lineSlug && businessLines.length > 0 && !currentLine) {
      return; // slug inválido: espera a que el usuario elija otro alcance
    }
    loadData();
  }, [loadData, lineSlug, businessLines.length, currentLine]);

  async function openOrder(order: Order) {
    setSelectedOrder(order);
    setDeliveries([]);

    try {
      const response = await api.get(`/api/admin/orders/${order.id}`);
      setSelectedOrder(response.data.order);
      setDeliveries(response.data.deliveries || []);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "No se pudo cargar el detalle de la orden.");
    }
  }

  async function markPaid(order: Order) {
    try {
      const response = await api.post(`/api/admin/orders/${order.id}/mark-paid`);
      setMessage(response.data.message || "Orden marcada como pagada.");
      await openOrder(response.data.order);
      await loadData();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "No se pudo marcar la orden como pagada.");
    }
  }

  async function retryDelivery(order: Order, delivery: Delivery) {
    try {
      const response = await api.post(`/api/admin/orders/${order.id}/deliveries/${delivery.id}/retry`);
      setMessage(response.data.message || "Reintento ejecutado.");
      await openOrder(order);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "No se pudo reintentar la entrega.");
    }
  }

  const chart = useMemo(() => {
    const series = summary?.monthlyRevenue || [];
    const maxRevenue = Math.max(...series.map((item) => item.revenue), 1);
    return series.map((item) => ({
      key: item.month,
      label: monthShortNames[Number(item.month.slice(5, 7)) - 1] || item.month,
      height: Math.round((item.revenue / maxRevenue) * 100),
      revenue: item.revenue,
      orders: item.orders,
    }));
  }, [summary]);

  const kpis = summary?.kpis;

  return (
    <section className="applications-module-shell">
      <div className="clients-page-head">
        <div>
          <h2>Ventas{currentLine ? ` · ${currentLine.name}` : " · Global"}</h2>
          <p>Órdenes y ingresos del checkout centralizado, consolidados y por línea de negocio.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-secondary-action" onClick={loadData} type="button">
            <RefreshCw size={18} /> Actualizar
          </button>
        </div>
      </div>

      {message && <p className={message.includes("No se") ? "admin-form-error" : "admin-form-success"}>{message}</p>}

      <div className="sales-scope-chips">
        <button
          className={`sales-scope-chip ${!currentLine ? "active" : ""}`}
          onClick={() => setSearchParams({})}
          type="button"
        >
          Global
        </button>
        {businessLines
          .filter((line) => line.status === "active")
          .map((line) => (
            <button
              key={line.id}
              className={`sales-scope-chip ${currentLine?.id === line.id ? "active" : ""}`}
              onClick={() => setSearchParams({ line: line.slug })}
              style={currentLine?.id === line.id ? { backgroundColor: line.color, borderColor: line.color } : undefined}
              type="button"
            >
              {line.name}
            </button>
          ))}
      </div>

      <div className="clients-stats-grid">
        <article className="clients-stat-card"><span className="clients-stat-icon is-green"><CircleDollarSign size={27} /></span><div><p>Ingresos totales</p><h3>{money(kpis?.revenueTotal || 0)}</h3><small>{loading ? "Cargando..." : `${kpis?.paidOrders || 0} órdenes pagadas`}</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-blue"><TrendingUp size={27} /></span><div><p>Ingresos del mes</p><h3>{money(kpis?.revenueThisMonth || 0)}</h3><small>Mes en curso</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-purple"><CreditCard size={27} /></span><div><p>Ticket promedio</p><h3>{money(kpis?.avgTicket || 0)}</h3><small>{money(kpis?.refundedAmount || 0)} reembolsado</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-orange"><Clock3 size={27} /></span><div><p>Pendientes de pago</p><h3>{kpis?.pendingOrders || 0}</h3><small>Sesiones abiertas</small></div></article>
      </div>

      <div className="sales-panels-grid">
        <article className="billing-table-card sales-panel">
          <header className="sales-panel-head">
            <h3>Ingresos últimos 6 meses</h3>
          </header>
          <div className="dashboard-chart sales-chart">
            {chart.map((item) => (
              <span key={item.key} style={{ "--bar-height": `${item.height}%` } as CSSProperties} title={`${money(item.revenue)} · ${item.orders} órdenes`}>
                <i />
                <small>{item.label}</small>
              </span>
            ))}
          </div>
        </article>

        {!currentLine && (
          <article className="billing-table-card sales-panel">
            <header className="sales-panel-head">
              <h3>Por línea de negocio</h3>
            </header>
            <div className="sales-breakdown">
              {(summary?.byLine || []).map((line) => {
                const maxLineRevenue = Math.max(...(summary?.byLine || []).map((item) => item.revenue), 1);
                return (
                  <button className="sales-breakdown-row" key={line.businessLineId} onClick={() => setSearchParams({ line: line.slug })} type="button">
                    <span className="business-line-chip" style={{ backgroundColor: `${line.color || "#B08D57"}22`, color: line.color || "#B08D57" }}>{line.name}</span>
                    <span className="sales-breakdown-bar"><i style={{ width: `${Math.round((line.revenue / maxLineRevenue) * 100)}%`, backgroundColor: line.color || "#B08D57" }} /></span>
                    <strong>{money(line.revenue)}</strong>
                    <small>{line.orders} órdenes</small>
                  </button>
                );
              })}
            </div>
          </article>
        )}

        {currentLine && (
          <article className="billing-table-card sales-panel">
            <header className="sales-panel-head">
              <h3>Por aplicación</h3>
            </header>
            <div className="sales-breakdown">
              {(summary?.byApplication || []).map((app) => (
                <div className="sales-breakdown-row" key={app.applicationId}>
                  <span>{app.name}</span>
                  <strong>{money(app.revenue)}</strong>
                  <small>{app.orders} órdenes</small>
                </div>
              ))}
              {(summary?.byApplication || []).length === 0 && <p className="sales-empty">Sin aplicaciones con ventas en esta línea.</p>}
            </div>
          </article>
        )}
      </div>

      <article className="billing-table-card">
        <div className="billing-table-toolbar">
          <input
            className="clients-table-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por concepto, referencia o correo"
            value={search}
          />
          <select className="clients-filter-button" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option value="">Todos los estados</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <span className="sales-total-caption">{totalOrders} órdenes</span>
        </div>

        <div className="clients-table-wrap">
          <table className="billing-data-table">
            <thead><tr><th>Concepto</th><th>Línea</th><th>Plan</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Creada</th></tr></thead>
            <tbody>
              {orders.map((order) => {
                const line = businessLines.find((item) => item.id === order.businessLineId);
                return (
                  <tr className="sales-order-row" key={order.id} onClick={() => openOrder(order)}>
                    <td><strong>{order.concept}</strong><small>{order.externalRef}</small></td>
                    <td>{line ? <span className="business-line-chip" style={{ backgroundColor: `${line.color}22`, color: line.color }}>{line.name}</span> : <small>—</small>}</td>
                    <td>{order.plan || order.sku || "—"}</td>
                    <td>{order.customer?.email || order.customer?.name || "—"}</td>
                    <td><strong>{money(order.amount)}</strong></td>
                    <td><span className={`billing-status ${statusTones[order.status]}`}>{statusLabels[order.status]}</span></td>
                    <td>{shortDate(order.createdAt)}</td>
                  </tr>
                );
              })}
              {!loading && orders.length === 0 && (
                <tr><td className="quotes-empty-row" colSpan={7}>No hay órdenes con los filtros actuales.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      {selectedOrder && (
        <div className="sales-drawer-backdrop" onClick={() => setSelectedOrder(null)}>
          <aside className="sales-drawer" onClick={(event) => event.stopPropagation()}>
            <header className="sales-drawer-head">
              <div>
                <h3>{selectedOrder.concept}</h3>
                <small>{selectedOrder.id}</small>
              </div>
              <button className="clients-row-action" onClick={() => setSelectedOrder(null)} type="button"><X size={20} /></button>
            </header>

            <div className="sales-drawer-body">
              <div className="sales-drawer-status">
                <span className={`billing-status ${statusTones[selectedOrder.status]}`}>{statusLabels[selectedOrder.status]}</span>
                {selectedOrder.status === "pending" && (
                  <button className="clients-secondary-action" onClick={() => markPaid(selectedOrder)} type="button">
                    <BadgeCheck size={16} /> Marcar pagada
                  </button>
                )}
              </div>

              <dl className="sales-drawer-facts">
                <div><dt>Subtotal</dt><dd>{money(selectedOrder.subtotal)}</dd></div>
                <div><dt>IVA (16%)</dt><dd>{money(selectedOrder.tax)}</dd></div>
                <div><dt>Total</dt><dd><strong>{money(selectedOrder.amount)}</strong></dd></div>
                <div><dt>Plan / SKU</dt><dd>{selectedOrder.plan || "—"} {selectedOrder.sku ? `· ${selectedOrder.sku}` : ""}</dd></div>
                <div><dt>Referencia</dt><dd><code>{selectedOrder.externalRef}</code></dd></div>
                <div><dt>Cliente</dt><dd>{selectedOrder.customer?.name || "—"} {selectedOrder.customer?.email ? `· ${selectedOrder.customer.email}` : ""}</dd></div>
                <div><dt>Stripe session</dt><dd><code>{selectedOrder.stripeSessionId || "simulada"}</code></dd></div>
                <div><dt>Pagada</dt><dd>{shortDate(selectedOrder.paidAt)}</dd></div>
                <div><dt>CFDI</dt><dd>{selectedOrder.cfdiId ? <code>{selectedOrder.cfdiId}</code> : "Sin factura"}</dd></div>
              </dl>

              <h4 className="sales-drawer-subtitle"><Send size={15} /> Notificaciones al producto</h4>
              <div className="sales-deliveries">
                {deliveries.map((delivery) => (
                  <div className="sales-delivery-row" key={delivery.id}>
                    <div>
                      <strong>{delivery.eventType}</strong>
                      <small>{delivery.targetUrl}</small>
                      {delivery.lastError && <small className="sales-delivery-error">{delivery.lastError}</small>}
                    </div>
                    <div className="sales-delivery-meta">
                      <span className={`billing-status ${delivery.status === "delivered" ? "is-active" : delivery.status === "exhausted" ? "is-error" : "is-pending"}`}>
                        {delivery.status === "delivered" ? "Entregada" : delivery.status === "exhausted" ? "Agotada" : "Pendiente"}
                      </span>
                      <small>{delivery.attempts} intento(s)</small>
                      {delivery.status !== "delivered" && (
                        <button className="clients-secondary-action" onClick={() => retryDelivery(selectedOrder, delivery)} type="button">
                          <RefreshCw size={14} /> Reintentar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {deliveries.length === 0 && <p className="sales-empty">Sin notificaciones registradas.</p>}
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
