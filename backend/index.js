require("dotenv").config();

const cors = require("cors");
const crypto = require("crypto");
const express = require("express");
const fsSync = require("fs");
const fs = require("fs/promises");
const nodemailer = require("nodemailer");
const path = require("path");
const PDFDocument = require("pdfkit");
const { Pool } = require("pg");
const SVGtoPDF = require("svg-to-pdfkit");

const app = express();
const PORT = Number(process.env.PORT || 4000);
const allowedOrigins = (
  process.env.FRONTEND_ORIGIN ||
  "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5180,http://localhost:5181,http://admin.localhost:5181,http://localhost:8080"
)
  .split(",")
  .map((origin) => origin.trim());
const localDevHostnames = new Set(["localhost", "127.0.0.1", "admin.localhost"]);
const dataDir = path.join(__dirname, "data");
const requestsFile = path.join(dataDir, "contact-requests.json");
const clientsFile = path.join(dataDir, "clients.json");
const adminUsersFile = path.join(dataDir, "admin-users.json");
const quotesFile = path.join(dataDir, "quotes.json");
const billingSatFile = path.join(dataDir, "billing-sat.json");
const paymentEngineFile = path.join(dataDir, "payment-engine.json");
const applicationsFile = path.join(dataDir, "connected-applications.json");
const businessLinesFile = path.join(dataDir, "business-lines.json");
const ordersFile = path.join(dataDir, "orders.json");
const outboundDeliveriesFile = path.join(dataDir, "outbound-webhook-deliveries.json");
const assetsDir = path.join(__dirname, "assets");
const logoPath = path.join(assetsDir, "logo-white.svg");
const quoteLogoPath = path.join(assetsDir, "logo-black.svg");
const legacyLogoPath = path.join(__dirname, "..", "frontend", "public", "img", "logo-white.svg");
const legacyQuoteLogoPath = path.join(__dirname, "..", "frontend", "public", "img", "logo-black.svg");
const giovsoftLegalName = "GiovSoft Technologies, S.A.S.";
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
const masterTwoFactorEnabled = process.env.MASTER_ADMIN_2FA_ENABLED === "true";
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
const IVA_RATE = 0.16;
const orderStatuses = new Set(["draft", "pending", "paid", "failed", "expired", "refunded"]);
// Reintentos de webhooks salientes: 5 intentos con backoff creciente.
const outboundRetryDelaysMs = [30 * 1000, 2 * 60 * 1000, 10 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000];
const outboundTimeoutMs = 10 * 1000;

// Cliente Stripe perezoso: sin STRIPE_SECRET_KEY el checkout opera en modo
// simulación (mismo patrón que CSFACTURACION_ENABLED para CFDI).
let stripeClient = null;
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  if (!stripeClient) {
    const Stripe = require("stripe");
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

// Líneas de negocio de GiovSoft. UUIDs fijos para que despliegues en JSON y
// PostgreSQL produzcan los mismos ids (las aplicaciones referencian estos ids).
const defaultBusinessLines = [
  {
    id: "7c9e6b1a-4f2d-4a8e-9c3b-1e5a7d2f8b4c",
    slug: "gesove",
    name: "Gesove",
    description: "Invitaciones digitales para eventos (gesove.com).",
    color: "#B08D57",
    icon: "Mail",
    status: "active",
  },
  {
    id: "3a8f2c5d-9b1e-4d7a-8f6c-2b4e9a1d5c7e",
    slug: "academy",
    name: "GiovSoft Academy",
    description: "Cursos de tecnología, membresías y certificaciones.",
    color: "#4F46E5",
    icon: "GraduationCap",
    status: "active",
  },
  {
    id: "5e2b8d4f-1c7a-4e9b-a3d8-6f4c2e8b9a1d",
    slug: "servicios-web",
    name: "Servicios Web GiovSoft",
    description: "Desarrollo web, ecommerce, dominios, correos y hosting.",
    color: "#0891B2",
    icon: "Globe",
    status: "active",
  },
  {
    id: "9d4a7e2c-6b8f-4c1d-b5e9-3a7f1c5d8e2b",
    slug: "clinic",
    name: "GiovSoft Clinic",
    description: "Soluciones para clínicas y consultorios.",
    color: "#059669",
    icon: "Stethoscope",
    status: "active",
  },
];

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

const quoteStatuses = new Set(["draft", "sent", "accepted", "rejected", "expired", "cancelled"]);
const applicationStatuses = new Set(["active", "pending", "paused", "error"]);

const defaultBillingSatState = {
  engine: {
    name: "GiovSoft SAT Billing Engine",
    version: "1.0",
    mode: "centralized",
    capabilities: [
      "Emision CFDI desde pagos y facturas internas",
      "Adaptador CSFacturacion para timbrado y cancelacion",
      "Presentacion propia de XML, PDF y QR",
      "Validacion fiscal previa del receptor",
      "Catalogos SAT sincronizados",
    ],
  },
  connectedSystems: [],
  webhookEvents: [],
  webhookSchema: {
    inboundHeader: "x-giovsoft-billing-secret",
    outboundSignatureHeader: "x-giovsoft-signature",
    supportedEvents: [
      "billing.invoice.requested",
      "billing.payment.received",
      "billing.subscription.renewed",
      "billing.cfdi.requested",
      "billing.cfdi.cancel.requested",
    ],
  },
  provider: {
    name: "CSFacturacion",
    environment: "demo",
    username: "",
    secretName: "csfacturacion-password",
    demoEndpoint: "https://csplug.csfacturacion.com/demo/cfdi",
    productionEndpoint: "https://csplug.csfacturacion.com/cfdi",
    demoCancelEndpoint: "https://csplug.csfacturacion.com/demo/cfdi/cancelar",
    productionCancelEndpoint: "https://csplug.csfacturacion.com/cfdi/cancelar",
    configured: false,
    lastVerifiedAt: "",
  },
  series: [],
  emitter: {
    legalName: giovsoftLegalName,
    rfc: "",
    taxRegime: "",
    postalCode: "",
    certificateStatus: "pending",
  },
  cfdis: [],
  catalogs: {
    status: "pending",
    lastSyncAt: "",
    items: ["RegimenFiscal", "UsoCFDI", "FormaPago", "MetodoPago", "Moneda", "TipoComprobante"],
  },
};

const defaultPaymentEngineState = {
  engine: {
    name: "GiovSoft Payment Engine",
    version: "1.0",
    mode: "stripe-connect",
    capabilities: [
      "Stripe Connect para cuentas conectadas por sistema",
      "PaymentIntents, Checkout y Stripe.js",
      "Pagos recurrentes, suscripciones y conciliacion",
      "Webhooks propios para sistemas internos",
      "Eventos Stripe normalizados para facturacion",
    ],
  },
  provider: {
    name: "Stripe Connect",
    environment: "test",
    publishableKey: "",
    secretName: "stripe-secret-key",
    webhookSecretName: "stripe-webhook-secret",
    connectMode: "express",
    configured: false,
    lastVerifiedAt: "",
  },
  connectedSystems: [],
  webhookEvents: [],
  payments: [],
  subscriptions: [],
  payouts: [],
  webhookSchema: {
    inboundHeader: "x-giovsoft-payments-secret",
    stripeSignatureHeader: "stripe-signature",
    supportedEvents: [
      "payment_intent.succeeded",
      "payment_intent.payment_failed",
      "checkout.session.completed",
      "invoice.paid",
      "invoice.payment_failed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "account.updated",
      "payments.payment.received",
      "payments.subscription.renewed",
    ],
  },
};

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      try {
        const parsedOrigin = new URL(origin);

        if (localDevHostnames.has(parsedOrigin.hostname)) {
          callback(null, true);
          return;
        }
      } catch {
        // Ignore malformed origins and fall through to the explicit CORS error.
      }

      callback(new Error("Origen no permitido por CORS."));
    },
  })
);
app.use(
  express.json({
    limit: "256kb",
    verify(req, _res, buffer) {
      req.rawBody = buffer.toString("utf8");
    },
  })
);

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
    avatarId: user.metadata?.avatarId || "",
    profileImage: user.metadata?.profileImage || "",
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
  const attachmentLogoPath = await getFirstExistingPath([logoPath, legacyLogoPath]);

  if (!attachmentLogoPath) {
    return [];
  }

  return [
    {
      filename: "giovsoft-logo.svg",
      path: attachmentLogoPath,
      cid: "giovsoft-logo",
      contentType: "image/svg+xml",
    },
  ];
}

async function getFirstExistingPath(filePaths) {
  for (const filePath of filePaths) {
    try {
      await fs.access(filePath);
      return filePath;
    } catch (_error) {
      // Try the next candidate path.
    }
  }

  return "";
}

function readFirstExistingText(filePaths) {
  for (const filePath of filePaths) {
    try {
      return fsSync.readFileSync(filePath, "utf8");
    } catch (_error) {
      // Try the next candidate path.
    }
  }

  return "";
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

function formatMoney(value, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(Number(value || 0));
}

function formatDateLabel(value) {
  if (!value) {
    return "Sin vigencia";
  }

  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("es-MX", {
    dateStyle: "long",
  });
}

function buildQuoteValidityMessage(quote) {
  if (!quote?.validUntil) {
    return "La vigencia de esta cotización quedará sujeta a confirmación comercial al momento de aprobar la propuesta.";
  }

  return `Esta cotización es válida hasta el ${formatDateLabel(quote.validUntil)}. Después de esta fecha, precios, tiempos de entrega y disponibilidad pueden actualizarse.`;
}

function buildQuoteEmail(quote) {
  const totalLabel = formatMoney(quote.total, quote.currency);
  const validityMessage = buildQuoteValidityMessage(quote);

  return {
    subject: `Cotización ${quote.folio} - GiovSoft`,
    text: [
      `Hola ${quote.clientName},`,
      "",
      "Te compartimos la cotización solicitada. Encontrarás el PDF adjunto con el desglose de conceptos, impuestos y total.",
      "",
      `Folio: ${quote.folio}`,
      `Vigencia: ${formatDateLabel(quote.validUntil)}`,
      `Total: ${totalLabel}`,
      "",
      validityMessage,
      "",
      "Si tienes dudas o quieres ajustar el alcance, responde este correo y con gusto te apoyamos.",
      "",
      "GiovSoft",
    ].join("\n"),
    html: buildEmailLayout({
      title: "Tu cotización está lista",
      preheader: `Cotización ${quote.folio} por ${totalLabel}.`,
      badge: "Propuesta comercial",
      intro:
        "Preparamos la cotización solicitada con el desglose de conceptos, impuestos y total. El documento PDF viene adjunto en este correo.",
      summaryRows: [
        { label: "Cliente", value: quote.clientName },
        { label: "Folio", value: quote.folio },
        { label: "Vigencia", value: formatDateLabel(quote.validUntil) },
        { label: "Subtotal", value: formatMoney(quote.subtotal, quote.currency) },
        { label: "IVA", value: formatMoney(quote.tax, quote.currency) },
        { label: "Total", value: totalLabel },
      ],
      ctaLabel: "Contactar por WhatsApp",
      ctaUrl: "https://wa.me/525566042994",
      footerNote: quote.notes ? `${validityMessage} ${quote.notes}` : validityMessage,
    }),
  };
}

function drawQuoteLogo(doc, x, y, width = 158) {
  const logoHeight = width * (80 / 315);
  const logoSvg = readFirstExistingText([quoteLogoPath, legacyQuoteLogoPath]);

  if (logoSvg) {
    try {
      SVGtoPDF(doc, logoSvg, x, y, {
        assumePt: true,
        height: logoHeight,
        preserveAspectRatio: "xMinYMin meet",
        width,
      });

      doc
        .fillColor("#d8e4f2")
        .fontSize(6.5)
        .text(giovsoftLegalName, x + 42, y + logoHeight - 4, { width: width - 42 });
      return;
    } catch (error) {
      console.warn("No se pudo renderizar el logo SVG de la cotizacion:", error.message);
    }
  }

  doc
    .save()
    .lineWidth(3)
    .strokeColor("#28aefb")
    .moveTo(x + 15, y + 5)
    .lineTo(x + 30, y + 20)
    .lineTo(x + 15, y + 35)
    .lineTo(x, y + 20)
    .closePath()
    .stroke()
    .moveTo(x + 15, y + 10)
    .lineTo(x + 25, y + 20)
    .lineTo(x + 15, y + 30)
    .lineTo(x + 5, y + 20)
    .closePath()
    .stroke()
    .fillColor("#ffffff")
    .fontSize(17)
    .text("GiovSoft", x + 42, y + 4, { width: width - 42 })
    .fillColor("#9fb0c4")
    .fontSize(6.5)
    .text("INNOVACION A TU ALCANCE", x + 42, y + 24, { width: width - 42 })
    .fillColor("#d8e4f2")
    .fontSize(6.5)
    .text(giovsoftLegalName, x + 42, y + 34, { width: width - 42 })
    .restore();
}

function drawQuoteFooter(doc, quote) {
  doc
    .save()
    .moveTo(46, 704)
    .lineTo(566, 704)
    .strokeColor("#e5edf6")
    .lineWidth(1)
    .stroke()
    .fontSize(8)
    .fillColor("#94a3b8")
    .text(`${giovsoftLegalName} · Innovación a tu alcance · contacto@giovsoft.com · Folio ${quote.folio}`, 46, 716, {
      align: "center",
      width: 520,
    })
    .restore();
}

function drawQuoteTableHeader(doc, y) {
  const columns = {
    description: 64,
    quantity: 306,
    unitPrice: 352,
    tax: 436,
    total: 496,
  };

  doc
    .roundedRect(46, y, 520, 30, 9)
    .fill("#eef5ff")
    .fillColor("#536680")
    .fontSize(8)
    .text("CONCEPTO", columns.description, y + 11, { width: 222 })
    .text("CANT.", columns.quantity, y + 11, { align: "right", width: 42 })
    .text("PRECIO", columns.unitPrice, y + 11, { align: "right", width: 66 })
    .text("IVA", columns.tax, y + 11, { align: "right", width: 44 })
    .text("TOTAL", columns.total, y + 11, { align: "right", width: 52 });

  return columns;
}

function getFittedFontSize(doc, text, { lineGap = 1, maxHeight, maxSize, minSize, width }) {
  for (let size = maxSize; size >= minSize; size -= 0.5) {
    doc.fontSize(size);
    const textHeight = doc.heightOfString(text, { lineGap, width });

    if (textHeight <= maxHeight) {
      return size;
    }
  }

  return minSize;
}

function createQuotePdf(quote) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 46, size: "LETTER" });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const issuedAt = formatDateLabel(quote.createdAt || new Date().toISOString());
    const validUntil = formatDateLabel(quote.validUntil);

    doc.rect(0, 0, 612, 150).fill("#071525");
    doc.circle(545, 44, 72).fillOpacity(0.16).fill("#29acff").fillOpacity(1);
    doc.circle(536, 42, 40).lineWidth(1).strokeColor("#1b5f86").stroke();
    drawQuoteLogo(doc, 54, 36, 154);

    doc
      .fillColor("#7de2c6")
      .fontSize(9)
      .text("PROPUESTA COMERCIAL", 388, 42, { align: "right", width: 178 })
      .fillColor("#ffffff")
      .fontSize(26)
      .text("COTIZACIÓN", 344, 58, { align: "right", width: 222 })
      .fillColor("#b8c6d7")
      .fontSize(9)
      .text(`Folio ${quote.folio}`, 388, 94, { align: "right", width: 178 });

    const clientName = String(quote.clientName || "Cliente sin nombre");
    const clientEmail = quote.clientEmail || "Sin correo registrado";
    const clientBoxY = 118;
    const clientNameWidth = 250;
    const clientNameMaxHeight = 46;
    const clientNameFontSize = getFittedFontSize(doc, clientName, {
      lineGap: 1,
      maxHeight: clientNameMaxHeight,
      maxSize: 12.5,
      minSize: 8.5,
      width: clientNameWidth,
    });
    doc.fontSize(clientNameFontSize);
    const clientNameHeight = Math.min(
      doc.heightOfString(clientName, { lineGap: 1, width: clientNameWidth }),
      clientNameMaxHeight
    );
    const clientEmailY = 154 + clientNameHeight + 8;
    const clientBoxHeight = Math.max(88, clientEmailY + 18 - clientBoxY + 16);
    const detailStartY = clientBoxY + clientBoxHeight + 30;

    doc
      .roundedRect(46, clientBoxY, 520, clientBoxHeight, 12)
      .fillAndStroke("#ffffff", "#dce7f3")
      .fillColor("#6b7d94")
      .fontSize(8)
      .text("CLIENTE", 66, 138)
      .text("FECHA", 354, 138)
      .text("VIGENCIA", 464, 138)
      .fillColor("#0f172a")
      .fontSize(clientNameFontSize)
      .text(clientName, 66, 154, { ellipsis: true, height: clientNameMaxHeight, lineGap: 1, width: clientNameWidth })
      .fontSize(10)
      .fillColor("#64748b")
      .text(clientEmail, 66, clientEmailY, { ellipsis: true, width: clientNameWidth })
      .fillColor("#0f172a")
      .fontSize(10)
      .text(issuedAt, 354, 156, { width: 88 })
      .text(validUntil, 464, 156, { width: 88 });

    doc
      .fillColor("#0f172a")
      .fontSize(13)
      .text("Detalle de la propuesta", 46, detailStartY)
      .fillColor("#64748b")
      .fontSize(9)
      .text("Importes expresados en pesos mexicanos, salvo que se indique otra moneda.", 46, detailStartY + 20);

    let y = detailStartY + 48;
    let columns = drawQuoteTableHeader(doc, y);
    y += 42;

    const items = safeArray(quote.items);
    if (items.length === 0) {
      doc.fillColor("#64748b").fontSize(10).text("Sin partidas registradas.", 64, y);
      y += 30;
    }

    for (const item of items) {
      if (y > 636) {
        drawQuoteFooter(doc, quote);
        doc.addPage();
        y = 58;
        columns = drawQuoteTableHeader(doc, y);
        y += 42;
      }

      const rowHeight = Math.max(38, doc.heightOfString(item.description || "Concepto", { width: 222 }) + 18);
      doc
        .roundedRect(46, y - 10, 520, rowHeight, 8)
        .fill("#fbfdff")
        .fillColor("#172033")
        .fontSize(10)
        .text(item.description || "Concepto", columns.description, y, { width: 222 })
        .fillColor("#334155")
        .fontSize(9)
        .text(String(item.quantity), columns.quantity, y, { width: 42, align: "right" })
        .text(formatMoney(item.unitPrice, quote.currency), columns.unitPrice, y, { width: 66, align: "right" })
        .text(`${item.taxRate}%`, columns.tax, y, { width: 44, align: "right" })
        .fillColor("#0f172a")
        .fontSize(10)
        .text(formatMoney(item.total, quote.currency), columns.total, y, { width: 52, align: "right" });

      y += rowHeight + 8;
    }

    const totalsTop = y > 560 ? y + 14 : 560;
    if (totalsTop > 640) {
      drawQuoteFooter(doc, quote);
      doc.addPage();
      y = 58;
    }

    const nextTotalsTop = totalsTop > 640 ? y : totalsTop;
    doc
      .roundedRect(330, nextTotalsTop, 236, 96, 12)
      .fillAndStroke("#071525", "#071525")
      .fillColor("#9fb0c4")
      .fontSize(9)
      .text("Subtotal", 350, nextTotalsTop + 18, { width: 88 })
      .text("IVA", 350, nextTotalsTop + 40, { width: 88 })
      .fillColor("#ffffff")
      .text(formatMoney(quote.subtotal, quote.currency), 454, nextTotalsTop + 18, { align: "right", width: 86 })
      .text(formatMoney(quote.tax, quote.currency), 454, nextTotalsTop + 40, { align: "right", width: 86 })
      .moveTo(350, nextTotalsTop + 64)
      .lineTo(540, nextTotalsTop + 64)
      .strokeColor("#244059")
      .stroke()
      .fillColor("#7de2c6")
      .fontSize(10)
      .text("TOTAL", 350, nextTotalsTop + 73)
      .fillColor("#ffffff")
      .fontSize(16)
      .text(formatMoney(quote.total, quote.currency), 414, nextTotalsTop + 68, { align: "right", width: 126 });

    const quoteConditions = quote.notes
      ? `${buildQuoteValidityMessage(quote)}\n\n${quote.notes}`
      : buildQuoteValidityMessage(quote);

    doc
      .roundedRect(46, nextTotalsTop, 256, 96, 12)
      .fillAndStroke("#f8fbff", "#dce7f3")
      .fillColor("#0f172a")
      .fontSize(11)
      .text("Condiciones", 64, nextTotalsTop + 16)
      .fillColor("#64748b")
      .fontSize(8.3)
      .text(quoteConditions, 64, nextTotalsTop + 35, { height: 48, lineGap: 1.4, width: 220 });

    drawQuoteFooter(doc, quote);

    doc.end();
  });
}

async function sendQuoteEmail(quote) {
  if (!quote.clientEmail) {
    return { reason: "La cotización no tiene correo de cliente.", status: "skipped" };
  }

  const transporter = createTransporter();

  if (!transporter) {
    return { reason: "SMTP no configurado", status: "skipped" };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const email = buildQuoteEmail(quote);
  const logoAttachments = await getLogoAttachments();
  const pdfBuffer = await createQuotePdf(quote);

  await transporter.sendMail({
    attachments: [
      ...logoAttachments,
      {
        content: pdfBuffer,
        contentType: "application/pdf",
        filename: `${quote.folio}.pdf`,
      },
    ],
    from,
    html: email.html,
    subject: email.subject,
    text: email.text,
    to: quote.clientEmail,
  });

  return { sentAt: new Date().toISOString(), status: "sent" };
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
      tax_regime TEXT,
      cfdi_use TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      segment TEXT,
      website TEXT,
      primary_service TEXT,
      notes TEXT,
      fiscal_address JSONB NOT NULL DEFAULT '{}'::jsonb,
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

    ALTER TABLE clients ADD COLUMN IF NOT EXISTS tax_regime TEXT;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS cfdi_use TEXT;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS fiscal_address JSONB NOT NULL DEFAULT '{}'::jsonb;

    CREATE TABLE IF NOT EXISTS admin_users (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'Administrador',
      status TEXT NOT NULL DEFAULT 'active',
      password_hash TEXT NOT NULL,
      password_change_required BOOLEAN NOT NULL DEFAULT TRUE,
      is_master BOOLEAN NOT NULL DEFAULT FALSE,
      passkeys JSONB NOT NULL DEFAULT '[]'::jsonb,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ
    );

    ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

    CREATE INDEX IF NOT EXISTS idx_admin_users_email
      ON admin_users (email);

    CREATE INDEX IF NOT EXISTS idx_admin_users_status
      ON admin_users (status);

    CREATE TABLE IF NOT EXISTS companies (
      id UUID PRIMARY KEY,
      commercial_name TEXT NOT NULL,
      legal_name TEXT,
      rfc TEXT,
      industry TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      plan TEXT,
      contact_name TEXT,
      contact_role TEXT,
      email TEXT,
      phone TEXT,
      website TEXT,
      city TEXT,
      state TEXT,
      address TEXT,
      employees TEXT,
      notes TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_companies_status
      ON companies (status);

    CREATE TABLE IF NOT EXISTS roles (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      scope TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      is_system BOOLEAN NOT NULL DEFAULT FALSE,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      id UUID PRIMARY KEY,
      role_id UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
      module_key TEXT NOT NULL,
      actions JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (role_id, module_key)
    );

    CREATE TABLE IF NOT EXISTS services (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      variable_pricing BOOLEAN NOT NULL DEFAULT FALSE,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS service_plans (
      id UUID PRIMARY KEY,
      service_id UUID NOT NULL REFERENCES services (id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      price_mode TEXT NOT NULL DEFAULT 'fixed',
      price NUMERIC(12,2) NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'MXN',
      billing_cycle TEXT NOT NULL DEFAULT 'Mensual',
      status TEXT NOT NULL DEFAULT 'active',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_service_plans_service_id
      ON service_plans (service_id);

    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY,
      client_id UUID REFERENCES clients (id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      client_name TEXT,
      service TEXT,
      manager TEXT,
      status TEXT NOT NULL DEFAULT 'planning',
      due_date DATE,
      budget TEXT,
      progress INTEGER NOT NULL DEFAULT 0,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_projects_status
      ON projects (status);

    CREATE TABLE IF NOT EXISTS project_deliverables (
      id UUID PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      owner TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      due_date DATE,
      notes TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS project_comments (
      id UUID PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
      author TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS project_attachments (
      id UUID PRIMARY KEY,
      project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      file_type TEXT,
      file_kind TEXT,
      file_url TEXT,
      uploaded_by TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY,
      client_id UUID REFERENCES clients (id) ON DELETE SET NULL,
      folio TEXT NOT NULL UNIQUE,
      client_name TEXT,
      concept TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'MXN',
      status TEXT NOT NULL DEFAULT 'draft',
      issued_at DATE,
      due_date DATE,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_status
      ON invoices (status);

    CREATE TABLE IF NOT EXISTS quotes (
      id UUID PRIMARY KEY,
      folio TEXT NOT NULL UNIQUE,
      client_id UUID REFERENCES clients (id) ON DELETE SET NULL,
      client_name TEXT NOT NULL,
      client_email TEXT,
      valid_until DATE,
      currency TEXT NOT NULL DEFAULT 'MXN',
      status TEXT NOT NULL DEFAULT 'draft',
      subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
      tax NUMERIC(12,2) NOT NULL DEFAULT 0,
      total NUMERIC(12,2) NOT NULL DEFAULT 0,
      items JSONB NOT NULL DEFAULT '[]'::jsonb,
      notes TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by UUID REFERENCES admin_users (id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_quotes_status
      ON quotes (status);

    CREATE INDEX IF NOT EXISTS idx_quotes_created_at
      ON quotes (created_at DESC);

    CREATE TABLE IF NOT EXISTS recurring_payments (
      id UUID PRIMARY KEY,
      client_id UUID REFERENCES clients (id) ON DELETE SET NULL,
      client_name TEXT,
      service TEXT,
      plan TEXT,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'MXN',
      frequency TEXT NOT NULL DEFAULT 'Mensual',
      payment_day INTEGER,
      next_charge DATE,
      payment_method TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      owner TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS collections (
      id UUID PRIMARY KEY,
      client_id UUID REFERENCES clients (id) ON DELETE SET NULL,
      client_name TEXT,
      concept TEXT NOT NULL,
      expected_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      due_date DATE,
      last_contact DATE,
      next_follow_up DATE,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id UUID PRIMARY KEY,
      client_id UUID REFERENCES clients (id) ON DELETE SET NULL,
      folio TEXT,
      client_name TEXT,
      receipt_type TEXT,
      file_name TEXT,
      file_url TEXT,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'MXN',
      status TEXT NOT NULL DEFAULT 'pending',
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS billing_sat_settings (
      id TEXT PRIMARY KEY,
      state JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payment_engine_settings (
      id TEXT PRIMARY KEY,
      state JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id UUID PRIMARY KEY,
      client_id UUID REFERENCES clients (id) ON DELETE SET NULL,
      folio TEXT NOT NULL UNIQUE,
      client_name TEXT,
      subject TEXT NOT NULL,
      channel TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'open',
      owner TEXT,
      sla_due TEXT,
      last_update TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS support_cases (
      id UUID PRIMARY KEY,
      client_id UUID REFERENCES clients (id) ON DELETE SET NULL,
      client_name TEXT,
      topic TEXT NOT NULL,
      owner TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      sla TEXT,
      channel TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS support_comments (
      id UUID PRIMARY KEY,
      support_case_id UUID NOT NULL REFERENCES support_cases (id) ON DELETE CASCADE,
      author TEXT,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS integrations (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      status TEXT NOT NULL DEFAULT 'disabled',
      last_sync TEXT,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS connected_applications (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT,
      api_base_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      sso_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      webhook_secret TEXT NOT NULL,
      login_redirect_url TEXT,
      last_sync TIMESTAMPTZ,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_connected_applications_status
      ON connected_applications (status);

    CREATE TABLE IF NOT EXISTS application_webhook_events (
      id UUID PRIMARY KEY,
      application_id UUID NOT NULL REFERENCES connected_applications (id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'MXN',
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_application_webhook_events_app_created
      ON application_webhook_events (application_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_application_webhook_events_type
      ON application_webhook_events (event_type);

    CREATE TABLE IF NOT EXISTS audit_events (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES admin_users (id) ON DELETE SET NULL,
      user_name TEXT,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'info',
      ip TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_audit_events_created_at
      ON audit_events (created_at DESC);

    CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      report_type TEXT NOT NULL,
      description TEXT,
      parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
      generated_by UUID REFERENCES admin_users (id) ON DELETE SET NULL,
      generated_at TIMESTAMPTZ,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_by UUID REFERENCES admin_users (id) ON DELETE SET NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS business_lines (
      id UUID PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT,
      icon TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE connected_applications ADD COLUMN IF NOT EXISTS business_line_id UUID;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS business_line_id UUID;
    ALTER TABLE connected_applications ADD COLUMN IF NOT EXISTS api_key TEXT;
    ALTER TABLE connected_applications ADD COLUMN IF NOT EXISTS outbound_webhook_url TEXT;

    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY,
      application_id UUID REFERENCES connected_applications (id) ON DELETE SET NULL,
      business_line_id UUID REFERENCES business_lines (id) ON DELETE SET NULL,
      sku TEXT,
      plan TEXT,
      concept TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      subtotal NUMERIC(12,2) NOT NULL,
      tax NUMERIC(12,2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'MXN',
      status TEXT NOT NULL DEFAULT 'pending',
      stripe_session_id TEXT,
      stripe_payment_intent_id TEXT,
      external_ref TEXT,
      idempotency_key TEXT,
      customer JSONB NOT NULL DEFAULT '{}'::jsonb,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      cfdi_id TEXT,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_app_idempotency
      ON orders (application_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders (stripe_session_id);
    CREATE INDEX IF NOT EXISTS idx_orders_line_created ON orders (business_line_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
    CREATE INDEX IF NOT EXISTS idx_orders_external_ref ON orders (external_ref);

    CREATE TABLE IF NOT EXISTS outbound_webhook_deliveries (
      id UUID PRIMARY KEY,
      application_id UUID REFERENCES connected_applications (id) ON DELETE CASCADE,
      order_id UUID,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      target_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INT NOT NULL DEFAULT 0,
      next_attempt_at TIMESTAMPTZ,
      last_status_code INT,
      last_error TEXT,
      delivered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_outbound_deliveries_pending
      ON outbound_webhook_deliveries (status, next_attempt_at);
    CREATE INDEX IF NOT EXISTS idx_outbound_deliveries_order
      ON outbound_webhook_deliveries (order_id);
  `);

  databaseReady = true;
}

function toIsoDate(value) {
  return value ? new Date(value).toISOString() : "";
}

function toDateOnly(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
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
    taxRegime: row.tax_regime || "",
    cfdiUse: row.cfdi_use || "",
    status: row.status,
    segment: row.segment || "",
    website: row.website || "",
    primaryService: row.primary_service || "",
    notes: row.notes || "",
    fiscalAddress: row.fiscal_address || {},
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

function mapAdminUserRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    passwordHash: row.password_hash,
    passwordChangeRequired: Boolean(row.password_change_required),
    isMaster: Boolean(row.is_master),
    passkeys: safeArray(row.passkeys),
    metadata: sanitizePlainObject(row.metadata),
    createdAt: toIsoDate(row.created_at),
    updatedAt: toIsoDate(row.updated_at),
    lastLoginAt: toIsoDate(row.last_login_at),
  };
}

function mapQuoteRow(row) {
  return {
    id: row.id,
    folio: row.folio,
    clientId: row.client_id || "",
    clientName: row.client_name,
    clientEmail: row.client_email || "",
    validUntil: toDateOnly(row.valid_until),
    currency: row.currency || "MXN",
    status: row.status || "draft",
    subtotal: Number(row.subtotal || 0),
    tax: Number(row.tax || 0),
    total: Number(row.total || 0),
    items: safeArray(row.items),
    notes: row.notes || "",
    metadata: sanitizePlainObject(row.metadata),
    createdBy: row.created_by || "",
    createdAt: toIsoDate(row.created_at),
    updatedAt: toIsoDate(row.updated_at),
  };
}

function mapBusinessLineRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || "",
    color: row.color || "",
    icon: row.icon || "",
    status: row.status || "active",
    createdAt: toIsoDate(row.created_at),
    updatedAt: toIsoDate(row.updated_at),
  };
}

function mapOrderRow(row) {
  return {
    id: row.id,
    applicationId: row.application_id || "",
    businessLineId: row.business_line_id || "",
    sku: row.sku || "",
    plan: row.plan || "",
    concept: row.concept,
    amount: Number(row.amount || 0),
    subtotal: Number(row.subtotal || 0),
    tax: Number(row.tax || 0),
    currency: row.currency || "MXN",
    status: row.status || "pending",
    stripeSessionId: row.stripe_session_id || "",
    stripePaymentIntentId: row.stripe_payment_intent_id || "",
    externalRef: row.external_ref || "",
    idempotencyKey: row.idempotency_key || "",
    customer: sanitizePlainObject(row.customer),
    metadata: sanitizePlainObject(row.metadata),
    cfdiId: row.cfdi_id || "",
    paidAt: toIsoDate(row.paid_at),
    createdAt: toIsoDate(row.created_at),
    updatedAt: toIsoDate(row.updated_at),
  };
}

function mapDeliveryRow(row) {
  return {
    id: row.id,
    applicationId: row.application_id || "",
    orderId: row.order_id || "",
    eventType: row.event_type,
    payload: sanitizePlainObject(row.payload),
    targetUrl: row.target_url,
    status: row.status || "pending",
    attempts: Number(row.attempts || 0),
    nextAttemptAt: toIsoDate(row.next_attempt_at),
    lastStatusCode: row.last_status_code === null || row.last_status_code === undefined ? null : Number(row.last_status_code),
    lastError: row.last_error || "",
    deliveredAt: toIsoDate(row.delivered_at),
    createdAt: toIsoDate(row.created_at),
    updatedAt: toIsoDate(row.updated_at),
  };
}

function mapApplicationRow(row, metrics = {}) {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain || "",
    apiBaseUrl: row.api_base_url || "",
    businessLineId: row.business_line_id || "",
    apiKey: row.api_key || "",
    outboundWebhookUrl: row.outbound_webhook_url || "",
    status: row.status || "pending",
    ssoEnabled: Boolean(row.sso_enabled),
    webhookSecret: row.webhook_secret || "",
    loginRedirectUrl: row.login_redirect_url || "",
    lastSync: toIsoDate(row.last_sync),
    config: sanitizePlainObject(row.config),
    metrics: {
      users: Number(metrics.users || 0),
      sales: Number(metrics.sales || 0),
      invoices: Number(metrics.invoices || 0),
      payments: Number(metrics.payments || 0),
      revenue: Number(metrics.revenue || 0),
      events: Number(metrics.events || 0),
    },
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

async function ensureQuotesFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(quotesFile);
  } catch {
    await fs.writeFile(quotesFile, "[]", "utf8");
  }
}

async function ensureBillingSatFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(billingSatFile);
  } catch {
    await fs.writeFile(billingSatFile, JSON.stringify(defaultBillingSatState, null, 2), "utf8");
  }
}

async function ensurePaymentEngineFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(paymentEngineFile);
  } catch {
    await fs.writeFile(paymentEngineFile, JSON.stringify(defaultPaymentEngineState, null, 2), "utf8");
  }
}

async function ensureApplicationsFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(applicationsFile);
  } catch {
    await fs.writeFile(applicationsFile, "[]", "utf8");
  }
}

async function ensureBusinessLinesFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(businessLinesFile);
  } catch {
    const now = new Date().toISOString();
    const seeded = defaultBusinessLines.map((line) => ({ ...line, createdAt: now, updatedAt: now }));
    await fs.writeFile(businessLinesFile, JSON.stringify(seeded, null, 2), "utf8");
  }
}

async function ensureOrdersFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(ordersFile);
  } catch {
    await fs.writeFile(ordersFile, "[]", "utf8");
  }
}

async function ensureOutboundDeliveriesFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(outboundDeliveriesFile);
  } catch {
    await fs.writeFile(outboundDeliveriesFile, "[]", "utf8");
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
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();
    const { rows } = await currentPool.query("SELECT * FROM admin_users ORDER BY created_at DESC");
    const users = rows.map(mapAdminUserRow);
    const usersWithMaster = await ensureMasterAdminUser(users);

    if (usersWithMaster.length !== users.length || usersWithMaster.some((user, index) => user !== users[index])) {
      await writeAdminUsers(usersWithMaster);
    }

    return usersWithMaster;
  }

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
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();

    const client = await currentPool.connect();

    try {
      await client.query("BEGIN");

      const ids = users.map((user) => user.id);

      if (ids.length > 0) {
        await client.query("DELETE FROM admin_users WHERE id <> ALL($1::uuid[])", [ids]);
      } else {
        await client.query("DELETE FROM admin_users");
      }

      for (const user of users) {
        await client.query(
          `
            INSERT INTO admin_users (
              id, name, email, role, status, password_hash, password_change_required,
              is_master, passkeys, metadata, created_at, updated_at, last_login_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              email = EXCLUDED.email,
              role = EXCLUDED.role,
              status = EXCLUDED.status,
              password_hash = EXCLUDED.password_hash,
              password_change_required = EXCLUDED.password_change_required,
              is_master = EXCLUDED.is_master,
              passkeys = EXCLUDED.passkeys,
              metadata = EXCLUDED.metadata,
              created_at = EXCLUDED.created_at,
              updated_at = EXCLUDED.updated_at,
              last_login_at = EXCLUDED.last_login_at
          `,
          [
            user.id,
            user.name,
            user.email,
            user.role || "Administrador",
            user.status || "active",
            user.passwordHash,
            Boolean(user.passwordChangeRequired),
            Boolean(user.isMaster),
            JSON.stringify(safeArray(user.passkeys)),
            JSON.stringify(sanitizePlainObject(user.metadata)),
            user.createdAt || new Date().toISOString(),
            user.updatedAt || new Date().toISOString(),
            user.lastLoginAt || null,
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
              id, business_name, legal_name, rfc, tax_regime, cfdi_use, status, segment, website, primary_service, notes,
              fiscal_address, contacts, services, domains, hosting, payments, reminders, contracts, documents, activity,
              created_at, updated_at
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
              $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb, $16::jsonb, $17::jsonb, $18::jsonb, $19::jsonb, $20::jsonb, $21::jsonb,
              $22, $23
            )
            ON CONFLICT (id) DO UPDATE SET
              business_name = EXCLUDED.business_name,
              legal_name = EXCLUDED.legal_name,
              rfc = EXCLUDED.rfc,
              tax_regime = EXCLUDED.tax_regime,
              cfdi_use = EXCLUDED.cfdi_use,
              status = EXCLUDED.status,
              segment = EXCLUDED.segment,
              website = EXCLUDED.website,
              primary_service = EXCLUDED.primary_service,
              notes = EXCLUDED.notes,
              fiscal_address = EXCLUDED.fiscal_address,
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
            item.taxRegime || null,
            item.cfdiUse || null,
            item.status || "active",
            item.segment || null,
            item.website || null,
            item.primaryService || null,
            item.notes || null,
            JSON.stringify(sanitizePlainObject(item.fiscalAddress)),
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

async function readQuotes() {
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();
    const { rows } = await currentPool.query("SELECT * FROM quotes ORDER BY created_at DESC");
    return rows.map(mapQuoteRow);
  }

  await ensureQuotesFile();
  const raw = await fs.readFile(quotesFile, "utf8");
  return JSON.parse(raw);
}

async function writeQuotes(quotes) {
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();
    const client = await currentPool.connect();

    try {
      await client.query("BEGIN");

      for (const quote of quotes) {
        await client.query(
          `
            INSERT INTO quotes (
              id, folio, client_id, client_name, client_email, valid_until, currency, status,
              subtotal, tax, total, items, notes, metadata, created_by, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14::jsonb, $15, $16, $17)
            ON CONFLICT (id) DO UPDATE SET
              folio = EXCLUDED.folio,
              client_id = EXCLUDED.client_id,
              client_name = EXCLUDED.client_name,
              client_email = EXCLUDED.client_email,
              valid_until = EXCLUDED.valid_until,
              currency = EXCLUDED.currency,
              status = EXCLUDED.status,
              subtotal = EXCLUDED.subtotal,
              tax = EXCLUDED.tax,
              total = EXCLUDED.total,
              items = EXCLUDED.items,
              notes = EXCLUDED.notes,
              metadata = EXCLUDED.metadata,
              created_by = EXCLUDED.created_by,
              created_at = EXCLUDED.created_at,
              updated_at = EXCLUDED.updated_at
          `,
          [
            quote.id,
            quote.folio,
            quote.clientId || null,
            quote.clientName,
            quote.clientEmail || null,
            quote.validUntil || null,
            quote.currency || "MXN",
            quote.status || "draft",
            Number(quote.subtotal || 0),
            Number(quote.tax || 0),
            Number(quote.total || 0),
            JSON.stringify(safeArray(quote.items)),
            quote.notes || null,
            JSON.stringify(sanitizePlainObject(quote.metadata)),
            quote.createdBy || null,
            quote.createdAt || new Date().toISOString(),
            quote.updatedAt || new Date().toISOString(),
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

  await ensureQuotesFile();
  await fs.writeFile(quotesFile, JSON.stringify(quotes, null, 2), "utf8");
}

function mergeBillingSatState(state = {}) {
  const storedEngine = sanitizePlainObject(state.engine);
  const legacyBillingCapabilities = safeArray(storedEngine.capabilities).some((capability) =>
    String(capability).toLowerCase().includes("pagos, facturas y suscripciones")
  );

  return {
    ...defaultBillingSatState,
    ...sanitizePlainObject(state),
    engine: {
      ...defaultBillingSatState.engine,
      ...storedEngine,
      name: storedEngine.name === "GiovSoft Billing Engine" ? defaultBillingSatState.engine.name : storedEngine.name || defaultBillingSatState.engine.name,
      capabilities:
        safeArray(storedEngine.capabilities).length && !legacyBillingCapabilities
          ? safeArray(storedEngine.capabilities)
          : defaultBillingSatState.engine.capabilities,
    },
    webhookSchema: {
      ...defaultBillingSatState.webhookSchema,
      ...sanitizePlainObject(state.webhookSchema),
      supportedEvents: safeArray(state.webhookSchema?.supportedEvents).length
        ? safeArray(state.webhookSchema.supportedEvents)
        : defaultBillingSatState.webhookSchema.supportedEvents,
    },
    provider: { ...defaultBillingSatState.provider, ...sanitizePlainObject(state.provider) },
    emitter: { ...defaultBillingSatState.emitter, ...sanitizePlainObject(state.emitter) },
    catalogs: { ...defaultBillingSatState.catalogs, ...sanitizePlainObject(state.catalogs), items: safeArray(state.catalogs?.items).length ? safeArray(state.catalogs.items) : defaultBillingSatState.catalogs.items },
    connectedSystems: safeArray(state.connectedSystems),
    webhookEvents: safeArray(state.webhookEvents),
    series: safeArray(state.series),
    cfdis: safeArray(state.cfdis),
  };
}

function publicBillingSatState(state) {
  const merged = mergeBillingSatState(state);
  return {
    ...merged,
    provider: {
      ...merged.provider,
      passwordConfigured: Boolean(process.env.CSFACTURACION_PASSWORD || process.env.CSFACTURACION_PASS),
    },
  };
}

async function readBillingSatState() {
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();
    const { rows } = await currentPool.query("SELECT state FROM billing_sat_settings WHERE id = 'main' LIMIT 1");

    if (!rows.length) {
      await writeBillingSatState(defaultBillingSatState);
      return defaultBillingSatState;
    }

    return mergeBillingSatState(rows[0].state);
  }

  await ensureBillingSatFile();
  const raw = await fs.readFile(billingSatFile, "utf8");
  return mergeBillingSatState(JSON.parse(raw));
}

async function writeBillingSatState(state) {
  const normalized = mergeBillingSatState(state);
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();
    await currentPool.query(
      `
        INSERT INTO billing_sat_settings (id, state, updated_at)
        VALUES ('main', $1::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()
      `,
      [JSON.stringify(normalized)]
    );
    return normalized;
  }

  await ensureBillingSatFile();
  await fs.writeFile(billingSatFile, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

function mergePaymentEngineState(state = {}) {
  return {
    ...defaultPaymentEngineState,
    ...sanitizePlainObject(state),
    engine: {
      ...defaultPaymentEngineState.engine,
      ...sanitizePlainObject(state.engine),
      capabilities: safeArray(state.engine?.capabilities).length
        ? safeArray(state.engine.capabilities)
        : defaultPaymentEngineState.engine.capabilities,
    },
    provider: {
      ...defaultPaymentEngineState.provider,
      ...sanitizePlainObject(state.provider),
      environment: sanitizeText(state.provider?.environment) === "live" ? "live" : "test",
    },
    webhookSchema: {
      ...defaultPaymentEngineState.webhookSchema,
      ...sanitizePlainObject(state.webhookSchema),
      supportedEvents: safeArray(state.webhookSchema?.supportedEvents).length
        ? safeArray(state.webhookSchema.supportedEvents)
        : defaultPaymentEngineState.webhookSchema.supportedEvents,
    },
    connectedSystems: safeArray(state.connectedSystems),
    webhookEvents: safeArray(state.webhookEvents),
    payments: safeArray(state.payments),
    subscriptions: safeArray(state.subscriptions),
    payouts: safeArray(state.payouts),
  };
}

function publicPaymentEngineState(state) {
  const merged = mergePaymentEngineState(state);
  return {
    ...merged,
    provider: {
      ...merged.provider,
      secretConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      webhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      configured: Boolean(merged.provider.publishableKey && process.env.STRIPE_SECRET_KEY),
    },
  };
}

async function readPaymentEngineState() {
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();
    const { rows } = await currentPool.query("SELECT state FROM payment_engine_settings WHERE id = 'main' LIMIT 1");

    if (!rows.length) {
      await writePaymentEngineState(defaultPaymentEngineState);
      return defaultPaymentEngineState;
    }

    return mergePaymentEngineState(rows[0].state);
  }

  await ensurePaymentEngineFile();
  const raw = await fs.readFile(paymentEngineFile, "utf8");
  return mergePaymentEngineState(JSON.parse(raw));
}

async function writePaymentEngineState(state) {
  const normalized = mergePaymentEngineState(state);
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();
    await currentPool.query(
      `
        INSERT INTO payment_engine_settings (id, state, updated_at)
        VALUES ('main', $1::jsonb, NOW())
        ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()
      `,
      [JSON.stringify(normalized)]
    );
    return normalized;
  }

  await ensurePaymentEngineFile();
  await fs.writeFile(paymentEngineFile, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

function buildCsFacturacionEndpoints(provider) {
  const useProduction = provider.environment === "production";
  return {
    issue: useProduction ? provider.productionEndpoint : provider.demoEndpoint,
    cancel: useProduction ? provider.productionCancelEndpoint : provider.demoCancelEndpoint,
  };
}

function validateFiscalClient(client) {
  const missing = [];
  const fiscalAddress = sanitizePlainObject(client.fiscalAddress);

  if (!sanitizeText(client.legalName || client.businessName)) missing.push("razon social");
  if (!sanitizeText(client.rfc)) missing.push("RFC");
  if (!sanitizeText(client.taxRegime)) missing.push("regimen fiscal");
  if (!sanitizeText(client.cfdiUse)) missing.push("uso CFDI");
  if (!sanitizeText(fiscalAddress.postalCode || client.postalCode)) missing.push("codigo postal");

  return {
    missing,
    valid: missing.length === 0,
  };
}

function buildCfdiPayloadForReceptor(body, state, receptor) {
  const client = receptor || {};
  const fiscalAddress = sanitizePlainObject(client.fiscalAddress);
  const concept = sanitizeText(body.concept);
  const amount = roundMoney(body.amount);
  const taxRate = Number(body.taxRate ?? 0.16);
  const tax = roundMoney(amount * taxRate);
  const total = roundMoney(amount + tax);

  return {
    Comprobante: {
      Serie: sanitizeText(body.series) || "A",
      Folio: sanitizeText(body.folio) || String(Date.now()),
      Fecha: new Date().toISOString(),
      FormaPago: sanitizeText(body.paymentForm) || "03",
      MetodoPago: sanitizeText(body.paymentMethod) || "PUE",
      Moneda: "MXN",
      SubTotal: amount,
      Total: total,
      TipoDeComprobante: "I",
      LugarExpedicion: state.emitter.postalCode,
    },
    Emisor: {
      Rfc: state.emitter.rfc,
      Nombre: state.emitter.legalName,
      RegimenFiscal: state.emitter.taxRegime,
    },
    Receptor: {
      Rfc: client.rfc,
      Nombre: client.legalName || client.businessName,
      DomicilioFiscalReceptor: fiscalAddress.postalCode || "",
      RegimenFiscalReceptor: client.taxRegime,
      UsoCFDI: client.cfdiUse || sanitizeText(body.cfdiUse) || "G03",
    },
    Conceptos: [
      {
        ClaveProdServ: sanitizeText(body.productServiceKey) || "81112100",
        Cantidad: Number(body.quantity || 1),
        ClaveUnidad: sanitizeText(body.unitKey) || "E48",
        Unidad: sanitizeText(body.unit) || "Servicio",
        Descripcion: concept,
        ValorUnitario: amount,
        Importe: amount,
        ObjetoImp: "02",
      },
    ],
  };
}

function buildCfdiPayload(body, state, clients) {
  const client = clients.find((item) => item.id === body.clientId) || {};
  return buildCfdiPayloadForReceptor(body, state, client);
}

// Timbra (si CSFacturación está habilitado) y guarda el CFDI en el estado de
// facturación. Compartido por la emisión admin y la API de productos.
async function stampAndStoreCfdi(state, payload, meta = {}) {
  const now = new Date().toISOString();
  const cfdi = {
    id: crypto.randomUUID(),
    clientId: meta.clientId || "",
    clientName: meta.clientName || payload.Receptor.Nombre || "",
    orderId: meta.orderId || "",
    businessLineId: meta.businessLineId || "",
    folio: `${payload.Comprobante.Serie}-${payload.Comprobante.Folio}`,
    provider: state.provider.name,
    environment: state.provider.environment,
    status: "draft",
    subtotal: payload.Comprobante.SubTotal,
    tax: roundMoney(payload.Comprobante.Total - payload.Comprobante.SubTotal),
    total: payload.Comprobante.Total,
    uuid: "",
    xmlBase64: "",
    pdfBase64: "",
    qrBase64: "",
    payload,
    providerResponse: {},
    createdAt: now,
    updatedAt: now,
  };

  const credentials = {
    username: state.provider.username || process.env.CSFACTURACION_USERNAME || process.env.CSFACTURACION_USER,
    password: process.env.CSFACTURACION_PASSWORD || process.env.CSFACTURACION_PASS,
  };

  if (process.env.CSFACTURACION_ENABLED === "true" && credentials.username && credentials.password) {
    const endpoints = buildCsFacturacionEndpoints(state.provider);
    const providerResponse = await callCsFacturacion(endpoints.issue, credentials, payload);
    cfdi.status = "issued";
    cfdi.uuid = providerResponse?.data?.uuid || providerResponse?.uuid || "";
    cfdi.xmlBase64 = providerResponse?.data?.xml || "";
    cfdi.pdfBase64 = providerResponse?.data?.pdf || "";
    cfdi.qrBase64 = providerResponse?.data?.qr || "";
    cfdi.providerResponse = providerResponse;
  }

  const updatedState = await writeBillingSatState({ ...state, cfdis: [cfdi, ...safeArray(state.cfdis)] });
  return { cfdi, updatedState };
}

async function callCsFacturacion(endpoint, credentials, payload) {
  const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64");
  const response = await fetch(endpoint, {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch (_error) {
    data = { message: text };
  }

  if (!response.ok) {
    const error = new Error(data.message || "CSFacturacion rechazo la solicitud.");
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

async function readApplications() {
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();

    const [appsResult, metricsResult] = await Promise.all([
      currentPool.query("SELECT * FROM connected_applications ORDER BY updated_at DESC"),
      currentPool.query(`
        SELECT
          application_id,
          COUNT(*)::int AS events,
          COUNT(*) FILTER (WHERE event_type IN ('user.created', 'user.updated'))::int AS users,
          COUNT(*) FILTER (WHERE event_type IN ('sale.created', 'order.created'))::int AS sales,
          COUNT(*) FILTER (WHERE event_type = 'invoice.created')::int AS invoices,
          COUNT(*) FILTER (WHERE event_type = 'payment.received')::int AS payments,
          COALESCE(SUM(amount) FILTER (WHERE event_type IN ('sale.created', 'order.created', 'payment.received')), 0)::numeric AS revenue
        FROM application_webhook_events
        GROUP BY application_id
      `),
    ]);

    const metricsByApp = new Map(metricsResult.rows.map((row) => [row.application_id, row]));
    return appsResult.rows.map((row) => mapApplicationRow(row, metricsByApp.get(row.id)));
  }

  await ensureApplicationsFile();
  const raw = await fs.readFile(applicationsFile, "utf8");
  return JSON.parse(raw);
}

async function writeApplications(applications) {
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();
    const client = await currentPool.connect();

    try {
      await client.query("BEGIN");

      for (const application of applications) {
        await client.query(
          `
            INSERT INTO connected_applications (
              id, name, domain, api_base_url, status, sso_enabled, webhook_secret,
              login_redirect_url, last_sync, config, business_line_id, api_key,
              outbound_webhook_url, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              domain = EXCLUDED.domain,
              api_base_url = EXCLUDED.api_base_url,
              status = EXCLUDED.status,
              sso_enabled = EXCLUDED.sso_enabled,
              webhook_secret = EXCLUDED.webhook_secret,
              login_redirect_url = EXCLUDED.login_redirect_url,
              last_sync = EXCLUDED.last_sync,
              config = EXCLUDED.config,
              business_line_id = EXCLUDED.business_line_id,
              api_key = EXCLUDED.api_key,
              outbound_webhook_url = EXCLUDED.outbound_webhook_url,
              created_at = EXCLUDED.created_at,
              updated_at = EXCLUDED.updated_at
          `,
          [
            application.id,
            application.name,
            application.domain || null,
            application.apiBaseUrl || null,
            application.status || "pending",
            application.ssoEnabled !== false,
            application.webhookSecret,
            application.loginRedirectUrl || null,
            application.lastSync || null,
            JSON.stringify(sanitizePlainObject(application.config)),
            application.businessLineId || null,
            application.apiKey || null,
            application.outboundWebhookUrl || null,
            application.createdAt || new Date().toISOString(),
            application.updatedAt || new Date().toISOString(),
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

  await ensureApplicationsFile();
  await fs.writeFile(applicationsFile, JSON.stringify(applications, null, 2), "utf8");
}

async function readBusinessLines() {
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();

    const { rows } = await currentPool.query("SELECT * FROM business_lines ORDER BY created_at ASC");

    if (rows.length === 0) {
      // Primera ejecución: sembrar el catálogo con UUIDs fijos.
      const now = new Date().toISOString();
      const seeded = defaultBusinessLines.map((line) => ({ ...line, createdAt: now, updatedAt: now }));
      await writeBusinessLines(seeded);
      return seeded;
    }

    return rows.map(mapBusinessLineRow);
  }

  await ensureBusinessLinesFile();
  const raw = await fs.readFile(businessLinesFile, "utf8");
  return JSON.parse(raw);
}

async function writeBusinessLines(businessLines) {
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();
    const client = await currentPool.connect();

    try {
      await client.query("BEGIN");

      for (const line of businessLines) {
        await client.query(
          `
            INSERT INTO business_lines (id, slug, name, description, color, icon, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
              slug = EXCLUDED.slug,
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              color = EXCLUDED.color,
              icon = EXCLUDED.icon,
              status = EXCLUDED.status,
              updated_at = EXCLUDED.updated_at
          `,
          [
            line.id,
            line.slug,
            line.name,
            line.description || null,
            line.color || null,
            line.icon || null,
            line.status || "active",
            line.createdAt || new Date().toISOString(),
            line.updatedAt || new Date().toISOString(),
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

  await ensureBusinessLinesFile();
  await fs.writeFile(businessLinesFile, JSON.stringify(businessLines, null, 2), "utf8");
}

async function readOrdersFileList() {
  await ensureOrdersFile();
  const raw = await fs.readFile(ordersFile, "utf8");
  return JSON.parse(raw);
}

async function saveOrder(order) {
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();
    await currentPool.query(
      `
        INSERT INTO orders (
          id, application_id, business_line_id, sku, plan, concept, amount, subtotal, tax,
          currency, status, stripe_session_id, stripe_payment_intent_id, external_ref,
          idempotency_key, customer, metadata, cfdi_id, paid_at, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17::jsonb, $18, $19, $20, $21)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          stripe_session_id = EXCLUDED.stripe_session_id,
          stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id,
          customer = EXCLUDED.customer,
          metadata = EXCLUDED.metadata,
          cfdi_id = EXCLUDED.cfdi_id,
          paid_at = EXCLUDED.paid_at,
          updated_at = EXCLUDED.updated_at
      `,
      [
        order.id,
        order.applicationId || null,
        order.businessLineId || null,
        order.sku || null,
        order.plan || null,
        order.concept,
        order.amount,
        order.subtotal,
        order.tax,
        order.currency || "MXN",
        order.status || "pending",
        order.stripeSessionId || null,
        order.stripePaymentIntentId || null,
        order.externalRef || null,
        order.idempotencyKey || null,
        JSON.stringify(sanitizePlainObject(order.customer)),
        JSON.stringify(sanitizePlainObject(order.metadata)),
        order.cfdiId || null,
        order.paidAt || null,
        order.createdAt || new Date().toISOString(),
        order.updatedAt || new Date().toISOString(),
      ]
    );
    return;
  }

  const orders = await readOrdersFileList();
  const orderIndex = orders.findIndex((item) => item.id === order.id);

  if (orderIndex === -1) {
    orders.unshift(order);
  } else {
    orders[orderIndex] = order;
  }

  await fs.writeFile(ordersFile, JSON.stringify(orders, null, 2), "utf8");
}

async function findOrder(criteria) {
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();
    const conditions = [];
    const values = [];

    if (criteria.id) {
      values.push(criteria.id);
      conditions.push(`id = $${values.length}`);
    }
    if (criteria.stripeSessionId) {
      values.push(criteria.stripeSessionId);
      conditions.push(`stripe_session_id = $${values.length}`);
    }
    if (criteria.applicationId) {
      values.push(criteria.applicationId);
      conditions.push(`application_id = $${values.length}`);
    }
    if (criteria.idempotencyKey) {
      values.push(criteria.idempotencyKey);
      conditions.push(`idempotency_key = $${values.length}`);
    }

    if (conditions.length === 0) {
      return null;
    }

    const { rows } = await currentPool.query(
      `SELECT * FROM orders WHERE ${conditions.join(" AND ")} LIMIT 1`,
      values
    );
    return rows[0] ? mapOrderRow(rows[0]) : null;
  }

  const orders = await readOrdersFileList();
  return (
    orders.find(
      (order) =>
        (!criteria.id || order.id === criteria.id) &&
        (!criteria.stripeSessionId || order.stripeSessionId === criteria.stripeSessionId) &&
        (!criteria.applicationId || order.applicationId === criteria.applicationId) &&
        (!criteria.idempotencyKey || order.idempotencyKey === criteria.idempotencyKey)
    ) || null
  );
}

async function listOrders(filters = {}) {
  const limit = Math.min(Number(filters.limit) || 50, 200);
  const offset = Math.max(Number(filters.offset) || 0, 0);
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();
    const conditions = [];
    const values = [];

    if (filters.applicationId) {
      values.push(filters.applicationId);
      conditions.push(`application_id = $${values.length}`);
    }
    if (filters.businessLineId) {
      values.push(filters.businessLineId);
      conditions.push(`business_line_id = $${values.length}`);
    }
    if (filters.status) {
      values.push(filters.status);
      conditions.push(`status = $${values.length}`);
    }
    if (filters.externalRef) {
      values.push(filters.externalRef);
      conditions.push(`external_ref = $${values.length}`);
    }
    if (filters.uninvoiced) {
      conditions.push("(cfdi_id IS NULL OR cfdi_id = '')");
    }
    if (filters.from) {
      values.push(filters.from);
      conditions.push(`created_at >= $${values.length}`);
    }
    if (filters.to) {
      values.push(filters.to);
      conditions.push(`created_at <= $${values.length}`);
    }
    if (filters.search) {
      values.push(`%${filters.search.toLowerCase()}%`);
      conditions.push(
        `(LOWER(concept) LIKE $${values.length} OR LOWER(COALESCE(external_ref, '')) LIKE $${values.length} OR LOWER(COALESCE(customer->>'email', '')) LIKE $${values.length})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rowsResult, countResult] = await Promise.all([
      currentPool.query(
        `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        values
      ),
      currentPool.query(`SELECT COUNT(*)::int AS total FROM orders ${whereClause}`, values),
    ]);

    return { orders: rowsResult.rows.map(mapOrderRow), total: countResult.rows[0].total };
  }

  const allOrders = await readOrdersFileList();
  const search = (filters.search || "").toLowerCase();
  const filtered = allOrders.filter(
    (order) =>
      (!filters.applicationId || order.applicationId === filters.applicationId) &&
      (!filters.businessLineId || order.businessLineId === filters.businessLineId) &&
      (!filters.status || order.status === filters.status) &&
      (!filters.externalRef || order.externalRef === filters.externalRef) &&
      (!filters.uninvoiced || !order.cfdiId) &&
      (!filters.from || order.createdAt >= filters.from) &&
      (!filters.to || order.createdAt <= filters.to) &&
      (!search ||
        order.concept.toLowerCase().includes(search) ||
        (order.externalRef || "").toLowerCase().includes(search) ||
        (order.customer?.email || "").toLowerCase().includes(search))
  );

  return { orders: filtered.slice(offset, offset + limit), total: filtered.length };
}

// Resumen de ventas: KPIs, serie mensual y desgloses por línea/aplicación.
// Calcula en JS sobre las órdenes filtradas (volúmenes actuales lo permiten
// en ambos modos de storage; si crece, migrar a agregados SQL).
async function buildSalesSummary({ businessLineId = "", months = 6 } = {}) {
  const [{ orders }, businessLines, applications] = await Promise.all([
    listOrders({ businessLineId, limit: 200000 }),
    readBusinessLines(),
    readApplications(),
  ]);

  const monthCount = Math.min(Math.max(Number(months) || 6, 1), 24);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const paidOrders = orders.filter((order) => order.status === "paid");

  const kpis = {
    revenueTotal: roundMoney(paidOrders.reduce((total, order) => total + order.amount, 0)),
    revenueThisMonth: roundMoney(
      paidOrders.filter((order) => (order.paidAt || "").startsWith(thisMonth)).reduce((total, order) => total + order.amount, 0)
    ),
    paidOrders: paidOrders.length,
    avgTicket: paidOrders.length > 0 ? roundMoney(paidOrders.reduce((total, order) => total + order.amount, 0) / paidOrders.length) : 0,
    pendingOrders: orders.filter((order) => order.status === "pending").length,
    refundedAmount: roundMoney(
      orders.filter((order) => order.status === "refunded").reduce((total, order) => total + order.amount, 0)
    ),
  };

  const monthlyRevenue = [];
  const reference = new Date();
  for (let index = monthCount - 1; index >= 0; index -= 1) {
    const monthDate = new Date(reference.getFullYear(), reference.getMonth() - index, 1);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    const monthOrders = paidOrders.filter((order) => (order.paidAt || "").startsWith(monthKey));
    monthlyRevenue.push({
      month: monthKey,
      revenue: roundMoney(monthOrders.reduce((total, order) => total + order.amount, 0)),
      orders: monthOrders.length,
    });
  }

  const byLine = businessLines.map((line) => {
    const lineOrders = paidOrders.filter((order) => order.businessLineId === line.id);
    return {
      businessLineId: line.id,
      slug: line.slug,
      name: line.name,
      color: line.color,
      status: line.status,
      revenue: roundMoney(lineOrders.reduce((total, order) => total + order.amount, 0)),
      orders: lineOrders.length,
    };
  });

  const byApplication = applications
    .map((application) => {
      const appOrders = paidOrders.filter((order) => order.applicationId === application.id);
      return {
        applicationId: application.id,
        name: application.name,
        businessLineId: application.businessLineId || "",
        revenue: roundMoney(appOrders.reduce((total, order) => total + order.amount, 0)),
        orders: appOrders.length,
      };
    })
    .filter((entry) => entry.orders > 0 || !businessLineId);

  return {
    kpis,
    monthlyRevenue,
    byLine,
    byApplication,
    recentOrders: orders.slice(0, 10),
  };
}

async function saveDelivery(delivery) {
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();
    await currentPool.query(
      `
        INSERT INTO outbound_webhook_deliveries (
          id, application_id, order_id, event_type, payload, target_url, status,
          attempts, next_attempt_at, last_status_code, last_error, delivered_at,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          attempts = EXCLUDED.attempts,
          next_attempt_at = EXCLUDED.next_attempt_at,
          last_status_code = EXCLUDED.last_status_code,
          last_error = EXCLUDED.last_error,
          delivered_at = EXCLUDED.delivered_at,
          updated_at = EXCLUDED.updated_at
      `,
      [
        delivery.id,
        delivery.applicationId || null,
        delivery.orderId || null,
        delivery.eventType,
        JSON.stringify(sanitizePlainObject(delivery.payload)),
        delivery.targetUrl,
        delivery.status || "pending",
        delivery.attempts || 0,
        delivery.nextAttemptAt || null,
        delivery.lastStatusCode === null || delivery.lastStatusCode === undefined ? null : delivery.lastStatusCode,
        delivery.lastError || null,
        delivery.deliveredAt || null,
        delivery.createdAt || new Date().toISOString(),
        delivery.updatedAt || new Date().toISOString(),
      ]
    );
    return;
  }

  await ensureOutboundDeliveriesFile();
  const raw = await fs.readFile(outboundDeliveriesFile, "utf8");
  const deliveries = JSON.parse(raw);
  const deliveryIndex = deliveries.findIndex((item) => item.id === delivery.id);

  if (deliveryIndex === -1) {
    deliveries.unshift(delivery);
  } else {
    deliveries[deliveryIndex] = delivery;
  }

  await fs.writeFile(outboundDeliveriesFile, JSON.stringify(deliveries.slice(0, 500), null, 2), "utf8");
}

async function listDeliveries(filters = {}) {
  const currentPool = getPool();

  if (currentPool) {
    await ensureDatabase();
    const conditions = [];
    const values = [];

    if (filters.orderId) {
      values.push(filters.orderId);
      conditions.push(`order_id = $${values.length}`);
    }
    if (filters.id) {
      values.push(filters.id);
      conditions.push(`id = $${values.length}`);
    }
    if (filters.duePending) {
      // Se compara contra la hora del hub (quien escribió next_attempt_at),
      // no contra NOW() de la BD: evita desfases de reloj entre procesos.
      values.push(new Date().toISOString());
      conditions.push(`status = 'pending' AND (next_attempt_at IS NULL OR next_attempt_at <= $${values.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await currentPool.query(
      `SELECT * FROM outbound_webhook_deliveries ${whereClause} ORDER BY created_at DESC LIMIT 50`
    , values);
    return rows.map(mapDeliveryRow);
  }

  await ensureOutboundDeliveriesFile();
  const raw = await fs.readFile(outboundDeliveriesFile, "utf8");
  const deliveries = JSON.parse(raw);
  const now = new Date().toISOString();

  return deliveries
    .filter(
      (delivery) =>
        (!filters.orderId || delivery.orderId === filters.orderId) &&
        (!filters.id || delivery.id === filters.id) &&
        (!filters.duePending || (delivery.status === "pending" && (!delivery.nextAttemptAt || delivery.nextAttemptAt <= now)))
    )
    .slice(0, 50);
}

// Firma estilo Stripe con el webhook secret (gws_) de la aplicación:
// x-giovsoft-signature: t=<unix>,v1=<hmac-sha256(secret, "<t>.<body>")>
function signOutboundPayload(secret, rawBody) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

// Intenta entregar un webhook saliente y actualiza su estado/reintentos.
async function attemptDelivery(delivery, application) {
  const rawBody = JSON.stringify(delivery.payload);
  const attemptNumber = (delivery.attempts || 0) + 1;
  const now = new Date().toISOString();
  let statusCode = null;
  let errorMessage = "";

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), outboundTimeoutMs);
    const response = await fetch(delivery.targetUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-giovsoft-signature": signOutboundPayload(application.webhookSecret, rawBody),
        "x-giovsoft-event-id": delivery.id,
        "x-giovsoft-event-type": delivery.eventType,
      },
      body: rawBody,
      signal: controller.signal,
    });
    clearTimeout(timer);
    statusCode = response.status;

    if (response.ok) {
      await saveDelivery({
        ...delivery,
        status: "delivered",
        attempts: attemptNumber,
        lastStatusCode: statusCode,
        lastError: "",
        deliveredAt: now,
        nextAttemptAt: null,
        updatedAt: now,
      });
      return true;
    }

    errorMessage = `HTTP ${statusCode}`;
  } catch (error) {
    errorMessage = error.name === "AbortError" ? `Timeout tras ${outboundTimeoutMs / 1000}s` : error.message;
  }

  const exhausted = attemptNumber >= outboundRetryDelaysMs.length;
  // Tras el intento N fallido se espera el retraso N-1: [30s, 2m, 10m, 30m, 2h].
  const nextDelay = outboundRetryDelaysMs[Math.min(attemptNumber - 1, outboundRetryDelaysMs.length - 1)];

  await saveDelivery({
    ...delivery,
    status: exhausted ? "exhausted" : "pending",
    attempts: attemptNumber,
    lastStatusCode: statusCode,
    lastError: errorMessage,
    nextAttemptAt: exhausted ? null : new Date(Date.now() + nextDelay).toISOString(),
    updatedAt: now,
  });
  return false;
}

// Barrido periódico de entregas pendientes vencidas. Nota para Cloud Run:
// con scale-to-zero este intervalo solo corre con una instancia caliente;
// el polling del producto (GET /api/v1/orders/:id) cubre los huecos.
async function sweepPendingDeliveries() {
  try {
    const dueDeliveries = await listDeliveries({ duePending: true });

    if (dueDeliveries.length === 0) {
      return;
    }

    const applications = await readApplications();

    for (const delivery of dueDeliveries.slice(0, 20)) {
      const application = applications.find((item) => item.id === delivery.applicationId);

      if (!application) {
        await saveDelivery({ ...delivery, status: "exhausted", lastError: "Aplicación no encontrada", updatedAt: new Date().toISOString() });
        continue;
      }

      await attemptDelivery(delivery, application);
    }
  } catch (error) {
    console.error("Error en el barrido de webhooks salientes:", error.message);
  }
}

setInterval(sweepPendingDeliveries, 30 * 1000).unref();

async function storeApplicationWebhookEvent(application, event) {
  const currentPool = getPool();
  const now = new Date().toISOString();

  if (currentPool) {
    await ensureDatabase();
    await currentPool.query(
      `
        INSERT INTO application_webhook_events (
          id, application_id, event_type, payload, amount, currency, occurred_at, created_at
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
      `,
      [
        crypto.randomUUID(),
        application.id,
        event.eventType,
        JSON.stringify(event.payload),
        event.amount,
        event.currency,
        event.occurredAt,
        now,
      ]
    );
    await currentPool.query("UPDATE connected_applications SET last_sync = $1, updated_at = $1 WHERE id = $2", [now, application.id]);
    return;
  }

  const applications = await readApplications();
  const index = applications.findIndex((item) => item.id === application.id);

  if (index === -1) {
    return;
  }

  const currentMetrics = applications[index].metrics || {};
  const nextMetrics = {
    events: Number(currentMetrics.events || 0) + 1,
    invoices: Number(currentMetrics.invoices || 0) + (event.eventType === "invoice.created" ? 1 : 0),
    payments: Number(currentMetrics.payments || 0) + (event.eventType === "payment.received" ? 1 : 0),
    revenue:
      Number(currentMetrics.revenue || 0) +
      (["sale.created", "order.created", "payment.received"].includes(event.eventType) ? Number(event.amount || 0) : 0),
    sales: Number(currentMetrics.sales || 0) + (["sale.created", "order.created"].includes(event.eventType) ? 1 : 0),
    users: Number(currentMetrics.users || 0) + (["user.created", "user.updated"].includes(event.eventType) ? 1 : 0),
  };

  applications[index] = {
    ...applications[index],
    lastSync: now,
    metrics: nextMetrics,
    updatedAt: now,
  };
  await writeApplications(applications);
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

function sanitizePlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [
      key,
      typeof entryValue === "string" ? sanitizeText(entryValue) : entryValue ?? "",
    ])
  );
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function buildQuoteFolio(quotes) {
  const year = new Date().getFullYear();
  const nextNumber =
    safeArray(quotes).reduce((highest, quote) => {
      const match = String(quote.folio || "").match(new RegExp(`^COT-${year}-(\\d+)$`));
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0) + 1;

  return `COT-${year}-${String(nextNumber).padStart(4, "0")}`;
}

function validateQuotePayload(body, existingQuote) {
  const rawItems = safeArray(body.items !== undefined ? body.items : existingQuote?.items);
  const items = rawItems
    .map((item) => {
      const quantity = Number(item?.quantity || 0);
      const unitPrice = Number(item?.unitPrice || 0);
      const taxRate = item?.taxRate === "" || item?.taxRate === undefined ? 16 : Number(item.taxRate);
      const lineSubtotal = roundMoney(quantity * unitPrice);
      const lineTax = roundMoney(lineSubtotal * (taxRate / 100));

      return {
        id: sanitizeText(item?.id) || crypto.randomUUID(),
        description: sanitizeText(item?.description),
        quantity: roundMoney(quantity),
        unitPrice: roundMoney(unitPrice),
        taxRate: roundMoney(taxRate),
        subtotal: lineSubtotal,
        tax: lineTax,
        total: roundMoney(lineSubtotal + lineTax),
      };
    })
    .filter((item) => item.description || item.quantity > 0 || item.unitPrice > 0);

  const subtotal = roundMoney(items.reduce((total, item) => total + item.subtotal, 0));
  const tax = roundMoney(items.reduce((total, item) => total + item.tax, 0));
  const status = sanitizeText(body.status || existingQuote?.status || "draft");
  const payload = {
    folio: sanitizeText(body.folio || existingQuote?.folio),
    clientId: sanitizeText(body.clientId || existingQuote?.clientId),
    clientName: sanitizeText(body.clientName || existingQuote?.clientName),
    clientEmail: sanitizeText(body.clientEmail || existingQuote?.clientEmail),
    validUntil: sanitizeText(body.validUntil || existingQuote?.validUntil),
    currency: sanitizeText(body.currency || existingQuote?.currency || "MXN"),
    status: quoteStatuses.has(status) ? status : "draft",
    subtotal,
    tax,
    total: roundMoney(subtotal + tax),
    items,
    notes: sanitizeText(body.notes || existingQuote?.notes),
    metadata: sanitizePlainObject(body.metadata || existingQuote?.metadata),
    updatedAt: new Date().toISOString(),
  };

  if (!payload.clientName) {
    return { error: "Selecciona o captura el cliente de la cotización." };
  }

  if (payload.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.clientEmail)) {
    return { error: "El correo del cliente no es válido." };
  }

  if (payload.items.length === 0 || payload.items.some((item) => !item.description || item.quantity <= 0 || item.unitPrice < 0)) {
    return { error: "Agrega al menos una partida con concepto, cantidad y precio válido." };
  }

  return { payload };
}

function createApplicationSecret() {
  return `gws_${crypto.randomBytes(24).toString("base64url")}`;
}

function createApplicationApiKey() {
  return `gwk_${crypto.randomBytes(24).toString("hex")}`;
}

function publicConnectedApplication(application) {
  return {
    apiBaseUrl: application.apiBaseUrl || "",
    config: sanitizePlainObject(application.config),
    domain: application.domain || "",
    id: application.id,
    lastSync: application.lastSync || "",
    loginRedirectUrl: application.loginRedirectUrl || "",
    name: application.name || "",
    ssoEnabled: application.ssoEnabled !== false,
    status: application.status || "pending",
  };
}

function validateApplicationPayload(body, existingApplication) {
  const status = sanitizeText(body.status || existingApplication?.status || "pending");
  const config = sanitizePlainObject(body.config || existingApplication?.config);
  const payload = {
    name: sanitizeText(body.name || existingApplication?.name),
    domain: sanitizeText(body.domain || existingApplication?.domain),
    apiBaseUrl: sanitizeText(body.apiBaseUrl || existingApplication?.apiBaseUrl),
    businessLineId: sanitizeText(
      body.businessLineId !== undefined ? body.businessLineId : existingApplication?.businessLineId
    ),
    status: applicationStatuses.has(status) ? status : "pending",
    ssoEnabled: body.ssoEnabled !== undefined ? Boolean(body.ssoEnabled) : existingApplication?.ssoEnabled !== false,
    webhookSecret: sanitizeText(body.webhookSecret || existingApplication?.webhookSecret || createApplicationSecret()),
    apiKey: sanitizeText(existingApplication?.apiKey || createApplicationApiKey()),
    outboundWebhookUrl: sanitizeText(
      body.outboundWebhookUrl !== undefined ? body.outboundWebhookUrl : existingApplication?.outboundWebhookUrl
    ),
    loginRedirectUrl: sanitizeText(body.loginRedirectUrl || existingApplication?.loginRedirectUrl),
    config: {
      syncUsers: config.syncUsers !== false,
      syncSales: config.syncSales !== false,
      syncInvoices: config.syncInvoices !== false,
      syncPayments: config.syncPayments !== false,
      webhookMode: "webhooks",
      authMode: "centralized_login",
    },
    updatedAt: new Date().toISOString(),
  };

  if (!payload.name) {
    return { error: "El nombre de la aplicación es requerido." };
  }

  if (!payload.apiBaseUrl) {
    return { error: "La URL base del API es requerida." };
  }

  try {
    new URL(payload.apiBaseUrl);
  } catch (_error) {
    return { error: "La URL base del API no es válida." };
  }

  if (payload.loginRedirectUrl) {
    try {
      new URL(payload.loginRedirectUrl);
    } catch (_error) {
      return { error: "La URL de login/retorno no es válida." };
    }
  }

  return { payload };
}

function sanitizeWebhookEvent(body) {
  const eventType = sanitizeText(body.eventType || body.type);
  const payload = sanitizePlainObject(body.data || body.payload || {});
  const amount = roundMoney(body.amount || payload.amount || payload.total || 0);
  const currency = sanitizeText(body.currency || payload.currency || "MXN");
  const occurredAt = sanitizeText(body.occurredAt || body.createdAt) || new Date().toISOString();

  if (!eventType) {
    return { error: "El tipo de evento es requerido." };
  }

  return { payload: { amount, currency, eventType, occurredAt, payload } };
}

function verifyWebhookSecret(incomingSecret, storedSecret) {
  if (!incomingSecret || !storedSecret) {
    return false;
  }

  const incomingBuffer = Buffer.from(String(incomingSecret));
  const storedBuffer = Buffer.from(String(storedSecret));
  return incomingBuffer.length === storedBuffer.length && crypto.timingSafeEqual(incomingBuffer, storedBuffer);
}

function sanitizeBillingWebhookEvent(body) {
  const eventType = sanitizeText(body.eventType || body.type);
  const payload = sanitizePlainObject(body.data || body.payload || {});
  const amount = roundMoney(body.amount || payload.amount || payload.total || 0);
  const currency = sanitizeText(body.currency || payload.currency || "MXN");
  const externalId = sanitizeText(body.externalId || payload.externalId || payload.id);
  const occurredAt = sanitizeText(body.occurredAt || body.createdAt || payload.createdAt) || new Date().toISOString();

  if (!eventType) {
    return { error: "El tipo de evento de facturacion es requerido." };
  }

  if (!defaultBillingSatState.webhookSchema.supportedEvents.includes(eventType)) {
    return { error: "Evento de facturacion no soportado por el motor." };
  }

  return { payload: { amount, currency, eventType, externalId, occurredAt, payload } };
}

function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!rawBody || !signatureHeader || !secret) {
    return false;
  }

  const parts = String(signatureHeader)
    .split(",")
    .map((part) => part.trim().split("="))
    .reduce((accumulator, [key, value]) => ({ ...accumulator, [key]: value }), {});
  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) {
    return false;
  }

  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

function sanitizePaymentWebhookEvent(body) {
  const eventType = sanitizeText(body.eventType || body.type);
  const payload = sanitizePlainObject(body.data?.object || body.data || body.payload || {});
  const amount = roundMoney(
    body.amount ||
      payload.amount_received ||
      payload.amount_paid ||
      payload.amount_total ||
      payload.amount ||
      payload.total ||
      0
  );
  const currency = sanitizeText(body.currency || payload.currency || "MXN").toUpperCase();
  const externalId = sanitizeText(body.externalId || payload.externalId || payload.id || body.id);
  const connectedAccountId = sanitizeText(body.account || payload.account || payload.stripeAccount || payload.connectedAccountId);
  const customerId = sanitizeText(payload.customer || payload.customer_id || payload.customerId);
  const occurredAt = sanitizeText(body.occurredAt || body.createdAt || payload.createdAt) || new Date().toISOString();

  if (!eventType) {
    return { error: "El tipo de evento de pagos es requerido." };
  }

  if (!defaultPaymentEngineState.webhookSchema.supportedEvents.includes(eventType)) {
    return { error: "Evento de pagos no soportado por el motor." };
  }

  return {
    payload: {
      amount,
      connectedAccountId,
      currency,
      customerId,
      eventType,
      externalId,
      occurredAt,
      payload,
    },
  };
}

function validateClientPayload(body, existingClient) {
  const now = new Date().toISOString();
  const payload = {
    businessName: sanitizeText(body.businessName || body.company || existingClient?.businessName),
    legalName: sanitizeText(body.legalName || existingClient?.legalName),
    rfc: sanitizeText(body.rfc || existingClient?.rfc || genericPublicRfc),
    taxRegime: sanitizeText(body.taxRegime || existingClient?.taxRegime),
    cfdiUse: sanitizeText(body.cfdiUse || existingClient?.cfdiUse),
    status: sanitizeText(body.status || existingClient?.status || "active"),
    segment: sanitizeText(body.segment || existingClient?.segment),
    website: sanitizeText(body.website || existingClient?.website),
    primaryService: sanitizeText(body.primaryService || existingClient?.primaryService),
    notes: sanitizeText(body.notes || existingClient?.notes),
    fiscalAddress: body.fiscalAddress !== undefined ? sanitizePlainObject(body.fiscalAddress) : sanitizePlainObject(existingClient?.fiscalAddress),
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

    const requiresTwoFactor = adminTwoFactorEnabled && (!user.isMaster || masterTwoFactorEnabled);

    if (requiresTwoFactor) {
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

app.post("/api/webhooks/applications/:id", async (req, res, next) => {
  try {
    const applications = await readApplications();
    const application = applications.find((item) => item.id === req.params.id && item.status === "active");

    if (!application) {
      return res.status(404).json({ message: "Aplicación no encontrada o inactiva." });
    }

    const webhookSecret = req.get("x-giovsoft-webhook-secret") || "";

    if (!verifyWebhookSecret(webhookSecret, application.webhookSecret)) {
      return res.status(401).json({ message: "Webhook no autorizado." });
    }

    const validation = sanitizeWebhookEvent(req.body);

    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    await storeApplicationWebhookEvent(application, validation.payload);
    return res.status(202).json({ message: "Evento recibido.", eventType: validation.payload.eventType });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/webhooks/payments/stripe/:systemId", async (req, res, next) => {
  try {
    const [state, applications] = await Promise.all([readPaymentEngineState(), readApplications()]);
    const systems = safeArray(state.connectedSystems);
    const system = systems.find((item) => item.id === req.params.systemId || item.applicationId === req.params.systemId);

    if (!system || system.status !== "active") {
      return res.status(404).json({ message: "Sistema de pagos no encontrado o inactivo." });
    }

    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

    if (stripeWebhookSecret && !verifyStripeSignature(req.rawBody, req.get("stripe-signature"), stripeWebhookSecret)) {
      return res.status(401).json({ message: "Firma Stripe no valida." });
    }

    const validation = sanitizePaymentWebhookEvent(req.body);

    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const now = new Date().toISOString();
    const webhookEvent = {
      id: crypto.randomUUID(),
      source: "stripe",
      systemId: system.id,
      applicationId: system.applicationId,
      systemName: system.name,
      status: "received",
      ...validation.payload,
      receivedAt: now,
    };
    const updatedSystems = systems.map((item) => {
      if (item.id !== system.id) {
        return item;
      }

      const metrics = sanitizePlainObject(item.metrics);
      const isPayment = ["payment_intent.succeeded", "checkout.session.completed", "invoice.paid", "payments.payment.received"].includes(validation.payload.eventType);
      const isSubscription = validation.payload.eventType.includes("subscription") || validation.payload.eventType.startsWith("invoice.");

      return {
        ...item,
        lastEventAt: now,
        metrics: {
          events: Number(metrics.events || 0) + 1,
          payments: Number(metrics.payments || 0) + (isPayment ? 1 : 0),
          revenue: Number(metrics.revenue || 0) + (isPayment ? Number(validation.payload.amount || 0) : 0),
          subscriptions: Number(metrics.subscriptions || 0) + (isSubscription ? 1 : 0),
        },
        updatedAt: now,
      };
    });
    const updatedState = {
      ...state,
      connectedSystems: updatedSystems,
      webhookEvents: [webhookEvent, ...safeArray(state.webhookEvents)].slice(0, 300),
    };

    await writePaymentEngineState(updatedState);
    return res.status(202).json({
      eventId: webhookEvent.id,
      message: "Evento recibido por GiovSoft Payment Engine.",
      status: webhookEvent.status,
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/webhooks/payments/:systemId", async (req, res, next) => {
  try {
    const [state, applications] = await Promise.all([readPaymentEngineState(), readApplications()]);
    const systems = safeArray(state.connectedSystems);
    const system = systems.find((item) => item.id === req.params.systemId || item.applicationId === req.params.systemId);

    if (!system || system.status !== "active") {
      return res.status(404).json({ message: "Sistema de pagos no encontrado o inactivo." });
    }

    const application = applications.find((item) => item.id === system.applicationId);
    const incomingSecret = req.get("x-giovsoft-payments-secret") || req.get("x-giovsoft-webhook-secret") || "";

    if (!verifyWebhookSecret(incomingSecret, application?.webhookSecret)) {
      return res.status(401).json({ message: "Webhook de pagos no autorizado." });
    }

    const validation = sanitizePaymentWebhookEvent(req.body);

    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const now = new Date().toISOString();
    const webhookEvent = {
      id: crypto.randomUUID(),
      source: "giovsoft",
      systemId: system.id,
      applicationId: system.applicationId,
      systemName: system.name,
      status: "received",
      ...validation.payload,
      receivedAt: now,
    };
    const updatedSystems = systems.map((item) => {
      if (item.id !== system.id) {
        return item;
      }

      const metrics = sanitizePlainObject(item.metrics);
      return {
        ...item,
        lastEventAt: now,
        metrics: {
          events: Number(metrics.events || 0) + 1,
          payments: Number(metrics.payments || 0) + (validation.payload.eventType === "payments.payment.received" ? 1 : 0),
          revenue: Number(metrics.revenue || 0) + Number(validation.payload.amount || 0),
          subscriptions: Number(metrics.subscriptions || 0) + (validation.payload.eventType === "payments.subscription.renewed" ? 1 : 0),
        },
        updatedAt: now,
      };
    });
    const updatedState = {
      ...state,
      connectedSystems: updatedSystems,
      webhookEvents: [webhookEvent, ...safeArray(state.webhookEvents)].slice(0, 300),
    };

    await writePaymentEngineState(updatedState);
    return res.status(202).json({
      eventId: webhookEvent.id,
      message: "Evento recibido por GiovSoft Payment Engine.",
      status: webhookEvent.status,
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/webhooks/billing/:systemId", async (req, res, next) => {
  try {
    const [state, applications] = await Promise.all([readBillingSatState(), readApplications()]);
    const systems = safeArray(state.connectedSystems);
    const system = systems.find((item) => item.id === req.params.systemId || item.applicationId === req.params.systemId);

    if (!system || system.status !== "active") {
      return res.status(404).json({ message: "Sistema de facturacion no encontrado o inactivo." });
    }

    const application = applications.find((item) => item.id === system.applicationId);
    const incomingSecret = req.get("x-giovsoft-billing-secret") || req.get("x-giovsoft-webhook-secret") || "";

    if (!verifyWebhookSecret(incomingSecret, application?.webhookSecret)) {
      return res.status(401).json({ message: "Webhook de facturacion no autorizado." });
    }

    const validation = sanitizeBillingWebhookEvent(req.body);

    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const now = new Date().toISOString();
    const webhookEvent = {
      id: crypto.randomUUID(),
      systemId: system.id,
      applicationId: system.applicationId,
      systemName: system.name,
      status: "received",
      ...validation.payload,
      receivedAt: now,
    };
    const updatedSystems = systems.map((item) => {
      if (item.id !== system.id) {
        return item;
      }

      const metrics = sanitizePlainObject(item.metrics);
      return {
        ...item,
        lastEventAt: now,
        metrics: {
          cfdiRequests: Number(metrics.cfdiRequests || 0) + (validation.payload.eventType === "billing.cfdi.requested" ? 1 : 0),
          events: Number(metrics.events || 0) + 1,
          payments: Number(metrics.payments || 0) + (validation.payload.eventType === "billing.payment.received" ? 1 : 0),
          revenue: Number(metrics.revenue || 0) + Number(validation.payload.amount || 0),
        },
        updatedAt: now,
      };
    });
    const updatedState = {
      ...state,
      connectedSystems: updatedSystems,
      webhookEvents: [webhookEvent, ...safeArray(state.webhookEvents)].slice(0, 200),
    };

    await writeBillingSatState(updatedState);
    return res.status(202).json({
      eventId: webhookEvent.id,
      message: "Evento recibido por GiovSoft Billing Engine.",
      status: webhookEvent.status,
    });
  } catch (error) {
    return next(error);
  }
});

/* ============================================================
   Motor de checkout centralizado (API para productos, /api/v1)
   ============================================================ */

// Autenticación de aplicaciones conectadas: x-giovsoft-app-id + x-giovsoft-api-key.
async function requireApplicationAuth(req, res, next) {
  try {
    const applicationId = sanitizeText(req.get("x-giovsoft-app-id"));
    const apiKey = sanitizeText(req.get("x-giovsoft-api-key"));

    if (!applicationId || !apiKey) {
      return res.status(401).json({ message: "Credenciales de aplicación requeridas." });
    }

    const applications = await readApplications();
    const application = applications.find((item) => item.id === applicationId);

    if (!application || !verifyWebhookSecret(apiKey, application.apiKey)) {
      return res.status(401).json({ message: "Credenciales de aplicación inválidas." });
    }

    if (application.status !== "active") {
      return res.status(403).json({ message: "La aplicación no está activa en el hub." });
    }

    req.application = application;
    return next();
  } catch (error) {
    return next(error);
  }
}

// Vista pública de una orden para el producto (nunca expone datos internos).
function publicOrder(order) {
  return {
    id: order.id,
    status: order.status,
    concept: order.concept,
    sku: order.sku,
    plan: order.plan,
    amount: order.amount,
    subtotal: order.subtotal,
    tax: order.tax,
    currency: order.currency,
    externalRef: order.externalRef,
    customer: order.customer,
    metadata: order.metadata,
    stripeSessionId: order.stripeSessionId,
    cfdi: order.cfdiId ? { id: order.cfdiId } : null,
    paidAt: order.paidAt || null,
    createdAt: order.createdAt,
  };
}

// Marca una orden como pagada y propaga: métricas de la aplicación (motor de
// pagos existente) y, en fases siguientes, webhook saliente al producto.
async function handleOrderPaid(order, application, extra = {}) {
  if (order.status === "paid") {
    return order;
  }

  const paidOrder = {
    ...order,
    status: "paid",
    paidAt: new Date().toISOString(),
    stripePaymentIntentId: extra.paymentIntentId || order.stripePaymentIntentId || "",
    updatedAt: new Date().toISOString(),
  };
  await saveOrder(paidOrder);

  if (application) {
    await storeApplicationWebhookEvent(application, {
      eventType: "payment.received",
      amount: paidOrder.amount,
      currency: paidOrder.currency,
      occurredAt: paidOrder.paidAt,
      payload: {
        orderId: paidOrder.id,
        concept: paidOrder.concept,
        plan: paidOrder.plan,
        externalRef: paidOrder.externalRef,
        source: "hub-checkout",
      },
    }).catch((error) => console.error("No se pudo registrar el evento de pago:", error.message));
  }

  await notifyOrderEvent(paidOrder, application, "order.paid");
  return paidOrder;
}

// Webhook saliente al producto: crea el registro de entrega y hace el primer
// intento en línea (los reintentos corren en el barrido cada 30s).
async function notifyOrderEvent(order, application, eventType) {
  if (!application) {
    console.warn(`[orden ${order.id}] evento ${eventType} sin aplicación asociada; no se notifica.`);
    return;
  }

  const targetUrl =
    sanitizeText(application.outboundWebhookUrl) ||
    `${String(application.apiBaseUrl || "").replace(/\/$/, "")}/api/payments/hub-webhook`;

  if (!targetUrl.startsWith("http")) {
    console.warn(`[orden ${order.id}] la aplicación ${application.name} no tiene URL de webhook válida.`);
    return;
  }

  const now = new Date().toISOString();
  const delivery = {
    id: crypto.randomUUID(),
    applicationId: application.id,
    orderId: order.id,
    eventType,
    payload: {
      id: crypto.randomUUID(),
      eventType,
      occurredAt: now,
      data: {
        orderId: order.id,
        externalRef: order.externalRef,
        plan: order.plan,
        sku: order.sku,
        concept: order.concept,
        amount: order.amount,
        subtotal: order.subtotal,
        tax: order.tax,
        currency: order.currency,
        status: order.status,
        paidAt: order.paidAt || null,
        stripeSessionId: order.stripeSessionId,
        customer: order.customer,
        metadata: order.metadata,
      },
    },
    targetUrl,
    status: "pending",
    attempts: 0,
    nextAttemptAt: now,
    lastStatusCode: null,
    lastError: "",
    deliveredAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await saveDelivery(delivery);
  // Primer intento inmediato, sin bloquear la respuesta del webhook de Stripe.
  attemptDelivery(delivery, application).catch((error) =>
    console.error(`[orden ${order.id}] error en el primer intento de entrega:`, error.message)
  );
}

app.post("/api/v1/checkout/sessions", requireApplicationAuth, async (req, res, next) => {
  try {
    const application = req.application;
    const idempotencyKey = sanitizeText(req.get("x-idempotency-key"));

    if (!idempotencyKey) {
      return res.status(400).json({ message: "El encabezado x-idempotency-key es requerido." });
    }

    // Replay idempotente: misma llave → misma orden.
    const existingOrder = await findOrder({ applicationId: application.id, idempotencyKey });
    if (existingOrder) {
      return res.status(200).json({
        order: publicOrder(existingOrder),
        checkoutUrl: existingOrder.metadata?.checkoutUrl || null,
        replayed: true,
      });
    }

    const concept = sanitizeText(req.body.concept);
    const amountTotal = roundMoney(Number(req.body.amountTotal));
    const externalRef = sanitizeText(req.body.externalRef);
    const successUrl = sanitizeText(req.body.successUrl);
    const cancelUrl = sanitizeText(req.body.cancelUrl);

    if (!concept) {
      return res.status(400).json({ message: "El concepto es requerido." });
    }
    if (!Number.isFinite(amountTotal) || amountTotal <= 0) {
      return res.status(400).json({ message: "El monto total (amountTotal) debe ser mayor a cero." });
    }
    if (!externalRef) {
      return res.status(400).json({ message: "La referencia externa (externalRef) es requerida." });
    }

    for (const [field, value] of [["successUrl", successUrl], ["cancelUrl", cancelUrl]]) {
      if (!value) {
        return res.status(400).json({ message: `La URL ${field} es requerida.` });
      }
      try {
        new URL(value);
      } catch (_error) {
        return res.status(400).json({ message: `La URL ${field} no es válida.` });
      }
    }

    const subtotal = roundMoney(amountTotal / (1 + IVA_RATE));
    const tax = roundMoney(amountTotal - subtotal);
    const now = new Date().toISOString();
    const order = {
      id: crypto.randomUUID(),
      applicationId: application.id,
      businessLineId: application.businessLineId || "",
      sku: sanitizeText(req.body.sku),
      plan: sanitizeText(req.body.plan),
      concept,
      amount: amountTotal,
      subtotal,
      tax,
      currency: sanitizeText(req.body.currency).toUpperCase() || "MXN",
      status: "pending",
      stripeSessionId: "",
      stripePaymentIntentId: "",
      externalRef,
      idempotencyKey,
      customer: sanitizePlainObject(req.body.customer),
      metadata: sanitizePlainObject(req.body.metadata),
      cfdiId: "",
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const stripe = getStripe();

    if (!stripe) {
      // Modo simulación: sin llaves de Stripe la orden queda pendiente y se
      // confirma con mark-paid desde el admin (útil en desarrollo y pruebas).
      order.metadata = { ...order.metadata, simulated: true };
      await saveOrder(order);
      return res.status(201).json({ order: publicOrder(order), checkoutUrl: null, simulated: true });
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: order.currency.toLowerCase(),
              unit_amount: Math.round(order.amount * 100),
              product_data: { name: order.concept },
            },
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: order.customer.email || undefined,
        metadata: {
          orderId: order.id,
          applicationId: application.id,
          businessLineId: order.businessLineId,
          externalRef: order.externalRef,
          plan: order.plan,
          sku: order.sku,
          subtotal: String(order.subtotal),
          tax: String(order.tax),
        },
        payment_intent_data: { metadata: { orderId: order.id } },
      },
      { idempotencyKey: `checkout-${order.id}` }
    );

    order.stripeSessionId = session.id;
    order.metadata = { ...order.metadata, checkoutUrl: session.url };
    await saveOrder(order);

    return res.status(201).json({
      order: publicOrder(order),
      checkoutUrl: session.url,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
    });
  } catch (error) {
    if (error?.type?.startsWith("Stripe")) {
      console.error("Error de Stripe al crear la sesión:", error.message);
      return res.status(502).json({ message: "No se pudo crear la sesión de pago con Stripe." });
    }
    return next(error);
  }
});

app.get("/api/v1/orders/:orderId", requireApplicationAuth, async (req, res, next) => {
  try {
    const order = await findOrder({ id: req.params.orderId, applicationId: req.application.id });

    if (!order) {
      return res.status(404).json({ message: "Orden no encontrada." });
    }

    return res.json({ order: publicOrder(order) });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/v1/orders", requireApplicationAuth, async (req, res, next) => {
  try {
    const { orders, total } = await listOrders({
      applicationId: req.application.id,
      externalRef: sanitizeText(req.query.externalRef),
      status: sanitizeText(req.query.status),
      limit: req.query.limit,
      offset: req.query.offset,
    });

    return res.json({ orders: orders.map(publicOrder), total });
  } catch (error) {
    return next(error);
  }
});

// Solicitud de CFDI para una orden pagada (facturación automática del
// producto). El receptor viene en el payload; el timbrado reutiliza el motor
// de CSFacturación (o queda en draft en modo simulación).
app.post("/api/v1/orders/:orderId/cfdi", requireApplicationAuth, async (req, res, next) => {
  try {
    const order = await findOrder({ id: req.params.orderId, applicationId: req.application.id });

    if (!order) {
      return res.status(404).json({ message: "Orden no encontrada." });
    }
    if (order.status !== "paid") {
      return res.status(422).json({ message: "Solo se pueden facturar órdenes pagadas." });
    }
    if (order.cfdiId) {
      return res.status(409).json({ message: "La orden ya tiene un CFDI vinculado.", cfdiId: order.cfdiId });
    }

    const receptorBody = sanitizePlainObject(req.body.receptor);
    const receptor = {
      rfc: sanitizeText(receptorBody.rfc).toUpperCase(),
      legalName: sanitizeText(receptorBody.legalName || receptorBody.name),
      taxRegime: sanitizeText(receptorBody.taxRegime),
      cfdiUse: sanitizeText(receptorBody.cfdiUse) || "G03",
      fiscalAddress: { postalCode: sanitizeText(receptorBody.postalCode) },
    };

    const receptorValidation = validateFiscalClient(receptor);
    if (!receptorValidation.valid) {
      return res.status(400).json({
        message: `Datos fiscales del receptor incompletos: ${receptorValidation.missing.join(", ")}.`,
      });
    }

    const state = await readBillingSatState();

    if (!state.emitter.rfc || !state.emitter.taxRegime || !state.emitter.postalCode) {
      return res.status(503).json({ message: "El emisor fiscal del hub no está configurado." });
    }

    const payload = buildCfdiPayloadForReceptor(
      {
        concept: order.concept,
        amount: order.subtotal,
        taxRate: IVA_RATE,
        cfdiUse: receptor.cfdiUse,
        paymentForm: sanitizeText(req.body.paymentForm) || "03",
        paymentMethod: "PUE",
        series: sanitizeText(req.body.series) || "A",
      },
      state,
      receptor
    );

    const { cfdi } = await stampAndStoreCfdi(state, payload, {
      clientName: receptor.legalName,
      orderId: order.id,
      businessLineId: order.businessLineId,
    });

    await saveOrder({ ...order, cfdiId: cfdi.id, updatedAt: new Date().toISOString() });

    return res.status(201).json({
      cfdi: {
        id: cfdi.id,
        folio: cfdi.folio,
        status: cfdi.status,
        uuid: cfdi.uuid,
        subtotal: cfdi.subtotal,
        tax: cfdi.tax,
        total: cfdi.total,
        environment: cfdi.environment,
      },
      message:
        cfdi.status === "issued"
          ? "CFDI timbrado por CSFacturación."
          : "CFDI preparado en modo simulación (CSFACTURACION_ENABLED desactivado).",
    });
  } catch (error) {
    error.statusCode = error.statusCode || 500;
    return next(error);
  }
});

// Descarga de documentos del CFDI de una orden (xml o pdf en base64).
app.get("/api/v1/orders/:orderId/cfdi/document/:type", requireApplicationAuth, async (req, res, next) => {
  try {
    const order = await findOrder({ id: req.params.orderId, applicationId: req.application.id });

    if (!order || !order.cfdiId) {
      return res.status(404).json({ message: "La orden no tiene CFDI." });
    }

    const state = await readBillingSatState();
    const cfdi = safeArray(state.cfdis).find((item) => item.id === order.cfdiId);

    if (!cfdi) {
      return res.status(404).json({ message: "CFDI no encontrado." });
    }

    const type = sanitizeText(req.params.type).toLowerCase();
    const contentByType = {
      xml: { base64: cfdi.xmlBase64, mime: "application/xml", extension: "xml" },
      pdf: { base64: cfdi.pdfBase64, mime: "application/pdf", extension: "pdf" },
    };
    const document = contentByType[type];

    if (!document) {
      return res.status(400).json({ message: "Tipo de documento inválido (xml o pdf)." });
    }
    if (!document.base64) {
      return res.status(409).json({ message: "El documento aún no está disponible (CFDI sin timbrar)." });
    }

    res.setHeader("Content-Type", document.mime);
    res.setHeader("Content-Disposition", `attachment; filename="cfdi-${cfdi.folio}.${document.extension}"`);
    return res.send(Buffer.from(document.base64, "base64"));
  } catch (error) {
    return next(error);
  }
});

// Webhook global de Stripe para el checkout centralizado (verificado con el
// SDK; la ruta legacy por sistema /api/webhooks/payments/stripe/:systemId
// sigue funcionando igual que antes).
app.post("/api/webhooks/stripe", async (req, res) => {
  const stripe = getStripe();

  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ message: "Stripe no está configurado en el hub." });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, req.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return res.status(400).json({ message: `Firma de Stripe inválida: ${error.message}` });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const order =
        (session.metadata?.orderId && (await findOrder({ id: session.metadata.orderId }))) ||
        (await findOrder({ stripeSessionId: session.id }));

      if (!order) {
        // Evento de una sesión que no creó el hub (p. ej. stripe trigger): se ignora.
        console.warn(`Webhook Stripe sin orden asociada (session ${session.id}).`);
        return res.json({ received: true, ignored: true });
      }

      const applications = await readApplications();
      const application = applications.find((item) => item.id === order.applicationId) || null;
      await handleOrderPaid(order, application, { paymentIntentId: session.payment_intent || "" });
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const order = await findOrder({ stripeSessionId: session.id });

      if (order && order.status === "pending") {
        await saveOrder({ ...order, status: "expired", updatedAt: new Date().toISOString() });
      }
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const orderId = charge.metadata?.orderId || "";
      const order = orderId ? await findOrder({ id: orderId }) : null;

      if (order && order.status === "paid") {
        const refundedOrder = { ...order, status: "refunded", updatedAt: new Date().toISOString() };
        await saveOrder(refundedOrder);
        const applications = await readApplications();
        const application = applications.find((item) => item.id === order.applicationId) || null;
        await notifyOrderEvent(refundedOrder, application, "order.refunded");
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("Error procesando webhook de Stripe:", error);
    return res.status(500).json({ message: "Error interno procesando el evento." });
  }
});

app.use("/api/admin", requireAdminAuth);

app.get("/api/admin/profile", (req, res) => {
  return res.json({ user: publicAdminUser(req.adminUser) });
});

app.patch("/api/admin/profile", async (req, res, next) => {
  try {
    const name = sanitizeText(req.body?.name || req.adminUser.name);
    const avatarId = sanitizeText(req.body?.avatarId || req.adminUser.metadata?.avatarId || "bot");
    const profileImage = sanitizeText(req.body?.profileImage || "");

    if (!name) {
      return res.status(400).json({ message: "El nombre es requerido." });
    }

    if (profileImage && !profileImage.startsWith("data:image/")) {
      return res.status(400).json({ message: "La foto de perfil debe ser una imagen válida." });
    }

    if (profileImage.length > 750000) {
      return res.status(400).json({ message: "La foto de perfil no debe superar 500 KB aproximadamente." });
    }

    const users = await readAdminUsers();
    const userIndex = users.findIndex((item) => item.id === req.adminUser.id);

    if (userIndex === -1) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const currentMetadata = sanitizePlainObject(users[userIndex].metadata);
    const updatedUser = {
      ...users[userIndex],
      name,
      metadata: {
        ...currentMetadata,
        avatarId,
        profileImage,
      },
      updatedAt: new Date().toISOString(),
    };

    users[userIndex] = updatedUser;
    await writeAdminUsers(users);

    return res.json({
      message: "Perfil actualizado.",
      user: publicAdminUser(updatedUser),
    });
  } catch (error) {
    return next(error);
  }
});

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

app.get("/api/admin/quotes", async (_req, res, next) => {
  try {
    const [quotes, clients] = await Promise.all([readQuotes(), readClients()]);
    return res.json({ quotes, clients });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/admin/quotes", async (req, res, next) => {
  try {
    const quotes = await readQuotes();
    const validation = validateQuotePayload(req.body);

    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const now = new Date().toISOString();
    const quote = {
      id: crypto.randomUUID(),
      ...validation.payload,
      folio: validation.payload.folio || buildQuoteFolio(quotes),
      createdBy: req.adminUser?.id || "",
      createdAt: now,
      updatedAt: now,
    };

    if (quotes.some((item) => item.folio === quote.folio)) {
      return res.status(409).json({ message: "Ya existe una cotización con ese folio." });
    }

    let emailResult = { status: "skipped", reason: "Envío no solicitado." };
    if (req.body?.sendEmail !== false) {
      if (!quote.clientEmail) {
        return res.status(400).json({ message: "Agrega el correo del cliente para enviar la cotización." });
      }

      try {
        emailResult = await sendQuoteEmail(quote);
        quote.metadata = {
          ...sanitizePlainObject(quote.metadata),
          emailStatus: emailResult.status,
          emailStatusDetail: emailResult.reason || emailResult.sentAt,
          lastEmailSentAt: emailResult.sentAt || "",
        };
        if (emailResult.status === "sent") {
          quote.status = "sent";
        }
      } catch (emailError) {
        console.error("Error enviando cotización:", emailError);
        quote.metadata = {
          ...sanitizePlainObject(quote.metadata),
          emailStatus: "failed",
          emailStatusDetail: "No se pudo enviar la cotización por correo.",
        };
      }
    }

    quotes.unshift(quote);
    await writeQuotes(quotes);

    return res.status(201).json({
      email: quote.metadata?.emailStatus || emailResult.status,
      message:
        req.body?.sendEmail === false
          ? "Cotización guardada como borrador."
          : quote.metadata?.emailStatus === "sent"
          ? "Cotización creada y enviada al cliente."
          : "Cotización creada. Revisa la configuración SMTP para el envío automático.",
      quote,
    });
  } catch (error) {
    return next(error);
  }
});

app.patch("/api/admin/quotes/:id", async (req, res, next) => {
  try {
    const quotes = await readQuotes();
    const quoteIndex = quotes.findIndex((quote) => quote.id === req.params.id);

    if (quoteIndex === -1) {
      return res.status(404).json({ message: "Cotización no encontrada." });
    }

    const validation = validateQuotePayload(req.body, quotes[quoteIndex]);

    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const updatedQuote = {
      ...quotes[quoteIndex],
      ...validation.payload,
      createdAt: quotes[quoteIndex].createdAt,
      createdBy: quotes[quoteIndex].createdBy || req.adminUser?.id || "",
    };

    if (quotes.some((quote) => quote.id !== updatedQuote.id && quote.folio === updatedQuote.folio)) {
      return res.status(409).json({ message: "Ya existe una cotización con ese folio." });
    }

    if (req.body?.sendEmail === true) {
      if (!updatedQuote.clientEmail) {
        return res.status(400).json({ message: "Agrega el correo del cliente para enviar la cotización." });
      }

      try {
        const emailResult = await sendQuoteEmail(updatedQuote);
        updatedQuote.metadata = {
          ...sanitizePlainObject(updatedQuote.metadata),
          emailStatus: emailResult.status,
          emailStatusDetail: emailResult.reason || emailResult.sentAt,
          lastEmailSentAt: emailResult.sentAt || "",
        };
        if (emailResult.status === "sent") {
          updatedQuote.status = "sent";
        }
      } catch (emailError) {
        console.error("Error enviando cotización:", emailError);
        updatedQuote.metadata = {
          ...sanitizePlainObject(updatedQuote.metadata),
          emailStatus: "failed",
          emailStatusDetail: "No se pudo enviar la cotización por correo.",
        };
      }
    }

    quotes[quoteIndex] = updatedQuote;
    await writeQuotes(quotes);

    return res.json({
      message:
        req.body?.sendEmail === false
          ? "Cotización guardada como borrador."
          : updatedQuote.metadata?.emailStatus === "sent"
          ? "Cotización actualizada y enviada al cliente."
          : "Cotización actualizada. Revisa la configuración SMTP para el envío automático.",
      quote: updatedQuote,
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/admin/quotes/:id/pdf", async (req, res, next) => {
  try {
    const quotes = await readQuotes();
    const quote = quotes.find((item) => item.id === req.params.id);

    if (!quote) {
      return res.status(404).json({ message: "Cotización no encontrada." });
    }

    const pdfBuffer = await createQuotePdf(quote);
    const dispositionType = req.query.download === "1" ? "attachment" : "inline";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${dispositionType}; filename="${quote.folio}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    return next(error);
  }
});

app.post("/api/admin/quotes/:id/send", async (req, res, next) => {
  try {
    const quotes = await readQuotes();
    const quoteIndex = quotes.findIndex((quote) => quote.id === req.params.id);

    if (quoteIndex === -1) {
      return res.status(404).json({ message: "Cotización no encontrada." });
    }

    const quote = quotes[quoteIndex];
    const emailResult = await sendQuoteEmail(quote);
    const updatedQuote = {
      ...quote,
      status: emailResult.status === "sent" ? "sent" : quote.status,
      metadata: {
        ...sanitizePlainObject(quote.metadata),
        emailStatus: emailResult.status,
        emailStatusDetail: emailResult.reason || emailResult.sentAt,
        lastEmailSentAt: emailResult.sentAt || "",
      },
      updatedAt: new Date().toISOString(),
    };

    quotes[quoteIndex] = updatedQuote;
    await writeQuotes(quotes);

    return res.json({
      message: emailResult.status === "sent" ? "Cotización enviada al cliente." : "No se pudo enviar la cotización.",
      quote: updatedQuote,
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/admin/payments/engine", async (_req, res, next) => {
  try {
    const [state, applications, clients] = await Promise.all([readPaymentEngineState(), readApplications(), readClients()]);
    const connectedSystems = safeArray(state.connectedSystems);
    const webhookEvents = safeArray(state.webhookEvents);
    const metrics = {
      total: webhookEvents.length,
      systems: connectedSystems.length,
      payments: connectedSystems.reduce((total, system) => total + Number(system.metrics?.payments || 0), 0),
      subscriptions: connectedSystems.reduce((total, system) => total + Number(system.metrics?.subscriptions || 0), 0),
      revenue: connectedSystems.reduce((total, system) => total + Number(system.metrics?.revenue || 0), 0),
    };

    return res.json({
      ...publicPaymentEngineState(state),
      applications: applications.map(publicConnectedApplication),
      clients,
      metrics,
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/admin/payments/engine/systems", async (req, res, next) => {
  try {
    const state = await readPaymentEngineState();
    const applications = await readApplications();
    const application = applications.find((item) => item.id === req.body.applicationId);
    const existingSystems = safeArray(state.connectedSystems);
    const system = {
      id: crypto.randomUUID(),
      applicationId: sanitizeText(req.body.applicationId),
      connectedAccountId: sanitizeText(req.body.connectedAccountId),
      name: sanitizeText(req.body.name) || application?.name || "Sistema GiovSoft",
      domain: sanitizeText(req.body.domain) || application?.domain || "",
      status: sanitizeText(req.body.status) || "active",
      flow: sanitizeText(req.body.flow) || "checkout-subscriptions-connect",
      provider: state.provider.name,
      connectMode: sanitizeText(req.body.connectMode) || state.provider.connectMode,
      webhookMode: sanitizeText(req.body.webhookMode) || "stripe-and-internal",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!system.applicationId || !application) {
      return res.status(400).json({ message: "Selecciona una aplicacion registrada para conectar el sistema de pagos." });
    }

    if (existingSystems.some((item) => item.applicationId && item.applicationId === system.applicationId)) {
      return res.status(409).json({ message: "Ese sistema ya esta conectado al motor de pagos." });
    }

    const updated = await writePaymentEngineState({ ...state, connectedSystems: [system, ...existingSystems] });
    return res.status(201).json({
      message: "Sistema conectado al motor de pagos.",
      ...publicPaymentEngineState(updated),
      applications: applications.map(publicConnectedApplication),
    });
  } catch (error) {
    return next(error);
  }
});

app.put("/api/admin/payments/engine/provider", async (req, res, next) => {
  try {
    const state = await readPaymentEngineState();
    const provider = {
      ...state.provider,
      environment: sanitizeText(req.body.environment) === "live" ? "live" : "test",
      publishableKey: sanitizeText(req.body.publishableKey),
      secretName: sanitizeText(req.body.secretName) || state.provider.secretName,
      webhookSecretName: sanitizeText(req.body.webhookSecretName) || state.provider.webhookSecretName,
      connectMode: sanitizeText(req.body.connectMode) || "express",
      configured: Boolean(sanitizeText(req.body.publishableKey) && process.env.STRIPE_SECRET_KEY),
      lastVerifiedAt: new Date().toISOString(),
    };
    const updated = await writePaymentEngineState({ ...state, provider });

    return res.json({ message: "Proveedor de pagos actualizado.", ...publicPaymentEngineState(updated) });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/admin/billing/sat", async (_req, res, next) => {
  try {
    const [state, clients, applications] = await Promise.all([readBillingSatState(), readClients(), readApplications()]);
    const cfdis = safeArray(state.cfdis);
    const connectedSystems = safeArray(state.connectedSystems);
    const metrics = {
      total: cfdis.length,
      issued: cfdis.filter((item) => item.status === "issued").length,
      cancelled: cfdis.filter((item) => item.status === "cancelled").length,
      pending: cfdis.filter((item) => item.status === "draft" || item.status === "pending").length,
      systems: connectedSystems.length,
    };

    return res.json({ ...publicBillingSatState(state), applications: applications.map(publicConnectedApplication), clients, metrics });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/admin/billing/sat/systems", async (req, res, next) => {
  try {
    const state = await readBillingSatState();
    const applications = await readApplications();
    const application = applications.find((item) => item.id === req.body.applicationId);
    const existingSystems = safeArray(state.connectedSystems);
    const system = {
      id: crypto.randomUUID(),
      applicationId: sanitizeText(req.body.applicationId),
      name: sanitizeText(req.body.name) || application?.name || "Sistema GiovSoft",
      domain: sanitizeText(req.body.domain) || application?.domain || "",
      status: sanitizeText(req.body.status) || "active",
      flow: sanitizeText(req.body.flow) || "payments-invoices-subscriptions",
      provider: state.provider.name,
      presentationProfile: sanitizeText(req.body.presentationProfile) || "giovsoft-standard",
      webhookMode: sanitizeText(req.body.webhookMode) || "outbound",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!system.applicationId || !application) {
      return res.status(400).json({ message: "Selecciona una aplicacion registrada para conectar el sistema." });
    }

    if (existingSystems.some((item) => item.applicationId && item.applicationId === system.applicationId)) {
      return res.status(409).json({ message: "Ese sistema ya esta conectado al motor de facturacion." });
    }

    const updated = await writeBillingSatState({ ...state, connectedSystems: [system, ...existingSystems] });
    return res.status(201).json({
      message: "Sistema conectado al motor de facturacion.",
      ...publicBillingSatState(updated),
      applications: applications.map(publicConnectedApplication),
    });
  } catch (error) {
    return next(error);
  }
});

app.put("/api/admin/billing/sat/provider", async (req, res, next) => {
  try {
    const state = await readBillingSatState();
    const provider = {
      ...state.provider,
      environment: sanitizeText(req.body.environment) === "production" ? "production" : "demo",
      username: sanitizeText(req.body.username),
      secretName: sanitizeText(req.body.secretName) || state.provider.secretName,
      demoEndpoint: sanitizeText(req.body.demoEndpoint) || state.provider.demoEndpoint,
      productionEndpoint: sanitizeText(req.body.productionEndpoint) || state.provider.productionEndpoint,
      demoCancelEndpoint: sanitizeText(req.body.demoCancelEndpoint) || state.provider.demoCancelEndpoint,
      productionCancelEndpoint: sanitizeText(req.body.productionCancelEndpoint) || state.provider.productionCancelEndpoint,
      configured: Boolean(sanitizeText(req.body.username) && (process.env.CSFACTURACION_PASSWORD || process.env.CSFACTURACION_PASS)),
      lastVerifiedAt: new Date().toISOString(),
    };
    const updated = await writeBillingSatState({ ...state, provider });

    return res.json({ message: "Proveedor SAT actualizado.", ...publicBillingSatState(updated) });
  } catch (error) {
    return next(error);
  }
});

app.put("/api/admin/billing/sat/emitter", async (req, res, next) => {
  try {
    const state = await readBillingSatState();
    const emitter = {
      ...state.emitter,
      legalName: sanitizeText(req.body.legalName) || giovsoftLegalName,
      rfc: sanitizeText(req.body.rfc).toUpperCase(),
      taxRegime: sanitizeText(req.body.taxRegime),
      postalCode: sanitizeText(req.body.postalCode),
      certificateStatus: sanitizeText(req.body.certificateStatus) || state.emitter.certificateStatus,
    };
    const updated = await writeBillingSatState({ ...state, emitter });

    return res.json({ message: "Datos fiscales del emisor actualizados.", ...publicBillingSatState(updated) });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/admin/billing/sat/series", async (req, res, next) => {
  try {
    const state = await readBillingSatState();
    const serie = {
      id: crypto.randomUUID(),
      company: sanitizeText(req.body.company),
      serie: sanitizeText(req.body.serie).toUpperCase(),
      nextFolio: Number(req.body.nextFolio || 1),
      documentType: sanitizeText(req.body.documentType) || "Ingreso",
      status: sanitizeText(req.body.status) || "active",
      createdAt: new Date().toISOString(),
    };

    if (!serie.company || !serie.serie) {
      return res.status(400).json({ message: "Empresa y serie son requeridas." });
    }

    const updated = await writeBillingSatState({ ...state, series: [serie, ...safeArray(state.series)] });
    return res.status(201).json({ message: "Serie agregada.", ...publicBillingSatState(updated) });
  } catch (error) {
    return next(error);
  }
});

app.patch("/api/admin/billing/sat/series/:id", async (req, res, next) => {
  try {
    const state = await readBillingSatState();
    const series = safeArray(state.series);
    const index = series.findIndex((item) => item.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ message: "Serie no encontrada." });
    }

    series[index] = {
      ...series[index],
      company: sanitizeText(req.body.company ?? series[index].company),
      serie: sanitizeText(req.body.serie ?? series[index].serie).toUpperCase(),
      nextFolio: Number(req.body.nextFolio ?? series[index].nextFolio ?? 1),
      documentType: sanitizeText(req.body.documentType ?? series[index].documentType),
      status: sanitizeText(req.body.status ?? series[index].status),
      updatedAt: new Date().toISOString(),
    };

    const updated = await writeBillingSatState({ ...state, series });
    return res.json({ message: "Serie actualizada.", ...publicBillingSatState(updated) });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/admin/billing/sat/validate-client", async (req, res, next) => {
  try {
    const clients = await readClients();
    const client = clients.find((item) => item.id === req.body.clientId);

    if (!client) {
      return res.status(404).json({ message: "Cliente no encontrado." });
    }

    const validation = validateFiscalClient(client);
    return res.json({
      client,
      message: validation.valid ? "Cliente fiscalmente listo para CFDI." : `Faltan datos: ${validation.missing.join(", ")}.`,
      ...validation,
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/admin/billing/sat/issue", async (req, res, next) => {
  try {
    const [state, clients] = await Promise.all([readBillingSatState(), readClients()]);
    const client = clients.find((item) => item.id === req.body.clientId);

    if (!client) {
      return res.status(404).json({ message: "Cliente no encontrado." });
    }

    const clientValidation = validateFiscalClient(client);
    if (!clientValidation.valid) {
      return res.status(400).json({ message: `El cliente no tiene datos fiscales completos: ${clientValidation.missing.join(", ")}.` });
    }

    if (!state.emitter.rfc || !state.emitter.taxRegime || !state.emitter.postalCode) {
      return res.status(400).json({ message: "Completa los datos fiscales del emisor antes de emitir CFDI." });
    }

    const payload = buildCfdiPayload(req.body, state, clients);
    const orderId = sanitizeText(req.body.orderId);
    let order = null;

    if (orderId) {
      order = await findOrder({ id: orderId });

      if (!order) {
        return res.status(404).json({ message: "La orden indicada no existe." });
      }
      if (order.cfdiId) {
        return res.status(409).json({ message: "La orden ya tiene un CFDI vinculado." });
      }
    }

    const { cfdi, updatedState: updated } = await stampAndStoreCfdi(state, payload, {
      clientId: client.id,
      clientName: client.legalName || client.businessName,
      orderId,
      businessLineId: order?.businessLineId || "",
    });

    if (order) {
      await saveOrder({ ...order, cfdiId: cfdi.id, updatedAt: new Date().toISOString() });
    }

    return res.status(201).json({
      cfdi,
      message: cfdi.status === "issued" ? "CFDI emitido por CSFacturación." : "CFDI preparado en modo simulación. Activa CSFACTURACION_ENABLED para timbrar.",
      ...publicBillingSatState(updated),
    });
  } catch (error) {
    error.statusCode = error.statusCode || 500;
    return next(error);
  }
});

app.post("/api/admin/billing/sat/:id/cancel", async (req, res, next) => {
  try {
    const state = await readBillingSatState();
    const cfdis = safeArray(state.cfdis);
    const index = cfdis.findIndex((item) => item.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ message: "CFDI no encontrado." });
    }

    const cfdi = cfdis[index];
    const credentials = {
      username: state.provider.username || process.env.CSFACTURACION_USERNAME || process.env.CSFACTURACION_USER,
      password: process.env.CSFACTURACION_PASSWORD || process.env.CSFACTURACION_PASS,
    };
    let providerResponse = {};

    if (process.env.CSFACTURACION_ENABLED === "true" && cfdi.uuid && credentials.username && credentials.password) {
      const endpoints = buildCsFacturacionEndpoints(state.provider);
      providerResponse = await callCsFacturacion(endpoints.cancel, credentials, {
        motivo: sanitizeText(req.body.motive) || "02",
        uuid: cfdi.uuid,
      });
    }

    cfdis[index] = {
      ...cfdi,
      cancelMotive: sanitizeText(req.body.motive) || "02",
      cancelledAt: new Date().toISOString(),
      providerResponse: { ...sanitizePlainObject(cfdi.providerResponse), cancellation: providerResponse },
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    };
    const updated = await writeBillingSatState({ ...state, cfdis });

    return res.json({ cfdi: cfdis[index], message: "CFDI cancelado.", ...publicBillingSatState(updated) });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/admin/billing/sat/:id/document/:type", async (req, res, next) => {
  try {
    const state = await readBillingSatState();
    const cfdi = safeArray(state.cfdis).find((item) => item.id === req.params.id);
    const type = sanitizeText(req.params.type).toLowerCase();
    const fieldByType = {
      pdf: "pdfBase64",
      qr: "qrBase64",
      xml: "xmlBase64",
    };
    const field = fieldByType[type];

    if (!cfdi || !field) {
      return res.status(404).json({ message: "Documento CFDI no encontrado." });
    }

    const base64Document = cfdi[field];
    if (!base64Document) {
      return res.status(404).json({ message: "El proveedor aun no devolvio ese documento." });
    }

    const mimeByType = {
      pdf: "application/pdf",
      qr: "image/png",
      xml: "application/xml",
    };
    const extension = type === "qr" ? "png" : type;
    const buffer = Buffer.from(base64Document, "base64");

    res.setHeader("Content-Type", mimeByType[type]);
    res.setHeader("Content-Disposition", `inline; filename="${cfdi.folio}.${extension}"`);
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
});

app.post("/api/admin/billing/sat/catalogs/sync", async (_req, res, next) => {
  try {
    const state = await readBillingSatState();
    const updated = await writeBillingSatState({
      ...state,
      catalogs: {
        ...state.catalogs,
        status: "synced",
        lastSyncAt: new Date().toISOString(),
      },
    });

    return res.json({ message: "Catálogos SAT sincronizados.", ...publicBillingSatState(updated) });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/admin/applications", async (_req, res, next) => {
  try {
    const applications = await readApplications();
    return res.json({ applications });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/admin/applications", async (req, res, next) => {
  try {
    const validation = validateApplicationPayload(req.body);

    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const applications = await readApplications();
    const now = new Date().toISOString();
    const application = {
      id: crypto.randomUUID(),
      ...validation.payload,
      createdAt: now,
      lastSync: "",
      metrics: { events: 0, invoices: 0, payments: 0, revenue: 0, sales: 0, users: 0 },
      updatedAt: now,
    };

    applications.unshift(application);
    await writeApplications(applications);

    return res.status(201).json({ application, message: "Aplicación conectada creada." });
  } catch (error) {
    return next(error);
  }
});

app.patch("/api/admin/applications/:id", async (req, res, next) => {
  try {
    const applications = await readApplications();
    const applicationIndex = applications.findIndex((application) => application.id === req.params.id);

    if (applicationIndex === -1) {
      return res.status(404).json({ message: "Aplicación no encontrada." });
    }

    const validation = validateApplicationPayload(req.body, applications[applicationIndex]);

    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const updatedApplication = {
      ...applications[applicationIndex],
      ...validation.payload,
      createdAt: applications[applicationIndex].createdAt,
      metrics: applications[applicationIndex].metrics,
    };

    applications[applicationIndex] = updatedApplication;
    await writeApplications(applications);

    return res.json({ application: updatedApplication, message: "Aplicación actualizada." });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/admin/business-lines", async (_req, res, next) => {
  try {
    const [businessLines, applications] = await Promise.all([readBusinessLines(), readApplications()]);

    // Roll-up por línea a partir de las métricas de sus aplicaciones.
    const withMetrics = businessLines.map((line) => {
      const lineApps = applications.filter((application) => application.businessLineId === line.id);
      return {
        ...line,
        metrics: {
          applications: lineApps.length,
          events: lineApps.reduce((total, app) => total + Number(app.metrics?.events || 0), 0),
          payments: lineApps.reduce((total, app) => total + Number(app.metrics?.payments || 0), 0),
          revenue: lineApps.reduce((total, app) => total + Number(app.metrics?.revenue || 0), 0),
        },
        applications: lineApps.map((app) => ({ id: app.id, name: app.name, status: app.status })),
      };
    });

    return res.json({ businessLines: withMetrics });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/admin/business-lines", async (req, res, next) => {
  try {
    const name = sanitizeText(req.body.name);
    const slug = sanitizeText(req.body.slug).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");

    if (!name) {
      return res.status(400).json({ message: "El nombre de la línea de negocio es requerido." });
    }

    if (!slug) {
      return res.status(400).json({ message: "El identificador (slug) es requerido." });
    }

    const businessLines = await readBusinessLines();

    if (businessLines.some((line) => line.slug === slug)) {
      return res.status(409).json({ message: "Ya existe una línea de negocio con ese identificador." });
    }

    const now = new Date().toISOString();
    const businessLine = {
      id: crypto.randomUUID(),
      slug,
      name,
      description: sanitizeText(req.body.description),
      color: sanitizeText(req.body.color),
      icon: sanitizeText(req.body.icon),
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    businessLines.push(businessLine);
    await writeBusinessLines(businessLines);

    return res.status(201).json({ businessLine, message: "Línea de negocio creada." });
  } catch (error) {
    return next(error);
  }
});

app.patch("/api/admin/business-lines/:id", async (req, res, next) => {
  try {
    const businessLines = await readBusinessLines();
    const lineIndex = businessLines.findIndex((line) => line.id === req.params.id);

    if (lineIndex === -1) {
      return res.status(404).json({ message: "Línea de negocio no encontrada." });
    }

    const current = businessLines[lineIndex];
    const status = sanitizeText(req.body.status || current.status);

    if (!["active", "archived"].includes(status)) {
      return res.status(400).json({ message: "Estado inválido (active o archived)." });
    }

    // El slug es inmutable: las órdenes y aplicaciones lo referencian por id,
    // pero los enlaces del panel usan el slug.
    const updated = {
      ...current,
      name: sanitizeText(req.body.name || current.name),
      description: req.body.description !== undefined ? sanitizeText(req.body.description) : current.description,
      color: req.body.color !== undefined ? sanitizeText(req.body.color) : current.color,
      icon: req.body.icon !== undefined ? sanitizeText(req.body.icon) : current.icon,
      status,
      updatedAt: new Date().toISOString(),
    };

    businessLines[lineIndex] = updated;
    await writeBusinessLines(businessLines);

    return res.json({ businessLine: updated, message: "Línea de negocio actualizada." });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/admin/orders", async (req, res, next) => {
  try {
    const { orders, total } = await listOrders({
      applicationId: sanitizeText(req.query.applicationId),
      businessLineId: sanitizeText(req.query.businessLineId),
      status: sanitizeText(req.query.status),
      uninvoiced: req.query.uninvoiced === "1",
      from: sanitizeText(req.query.from),
      to: sanitizeText(req.query.to),
      search: sanitizeText(req.query.q),
      limit: req.query.limit,
      offset: req.query.offset,
    });

    return res.json({ orders, total });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/admin/orders/:id", async (req, res, next) => {
  try {
    const order = await findOrder({ id: req.params.id });

    if (!order) {
      return res.status(404).json({ message: "Orden no encontrada." });
    }

    const deliveries = await listDeliveries({ orderId: order.id });
    return res.json({ order, deliveries });
  } catch (error) {
    return next(error);
  }
});

// Reintento manual de una entrega saliente (delivered no se reintenta).
app.post("/api/admin/orders/:id/deliveries/:deliveryId/retry", async (req, res, next) => {
  try {
    const [delivery] = await listDeliveries({ id: req.params.deliveryId });

    if (!delivery || delivery.orderId !== req.params.id) {
      return res.status(404).json({ message: "Entrega no encontrada." });
    }

    if (delivery.status === "delivered") {
      return res.status(409).json({ message: "La entrega ya fue exitosa." });
    }

    const applications = await readApplications();
    const application = applications.find((item) => item.id === delivery.applicationId);

    if (!application) {
      return res.status(404).json({ message: "La aplicación de la entrega ya no existe." });
    }

    const delivered = await attemptDelivery({ ...delivery, status: "pending" }, application);
    const [updated] = await listDeliveries({ id: delivery.id });

    return res.json({
      delivery: updated,
      message: delivered ? "Entrega reenviada con éxito." : "El reintento falló; se reprogramó según el backoff.",
    });
  } catch (error) {
    return next(error);
  }
});

// Confirmación manual (modo simulación sin Stripe, o conciliación).
app.post("/api/admin/orders/:id/mark-paid", async (req, res, next) => {
  try {
    const order = await findOrder({ id: req.params.id });

    if (!order) {
      return res.status(404).json({ message: "Orden no encontrada." });
    }

    if (order.status === "paid") {
      return res.status(409).json({ message: "La orden ya está pagada." });
    }

    if (!["pending", "failed", "expired"].includes(order.status)) {
      return res.status(400).json({ message: `No se puede marcar como pagada una orden en estado ${order.status}.` });
    }

    const applications = await readApplications();
    const application = applications.find((item) => item.id === order.applicationId) || null;
    const paidOrder = await handleOrderPaid(order, application, {});
    console.log(`[admin] orden ${paidOrder.id} marcada como pagada (${paidOrder.concept}, $${paidOrder.amount}).`);

    return res.json({ order: paidOrder, message: "Orden marcada como pagada." });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/admin/sales/summary", async (req, res, next) => {
  try {
    const summary = await buildSalesSummary({
      businessLineId: sanitizeText(req.query.businessLineId),
      months: req.query.months,
    });

    return res.json(summary);
  } catch (error) {
    return next(error);
  }
});

app.post("/api/admin/applications/:id/api-key", async (req, res, next) => {
  try {
    const applications = await readApplications();
    const applicationIndex = applications.findIndex((application) => application.id === req.params.id);

    if (applicationIndex === -1) {
      return res.status(404).json({ message: "Aplicación no encontrada." });
    }

    const apiKey = createApplicationApiKey();
    applications[applicationIndex] = {
      ...applications[applicationIndex],
      apiKey,
      updatedAt: new Date().toISOString(),
    };
    await writeApplications(applications);

    return res.json({ apiKey, message: "API key regenerada. Guárdala: no se volverá a mostrar completa." });
  } catch (error) {
    return next(error);
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
      revenue: (await buildSalesSummary({ months: 6 }).catch(() => null)) || undefined,
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
  const statusCode = Number(err.statusCode || 500);
  res.status(statusCode).json({
    details: err.details || undefined,
    message: statusCode >= 500 ? "Error interno del servidor." : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`GiovSoft API escuchando en http://localhost:${PORT}`);
});
