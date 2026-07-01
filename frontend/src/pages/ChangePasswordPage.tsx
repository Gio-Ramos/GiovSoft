import { useState } from "react";
import type { FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function ChangePasswordPage() {
  const { user, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const requiresChange = Boolean(user?.passwordChangeRequired);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (newPassword !== confirmPassword) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    const result = await changePassword(newPassword, currentPassword);
    setIsSubmitting(false);

    if (!result.ok) {
      setMessage(result.message || "No se pudo actualizar la contraseña.");
      return;
    }

    navigate("/admin", { replace: true });
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
      <section className="login-card" aria-labelledby="change-password-title">
        <div className="login-brand">
          <div className="login-logo-lockup">
            <img src="/img/logo-icon.svg" alt="" aria-hidden="true" />
            <div>
              <strong>GiovSoft</strong>
              <small>Innovación a tu alcance</small>
            </div>
          </div>
          <span className="login-badge">
            <KeyRound size={16} />
            Seguridad
          </span>
        </div>

        <div className="login-copy">
          <p className="eyebrow is-light">Contraseña requerida</p>
          <h1 id="change-password-title">Actualiza tu contraseña</h1>
          <p>
            {requiresChange
              ? "Tu cuenta usa una contraseña temporal. Define una contraseña nueva para continuar."
              : "Ingresa tu contraseña actual y define una nueva."}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {!requiresChange && (
            <>
              <label htmlFor="current-password">Contraseña actual</label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                autoComplete="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Contraseña actual"
                required
              />
            </>
          )}

          <label htmlFor="new-password">Nueva contraseña</label>
          <input
            id="new-password"
            type="password"
            value={newPassword}
            autoComplete="new-password"
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            required
          />

          <label htmlFor="confirm-password">Confirmar contraseña</label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            autoComplete="new-password"
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repite la nueva contraseña"
            minLength={8}
            required
          />

          {message && <p className="login-message">{message}</p>}
          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Actualizando..." : "Guardar contraseña"}
          </button>
        </form>
      </section>
    </main>
  );
}
