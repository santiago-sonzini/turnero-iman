import { PrismaClient } from "@prisma/client";

import { env } from "@/env";
import { getDemoPackId } from "./demo/current";

// Sin DATABASE_URL la app corre en MODO DEMO: PGlite (Postgres embebido) con
// datos ficticios, cero servicios externos. Con DATABASE_URL es Postgres real.
// Este switch es el único punto donde se decide la fuente de datos.
export const DEMO_MODE = !env.DATABASE_URL;

const createPrismaClient = () =>
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  // Una instancia demo por PACK (tipo-rubro), cada una con su PGlite propio.
  prismaDemo: Map<string, Promise<PrismaClient>> | undefined;
};

// En modo efímero (deploy) las instancias viven en memoria: cap para no
// acumular WASM si alguien recorre todos los packs en una misma lambda.
const EPHEMERAL = !!process.env.VERCEL || env.DEMO_EPHEMERAL === "1";
const MAX_INSTANCIAS_EFIMERAS = 4;

// El bootstrap demo es async (WASM + seed) y arranca recién con la PRIMERA
// consulta — nunca al importar este módulo (si no, `next build` lo dispararía
// al recolectar páginas y podría cortar el seed a la mitad). Exponemos un
// Proxy con la misma forma que PrismaClient: cada llamada resuelve el pack
// activo (cookie del request) y despacha a su instancia. Como todo el código
// ya usa `await db.modelo.metodo(...)`, nada más cambia.
function demoPromise(packId: string): Promise<PrismaClient> {
  const map = (globalForPrisma.prismaDemo ??= new Map());
  let p = map.get(packId);
  if (!p) {
    if (EPHEMERAL && map.size >= MAX_INSTANCIAS_EFIMERAS) {
      // Evicción simple del pack más viejo del Map (orden de inserción).
      const primero = map.keys().next().value as string | undefined;
      if (primero) {
        map.delete(primero);
        void import("./demo/bootstrap").then((m) => m.cerrarPack(primero));
      }
    }
    p = import("./demo/bootstrap").then((m) => m.createDemoPrismaById(packId));
    map.set(packId, p);
  }
  return p;
}

function lazyClient(): PrismaClient {
  return new Proxy({} as PrismaClient, {
    get(_target, prop) {
      if (prop === "then" || typeof prop === "symbol") return undefined;
      return new Proxy(function () {}, {
        get(_t, method) {
          if (method === "then" || typeof method === "symbol") return undefined;
          return (...args: unknown[]) =>
            demoPromise(getDemoPackId()).then((c) =>
              (c as any)[prop][method](...args)
            );
        },
        apply(_t, _thisArg, args) {
          return demoPromise(getDemoPackId()).then((c) =>
            (c as any)[prop](...args)
          );
        },
      });
    },
  });
}

function buildDb(): PrismaClient {
  if (!DEMO_MODE) {
    const client = globalForPrisma.prisma ?? createPrismaClient();
    if (env.NODE_ENV !== "production") globalForPrisma.prisma = client;
    return client;
  }
  return lazyClient();
}

/**
 * Cliente SIN scoping de tenant. Solo para:
 *  - resolver la sesión → tenant (src/server/tenant-context.ts)
 *  - webhooks de Mercado Pago (el tenant llega por external_reference)
 *  - lookups públicos por token (accessToken de cliente, partnerToken)
 *  - alta de tenants (signup)
 * Para TODO lo demás usar `db` (abajo), que inyecta tenantId solo.
 */
export const systemDb = buildDb();

// ── Choke point multi-tenant ─────────────────────────────────────────────────
// Todas las queries de la app pasan por este Proxy, que inyecta el tenantId de
// la sesión en cada operación (where en lecturas/updates, data en creates).
// La regla vive SOLO acá: ningún action necesita (ni puede olvidarse de)
// filtrar por tenant. Sin sesión → TenantError, nunca datos de otro negocio.

type ModoScope =
  | { tipo: "columna" } // el modelo tiene tenantId propio
  | { tipo: "via"; relacion: string } // hereda el tenant del padre (relación)
  | { tipo: "self" }; // el modelo Tenant mismo: se filtra por id

const SCOPE_POR_MODELO: Record<string, ModoScope> = {
  user: { tipo: "columna" },
  client: { tipo: "columna" },
  payment: { tipo: "columna" },
  clientDiscount: { tipo: "columna" },
  category: { tipo: "columna" },
  product: { tipo: "columna" },
  offer: { tipo: "columna" },
  order: { tipo: "columna" },
  reorderAlert: { tipo: "columna" },
  messageTemplate: { tipo: "columna" },
  contactLog: { tipo: "columna" },
  businessProfile: { tipo: "columna" },
  purchaseAnalytics: { tipo: "columna" },
  funnelEvent: { tipo: "columna" },
  // Hijas sin columna propia: el tenant es el del padre.
  productInOrder: { tipo: "via", relacion: "order" },
  paymentAllocation: { tipo: "via", relacion: "payment" },
  tenant: { tipo: "self" },
};

// Operaciones cuyo `where` es de tipo unique: el filtro se agrega plano
// (Prisma 5 acepta campos extra no-unique en whereUnique).
const OPS_UNIQUE = new Set(["update", "delete", "upsert"]);
// Operaciones de lectura/lote: el filtro se combina con AND.
const OPS_WHERE = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "updateMany",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
]);

function inyectarTenant(
  modelo: string,
  op: string,
  args: any,
  tenantId: string
): any {
  const scope = SCOPE_POR_MODELO[modelo]!;
  const filtro =
    scope.tipo === "columna"
      ? { tenantId }
      : scope.tipo === "via"
        ? { [scope.relacion]: { is: { tenantId } } }
        : { id: tenantId };
  const a = args ?? {};

  if (op === "create") {
    if (scope.tipo === "self")
      throw new Error("No se crean tenants desde el cliente scoped: usar systemDb");
    if (scope.tipo === "via") return a; // hereda el padre (connect/nested)
    return { ...a, data: { ...(a.data ?? {}), tenantId } };
  }
  if (op === "createMany" || op === "createManyAndReturn") {
    if (scope.tipo !== "columna") return a;
    const data = Array.isArray(a.data) ? a.data : [a.data];
    return { ...a, data: data.map((d: any) => ({ ...d, tenantId })) };
  }
  if (op === "upsert") {
    return {
      ...a,
      where: { ...(a.where ?? {}), ...filtro },
      create:
        scope.tipo === "columna"
          ? { ...(a.create ?? {}), tenantId }
          : (a.create ?? {}),
    };
  }
  if (OPS_UNIQUE.has(op)) {
    return { ...a, where: { ...(a.where ?? {}), ...filtro } };
  }
  if (OPS_WHERE.has(op)) {
    return { ...a, where: { AND: [a.where ?? {}, filtro] } };
  }
  return a;
}

function scopedClient(base: any): PrismaClient {
  return new Proxy(base, {
    get(target, prop, receiver) {
      const key = String(prop);
      if (key === "$transaction") {
        // Forma interactiva: el `tx` que recibe el callback también queda
        // scoped, así una transacción no puede saltarse el tenant.
        const fn = Reflect.get(target, prop, receiver) as any;
        return (arg: any, ...resto: any[]) => {
          if (typeof arg === "function") {
            return fn.call(target, (tx: any) => arg(scopedClient(tx)), ...resto);
          }
          // Forma array: no soportada por el cliente scoped (las promesas ya
          // salieron despachadas). Usar la forma interactiva o systemDb.
          throw new Error(
            "db.$transaction([...]) no está soportado con scoping: usá la forma interactiva $transaction(async (tx) => ...)"
          );
        };
      }
      if (typeof prop === "symbol" || !(key in SCOPE_POR_MODELO)) {
        // $queryRaw y demás NO pasan por acá: si un action los necesita con
        // datos de tenant, debe usar systemDb + filtro explícito.
        return Reflect.get(target, prop, receiver);
      }
      const delegado = Reflect.get(target, prop, receiver) as any;
      return new Proxy(delegado, {
        get(m, opProp) {
          if (typeof opProp === "symbol") return Reflect.get(m, opProp);
          let op = String(opProp);
          const fn = Reflect.get(m, opProp);
          if (typeof fn !== "function") return fn;
          return async (...args: any[]) => {
            // findUnique se convierte a findFirst: el where deja de ser
            // unique al sumarle tenantId y así el tipo composite no molesta.
            let realOp = op;
            if (op === "findUnique") realOp = "findFirst";
            if (op === "findUniqueOrThrow") realOp = "findFirstOrThrow";
            const { getTenantId } = await import("./tenant-context");
            const tenantId = await getTenantId();
            const nuevosArgs = inyectarTenant(key, realOp, args[0], tenantId);
            const realFn = realOp === op ? fn : (Reflect.get(m, realOp) as any);
            return realFn.call(m, nuevosArgs, ...args.slice(1));
          };
        },
      });
    },
  });
}

/** Cliente de datos de la app: SIEMPRE scoped al tenant de la sesión. */
export const db = scopedClient(systemDb);
