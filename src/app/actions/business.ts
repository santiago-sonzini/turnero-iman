"use server"
import { db } from "@/server/db"

export interface BusinessInfo {
  id: string
  name: string
  phone: string | null
  cuit: string | null
  address: string | null
  logoUrl: string | null
  themeAccent: string | null
}

const FALLBACK: Omit<BusinessInfo, "id"> = {
  name: "Mi negocio",
  phone: null,
  cuit: null,
  address: null,
  logoUrl: null,
  themeAccent: null,
}

// Perfil del negocio dueño de la instancia (una sola fila). Punto de anclaje
// futuro para white-label multi-negocio.
export async function getBusinessProfile(): Promise<BusinessInfo> {
  const profile = await db.businessProfile.findFirst()
  if (!profile) return { id: "", ...FALLBACK }
  return {
    id: profile.id,
    name: profile.name,
    phone: profile.phone,
    cuit: profile.cuit,
    address: profile.address,
    logoUrl: profile.logoUrl,
    themeAccent: profile.themeAccent,
  }
}

export async function upsertBusinessProfile(data: {
  name: string
  phone?: string | null
  cuit?: string | null
  address?: string | null
  logoUrl?: string | null
  themeAccent?: string | null
}) {
  const existing = await db.businessProfile.findFirst()
  const payload = {
    name: data.name.trim(),
    phone: data.phone?.trim() || null,
    cuit: data.cuit?.trim() || null,
    address: data.address?.trim() || null,
    logoUrl: data.logoUrl || null,
    // themeAccent solo se pisa si viene en el input (undefined = no tocar)
    ...(data.themeAccent !== undefined ? { themeAccent: data.themeAccent || null } : {}),
  }
  const saved = existing
    ? await db.businessProfile.update({ where: { id: existing.id }, data: payload })
    : await db.businessProfile.create({ data: payload })
  return { status: 200, data: saved }
}
