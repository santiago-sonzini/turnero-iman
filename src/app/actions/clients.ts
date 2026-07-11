'use server'
import { db } from "@/server/db";

import { Client, Prisma, PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = db;

// -----------------------------
// Tipado y validación
// -----------------------------

const clientQuerySchema = z.object({
  page: z.number().default(0),
  pageSize: z.number().default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  filters: z
    .object({
      name: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional(),
})

export type ClientQueryParams = z.infer<typeof clientQuerySchema>

export type GetClientsResponse = {
  clients: any[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
}

// -----------------------------
// Server Action principal
// -----------------------------

export async function getClientsAction(
  input: ClientQueryParams
): Promise<GetClientsResponse> {
  const { page, pageSize, sortBy, sortOrder, filters } =
    clientQuerySchema.parse(input)

  const where: any = {}

  // Filtros dinámicos
  if (filters?.name) {
    where.name = { contains: filters.name, mode: 'insensitive' }
  }

  if (filters?.phone) {
    where.phone = { contains: filters.phone, mode: 'insensitive' }
  }

  // Ordenamiento
  const orderBy: any = sortBy
    ? { [sortBy]: sortOrder || 'asc' }
    : { createdAt: 'desc' }

  // Conteo total
  const totalCount = await prisma.client.count({ where })

  // Consulta principal
  const clients = await prisma.client.findMany({
    where,
    orderBy,
    skip: page * pageSize,
    take: pageSize,
  })

  return {
    clients,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  }
}


export const upsertClient = async (client: any) => {
  try {
    // El id identifica el registro pero no es parte de los datos a escribir.
    const { id, ...data } = client;
    const existingClient = id ? await prisma.client.findUnique({
      where: { id },
    }) : undefined;

    if (existingClient) {
      await prisma.client.update({
        where: { id },
        data,
      });
    } else {
      await prisma.client.create({
        data,
      });
    }
    return {
      status: 200,
      message: "Cliente creado o actualizado correctamente.",
      data: client,
    };
  } catch (error) {
    return {
      status: 500,
      message: "Error al crear o actualizar el cliente.",
    };
  }
};

export const createClient = async (client: {
  name: string
  email?: string
  phone?: string
  discount?: number
}) => {
  try {
    const existingClient = await prisma.client.findFirst({
      where: { name: client.name },
    });
  
    if (existingClient) {
      return {
        status: 400,
        message: "El cliente ya existe.",
      };
    }
  
    const created = await prisma.client.create({
      data: {
        name: client.name,
        email: client.email,
        phone: client.phone,
        createdAt: new Date(),
        updatedAt: new Date(),
        discount: client.discount || 0,
      },
    });
  
    return {
      status: 200,
      message: "Cliente creado correctamente.",
      data: created ,
    };
  } catch (error) {
    return {
      status: 500,
      message: "Error al crear el cliente.",
    };
  }
};




/**
 * Crea (o recupera) una "cuenta liviana" de cliente para la página pública:
 * un User con rol CLIENT vinculado al Client, más un accessToken que habilita
 * el link. No hay contraseña (en modo demo el acceso es por link). Devuelve el
 * link a compartir.
 */
export const createClientAccount = async (clientId: string) => {
  try {
    const client = await prisma.client.findUnique({ where: { id: clientId } })
    if (!client) {
      return { status: 404, message: "No se encontró el cliente." }
    }

    // Token estable del link (se conserva si ya existía).
    const accessToken =
      client.accessToken ??
      `${clientId}-${Math.random().toString(36).slice(2, 10)}`

    if (!client.accessToken) {
      await prisma.client.update({
        where: { id: clientId },
        data: { accessToken },
      })
    }

    // Vincular un User CLIENT si todavía no existe uno para este cliente.
    const existingUser = await prisma.user.findFirst({ where: { clientId } })
    if (!existingUser) {
      const baseEmail =
        client.email ||
        `${client.name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@cliente.local`

      // email es @unique en User: si ya está tomado por un usuario suelto lo
      // vinculamos; si pertenece a otro cliente, usamos un fallback único.
      const byEmail = await prisma.user.findUnique({ where: { email: baseEmail } })
      if (byEmail && !byEmail.clientId) {
        await prisma.user.update({
          where: { id: byEmail.id },
          data: { clientId, role: "CLIENT" },
        })
      } else {
        const email = byEmail ? `${clientId}@cliente.local` : baseEmail
        try {
          await prisma.user.create({
            data: {
              email,
              name: client.name,
              phone: client.phone,
              role: "CLIENT",
              clientId,
            },
          })
        } catch {
          // Colisión residual (name/phone también son únicos): crear el mínimo viable.
          await prisma.user.create({
            data: { email: `${clientId}@cliente.local`, role: "CLIENT", clientId },
          })
        }
      }
    }

    return {
      status: 200,
      message: "Cuenta de cliente habilitada.",
      data: { accessToken, link: `/history/${clientId}` },
    }
  } catch (error) {
    console.error("Error creating client account:", error)
    return { status: 500, message: "No se pudo crear la cuenta del cliente." }
  }
}

/** Indica si el cliente ya tiene una cuenta pública habilitada. */
export const getClientAccount = async (clientId: string) => {
  const [client, user] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: { accessToken: true },
    }),
    prisma.user.findFirst({ where: { clientId }, select: { id: true } }),
  ])
  const enabled = !!user || !!client?.accessToken
  return { enabled, accessToken: client?.accessToken ?? null }
}

export const deleteClient = async (clientId: string) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });
  
    if (!client) {
      return {
        status: 404,
        message: "No se encontró el cliente.",
      };
    }
  
    await prisma.client.delete({
      where: { id: clientId },
    });
  
    return {
      status: 200,
      message: "Cliente eliminado correctamente.",
    };
  } catch (error) {
    return {
      status: 500,
      message: "Error al eliminar el cliente.",
    };
  }
};