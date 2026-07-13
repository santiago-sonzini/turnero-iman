import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import whatsappWeb from "whatsapp-web.js";

const { Client, LocalAuth } = whatsappWeb;

const PORT = Number(process.env.WA_PORT || 8321);
const HOST = process.env.WA_HOST || "127.0.0.1";
const TOKEN = process.env.WA_SERVER_TOKEN || "";
const CORE_URL = process.env.IMAN_CORE_URL || "http://localhost:3000";
const SESSION_ROOT = process.env.WA_SESSION_ROOT || path.resolve("sessions");
const MIN_GAP = Number(process.env.WA_MIN_GAP_MS || 25_000);
const MAX_GAP = Number(process.env.WA_MAX_GAP_MS || 70_000);
const clients = new Map();
const starting = new Map();
let stopped = false;

await fs.mkdir(SESSION_ROOT, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const spacing = () => MIN_GAP + Math.floor(Math.random() * Math.max(1, MAX_GAP - MIN_GAP));
const validTenantId = (value) => typeof value === "string" && /^[A-Za-z0-9_-]{3,100}$/.test(value);
const normalizePhone = (value) => {
  let digits = String(value || "").replace(/\D/g, "").replace(/^00/, "");
  if (digits.startsWith("54")) digits = digits.slice(2);
  digits = digits.replace(/^0+/, "");
  if (digits.length === 12) {
    for (let areaLength = 2; areaLength <= 4; areaLength += 1) {
      if (digits.slice(areaLength, areaLength + 2) === "15") {
        digits = digits.slice(0, areaLength) + digits.slice(areaLength + 2);
        break;
      }
    }
  }
  if (digits.startsWith("9") && digits.length === 11) return `54${digits}`;
  return digits.length === 10 ? `549${digits}` : `54${digits}`;
};

async function core(method, pathName, body) {
  const response = await fetch(`${CORE_URL}${pathName}`, {
    method, headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`core ${response.status}: ${await response.text()}`);
  return response.json();
}

async function report(tenantId, health, extra = {}) {
  try { await core("PATCH", "/api/whatsapp/worker", { tenantId, health, ...extra }); }
  catch (error) { console.error("[worker] no se pudo reportar salud", error); }
}

async function session(tenantId) {
  if (!validTenantId(tenantId)) throw new Error("tenantId inválido");
  if (clients.has(tenantId)) return clients.get(tenantId);
  if (starting.has(tenantId)) return starting.get(tenantId);
  const promise = new Promise((resolve, reject) => {
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: tenantId, dataPath: SESSION_ROOT }),
      puppeteer: {
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
    });
    let attempts = 0;

    client.on("qr", async (qr) => {
      attempts += 1;
      try {
        const qrCode = await QRCode.toDataURL(qr, { width: 440, margin: 1 });
        await report(tenantId, "QR_PENDING", { qrCode, attempts });
      } catch (error) {
        await report(tenantId, "DEGRADED", { lastError: String(error) });
      }
    });
    client.once("ready", async () => {
      clients.set(tenantId, client);
      starting.delete(tenantId);
      await report(tenantId, "CONNECTED", { qrCode: null, lastSeenAt: new Date().toISOString() });
      resolve(client);
    });
    client.once("auth_failure", async (message) => {
      starting.delete(tenantId);
      await report(tenantId, "DEGRADED", { lastError: String(message) });
      reject(new Error(String(message)));
    });
    client.on("disconnected", async (reason) => {
      clients.delete(tenantId);
      starting.delete(tenantId);
      await report(tenantId, /ban|blocked/i.test(String(reason)) ? "BANNED" : "DEGRADED", { lastError: String(reason) });
      await client.destroy().catch(() => {});
    });
    client.initialize().catch(async (error) => {
      starting.delete(tenantId);
      await report(tenantId, /ban|blocked/i.test(String(error)) ? "BANNED" : "DEGRADED", { lastError: String(error) });
      reject(error);
    });
  });
  starting.set(tenantId, promise);
  return promise;
}

async function processQueue() {
  while (!stopped) {
    try {
      const { jobs = [] } = await core("GET", "/api/whatsapp/worker");
      for (const job of jobs) {
        try {
          const client = await session(job.tenantId);
          const number = normalizePhone(job.phone);
          await client.sendMessage(`${number}@c.us`, job.body);
          await core("PATCH", "/api/whatsapp/worker", { tenantId: job.tenantId, jobId: job.id, result: "SENT" });
        } catch (error) {
          await core("PATCH", "/api/whatsapp/worker", { tenantId: job.tenantId, jobId: job.id, result: "FAILED", error: String(error) }).catch(()=>{});
        }
        await sleep(spacing());
      }
    } catch (error) { console.error("[worker] cola no disponible", error); }
    await sleep(5_000);
  }
}

function authorized(req) { return !!TOKEN && req.headers.authorization === `Bearer ${TOKEN}`; }
const json = (res, status, data) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(data)); };
const server = http.createServer(async (req, res) => {
  if (!authorized(req)) return json(res, 401, { error: "unauthorized" });
  if (req.method === "GET" && req.url === "/health") return json(res, 200, { ok: true, sessions: clients.size });
  if (req.method === "POST" && req.url === "/link") {
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 65_536) return json(res, 413, { error: "body demasiado grande" });
    }
    let body;
    try { body = JSON.parse(raw || "{}"); }
    catch { return json(res, 400, { error: "JSON inválido" }); }
    const { tenantId } = body;
    if (!validTenantId(tenantId)) return json(res, 400, { error: "tenantId inválido" });
    session(tenantId).catch(()=>{});
    return json(res, 202, { ok: true });
  }
  return json(res, 404, { error: "not found" });
});

server.listen(PORT, HOST, () => console.log(`[worker] Imán Turnos Auto en ${HOST}:${PORT}`));
processQueue();
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, async () => { stopped = true; for (const client of clients.values()) await client.destroy().catch(()=>{}); process.exit(0); });
