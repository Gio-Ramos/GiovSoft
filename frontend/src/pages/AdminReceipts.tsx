import type { ChangeEvent } from "react";
import { CheckCircle2, Download, FileArchive, FileCheck2, FileUp, Filter, MoreVertical, Plus, Search, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";

type ReceiptStatus = "valid" | "pending" | "rejected" | "archived";

interface ReceiptItem {
  id: string;
  folio: string;
  client: string;
  type: string;
  fileName: string;
  amount: number;
  status: ReceiptStatus;
  uploadedAt: string;
}

const receiptsSeed: ReceiptItem[] = [
  { id: "rec-1", folio: "UUID-8F23", client: "Clínica Valle del Sol", type: "CFDI ingreso", fileName: "F-2026-000123.xml", amount: 14990, status: "valid", uploadedAt: "2026-06-25" },
  { id: "rec-2", folio: "UUID-9A11", client: "Hospital Central", type: "PDF factura", fileName: "F-2026-000124.pdf", amount: 3490, status: "valid", uploadedAt: "2026-06-20" },
  { id: "rec-3", folio: "PEND-001", client: "Nova Farma", type: "Comprobante pago", fileName: "transferencia-nova.png", amount: 39990, status: "pending", uploadedAt: "2026-06-30" },
  { id: "rec-4", folio: "REV-445", client: "Laboratorio Clínico", type: "CFDI ingreso", fileName: "dns-lab.xml", amount: 690, status: "rejected", uploadedAt: "2026-06-15" },
];

const statusLabels: Record<ReceiptStatus, string> = {
  valid: "Validado",
  pending: "Pendiente",
  rejected: "Rechazado",
  archived: "Archivado",
};

function money(value: number) {
  return new Intl.NumberFormat("es-MX", { currency: "MXN", maximumFractionDigits: 0, style: "currency" }).format(value);
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-MX");
}

export default function AdminReceipts() {
  const [receipts, setReceipts] = useState(receiptsSeed);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [openMenu, setOpenMenu] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const filteredReceipts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return receipts.filter((receipt) => {
      const matchesQuery = !normalized || `${receipt.folio} ${receipt.client} ${receipt.fileName}`.toLowerCase().includes(normalized);
      const matchesStatus = statusFilter === "Todos" || statusLabels[receipt.status] === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, receipts, statusFilter]);

  const valid = receipts.filter((receipt) => receipt.status === "valid").length;
  const pending = receipts.filter((receipt) => receipt.status === "pending").length;
  const rejected = receipts.filter((receipt) => receipt.status === "rejected").length;
  const totalAmount = receipts.reduce((total, receipt) => total + receipt.amount, 0);

  function updateStatus(receipt: ReceiptItem, status: ReceiptStatus) {
    setReceipts((current) => current.map((item) => (item.id === receipt.id ? { ...item, status } : item)));
    setOpenMenu("");
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);

    if (!file) return;

    setReceipts((current) => [
      {
        id: crypto.randomUUID(),
        folio: `PEND-${String(current.length + 1).padStart(3, "0")}`,
        client: "Sin asignar",
        type: file.type.includes("pdf") ? "PDF factura" : file.name.endsWith(".xml") ? "CFDI XML" : "Imagen comprobante",
        fileName: file.name,
        amount: 0,
        status: "pending",
        uploadedAt: new Date().toISOString().slice(0, 10),
      },
      ...current,
    ]);
  }

  return (
    <section className="receipts-module-shell">
      <div className="clients-page-head">
        <div>
          <h2>Comprobantes</h2>
          <p>Administra XML, PDF, comprobantes de pago y evidencia fiscal.</p>
        </div>
        <div className="clients-head-actions">
          <label className="receipts-upload-button">
            <Plus size={20} />
            Subir comprobante
            <input accept=".xml,.pdf,image/*,application/pdf" onChange={handleFile} type="file" />
          </label>
        </div>
      </div>

      {selectedFile && <p className="admin-form-success">Comprobante cargado: {selectedFile.name}</p>}

      <div className="clients-stats-grid">
        <article className="clients-stat-card"><span className="clients-stat-icon is-blue"><FileCheck2 size={27} /></span><div><p>Comprobantes</p><h3>{receipts.length}</h3><small>Archivos registrados</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-green"><CheckCircle2 size={27} /></span><div><p>Validados</p><h3>{valid}</h3><small>Listos para archivo</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-purple"><FileArchive size={27} /></span><div><p>Pendientes</p><h3>{pending}</h3><small>En revisión</small></div></article>
        <article className="clients-stat-card"><span className="clients-stat-icon is-orange"><ShieldAlert size={27} /></span><div><p>Rechazados</p><h3>{rejected}</h3><small>{money(totalAmount)} registrados</small></div></article>
      </div>

      <article className="receipts-table-card">
        <div className="billing-table-toolbar">
          <label className="clients-table-search"><Search size={19} /><input onChange={(event) => setQuery(event.target.value)} placeholder="Buscar folio, cliente o archivo..." value={query} /></label>
          <label className="clients-filter-field">
            Estado
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option>Todos</option>
              {Object.values(statusLabels).map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <button className="clients-filter-button" type="button"><Filter size={18} /> Filtros</button>
          <button className="clients-download-button" type="button"><Download size={18} /></button>
        </div>
        <div className="clients-table-wrap">
          <table className="billing-data-table">
            <thead><tr><th>Folio/UUID</th><th>Cliente</th><th>Tipo</th><th>Archivo</th><th>Monto</th><th>Carga</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {filteredReceipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td><strong>{receipt.folio}</strong></td>
                  <td>{receipt.client}</td>
                  <td>{receipt.type}</td>
                  <td><span className="receipt-file-name"><FileUp size={15} /> {receipt.fileName}</span></td>
                  <td>{money(receipt.amount)}</td>
                  <td>{formatDate(receipt.uploadedAt)}</td>
                  <td><span className={`billing-status is-${receipt.status}`}>{statusLabels[receipt.status]}</span></td>
                  <td>
                    <button className="clients-row-action" onClick={() => setOpenMenu(openMenu === receipt.id ? "" : receipt.id)} type="button"><MoreVertical size={20} /></button>
                    <div className={`clients-action-menu ${openMenu === receipt.id ? "is-open" : ""}`}>
                      <button onClick={() => updateStatus(receipt, "valid")} type="button">Validar</button>
                      <button onClick={() => updateStatus(receipt, "rejected")} type="button">Rechazar</button>
                      <button onClick={() => updateStatus(receipt, "archived")} type="button">Archivar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
