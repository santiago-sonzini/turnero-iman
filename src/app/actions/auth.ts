'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { DEMO_MODE, systemDb } from '@/server/db';
import { createClientServer } from '@/lib/user';
import { trackFor } from '@/server/track';
import { ensureUniqueSlug } from '@/lib/slug';
import { z } from 'zod';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const credentialsSchema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(8).max(200) });

async function ensureTenantForUser(user: SupabaseUser, fallbackBusiness?: string) {
  const existing = await systemDb.user.findUnique({ where: { id: user.id }, include: { tenant: true } });
  if (existing) return existing.tenant;
  const business = String(user.user_metadata?.name ?? fallbackBusiness ?? "Mi negocio").trim().slice(0, 80) || "Mi negocio";
  const slug = await slugDe(business);
  const tenant = await systemDb.$transaction(async (tx) => {
    const created = await tx.tenant.create({
      data: { name: business, slug, planStatus: "ONBOARDING", onboardingStep: "negocio" },
    });
    await tx.user.create({
      data: { id: user.id, email: user.email ?? "", name: business, role: "ADMIN", tenantId: created.id },
    });
    await tx.businessProfile.create({
      data: { name: business, tenantId: created.id, notifyOnBooking: true, notifyEmail: user.email ?? null },
    });
    return created;
  });
  await trackFor(tenant.id, "cuenta_creada", { email: user.email });
  return tenant;
}

export async function login(values: { email: string; password: string }) {
  // Modo demo: sin Supabase configurado no hay login real.
  if (DEMO_MODE) redirect('/app')
  const parsed = credentialsSchema.safeParse(values);
  if (!parsed.success) return { status: 400, message: "Revisá el email y la clave." };
  const supabase = await createClientServer()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return { status: 401, message: error.message }
  }

  if (data) {
    const tenant = await ensureTenantForUser(data.user)
    redirect(tenant.planStatus === "ONBOARDING" ? "/onboarding" : `/${tenant.slug}`)
  }

  redirect('/')
}

// Slug único (identificador de link) a partir del nombre del negocio.
async function slugDe(nombre: string): Promise<string> {
  return ensureUniqueSlug(nombre, async (slug) =>
    !!(await systemDb.tenant.findUnique({ where: { slug }, select: { id: true } }))
  );
}

/**
 * Alta de cuenta = alta de TENANT: crea el negocio (organización), el usuario
 * dueño y el perfil, y arranca el onboarding (el trial arranca recién al
 * elegir plan, después de ver el resultado con sus propios datos).
 */
export async function signup(values: {
  email: string
  password: string
  negocio: string
}) {
  if (DEMO_MODE) redirect('/app')
  const parsed = credentialsSchema.extend({ negocio: z.string().trim().min(2).max(80) }).safeParse(values);
  if (!parsed.success) return { status: 400, message: "Revisá el nombre, el email y la clave." };
  const supabase = await createClientServer()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.negocio },
    },
  })

  if (error) {
    return { status: 401, message: error.message }
  }
  if (!data.user) {
    return { status: 401, message: "No se pudo crear la cuenta" }
  }

  // Con confirmación de email activada en Supabase no hay sesión todavía.
  if (!data.session) {
    return {
      status: 200,
      message: "Te mandamos un email para confirmar la cuenta. Después entrá con tu clave.",
    }
  }

  await ensureTenantForUser(data.user, parsed.data.negocio)
  redirect('/onboarding')
}


export async function signOut() {
  if (DEMO_MODE) redirect('/')
  const supabase = await createClientServer()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/auth')
}
