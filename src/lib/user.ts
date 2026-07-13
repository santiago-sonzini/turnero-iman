"use server"
import { env } from '@/env'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getUser } from "@/server/users";
import { type User as UserDB } from "@prisma/client";
import { type User } from "@supabase/supabase-js";



export async function createClientServer() {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error("Supabase Auth no está configurado")
  }
  const cookieStore = await cookies()

  return createServerClient(
    env.SUPABASE_URL!,
    env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch { /* un Server Component no puede escribir; proxy refresca */ }
        },
      },
    }
  )


}

export type UserServerResponse = {
  user: User;
  userDb: UserDB | null;
} | null;

const getUserServer = async (): Promise<UserServerResponse> => {
  // Modo demo (sin Supabase configurado): sesión de dueño ficticia.
  if (env.NODE_ENV !== "production" && (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY)) {
    return {
      user: { id: "demo-user", email: "demo@iman.app" } as User,
      userDb: {
        id: "demo-user",
        email: "demo@iman.app",
        name: "Demo",
        phone: null,
        role: "ADMIN",
        tenantId: "demo-barberia-el-roble",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserDB,
    }
  }

  const supabase = await createClientServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const resUserDb = await getUser(user?.id)


  return { user: user, userDb: resUserDb.data }
}

export default getUserServer
