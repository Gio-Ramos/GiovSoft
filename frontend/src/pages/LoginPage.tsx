import { useState } from "react";
import type { FormEvent } from "react";
import { KeyRound, LockKeyhole, MailCheck, ShieldCheck } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";

export default function LoginPage() {
  const { isAuthenticated, login, verifyTwoFactor } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<{
    challengeId: string;
    emailHint: string;
    expiresAt?: number;
    passkeyAvailable?: boolean;
  } | null>(null);
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

    const result = twoFactorChallenge
      ? await verifyTwoFactor(twoFactorChallenge.challengeId, verificationCode)
      : await login(email, password);
    setIsSubmitting(false);

    if (result.requiresTwoFactor && result.challengeId) {
      setTwoFactorChallenge({
        challengeId: result.challengeId,
        emailHint: result.emailHint || email,
        expiresAt: result.expiresAt,
        passkeyAvailable: Boolean(result.methods?.passkey),
      });
      setVerificationCode("");
      setMessage("Te enviamos un código de verificación a tu correo.");
      return;
    }

    if (!result.ok) {
      setMessage(result.message || "No se pudo iniciar sesión.");
      return;
    }

    navigate(from, { replace: true });
  }

  async function handlePasskeyLogin() {
    setMessage("");
    setIsSubmitting(true);

    try {
      await api.post("/api/admin/login/passkey/start", { email });
      setMessage("Sigue las instrucciones de tu navegador para usar tu llave de seguridad.");
    } catch (error) {
      const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setMessage(responseMessage || "La llave de seguridad todavía no está configurada para este usuario.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetLoginFlow() {
    setTwoFactorChallenge(null);
    setVerificationCode("");
    setPassword("");
    setMessage("");
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
          <h1 id="login-title">{twoFactorChallenge ? "Verifica tu acceso" : "Inicia sesión"}</h1>
          <p>
            {twoFactorChallenge
              ? `Ingresa el código de 6 dígitos enviado a ${twoFactorChallenge.emailHint}.`
              : "Ingresa tu correo y contraseña para consultar solicitudes, clientes y seguimiento."}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {twoFactorChallenge ? (
            <>
              <div className="login-2fa-panel">
                <MailCheck size={22} />
                <div>
                  <strong>Código por correo</strong>
                  <span>
                    Vence en unos minutos. Si no lo recibes, revisa spam o vuelve a iniciar sesión.
                  </span>
                </div>
              </div>

              <label htmlFor="admin-2fa-code">Código de verificación</label>
              <input
                id="admin-2fa-code"
                type="text"
                value={verificationCode}
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                required
              />
            </>
          ) : (
            <>
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
            </>
          )}
          {message && <p className="login-message">{message}</p>}
          {!twoFactorChallenge && (
            <button className="login-secondary-action" onClick={handlePasskeyLogin} type="button" disabled={isSubmitting || !email}>
              <KeyRound size={18} />
              Usar llave de seguridad o iCloud
            </button>
          )}
          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Validando..." : twoFactorChallenge ? "Verificar código" : "Entrar al panel"}
          </button>
          {twoFactorChallenge && (
            <button className="login-reset-button" onClick={resetLoginFlow} type="button">
              <ShieldCheck size={16} />
              Volver a iniciar sesión
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
