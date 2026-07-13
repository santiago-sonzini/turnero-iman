import { PrismaClient } from "@prisma/client";
import { env } from "@/env";

// El modo demo solo existe en desarrollo. Una configuración incompleta en
// producción debe fallar cerrada, nunca otorgar una sesión ficticia.
export const DEMO_MODE = env.NODE_ENV !== "production" && (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const systemDb = globalForPrisma.prisma ?? new PrismaClient({
  log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});
if (env.NODE_ENV !== "production") globalForPrisma.prisma = systemDb;

type Scope = { kind: "column" } | { kind: "self" };
const scopes: Record<string, Scope> = {
  tenant: { kind: "self" },
  user: { kind: "column" },
  businessProfile: { kind: "column" },
  client: { kind: "column" },
  service: { kind: "column" },
  staff: { kind: "column" },
  staffService: { kind: "column" },
  workingHour: { kind: "column" },
  appointment: { kind: "column" },
  promotion: { kind: "column" },
  messageJob: { kind: "column" },
  whatsappSession: { kind: "column" },
  funnelEvent: { kind: "column" },
};

const listOps = new Set(["findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy", "updateMany", "deleteMany"]);
const uniqueOps = new Set(["update", "delete", "upsert"]);

function scopedArgs(model: string, op: string, args: any, tenantId: string) {
  const scope = scopes[model]!;
  const filter = scope.kind === "self" ? { id: tenantId } : { tenantId };
  const input = args ?? {};
  if (op === "create") {
    if (scope.kind === "self") throw new Error("Usá systemDb para crear tenants");
    return { ...input, data: { ...(input.data ?? {}), tenantId } };
  }
  if (op === "createMany") {
    const rows = Array.isArray(input.data) ? input.data : [input.data];
    return { ...input, data: rows.map((row: any) => ({ ...row, tenantId })) };
  }
  if (op === "upsert") return {
    ...input,
    where: { ...(input.where ?? {}), ...filter },
    create: scope.kind === "self" ? input.create : { ...(input.create ?? {}), tenantId },
  };
  if (uniqueOps.has(op)) return { ...input, where: { ...(input.where ?? {}), ...filter } };
  if (listOps.has(op)) return { ...input, where: { AND: [input.where ?? {}, filter] } };
  return input;
}

function scopedClient(base: any): PrismaClient {
  return new Proxy(base, {
    get(target, prop, receiver) {
      const model = String(prop);
      if (model === "$transaction") {
        const transaction = Reflect.get(target, prop, receiver);
        return (callback: any, ...rest: any[]) => {
          if (typeof callback !== "function") throw new Error("Usá la forma interactiva de $transaction");
          return transaction.call(target, (tx: any) => callback(scopedClient(tx)), ...rest);
        };
      }
      if (typeof prop === "symbol" || !scopes[model]) return Reflect.get(target, prop, receiver);
      const delegate = Reflect.get(target, prop, receiver);
      return new Proxy(delegate, {
        get(methods, methodProp) {
          const method = String(methodProp);
          const fn = Reflect.get(methods, methodProp);
          if (typeof fn !== "function") return fn;
          return async (...args: any[]) => {
            let actual = method;
            if (method === "findUnique") actual = "findFirst";
            if (method === "findUniqueOrThrow") actual = "findFirstOrThrow";
            const { getTenantId } = await import("./tenant-context");
            const tenantId = await getTenantId();
            return Reflect.get(methods, actual).call(methods, scopedArgs(model, actual, args[0], tenantId), ...args.slice(1));
          };
        },
      });
    },
  });
}

export const db = scopedClient(systemDb);
