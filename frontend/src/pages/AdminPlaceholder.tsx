import { ArrowRight } from "lucide-react";

interface Props {
  title: string;
  description?: string;
}

export default function AdminPlaceholder({ title, description }: Props) {
  return (
    <section className="admin-placeholder surface-card">
      <p className="eyebrow">Modulo administrativo</p>
      <h2>{title}</h2>
      <p>{description || "Esta seccion esta lista para conectar su flujo operativo."}</p>
      <span>
        Configuracion pendiente
        <ArrowRight size={16} />
      </span>
    </section>
  );
}
