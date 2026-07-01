import { useState } from "react";
import type { FormEvent } from "react";
import { LockKeyhole } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/admin";

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.ok) {
      setMessage(result.message || "No se pudo iniciar sesión.");
      return;
    }

    navigate(from, { replace: true });
  }

  return (
    <main className="login-shell">
      <div className="login-tech-field" aria-hidden="true">
        <span className="tech-node tech-node-a" />
        <span className="tech-node tech-node-b" />
        <span className="tech-node tech-node-c" />
        <span className="tech-circuit tech-circuit-a" />
        <span className="tech-circuit tech-circuit-b" />
        <span className="tech-circuit tech-circuit-c" />
        <span className="tech-ring tech-ring-a" />
        <span className="tech-ring tech-ring-b" />
      </div>
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <div className="login-logo-lockup">
            <img src="/img/logo-icon.svg" alt="" aria-hidden="true" />
            <div>
              <strong>GiovSoft</strong>
              <small>Innovación a tu alcance</small>
            </div>
          </div>
          <span className="login-badge">
            <LockKeyhole size={16} />
            Panel administrativo
          </span>
        </div>

        <div className="login-copy">
          <p className="eyebrow is-light">Acceso privado</p>
          <h1 id="login-title">Inicia sesión</h1>
          <p>Ingresa tu correo y contraseña para consultar solicitudes, clientes y seguimiento.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="admin-email">Correo</label>
          <input
            id="admin-email"
            type="email"
            value={email}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="correo@giovsoft.com"
            required
          />

          <label htmlFor="admin-password">Contraseña</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Contraseña del panel"
            required
          />
          {message && <p className="login-message">{message}</p>}
          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Validando..." : "Entrar al panel"}
          </button>
        </form>
      </section>
    </main>
  );
}
