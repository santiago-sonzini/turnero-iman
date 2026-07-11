'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getUser } from './users';
import { db, DEMO_MODE, systemDb } from '@/server/db';
import { createClientServer } from '@/lib/user';
import { trackFor } from '@/server/track';

export async function login(values: any) {
  // Modo demo: sin Supabase configurado no hay login real.
  if (DEMO_MODE) redirect('/dashboard')
  const supabase = await createClientServer()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  })

  if (error) {
    return { status: 401, message: error.message }
  }

  if (data) {
    const res = await getUser(data.user.id)
    if (res.status === 200) {
      // Dueño de negocio: si dejó el onboarding a la mitad, retoma donde estaba.
      const tenant = await systemDb.tenant.findUnique({
        where: { id: res.data.tenantId },
      })
      redirect(tenant?.planStatus === "ONBOARDING" ? "/onboarding" : "/app")
    } else {
      return { status: 401, message: "Error al recuperar usuario" }
    }
  }

  redirect('/')
}

// Slug único para el tenant a partir del nombre del negocio.
function slugDe(nombre: string): string {
  const base = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "negocio";
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
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
  if (DEMO_MODE) redirect('/dashboard')
  const supabase = await createClientServer()
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: { name: values.negocio },
    },
  })

  if (error) {
    return { status: 401, message: error.message }
  }
  if (!data.user) {
    return { status: 401, message: "No se pudo crear la cuenta" }
  }

  // Tenant + dueño + perfil + plantillas por defecto. systemDb: todavía no
  // hay tenant al que scopear — es el único lugar legítimo para crear uno.
  const existente = await systemDb.user.findUnique({ where: { id: data.user.id } })
  if (!existente) {
    const tenant = await systemDb.tenant.create({
      data: {
        name: values.negocio,
        slug: slugDe(values.negocio),
        planStatus: "ONBOARDING",
        onboardingStep: "negocio",
      },
    })
    await systemDb.user.create({
      data: {
        id: data.user.id,
        email: values.email,
        name: values.negocio,
        role: "ADMIN",
        tenantId: tenant.id,
      },
    })
    await systemDb.businessProfile.create({
      data: { name: values.negocio, tenantId: tenant.id },
    })
    await trackFor(tenant.id, "cuenta_creada", { email: values.email })
  }

  // Con confirmación de email activada en Supabase no hay sesión todavía.
  if (!data.session) {
    return {
      status: 200,
      message: "Te mandamos un email para confirmar la cuenta. Después entrá con tu clave.",
    }
  }

  redirect('/onboarding')
}


export async function signOut() {
  if (DEMO_MODE) redirect('/')
  const supabase = await createClientServer()
  const { error } = await supabase.auth.signOut()
  if (!error) {
    revalidatePath('/auth/signin')
    redirect('/auth/signin')
  }
}
