import { BookOpenCheck, Bot, CheckCircle2, CircleHelp, Clock3, Headphones, LifeBuoy, MessageSquareText, PhoneCall, Plus, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";

type ChannelStatus = "online" | "busy" | "offline";
type QueueStatus = "open" | "in_progress" | "waiting" | "resolved";

interface SupportChannel {
  id: string;
  name: string;
  description: string;
  icon: typeof MessageSquareText;
  status: ChannelStatus;
  volume: number;
  responseTime: string;
}

interface QueueItem {
  id: string;
  client: string;
  topic: string;
  owner: string;
  status: QueueStatus;
  sla: string;
}

const supportChannels: SupportChannel[] = [
  { id: "whatsapp", name: "WhatsApp", description: "Atención rápida para incidencias y confirmaciones.", icon: MessageSquareText, status: "online", volume: 18, responseTime: "12 min" },
  { id: "email", name: "Correo", description: "Seguimiento formal, evidencias y acuerdos de servicio.", icon: Send, status: "online", volume: 11, responseTime: "35 min" },
  { id: "phone", name: "Teléfono", description: "Casos urgentes, validaciones y soporte directo.", icon: PhoneCall, status: "busy", volume: 6, responseTime: "8 min" },
  { id: "assistant", name: "Asistente interno", description: "Respuestas base, artículos y sugerencias de atención.", icon: Bot, status: "online", volume: 24, responseTime: "1 min" },
];

const queueSeed: QueueItem[] = [
  { id: "support-1", client: "Clínica Valle del Sol", topic: "Correo de formulario no recibido", owner: "Ana Sofía Martínez", status: "open", sla: "42 min" },
  { id: "support-2", client: "Hospital Central", topic: "Alta de usuarios Workspace", owner: "Jorge Ramírez", status: "in_progress", sla: "1 h 20 min" },
  { id: "support-3", client: "Nova Farma", topic: "Ajuste de contenido ecommerce", owner: "Lucía Gómez", status: "waiting", sla: "Mañana" },
  { id: "support-4", client: "Dermatología & Belleza", topic: "Renovación mensual confirmada", owner: "María Fernanda López", status: "resolved", sla: "Completado" },
];

const statusLabels: Record<QueueStatus, string> = {
  open: "Abierto",
  in_progress: "En atención",
  waiting: "En espera",
  resolved: "Resuelto",
};

const channelLabels: Record<ChannelStatus, string> = {
  online: "En línea",
  busy: "Alta carga",
  offline: "Fuera de línea",
};

const knowledgeItems = [
  "Configuración inicial de Google Workspace",
  "Checklist para publicación de sitio web",
  "DNS, dominio y propagación",
  "Proceso para comprobantes y facturación",
];

export default function AdminSupport() {
  const [queue, setQueue] = useState(queueSeed);
  const [internalNote, setInternalNote] = useState("");

  const activeCases = queue.filter((item) => item.status === "open" || item.status === "in_progress").length;
  const waitingCases = queue.filter((item) => item.status === "waiting").length;
  const resolvedCases = queue.filter((item) => item.status === "resolved").length;
  const totalVolume = supportChannels.reduce((total, channel) => total + channel.volume, 0);

  function moveQueueItem(item: QueueItem, status: QueueStatus) {
    setQueue((current) => current.map((queueItem) => (queueItem.id === item.id ? { ...queueItem, status } : queueItem)));
  }

  function addInternalNote() {
    if (!internalNote.trim()) return;

    setQueue((current) => [
      {
        id: crypto.randomUUID(),
        client: "Nota interna",
        topic: internalNote.trim(),
        owner: "Mesa de soporte",
        status: "open",
        sla: "Hoy",
      },
      ...current,
    ]);
    setInternalNote("");
  }

  return (
    <section className="support-module-shell">
      <div className="clients-page-head">
        <div>
          <h2>Soporte</h2>
          <p>Administra canales, SLA, cola de atención y documentación de ayuda.</p>
        </div>
        <div className="clients-head-actions">
          <button className="clients-primary-action" onClick={addInternalNote} type="button"><Plus size={20} /> Nueva atención</button>
        </div>
      </div>

      <div className="clients-stats-grid">
        <article className="clients-stat-card"><span className="clients-stat-icon is-blue"><Headphones size={27} /></span><div><p>Casos activos</p><h3>{activeCases}</h3><small>En cola o atención</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-purple"><Clock3 size={27} /></span><div><p>En espera</p><h3>{waitingCases}</h3><small>Requieren respuesta externa</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-green"><CheckCircle2 size={27} /></span><div><p>Resueltos</p><h3>{resolvedCases}</h3><small>Últimas atenciones</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-orange"><LifeBuoy size={27} /></span><div><p>Volumen diario</p><h3>{totalVolume}</h3><small>Interacciones registradas</small></div></article>
      </div>

      <div className="support-grid">
        <article className="support-panel">
          <header>
            <div>
              <h3>Canales de soporte</h3>
              <p>Estado operativo y carga actual por canal.</p>
            </div>
            <Sparkles size={21} />
          </header>
          <div className="support-channel-grid">
            {supportChannels.map((channel) => {
              const Icon = channel.icon;
              return (
                <section className="support-channel-card" key={channel.id}>
                  <span className="support-channel-icon"><Icon size={22} /></span>
                  <div>
                    <h4>{channel.name}</h4>
                    <p>{channel.description}</p>
                    <small>{channel.volume} interacciones · respuesta {channel.responseTime}</small>
                  </div>
                  <span className={`support-channel-status is-${channel.status}`}>{channelLabels[channel.status]}</span>
                </section>
              );
            })}
          </div>
        </article>

        <article className="support-panel">
          <header>
            <div>
              <h3>Cola de atención</h3>
              <p>Seguimiento rápido de casos que requieren soporte.</p>
            </div>
            <CircleHelp size={21} />
          </header>
          <div className="support-queue-list">
            {queue.map((item) => (
              <section className="support-queue-item" key={item.id}>
                <div>
                  <strong>{item.client}</strong>
                  <span>{item.topic}</span>
                  <small>{item.owner} · SLA {item.sla}</small>
                </div>
                <span className={`billing-status is-${item.status}`}>{statusLabels[item.status]}</span>
                <div className="support-queue-actions">
                  <button onClick={() => moveQueueItem(item, "in_progress")} type="button">Atender</button>
                  <button onClick={() => moveQueueItem(item, "waiting")} type="button">Espera</button>
                  <button onClick={() => moveQueueItem(item, "resolved")} type="button">Resolver</button>
                </div>
              </section>
            ))}
          </div>
        </article>

        <article className="support-panel">
          <header>
            <div>
              <h3>Nota rápida</h3>
              <p>Registra una solicitud interna para seguimiento.</p>
            </div>
            <ShieldCheck size={21} />
          </header>
          <div className="support-note-box">
            <textarea onChange={(event) => setInternalNote(event.target.value)} placeholder="Ej. Revisar acceso de correo para cliente..." value={internalNote} />
            <button onClick={addInternalNote} type="button"><Plus size={18} /> Agregar a cola</button>
          </div>
        </article>

        <article className="support-panel">
          <header>
            <div>
              <h3>Base de conocimiento</h3>
              <p>Artículos recomendados para resolver casos frecuentes.</p>
            </div>
            <BookOpenCheck size={21} />
          </header>
          <div className="support-knowledge-list">
            {knowledgeItems.map((item) => (
              <button key={item} type="button"><BookOpenCheck size={18} /> {item}</button>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
