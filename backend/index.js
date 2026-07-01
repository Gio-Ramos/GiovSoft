require("dotenv").config();

const cors = require("cors");
const crypto = require("crypto");
const express = require("express");
const fs = require("fs/promises");
const nodemailer = require("nodemailer");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = Number(process.env.PORT || 4000);
const allowedOrigins = (
  process.env.FRONTEND_ORIGIN || "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:8080"
)
  .split(",")
  .map((origin) => origin.trim());
const dataDir = path.join(__dirname, "data");
const requestsFile = path.join(dataDir, "contact-requests.json");
const clientsFile = path.join(dataDir, "clients.json");
const adminUsersFile = path.join(dataDir, "admin-users.json");
const logoPath = path.join(__dirname, "..", "frontend", "public", "img", "logo-white.svg");
const adminEmail = process.env.ADMIN_EMAIL || "contacto@giovsoft.com";
const adminPassword = process.env.ADMIN_PASSWORD || "GiovSoft2026!";
const adminName = process.env.ADMIN_NAME || "Giovanni Ramos";
const masterAdminEmail = (process.env.MASTER_ADMIN_EMAIL || "").toLowerCase();
const masterAdminPassword = process.env.MASTER_ADMIN_PASSWORD || "";
const masterAdminName = process.env.MASTER_ADMIN_NAME || "Master GiovSoft";
const temporaryAdminPassword = "123456";
const adminTokenSecret = process.env.ADMIN_TOKEN_SECRET || "giovsoft-local-admin-secret";
const adminTokenTtlMs = Number(process.env.ADMIN_TOKEN_TTL_HOURS || 12) * 60 * 60 * 1000;
const adminTwoFactorEnabled = process.env.ADMIN_2FA_ENABLED !== "false";
const twoFactorCodeTtlMs = Number(process.env.ADMIN_2FA_CODE_TTL_MINUTES || 10) * 60 * 1000;
const twoFactorMaxAttempts = Number(process.env.ADMIN_2FA_MAX_ATTEMPTS || 5);
const genericPublicRfc = "XAXX010101000";
const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const cloudSqlHost = process.env.CLOUD_SQL_CONNECTION_NAME
  ? `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`
  : "";
const postgresConfigured = Boolean(
  process.env.DATABASE_URL ||
    process.env.PGHOST ||
    process.env.DB_HOST ||
    cloudSqlHost ||
    process.env.PGDATABASE ||
    process.env.DB_NAME
);
const dataStore = postgresConfigured ? "PostgreSQL" : "JSON local";
let pool;
let databaseReady = false;
const twoFactorChallenges = new Map();

const serviceDetails = {
  "GiovSoft 360": {
    title: "GiovSoft 360",
    details:
      "revisaremos tu negocio para proponerte un paquete integral con sitio o tienda, dominio, correos, Workspace y acompanamiento.",
  },
  "Sitio web": {
    title: "Sitio web",
    details:
      "revisaremos el objetivo del sitio, secciones necesarias, estilo visual, SEO inicial y forma de contacto ideal.",
  },
  Ecommerce: {
    title: "Ecommerce",
    details:
      "revisaremos catalogo, flujo de compra, pagos, envios e integraciones como Stripe, Mercado Pago, Skydrop o Envia.com.",
  },
  Dominios: {
    title: "Dominios",
    details:
      "revisaremos disponibilidad, configuracion DNS y conexiones con sitio web, correo o servicios digitales.",
  },
  "Correos corporativos": {
    title: "Correos corporativos",
    details:
      "revisaremos dominio, cuentas necesarias, configuracion de seguridad y dispositivos donde trabajara tu equipo.",
  },
  "Google Workspace": {
    title: "Google Workspace",
    details:
      "revisaremos usuarios, Gmail empresarial, Drive, Meet, Calendario y permisos iniciales para tu equipo.",
  },
};

const requestStatuses = {
  new: "Nueva",
  contacted: "Contactado",
  in_progress: "En seguimiento",
  info_only: "Solo queria informacion",
  converted: "Cliente convertido",
  lost: "Perdida",
};

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origen no permitido por CORS."));
    },
  })
);
app.use(express.json({ limit: "256kb" }));

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload) {
  return crypto.createHmac("sha256", adminTokenSecret).update(payload).digest("base64url");
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("base64url");

  return `${salt}.${hash}`;
}

function verifyPassword(password, passwordHash) {
  if (!passwordHash || !passwordHash.includes(".")) {
    return false;
  }

  const [salt, storedHash] = passwordHash.split(".");
  const incomingHash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("base64url");
  const incomingBuffer = Buffer.from(incomingHash);
  const storedBuffer = Buffer.from(storedHash || "");

  return incomingBuffer.length === storedBuffer.length && crypto.timingSafeEqual(incomingBuffer, storedBuffer);
}

function createTwoFactorCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashTwoFactorCode(challengeId, code) {
  return crypto.createHmac("sha256", adminTokenSecret).update(`${challengeId}:${code}`).digest("base64url");
}

function maskEmail(email) {
  const [name = "", domain = ""] = String(email || "").split("@");
  if (!name || !domain) {
    return email;
  }

  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"*".repeat(Math.max(2, name.length - visible.length))}@${domain}`;
}

function cleanupTwoFactorChallenges() {
  const now = Date.now();

  for (const [challengeId, challenge] of twoFactorChallenges.entries()) {
    if (challenge.expiresAt <= now || challenge.attempts >= twoFactorMaxAttempts) {
      twoFactorChallenges.delete(challengeId);
    }
  }
}

function createTwoFactorChallenge(user) {
  cleanupTwoFactorChallenges();

  const challengeId = crypto.randomUUID();
  const code = createTwoFactorCode();
  const expiresAt = Date.now() + twoFactorCodeTtlMs;

  twoFactorChallenges.set(challengeId, {
    attempts: 0,
    codeHash: hashTwoFactorCode(challengeId, code),
    email: user.email,
    expiresAt,
    userId: user.id,
  });

  return { challengeId, code, expiresAt };
}

function verifyTwoFactorChallenge(challengeId, code) {
  cleanupTwoFactorChallenges();

  const challenge = twoFactorChallenges.get(challengeId);

  if (!challenge) {
    return { ok: false, message: "El código expiró o no existe. Solicita uno nuevo." };
  }

  challenge.attempts += 1;

  if (challenge.attempts > twoFactorMaxAttempts) {
    twoFactorChallenges.delete(challengeId);
    return { ok: false, message: "Demasiados intentos. Vuelve a iniciar sesión." };
  }

  if (challenge.expiresAt <= Date.now()) {
    twoFactorChallenges.delete(challengeId);
    return { ok: false, message: "El código expiró. Vuelve a iniciar sesión." };
  }

  const incomingHash = hashTwoFactorCode(challengeId, sanitizeText(code));
  const incomingBuffer = Buffer.from(incomingHash);
  const storedBuffer = Buffer.from(challenge.codeHash);
  const matches = incomingBuffer.length === storedBuffer.length && crypto.timingSafeEqual(incomingBuffer, storedBuffer);

  if (!matches) {
    return { ok: false, message: "Código de verificación incorrecto." };
  }

  twoFactorChallenges.delete(challengeId);
  return { ok: true, userId: challenge.userId };
}

function publicAdminUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    isMaster: Boolean(user.isMaster),
    passwordChangeRequired: Boolean(user.passwordChangeRequired),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt || "",
  };
}

function createAdminToken(user) {
  const payload = JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    passwordChangeRequired: Boolean(user.passwordChangeRequired),
    exp: Date.now() + adminTokenTtlMs,
  });
  const encodedPayload = base64UrlEncode(payload);
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function verifyAdminToken(token) {
  if (!token || !token.includes(".")) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");
  const expectedSignature = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature || "");
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (!payload.sub || Number(payload.exp) <= Date.now()) {
      return null;
    }

    return payload;
  } catch (_error) {
    return null;
  }
}

async function requireAdminAuth(req, res, next) {
  const authHeader = req.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const payload = verifyAdminToken(token);

  if (!payload) {
    return res.status(401).json({ message: "Sesion administrativa invalida o expirada." });
  }

  try {
    const users = await readAdminUsers();
    const user = users.find((item) => item.id === payload.sub && item.status === "active");

    if (!user) {
      return res.status(401).json({ message: "Usuario administrativo no disponible." });
    }

    req.adminUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

function createTransporter() {
  if (!smtpConfigured) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function getLogoAttachments() {
  try {
    await fs.access(logoPath);
    return [
      {
        filename: "giovsoft-logo.svg",
        path: logoPath,
        cid: "giovsoft-logo",
        contentType: "image/svg+xml",
      },
    ];
  } catch (_error) {
    return [];
  }
}

function getServiceDetail(service) {
  return serviceDetails[service] || {
    title: service || "Servicio digital",
    details:
      "revisaremos tu solicitud para identificar la solucion digital mas adecuada para tu negocio.",
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildEmailLayout({ title, preheader, badge, intro, summaryRows, ctaLabel, ctaUrl, footerNote }) {
  const rows = summaryRows
    .map((row) => {
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5edf6;color:#64748b;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(row.label)}</td>
          <td style="padding:12px 0;border-bottom:1px solid #e5edf6;color:#0f172a;font-size:15px;font-weight:800;text-align:right;">${escapeHtml(row.value)}</td>
        </tr>
      `;
    })
    .join("");

  return `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      @media (max-width: 620px) {
        .email-shell { padding: 18px !important; }
        .email-card { border-radius: 18px !important; }
        .email-title { font-size: 34px !important; }
        .summary-table td { display: block !important; text-align: left !important; }
      }
      @keyframes softPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(117,224,193,.34); transform: translateY(0); }
        50% { box-shadow: 0 0 0 10px rgba(117,224,193,0); transform: translateY(-2px); }
      }
      .pulse { animation: softPulse 2.8s ease-in-out infinite; }
    </style>
  </head>
  <body style="margin:0;background:#eef6fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef6fb;">
      <tr>
        <td class="email-shell" align="center" style="padding:34px 18px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;">
            <tr>
              <td class="email-card" style="overflow:hidden;border-radius:26px;background:#ffffff;border:1px solid #d8e7f3;box-shadow:0 24px 70px rgba(15,23,42,.12);">
                <div style="background:#0b1728;background-image:radial-gradient(circle at 18% 20%,rgba(41,172,255,.28),transparent 28%),radial-gradient(circle at 82% 40%,rgba(117,224,193,.25),transparent 32%);padding:28px 30px 34px;">
                  <img src="cid:giovsoft-logo" width="190" alt="GiovSoft" style="display:block;max-width:190px;height:auto;margin-bottom:28px;">
                  <span class="pulse" style="display:inline-block;border:1px solid rgba(117,224,193,.38);background:rgba(117,224,193,.12);color:#75e0c1;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;">${escapeHtml(badge)}</span>
                  <h1 class="email-title" style="margin:18px 0 0;color:#ffffff;font-size:44px;line-height:.98;letter-spacing:-.02em;">${escapeHtml(title)}</h1>
                  <p style="margin:16px 0 0;color:#cfe7ff;font-size:16px;line-height:1.65;max-width:560px;">${escapeHtml(intro)}</p>
                </div>
                <div style="padding:28px 30px;">
                  <table class="summary-table" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                    ${rows}
                  </table>
                  ${
                    ctaUrl
                      ? `<div style="padding-top:26px;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#75e0c1;color:#07111f;text-decoration:none;border-radius:999px;padding:14px 20px;font-weight:900;">${escapeHtml(ctaLabel)}</a></div>`
                      : ""
                  }
                  <p style="margin:26px 0 0;color:#64748b;font-size:14px;line-height:1.7;">${escapeHtml(footerNote)}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px;color:#64748b;font-size:12px;">
                © 2026 GiovSoft. Innovacion a tu alcance.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildClientEmail(request) {
  const service = getServiceDetail(request.service);

  return {
    subject: `Recibimos tu solicitud sobre ${service.title}`,
    text: [
      `Hola ${request.name},`,
      "",
      "Gracias por contactar a GiovSoft. Ya registramos tu solicitud.",
      "",
      `Servicio solicitado: ${service.title}`,
      `Sobre tu solicitud: ${service.details}`,
      "",
      "Nuestro equipo revisara la informacion y te contactara lo mas pronto posible para darte seguimiento.",
      "",
      "Resumen recibido:",
      `Empresa: ${request.company || "No especificada"}`,
      `WhatsApp: ${request.phone || "No especificado"}`,
      `Mensaje: ${request.message}`,
      "",
      "GiovSoft",
    ].join("\n"),
    html: buildEmailLayout({
      title: "Solicitud recibida",
      preheader: `GiovSoft ya recibio tu solicitud sobre ${service.title}.`,
      badge: service.title,
      intro:
        "Gracias por contactar a GiovSoft. Ya registramos tu solicitud y nuestro equipo revisara la informacion para contactarte lo mas pronto posible.",
      summaryRows: [
        { label: "Nombre", value: request.name },
        { label: "Empresa", value: request.company || "No especificada" },
        { label: "Servicio", value: service.title },
        { label: "WhatsApp", value: request.phone || "No especificado" },
        { label: "Mensaje", value: request.message },
      ],
      ctaLabel: "Enviar WhatsApp",
      ctaUrl: "https://wa.me/525566042994",
      footerNote: `Sobre tu solicitud: ${service.details}`,
    }),
  };
}

function buildAdminEmail(request) {
  return {
    subject: `Nueva solicitud web: ${request.service || "Servicio por definir"}`,
    text: [
      "Nueva solicitud registrada en el panel administrativo.",
      "",
      `Nombre: ${request.name}`,
      `Empresa: ${request.company || "No especificada"}`,
      `Correo: ${request.email}`,
      `WhatsApp: ${request.phone || "No especificado"}`,
      `Servicio: ${request.service || "No especificado"}`,
      `Mensaje: ${request.message}`,
      `Fecha: ${request.createdAt}`,
      "",
      "La solicitud ya fue guardada y aparece en el dashboard administrativo.",
    ].join("\n"),
    html: buildEmailLayout({
      title: "Nueva solicitud web",
      preheader: `${request.name} solicito informacion sobre ${request.service || "un servicio"}.`,
      badge: "Panel administrativo",
      intro:
        "Se registro una nueva solicitud desde el formulario publico. La informacion ya esta guardada en el panel administrativo para seguimiento.",
      summaryRows: [
        { label: "Nombre", value: request.name },
        { label: "Empresa", value: request.company || "No especificada" },
        { label: "Correo", value: request.email },
        { label: "WhatsApp", value: request.phone || "No especificado" },
        { label: "Servicio", value: request.service || "No especificado" },
        { label: "Mensaje", value: request.message },
        { label: "Fecha", value: request.createdAt },
      ],
      ctaLabel: "Responder por WhatsApp",
      ctaUrl: request.phone ? `https://wa.me/52${request.phone.replace(/\D/g, "")}` : "",
      footerNote: "Esta solicitud ya aparece en el dashboard administrativo de GiovSoft.",
    }),
  };
}

function buildTwoFactorEmail({ user, code, expiresAt }) {
  const expiresAtLabel = new Date(expiresAt).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return {
    subject: "Código de verificación GiovSoft",
    text: [
      `Hola ${user.name},`,
      "",
      "Usa este código para completar tu inicio de sesión en el panel administrativo de GiovSoft:",
      "",
      code,
      "",
      `Este código vence el ${expiresAtLabel}.`,
      "Si no intentaste iniciar sesión, ignora este correo y revisa tu cuenta.",
      "",
      "GiovSoft",
    ].join("\n"),
    html: buildEmailLayout({
      title: "Verificación de acceso",
      preheader: "Tu código de seguridad para entrar al panel GiovSoft.",
      badge: "Código 2FA",
      intro:
        "Recibimos un intento de inicio de sesión en el panel administrativo. Ingresa el siguiente código para confirmar que eres tú.",
      summaryRows: [
        { label: "Usuario", value: user.name },
        { label: "Correo", value: user.email },
        { label: "Código", value: code },
        { label: "Vence", value: expiresAtLabel },
      ],
      ctaLabel: "",
      ctaUrl: "",
      footerNote: "Por seguridad, este código solo se puede usar una vez. Si no reconoces este acceso, cambia tu contraseña.",
    }),
  };
}

async function sendTwoFactorEmail(user, code, expiresAt) {
  const transporter = createTransporter();

  if (!transporter) {
    return { status: "skipped", reason: "SMTP no configurado" };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const email = buildTwoFactorEmail({ code, expiresAt, user });
  const attachments = await getLogoAttachments();

  await transporter.sendMail({
    attachments,
    from,
    html: email.html,
    subject: email.subject,
    text: email.text,
    to: user.email,
  });

  return { status: "sent", sentAt: new Date().toISOString() };
}

async function sendContactEmails(request) {
  const transporter = createTransporter();

  if (!transporter) {
    return { status: "skipped", reason: "SMTP no configurado" };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const clientEmail = buildClientEmail(request);
  const adminNotification = buildAdminEmail(request);
  const attachments = await getLogoAttachments();

  await Promise.all([
    transporter.sendMail({
      attachments,
      from,
      to: request.email,
      subject: clientEmail.subject,
      text: clientEmail.text,
      html: clientEmail.html,
    }),
    transporter.sendMail({
      attachments,
      from,
      to: adminEmail,
      replyTo: request.email,
      subject: adminNotification.subject,
      text: adminNotification.text,
      html: adminNotification.html,
    }),
  ]);

  return { status: "sent", sentAt: new Date().toISOString() };
}

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(requestsFile);
  } catch {
    await fs.writeFile(requestsFile, "[]", "utf8");
  }
}

function getPool() {
  if (!postgresConfigured) {
    return null;
  }

  if (!pool) {
    if (process.env.DATABASE_URL) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
      });
    } else {
      pool = new Pool({
        host: process.env.PGHOST || process.env.DB_HOST || cloudSqlHost,
        port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
        database: process.env.PGDATABASE || process.env.DB_NAME || "giovsoft",
        user: process.env.PGUSER || process.env.DB_USER || "giovsoft_app",
        password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
      });
    }
  }

  return pool;
}

async function ensureDatabase() {
  const currentPool = getPool();

  if (!currentPool || databaseReady) {
    return;
  }

  await currentPool.query(`
    CREATE TABLE IF NOT EXISTS contact_requests (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      service TEXT,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      status_label TEXT NOT NULL DEFAULT 'Nueva',
      email_status TEXT NOT NULL DEFAULT 'pending',
      email_status_detail TEXT,
      source TEXT NOT NULL DEFAULT 'website',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_contact_requests_status
      ON contact_requests (status);

    CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at
      ON contact_requests (created_at DESC);

    CREATE TABLE IF NOT EXISTS contact_request_notes (
      id UUID PRIMARY KEY,
      request_id UUID NOT NULL REFERENCES contact_requests (id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      status TEXT NOT NULL,
      status_label TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_contact_request_notes_request_id
      ON contact_request_notes (request_id);

    CREATE TABLE IF NOT EXISTS contact_request_status_history (
      id UUID PRIMARY KEY,
      request_id UUID NOT NULL REFERENCES contact_requests (id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      label TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_contact_request_status_history_request_id
      ON contact_request_status_history (request_id);

    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY,
      business_name TEXT NOT NULL,
      legal_name TEXT,
      rfc TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      segment TEXT,
      website TEXT,
      primary_service TEXT,
      notes TEXT,
      contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
      services JSONB NOT NULL DEFAULT '[]'::jsonb,
      domains JSONB NOT NULL DEFAULT '[]'::jsonb,
      hosting JSONB NOT NULL DEFAULT '[]'::jsonb,
      payments JSONB NOT NULL DEFAULT '[]'::jsonb,
      reminders JSONB NOT NULL DEFAULT '[]'::jsonb,
      contracts JSONB NOT NULL DEFAULT '[]'::jsonb,
      documents JSONB NOT NULL DEFAULT '[]'::jsonb,
      activity JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_clients_status
      ON clients (status);

    CREATE INDEX IF NOT EXISTS idx_clients_business_name
      ON clients (business_name);
  `);

  databaseReady = true;
}

function toIsoDate(value) {
  return value ? new Date(value).toISOString() : "";
}

function mapRequestRow(row, notes = [], statusHistory = []) {
  return {
    id: row.id,
    name: row.name,
    company: row.company || "",
    email: row.email,
    phone: row.phone || "",
    service: row.service || "",
    message: row.message,
    status: row.status,
    statusLabel: row.status_label,
    emailStatus: row.email_status,
    emailStatusDetail: row.email_status_detail || "",
    source: row.source,
    notes,
    statusHistory,
    createdAt: toIsoDate(row.created_at),
    updatedAt: toIsoDate(row.updated_at),
  };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function mapClientRow(row) {
  return {
    id: row.id,
    businessName: row.business_name,
    legalName: row.legal_name || "",
    rfc: row.rfc || "",
    status: row.status,
    segment: row.segment || "",
    website: row.website || "",
    primaryService: row.primary_service || "",
    notes: row.notes || "",
    contacts: safeArray(row.contacts),
    services: safeArray(row.services),
    domains: safeArray(row.domains),
    hosting: safeArray(row.hosting),
    payments: safeArray(row.payments),
    reminders: safeArray(row.reminders),
    contracts: safeArray(row.contracts),
    documents: safeArray(row.documents),
    activity: safeArray(row.activity),
    createdAt: toIsoDate(row.created_at),
    updatedAt: toIsoDate(row.updated_at),
  };
}

async function readRequests() {
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();

    const { rows } = await currentPool.query("SELECT * FROM contact_requests ORDER BY created_at DESC");
    const ids = rows.map((row) => row.id);

    if (ids.length === 0) {
      return [];
    }

    const [notesResult, historyResult] = await Promise.all([
      currentPool.query(
        "SELECT * FROM contact_request_notes WHERE request_id = ANY($1::uuid[]) ORDER BY created_at DESC",
        [ids]
      ),
      currentPool.query(
        "SELECT * FROM contact_request_status_history WHERE request_id = ANY($1::uuid[]) ORDER BY created_at DESC",
        [ids]
      ),
    ]);

    const notesByRequest = new Map();
    for (const note of notesResult.rows) {
      const currentNotes = notesByRequest.get(note.request_id) || [];
      currentNotes.push({
        id: note.id,
        body: note.body,
        status: note.status,
        statusLabel: note.status_label,
        createdAt: toIsoDate(note.created_at),
      });
      notesByRequest.set(note.request_id, currentNotes);
    }

    const historyByRequest = new Map();
    for (const item of historyResult.rows) {
      const currentHistory = historyByRequest.get(item.request_id) || [];
      currentHistory.push({
        status: item.status,
        label: item.label,
        note: item.note,
        createdAt: toIsoDate(item.created_at),
      });
      historyByRequest.set(item.request_id, currentHistory);
    }

    return rows.map((row) => {
      return mapRequestRow(row, notesByRequest.get(row.id) || [], historyByRequest.get(row.id) || []);
    });
  }

  await ensureDataFile();
  const raw = await fs.readFile(requestsFile, "utf8");
  return JSON.parse(raw);
}

async function ensureClientsFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(clientsFile);
  } catch {
    await fs.writeFile(clientsFile, "[]", "utf8");
  }
}

async function ensureAdminUsersFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(adminUsersFile);
  } catch {
    if (masterAdminEmail && masterAdminPassword) {
      await fs.writeFile(adminUsersFile, "[]", "utf8");
      return;
    }

    const now = new Date().toISOString();
    const seedUser = {
      id: crypto.randomUUID(),
      name: adminName,
      email: adminEmail.toLowerCase(),
      role: "Administrador",
      status: "active",
      passwordHash: createPasswordHash(adminPassword),
      passwordChangeRequired: false,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: "",
    };

    await fs.writeFile(adminUsersFile, JSON.stringify([seedUser], null, 2), "utf8");
  }
}

async function ensureMasterAdminUser(users) {
  if (!masterAdminEmail || !masterAdminPassword) {
    return users;
  }

  const existingMasterIndex = users.findIndex((user) => user.isMaster || user.email === masterAdminEmail);
  const now = new Date().toISOString();

  if (existingMasterIndex >= 0) {
    const currentMaster = users[existingMasterIndex];
    const needsUpdate =
      currentMaster.name !== (currentMaster.name || masterAdminName) ||
      currentMaster.email !== masterAdminEmail ||
      currentMaster.role !== "Master" ||
      currentMaster.status !== "active" ||
      currentMaster.isMaster !== true ||
      currentMaster.passwordChangeRequired !== false;

    if (!needsUpdate) {
      return users;
    }

    const updatedMaster = {
      ...currentMaster,
      name: currentMaster.name || masterAdminName,
      email: masterAdminEmail,
      role: "Master",
      status: "active",
      isMaster: true,
      passwordChangeRequired: false,
      updatedAt: now,
    };

    users[existingMasterIndex] = updatedMaster;
    return users;
  }

  return [
    {
      id: crypto.randomUUID(),
      name: masterAdminName,
      email: masterAdminEmail,
      role: "Master",
      status: "active",
      isMaster: true,
      passwordHash: createPasswordHash(masterAdminPassword),
      passwordChangeRequired: false,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: "",
    },
    ...users,
  ];
}

async function readAdminUsers() {
  await ensureAdminUsersFile();
  const raw = await fs.readFile(adminUsersFile, "utf8");
  const users = JSON.parse(raw);
  const usersWithMaster = await ensureMasterAdminUser(users);

  if (usersWithMaster.length !== users.length || usersWithMaster.some((user, index) => user !== users[index])) {
    await fs.writeFile(adminUsersFile, JSON.stringify(usersWithMaster, null, 2), "utf8");
  }

  return usersWithMaster;
}

async function writeAdminUsers(users) {
  await ensureAdminUsersFile();
  await fs.writeFile(adminUsersFile, JSON.stringify(users, null, 2), "utf8");
}

async function readClients() {
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();
    const { rows } = await currentPool.query("SELECT * FROM clients ORDER BY updated_at DESC");
    return rows.map(mapClientRow);
  }

  await ensureClientsFile();
  const raw = await fs.readFile(clientsFile, "utf8");
  return JSON.parse(raw);
}

async function writeClients(clients) {
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();

    const client = await currentPool.connect();

    try {
      await client.query("BEGIN");

      for (const item of clients) {
        await client.query(
          `
            INSERT INTO clients (
              id, business_name, legal_name, rfc, status, segment, website, primary_service, notes,
              contacts, services, domains, hosting, payments, reminders, contracts, documents, activity,
              created_at, updated_at
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9,
              $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18::jsonb,
              $19, $20
            )
            ON CONFLICT (id) DO UPDATE SET
              business_name = EXCLUDED.business_name,
              legal_name = EXCLUDED.legal_name,
              rfc = EXCLUDED.rfc,
              status = EXCLUDED.status,
              segment = EXCLUDED.segment,
              website = EXCLUDED.website,
              primary_service = EXCLUDED.primary_service,
              notes = EXCLUDED.notes,
              contacts = EXCLUDED.contacts,
              services = EXCLUDED.services,
              domains = EXCLUDED.domains,
              hosting = EXCLUDED.hosting,
              payments = EXCLUDED.payments,
              reminders = EXCLUDED.reminders,
              contracts = EXCLUDED.contracts,
              documents = EXCLUDED.documents,
              activity = EXCLUDED.activity,
              created_at = EXCLUDED.created_at,
              updated_at = EXCLUDED.updated_at
          `,
          [
            item.id,
            item.businessName,
            item.legalName || null,
            item.rfc || null,
            item.status || "active",
            item.segment || null,
            item.website || null,
            item.primaryService || null,
            item.notes || null,
            JSON.stringify(safeArray(item.contacts)),
            JSON.stringify(safeArray(item.services)),
            JSON.stringify(safeArray(item.domains)),
            JSON.stringify(safeArray(item.hosting)),
            JSON.stringify(safeArray(item.payments)),
            JSON.stringify(safeArray(item.reminders)),
            JSON.stringify(safeArray(item.contracts)),
            JSON.stringify(safeArray(item.documents)),
            JSON.stringify(safeArray(item.activity)),
            item.createdAt || new Date().toISOString(),
            item.updatedAt || new Date().toISOString(),
          ]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return;
  }

  await ensureClientsFile();
  await fs.writeFile(clientsFile, JSON.stringify(clients, null, 2), "utf8");
}

async function writeRequests(requests) {
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();

    const client = await currentPool.connect();

    try {
      await client.query("BEGIN");

      for (const request of requests) {
        await client.query(
          `
            INSERT INTO contact_requests (
              id, name, company, email, phone, service, message, status, status_label,
              email_status, email_status_detail, source, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              company = EXCLUDED.company,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone,
              service = EXCLUDED.service,
              message = EXCLUDED.message,
              status = EXCLUDED.status,
              status_label = EXCLUDED.status_label,
              email_status = EXCLUDED.email_status,
              email_status_detail = EXCLUDED.email_status_detail,
              source = EXCLUDED.source,
              created_at = EXCLUDED.created_at,
              updated_at = EXCLUDED.updated_at
          `,
          [
            request.id,
            request.name,
            request.company || null,
            request.email,
            request.phone || null,
            request.service || null,
            request.message,
            request.status || "new",
            request.statusLabel || requestStatuses[request.status] || requestStatuses.new,
            request.emailStatus || "pending",
            request.emailStatusDetail || null,
            request.source || "website",
            request.createdAt || new Date().toISOString(),
            request.updatedAt || request.createdAt || new Date().toISOString(),
          ]
        );

        await client.query("DELETE FROM contact_request_notes WHERE request_id = $1", [request.id]);
        await client.query("DELETE FROM contact_request_status_history WHERE request_id = $1", [request.id]);

        for (const note of Array.isArray(request.notes) ? request.notes : []) {
          await client.query(
            `
              INSERT INTO contact_request_notes (id, request_id, body, status, status_label, created_at)
              VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
              note.id || crypto.randomUUID(),
              request.id,
              note.body,
              note.status || request.status || "new",
              note.statusLabel || requestStatuses[note.status] || requestStatuses.new,
              note.createdAt || new Date().toISOString(),
            ]
          );
        }

        for (const item of Array.isArray(request.statusHistory) ? request.statusHistory : []) {
          await client.query(
            `
              INSERT INTO contact_request_status_history (id, request_id, status, label, note, created_at)
              VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
              crypto.randomUUID(),
              request.id,
              item.status || request.status || "new",
              item.label || requestStatuses[item.status] || requestStatuses.new,
              item.note || "",
              item.createdAt || new Date().toISOString(),
            ]
          );
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return;
  }

  await ensureDataFile();
  await fs.writeFile(requestsFile, JSON.stringify(requests, null, 2), "utf8");
}

function sanitizeText(value) {
  return String(value || "").trim();
}

function validateContactRequest(body) {
  const payload = {
    name: sanitizeText(body.name),
    company: sanitizeText(body.company),
    email: sanitizeText(body.email),
    phone: sanitizeText(body.phone),
    service: sanitizeText(body.service),
    message: sanitizeText(body.message),
  };

  const missing = [];
  if (!payload.name) missing.push("name");
  if (!payload.email) missing.push("email");
  if (!payload.message) missing.push("message");

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return { error: "Correo invalido." };
  }

  if (missing.length > 0) {
    return { error: `Campos requeridos: ${missing.join(", ")}.` };
  }

  return { payload };
}

function sanitizeCollection(value) {
  return safeArray(value).map((item) => {
    return Object.fromEntries(
      Object.entries(item || {}).map(([key, entryValue]) => [key, typeof entryValue === "string" ? sanitizeText(entryValue) : entryValue])
    );
  });
}

function validateClientPayload(body, existingClient) {
  const now = new Date().toISOString();
  const payload = {
    businessName: sanitizeText(body.businessName || body.company || existingClient?.businessName),
    legalName: sanitizeText(body.legalName || existingClient?.legalName),
    rfc: sanitizeText(body.rfc || existingClient?.rfc || genericPublicRfc),
    status: sanitizeText(body.status || existingClient?.status || "active"),
    segment: sanitizeText(body.segment || existingClient?.segment),
    website: sanitizeText(body.website || existingClient?.website),
    primaryService: sanitizeText(body.primaryService || existingClient?.primaryService),
    notes: sanitizeText(body.notes || existingClient?.notes),
    contacts: body.contacts !== undefined ? sanitizeCollection(body.contacts) : safeArray(existingClient?.contacts),
    services: body.services !== undefined ? sanitizeCollection(body.services) : safeArray(existingClient?.services),
    domains: body.domains !== undefined ? sanitizeCollection(body.domains) : safeArray(existingClient?.domains),
    hosting: body.hosting !== undefined ? sanitizeCollection(body.hosting) : safeArray(existingClient?.hosting),
    payments: body.payments !== undefined ? sanitizeCollection(body.payments) : safeArray(existingClient?.payments),
    reminders: body.reminders !== undefined ? sanitizeCollection(body.reminders) : safeArray(existingClient?.reminders),
    contracts: body.contracts !== undefined ? sanitizeCollection(body.contracts) : safeArray(existingClient?.contracts),
    documents: body.documents !== undefined ? sanitizeCollection(body.documents) : safeArray(existingClient?.documents),
  };

  if (!payload.businessName) {
    return { error: "El nombre comercial del cliente es requerido." };
  }

  return {
    payload: {
      ...payload,
      activity: body.activity !== undefined ? sanitizeCollection(body.activity) : safeArray(existingClient?.activity),
      updatedAt: now,
    },
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "giovsoft-api" });
});

app.post("/api/admin/login", async (req, res, next) => {
  try {
    const email = sanitizeText(req.body?.email).toLowerCase();
    const password = sanitizeText(req.body?.password);

    if (!email || !password) {
      return res.status(400).json({ message: "Correo y contraseña son requeridos." });
    }

    const users = await readAdminUsers();
    const userIndex = users.findIndex((item) => item.email === email && item.status === "active");
    const user = users[userIndex];

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ message: "Correo o contraseña incorrectos." });
    }

    if (adminTwoFactorEnabled) {
      const { challengeId, code, expiresAt } = createTwoFactorChallenge(user);
      const emailResult = await sendTwoFactorEmail(user, code, expiresAt);

      if (emailResult.status !== "sent") {
        twoFactorChallenges.delete(challengeId);
        return res.status(503).json({
          message: "No se pudo enviar el código 2FA. Revisa la configuración SMTP del servidor.",
        });
      }

      return res.json({
        challengeId,
        emailHint: maskEmail(user.email),
        expiresAt,
        methods: {
          email: true,
          passkey: Boolean(user.passkeys?.length),
        },
        requiresTwoFactor: true,
      });
    }

    const updatedUser = {
      ...user,
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users[userIndex] = updatedUser;
    await writeAdminUsers(users);

    return res.json({
      token: createAdminToken(updatedUser),
      user: publicAdminUser(updatedUser),
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/admin/login/2fa", async (req, res, next) => {
  try {
    const challengeId = sanitizeText(req.body?.challengeId);
    const code = sanitizeText(req.body?.code).replace(/\D/g, "");

    if (!challengeId || !code) {
      return res.status(400).json({ message: "Código de verificación requerido." });
    }

    const challengeResult = verifyTwoFactorChallenge(challengeId, code);

    if (!challengeResult.ok) {
      return res.status(401).json({ message: challengeResult.message });
    }

    const users = await readAdminUsers();
    const userIndex = users.findIndex((item) => item.id === challengeResult.userId && item.status === "active");
    const user = users[userIndex];

    if (!user) {
      return res.status(401).json({ message: "Usuario administrativo no disponible." });
    }

    const updatedUser = {
      ...user,
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users[userIndex] = updatedUser;
    await writeAdminUsers(users);

    return res.json({
      token: createAdminToken(updatedUser),
      user: publicAdminUser(updatedUser),
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/admin/login/passkey/start", (_req, res) => {
  return res.status(501).json({
    message: "Las llaves de seguridad y llavero de iCloud requieren registrar una passkey desde el perfil del usuario.",
  });
});

app.use("/api/admin", requireAdminAuth);

app.post("/api/admin/change-password", async (req, res, next) => {
  try {
    const currentPassword = sanitizeText(req.body?.currentPassword);
    const nextPassword = sanitizeText(req.body?.newPassword);

    if (!nextPassword || nextPassword.length < 8) {
      return res.status(400).json({ message: "La nueva contraseña debe tener al menos 8 caracteres." });
    }

    if (!req.adminUser.passwordChangeRequired && !verifyPassword(currentPassword, req.adminUser.passwordHash)) {
      return res.status(400).json({ message: "La contraseña actual no es correcta." });
    }

    const users = await readAdminUsers();
    const userIndex = users.findIndex((item) => item.id === req.adminUser.id);

    if (userIndex === -1) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const updatedUser = {
      ...users[userIndex],
      passwordHash: createPasswordHash(nextPassword),
      passwordChangeRequired: false,
      updatedAt: new Date().toISOString(),
    };

    users[userIndex] = updatedUser;
    await writeAdminUsers(users);

    return res.json({
      message: "Contraseña actualizada.",
      token: createAdminToken(updatedUser),
      user: publicAdminUser(updatedUser),
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/admin/users", async (_req, res, next) => {
  try {
    const users = await readAdminUsers();
    res.json({ users: users.filter((user) => !user.isMaster).map(publicAdminUser) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/users", async (req, res, next) => {
  try {
    const name = sanitizeText(req.body?.name);
    const email = sanitizeText(req.body?.email).toLowerCase();
    const role = sanitizeText(req.body?.role || "Administrador");

    if (!name || !email) {
      return res.status(400).json({ message: "Nombre y correo son requeridos." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Correo inválido." });
    }

    const users = await readAdminUsers();

    if (users.some((item) => item.email === email)) {
      return res.status(409).json({ message: "Ya existe un usuario con ese correo." });
    }

    const now = new Date().toISOString();
    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      role,
      status: "active",
      passwordHash: createPasswordHash(temporaryAdminPassword),
      passwordChangeRequired: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: "",
    };

    users.unshift(user);
    await writeAdminUsers(users);

    return res.status(201).json({
      message: "Usuario creado. Contraseña temporal: 123456.",
      user: publicAdminUser(user),
      temporaryPassword: temporaryAdminPassword,
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/users/:id", async (req, res, next) => {
  try {
    const users = await readAdminUsers();
    const userIndex = users.findIndex((item) => item.id === req.params.id);

    if (userIndex === -1) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    if (users[userIndex].isMaster) {
      return res.status(403).json({ message: "El usuario master no puede modificarse desde el panel." });
    }

    const updatedUser = {
      ...users[userIndex],
      name: sanitizeText(req.body?.name || users[userIndex].name),
      role: sanitizeText(req.body?.role || users[userIndex].role),
      status: sanitizeText(req.body?.status || users[userIndex].status),
      updatedAt: new Date().toISOString(),
    };

    users[userIndex] = updatedUser;
    await writeAdminUsers(users);

    return res.json({ message: "Usuario actualizado.", user: publicAdminUser(updatedUser) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/users/:id/reset-password", async (req, res, next) => {
  try {
    const users = await readAdminUsers();
    const userIndex = users.findIndex((item) => item.id === req.params.id);

    if (userIndex === -1) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    if (users[userIndex].isMaster) {
      return res.status(403).json({ message: "El usuario master no puede restablecerse desde el panel." });
    }

    const updatedUser = {
      ...users[userIndex],
      passwordHash: createPasswordHash(temporaryAdminPassword),
      passwordChangeRequired: true,
      updatedAt: new Date().toISOString(),
    };

    users[userIndex] = updatedUser;
    await writeAdminUsers(users);

    return res.json({
      message: "Contraseña restablecida. Contraseña temporal: 123456.",
      user: publicAdminUser(updatedUser),
      temporaryPassword: temporaryAdminPassword,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/contact-requests", async (req, res, next) => {
  try {
    const validation = validateContactRequest(req.body);

    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const requests = await readRequests();
    const contactRequest = {
      id: crypto.randomUUID(),
      ...validation.payload,
      status: "new",
      statusLabel: requestStatuses.new,
      emailStatus: "pending",
      source: "website",
      notes: [],
      statusHistory: [
        {
          status: "new",
          label: requestStatuses.new,
          note: "Solicitud recibida desde el sitio web.",
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const emailResult = await sendContactEmails(contactRequest);
      contactRequest.emailStatus = emailResult.status;
      contactRequest.emailStatusDetail = emailResult.reason || emailResult.sentAt;
    } catch (emailError) {
      console.error("Error enviando correos:", emailError);
      contactRequest.emailStatus = "failed";
      contactRequest.emailStatusDetail = "No se pudieron enviar los correos.";
    }

    requests.unshift(contactRequest);
    await writeRequests(requests);

    return res.status(201).json({ message: "Solicitud recibida.", request: contactRequest });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/admin/contact-requests", async (_req, res, next) => {
  try {
    const requests = await readRequests();
    res.json({ requests });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/settings", (_req, res) => {
  res.json({
    adminEmail,
    smtpConfigured,
    smtpUser: process.env.SMTP_USER || "",
    frontendOrigins: allowedOrigins,
    dataStore,
  });
});

app.get("/api/admin/clients", async (_req, res, next) => {
  try {
    const clients = await readClients();
    res.json({ clients });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/clients", async (req, res, next) => {
  try {
    const validation = validateClientPayload(req.body);

    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const clients = await readClients();
    const now = new Date().toISOString();
    const newClient = {
      id: crypto.randomUUID(),
      ...validation.payload,
      activity: [
        {
          id: crypto.randomUUID(),
          type: "Alta",
          detail: "Cliente creado manualmente en plataforma.",
          createdAt: now,
        },
        ...safeArray(validation.payload.activity),
      ],
      createdAt: now,
      updatedAt: now,
    };

    clients.unshift(newClient);
    await writeClients(clients);

    res.status(201).json({ message: "Cliente creado.", client: newClient });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/clients/:id", async (req, res, next) => {
  try {
    const clients = await readClients();
    const clientIndex = clients.findIndex((client) => client.id === req.params.id);

    if (clientIndex === -1) {
      return res.status(404).json({ message: "Cliente no encontrado." });
    }

    const currentClient = clients[clientIndex];
    const validation = validateClientPayload(req.body, currentClient);

    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const updatedClient = {
      ...currentClient,
      ...validation.payload,
      activity: [
        {
          id: crypto.randomUUID(),
          type: "Actualizacion",
          detail: sanitizeText(req.body.activityNote) || "Ficha de cliente actualizada.",
          createdAt: validation.payload.updatedAt,
        },
        ...safeArray(validation.payload.activity),
      ],
    };

    clients[clientIndex] = updatedClient;
    await writeClients(clients);

    res.json({ message: "Cliente actualizado.", client: updatedClient });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/contact-requests/:id", async (req, res, next) => {
  try {
    const requests = await readRequests();
    const requestIndex = requests.findIndex((request) => request.id === req.params.id);

    if (requestIndex === -1) {
      return res.status(404).json({ message: "Solicitud no encontrada." });
    }

    const currentRequest = requests[requestIndex];
    const nextStatus = sanitizeText(req.body.status || currentRequest.status || "new");
    const note = sanitizeText(req.body.note);

    if (!requestStatuses[nextStatus]) {
      return res.status(400).json({ message: "Estado de solicitud invalido." });
    }

    const updatedAt = new Date().toISOString();
    const statusChanged = nextStatus !== currentRequest.status;
    const notes = Array.isArray(currentRequest.notes) ? currentRequest.notes : [];
    const statusHistory = Array.isArray(currentRequest.statusHistory) ? currentRequest.statusHistory : [];

    const updatedRequest = {
      ...currentRequest,
      status: nextStatus,
      statusLabel: requestStatuses[nextStatus],
      updatedAt,
      notes: note
        ? [
            {
              id: crypto.randomUUID(),
              body: note,
              status: nextStatus,
              statusLabel: requestStatuses[nextStatus],
              createdAt: updatedAt,
            },
            ...notes,
          ]
        : notes,
      statusHistory:
        statusChanged || note
          ? [
              {
                status: nextStatus,
                label: requestStatuses[nextStatus],
                note: note || `Estado actualizado a ${requestStatuses[nextStatus]}.`,
                createdAt: updatedAt,
              },
              ...statusHistory,
            ]
          : statusHistory,
    };

    requests[requestIndex] = updatedRequest;
    await writeRequests(requests);

    return res.json({ message: "Solicitud actualizada.", request: updatedRequest });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/admin/summary", async (_req, res, next) => {
  try {
    const requests = await readRequests();
    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const activeRequests = requests.filter((request) => ["new", "contacted", "in_progress"].includes(request.status));
    const newRequests = requests.filter((request) => request.status === "new");
    const todayRequests = requests.filter((request) => request.createdAt.startsWith(today));
    const recentRequests = requests.slice(0, 5);
    const lastWeekRequests = requests.filter((request) => {
      return now - new Date(request.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000;
    });

    res.json({
      stats: [
        {
          label: "Solicitudes hoy",
          value: String(todayRequests.length),
          change: `${newRequests.length} nuevas`,
          tone: "is-positive",
        },
        {
          label: "Leads activos",
          value: String(activeRequests.length),
          change: "por contactar",
          tone: "is-neutral",
        },
        {
          label: "Ultimos 7 dias",
          value: String(lastWeekRequests.length),
          change: "desde el sitio",
          tone: "is-critical",
        },
      ],
      recentRequests,
      priorities: [
        "Contactar solicitudes nuevas durante el mismo dia.",
        "Clasificar cada lead por servicio: GiovSoft 360, web, ecommerce o Workspace.",
        "Dar seguimiento a solicitudes sin respuesta antes de cerrar la semana.",
      ],
    });
  } catch (error) {
    next(error);
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Error interno del servidor." });
});

app.listen(PORT, () => {
  console.log(`GiovSoft API escuchando en http://localhost:${PORT}`);
});
