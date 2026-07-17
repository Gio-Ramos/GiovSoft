import { ExternalLink, RefreshCw, Save, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

interface LeadOpportunity {
  externalOpportunityId: string;
  companyName: string;
  score: number;
  confidence: number;
  recommendedService: string;
  commercialStatus: string;
  assignedTo: string;
  commercialResult: string;
  leadIntelligenceUrl: string;
  updatedAt: string;
}

const statusLabels: Record<string, string> = { approved: "Aprobada", assigned: "Asignada", contacted: "Contactada", qualified: "Calificada", won: "Ganada", lost: "Perdida" };

export default function AdminLeadIntelligence() {
  const [items, setItems] = useState<LeadOpportunity[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await api.get("/api/admin/lead-intelligence/opportunities");
    setItems(response.data.opportunities || []);
  }

  useEffect(() => { api.get("/api/admin/lead-intelligence/opportunities").then((response) => setItems(response.data.opportunities || [])).catch(() => setMessage("No se pudieron cargar las oportunidades.")); }, []);

  const metrics = useMemo(() => ({
    total: items.length,
    assigned: items.filter((item) => item.assignedTo).length,
    won: items.filter((item) => item.commercialStatus === "won").length,
    average: items.length ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length) : 0,
  }), [items]);

  function change(id: string, field: keyof LeadOpportunity, value: string) {
    setItems((current) => current.map((item) => item.externalOpportunityId === id ? { ...item, [field]: value } : item));
  }

  async function save(item: LeadOpportunity) {
    const response = await api.patch(`/api/admin/lead-intelligence/opportunities/${item.externalOpportunityId}`, {
      assignedTo: item.assignedTo,
      commercialResult: item.commercialResult,
      commercialStatus: item.commercialStatus,
    });
    setItems((current) => current.map((row) => row.externalOpportunityId === item.externalOpportunityId ? response.data.opportunity : row));
    setMessage("Resultado comercial guardado y disponible para Lead Intelligence.");
  }

  return (
    <section className="lead-intelligence-shell">
      <div className="clients-page-head"><div><h2>Inteligencia comercial</h2><p>Oportunidades verificadas por Lead Intelligence, listas para asignación y seguimiento.</p></div><button className="clients-secondary-action" onClick={load} type="button"><RefreshCw size={18} /> Actualizar</button></div>
      {message && <p className="admin-form-success">{message}</p>}
      <div className="clients-stats-grid">
        <article className="clients-stat-card"><span className="clients-stat-icon is-blue"><Sparkles size={25} /></span><div><p>Oportunidades</p><h3>{metrics.total}</h3><small>Aprobadas por el motor</small></div></article>
        <article className="clients-stat-card"><div><p>Score promedio</p><h3>{metrics.average}</h3><small>Reglas explicables</small></div></article>
        <article className="clients-stat-card"><div><p>Asignadas</p><h3>{metrics.assigned}</h3><small>Con responsable</small></div></article>
        <article className="clients-stat-card"><div><p>Ganadas</p><h3>{metrics.won}</h3><small>Resultado comercial</small></div></article>
      </div>
      <article className="billing-table-card applications-card"><div className="clients-table-wrap"><table className="billing-data-table lead-intelligence-table"><thead><tr><th>Empresa</th><th>Score</th><th>Servicio</th><th>Responsable</th><th>Estado</th><th>Resultado</th><th>Expediente</th><th /></tr></thead><tbody>
        {items.map((item) => <tr key={item.externalOpportunityId}>
          <td><strong>{item.companyName}</strong><small>{Math.round(item.confidence * 100)}% confianza</small></td><td><strong>{item.score}</strong></td><td>{item.recommendedService}</td>
          <td><input value={item.assignedTo} onChange={(event) => change(item.externalOpportunityId, "assignedTo", event.target.value)} placeholder="Ej. Giovanni" /></td>
          <td><select value={item.commercialStatus} onChange={(event) => change(item.externalOpportunityId, "commercialStatus", event.target.value)}>{Object.entries(statusLabels).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></td>
          <td><input value={item.commercialResult} onChange={(event) => change(item.externalOpportunityId, "commercialResult", event.target.value)} placeholder="Nota o resultado" /></td>
          <td>{item.leadIntelligenceUrl && <a href={item.leadIntelligenceUrl} target="_blank" rel="noreferrer"><ExternalLink size={17} /> Abrir</a>}</td>
          <td><button className="clients-row-action" onClick={() => save(item)} type="button"><Save size={17} /></button></td>
        </tr>)}
        {!items.length && <tr><td className="quotes-empty-row" colSpan={8}>Aún no hay oportunidades aprobadas desde Lead Intelligence.</td></tr>}
      </tbody></table></div></article>
    </section>
  );
}
