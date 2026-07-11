"use server"
import { redirect } from "next/navigation";
import { env } from '@/env'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getUser } from "@/app/actions/users";
import { User as UserDB } from "@prisma/client";
import { User } from "@supabase/supabase-js";



export async function createClientServer() {
  const cookieStore = cookies()

  return createServerClient(
    env.SUPABASE_URL!,
    env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.log(error);

          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.log(error);

          }
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
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return {
      user: { id: "demo-user", email: "demo@iman.app" } as User,
      userDb: {
        id: "demo-user",
        email: "demo@iman.app",
        name: "Demo",
        phone: null,
        adress: null,
        role: "ADMIN",
        clientId: null,
        tenantId: "demo-tenant",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserDB,
    }
  }

  const supabase = await createClientServer()
  const {
    data: { user }, error
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const resUserDb = await getUser(user?.id)


  return { user: user, userDb: resUserDb.data }
}

export default getUserServer