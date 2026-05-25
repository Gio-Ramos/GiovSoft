import { api } from "./api";

export interface RequestNote {
  id: string;
  body: string;
  status: string;
  statusLabel: string;
  createdAt: string;
}

export interface ContactRequest {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  service?: string;
  message: string;
  status: string;
  statusLabel?: string;
  emailStatus?: string;
  notes?: RequestNote[];
  statusHistory?: Array<{
    status: string;
    label: string;
    note: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt?: string;
}

export const statusOptions = [
  { value: "all", label: "Todas" },
  { value: "new", label: "Nuevas" },
  { value: "contacted", label: "Contactado" },
  { value: "in_progress", label: "En seguimiento" },
  { value: "info_only", label: "Solo información" },
  { value: "converted", label: "Cliente" },
  { value: "lost", label: "Perdidas" },
];

export const editableStatuses = statusOptions.filter((status) => status.value !== "all");

export function formatAdminDate(value?: string) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getStatusLabel(request: ContactRequest) {
  return request.statusLabel || statusOptions.find((status) => status.value === request.status)?.label || "Nueva";
}

export async function getAdminRequests() {
  const response = await api.get<{ requests: ContactRequest[] }>("/api/admin/contact-requests");
  return response.data.requests;
}
