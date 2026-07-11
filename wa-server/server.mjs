import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { create } from "@open-wa/wa-automate";

const PORT = Number(process.env.WA_PORT || 8321);
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

async function core(method, pathName, body) {
  const response = await fetch(`${CORE_URL}${pathName}`, {
    method, headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`core ${response.status}: ${await response.text()}`);
  return response.json();
}

async function report(tenantId, health, extra = {}) {
  try { await core("PATCH", "/api/whatsapp/worker", { tenantId, health, ...extra }); }
  catch (error) { console.error("[worker] no se pudo reportar salud", error); }
}

async function session(tenantId) {
  if (clients.has(tenantId)) return clients.get(tenantId);
  if (starting.has(tenantId)) return starting.get(tenantId);
  const promise = create({
    sessionId: tenantId,
    sessionDataPath: path.join(SESSION_ROOT, tenantId),
    multiDevice: true,
    headless: true,
    qrTimeout: 0,
    authTimeout: 0,
    cacheEnabled: false,
    killProcessOnBrowserClose: false,
    qrRefreshS: 15,
    qrCallback: async (qrCode, _ascii, attempts, urlCode) => report(tenantId, "QR_PENDING", { qrCode, attempts, urlCode }),
  }).then(async (client) => {
    clients.set(tenantId, client); starting.delete(tenantId);
    await report(tenantId, "CONNECTED", { qrCode: null, lastSeenAt: new Date().toISOString() });
    client.onStateChanged(async (state) => {
      if (["CONFLICT", "UNPAIRED", "UNLAUNCHED"].includes(state)) await report(tenantId, "DEGRADED", { lastError: state });
    });
    return client;
  }).catch(async (error) => {
    starting.delete(tenantId);
    const banned = /ban|blocked/i.test(String(error));
    await report(tenantId, banned ? "BANNED" : "DEGRADED", { lastError: String(error) });
    throw error;
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
          const number = String(job.phone).replace(/\D/g, "");
          await client.sendText(`${number}@c.us`, job.body);
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
    let raw = ""; for await (const chunk of req) raw += chunk;
    const { tenantId } = JSON.parse(raw || "{}");
    if (!tenantId) return json(res, 400, { error: "tenantId requerido" });
    session(tenantId).catch(()=>{});
    return json(res, 202, { ok: true });
  }
  return json(res, 404, { error: "not found" });
});

server.listen(PORT, () => console.log(`[worker] Imán Turnos Auto en :${PORT}`));
processQueue();
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, async () => { stopped = true; for (const client of clients.values()) await client.close().catch(()=>{}); process.exit(0); });
