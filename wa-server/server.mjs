// ─────────────────────────────────────────────────────────────────────────────
// Servidor OPCIONAL de WhatsApp para Imán, con Baileys (protocolo por WebSocket).
//
// ¿Por qué Baileys y no open-wa? open-wa maneja un Chromium headless y "scrapea"
// WhatsApp Web; cuando WhatsApp cambia su interfaz, se rompe (timeouts al buscar
// el QR). Baileys habla el protocolo directo: no necesita navegador, arranca
// liviano y genera el QR de una. Más estable para un proceso que tiene que
// quedar prendido.
//
// ⚠️ NO puede ser serverless: mantiene una sesión de WhatsApp viva. Corre en una
// VPS chica, una Mac/PC prendida o un contenedor long-running. La app Next NO lo
// necesita: sin este servidor, todo sale por links wa.me. Con él corriendo y
// WA_SERVER_URL configurada en la app, aparece "Enviar ahora".
//
// Cómo levantarlo:
//   cd wa-server
//   npm install          (rápido, sin Chromium)
//   npm start            (abrí http://localhost:8321/qr y escaneá el QR con el
//                         WhatsApp del negocio → Dispositivos vinculados.
//                         También sale en la terminal.)
//
// Variables de entorno:
//   WA_PORT          puerto HTTP (default 8321)
//   WA_SERVER_TOKEN  si se setea, /estado y /enviar piden Authorization: Bearer
//                    (mismo valor que WA_SERVER_TOKEN en el .env de la app Next)
//
// La sesión se guarda en wa-server/auth/ (borrala para desvincular).
//
// Endpoints:
//   GET  /qr      página HTML con el QR para escanear (sin token)
//   GET  /estado  → { conectado: boolean }
//   POST /enviar  → { telefono: "549...", mensaje, imagenUrl? }
// ─────────────────────────────────────────────────────────────────────────────
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pino from "pino";
import QRCode from "qrcode";
import * as Baileys from "@whiskeysockets/baileys";

const makeWASocket = Baileys.makeWASocket || Baileys.default;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = Baileys;

const PORT = Number(process.env.WA_PORT || 8321);
const TOKEN = process.env.WA_SERVER_TOKEN || "";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(__dirname, "auth");

let sock = null;
let conectado = false;
let ultimoQR = null; // data URL del QR más reciente

async function iniciar() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    browser: ["Imán", "Chrome", "1.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (u) => {
    const { connection, lastDisconnect, qr } = u;

    if (qr) {
      ultimoQR = await QRCode.toDataURL(qr).catch(() => null);
      // También en la terminal, por comodidad
      QRCode.toString(qr, { type: "terminal", small: true })
        .then((t) => console.log("\nEscaneá este QR (o abrí /qr en el navegador):\n" + t))
        .catch(() => {});
    }

    if (connection === "open") {
      conectado = true;
      ultimoQR = null;
      console.log("✅ WhatsApp conectado. Listo para enviar.");
    }

    if (connection === "close") {
      conectado = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log("Sesión cerrada. Borrá wa-server/auth/ y reiniciá para vincular de nuevo.");
      } else {
        console.log("Conexión caída, reintentando…");
        setTimeout(iniciar, 2000);
      }
    }
  });
}

iniciar().catch((err) => console.error("No se pudo iniciar la sesión de WhatsApp:", err));

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function autorizado(req) {
  if (!TOKEN) return true;
  return req.headers.authorization === `Bearer ${TOKEN}`;
}

const server = http.createServer(async (req, res) => {
  // /qr: página de vinculación para escanear desde el navegador (sin token: es
  // local y solo muestra el QR de emparejamiento).
  if (req.method === "GET" && (req.url === "/qr" || req.url === "/")) {
    const cuerpo = conectado
      ? `<h1>✅ WhatsApp ya está conectado</h1><p>Podés cerrar esta pestaña.</p>`
      : ultimoQR
        ? `<h1>Escaneá este QR</h1>
           <p>WhatsApp → Dispositivos vinculados → Vincular un dispositivo.</p>
           <img src="${ultimoQR}" alt="QR" style="width:min(80vw,320px);height:auto"/>
           <p style="color:#6f665a">La página se refresca sola.</p>`
        : `<h1>Generando el QR…</h1><p>Esperá unos segundos y refrescá.</p>`;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><meta charset="utf-8"/><meta http-equiv="refresh" content="3"/>
      <title>Vincular WhatsApp — Imán</title>
      <body style="font-family:-apple-system,'Segoe UI',Roboto,sans-serif;background:#faf6ef;color:#221d16;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px;gap:8px">
      ${cuerpo}</body>`);
    return;
  }

  if (!autorizado(req)) return json(res, 401, { error: "Token inválido" });

  if (req.method === "GET" && req.url === "/estado") {
    return json(res, 200, { conectado });
  }

  if (req.method === "POST" && req.url === "/enviar") {
    if (!conectado || !sock) {
      return json(res, 503, {
        error: ultimoQR
          ? "Todavía sin vincular: abrí /qr y escaneá el código."
          : "Sesión de WhatsApp no disponible.",
      });
    }

    let body = "";
    for await (const chunk of req) body += chunk;

    try {
      const { telefono, mensaje, imagenUrl } = JSON.parse(body || "{}");
      const digitos = String(telefono ?? "").replace(/\D/g, "");
      if (!digitos || !mensaje) {
        return json(res, 400, { error: "Faltan telefono o mensaje" });
      }
      const jid = `${digitos}@s.whatsapp.net`;

      if (imagenUrl) {
        await sock.sendMessage(jid, { image: { url: imagenUrl }, caption: mensaje });
      } else {
        await sock.sendMessage(jid, { text: mensaje });
      }
      console.log(`→ enviado a ${digitos}${imagenUrl ? " (con imagen)" : ""}`);
      return json(res, 200, { ok: true });
    } catch (err) {
      console.error("Error enviando:", err);
      return json(res, 500, { error: String(err?.message ?? err) });
    }
  }

  json(res, 404, { error: "No existe" });
});

server.listen(PORT, () => {
  console.log(`Servidor WhatsApp de Imán en http://localhost:${PORT}`);
  console.log(`📱 Escaneá el QR desde el navegador: http://localhost:${PORT}/qr`);
  console.log(TOKEN ? "Auth: token requerido" : "Auth: sin token (solo red local)");
});
