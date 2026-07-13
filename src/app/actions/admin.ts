"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { requireFounder } from "@/server/admin/guard";
import { systemDb } from "@/server/db";

const localDateTime = z.string().trim().refine(
  (value) => !value || (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) && !Number.isNaN(parseArgentinaDate(value)?.getTime())),
  "Fecha inválida",
);

const subscriptionSchema = z.object({
  plan: z.enum(["", "TURNOS", "TURNOS_AUTO"]),
  planStatus: z.enum(["ONBOARDING", "TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED"]),
  trialEndsAt: localDateTime,
  graceUntil: localDateTime,
  mpLastPaymentAt: localDateTime,
  cancellationEffectiveAt: localDateTime,
  mpPayerEmail: z.string().trim().email().or(z.literal("")),
  mpPreapprovalId: z.string().trim().max(200),
  mpPreapprovalPlanId: z.string().trim().max(200),
  mpLastPaymentPreapprovalId: z.string().trim().max(200),
  addons: z.string().trim().max(2_000),
});

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// datetime-local no incluye zona horaria. El panel opera en hora argentina.
function parseArgentinaDate(value: string): Date | null {
  if (!value) return null;
  return new Date(`${value}:00-03:00`);
}

export async function updateTenantSubscription(tenantId: string, formData: FormData) {
  await requireFounder();
  const tenant = await systemDb.tenant.findUnique({ where: { id: tenantId }, select: { id: true, slug: true } });
  if (!tenant) notFound();

  const parsed = subscriptionSchema.safeParse({
    plan: formString(formData, "plan"),
    planStatus: formString(formData, "planStatus"),
    trialEndsAt: formString(formData, "trialEndsAt"),
    graceUntil: formString(formData, "graceUntil"),
    mpLastPaymentAt: formString(formData, "mpLastPaymentAt"),
    cancellationEffectiveAt: formString(formData, "cancellationEffectiveAt"),
    mpPayerEmail: formString(formData, "mpPayerEmail"),
    mpPreapprovalId: formString(formData, "mpPreapprovalId"),
    mpPreapprovalPlanId: formString(formData, "mpPreapprovalPlanId"),
    mpLastPaymentPreapprovalId: formString(formData, "mpLastPaymentPreapprovalId"),
    addons: formString(formData, "addons"),
  });
  const path = `/admin/negocios/${tenant.slug}`;
  if (!parsed.success) redirect(`${path}?suscripcion=datos-invalidos`);

  const values = parsed.data;
  const addons = [...new Set(values.addons.split(",").map((addon) => addon.trim()).filter(Boolean))];
  const update = {
    plan: values.plan || null,
    planStatus: values.planStatus,
    trialEndsAt: parseArgentinaDate(values.trialEndsAt),
    graceUntil: parseArgentinaDate(values.graceUntil),
    mpLastPaymentAt: parseArgentinaDate(values.mpLastPaymentAt),
    cancellationEffectiveAt: parseArgentinaDate(values.cancellationEffectiveAt),
    mpPayerEmail: values.mpPayerEmail || null,
    mpPreapprovalId: values.mpPreapprovalId || null,
    mpPreapprovalPlanId: values.mpPreapprovalPlanId || null,
    mpLastPaymentPreapprovalId: values.mpLastPaymentPreapprovalId || null,
    mpCancellationPending: formData.get("mpCancellationPending") === "on",
    addons,
  } as const;

  let errorCode: string | null = null;
  try {
    await systemDb.$transaction(async (tx) => {
      await tx.tenant.update({ where: { id: tenant.id }, data: update });
      await tx.funnelEvent.create({
        data: {
          tenantId: tenant.id,
          event: "suscripcion_actualizada_admin",
          props: {
            plan: update.plan,
            planStatus: update.planStatus,
            trialEndsAt: update.trialEndsAt?.toISOString() ?? null,
            graceUntil: update.graceUntil?.toISOString() ?? null,
            cancellationEffectiveAt: update.cancellationEffectiveAt?.toISOString() ?? null,
          },
        },
      });
    });
  } catch (error) {
    errorCode = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" ? "id-duplicado" : "error";
  }
  if (errorCode) redirect(`${path}?suscripcion=${errorCode}`);

  revalidatePath("/admin");
  revalidatePath("/admin/negocios");
  revalidatePath(path);
  revalidatePath(`/${tenant.slug}`);
  revalidatePath(`/${tenant.slug}/turnos`);
  redirect(`${path}?suscripcion=guardada`);
}
