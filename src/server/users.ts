// Helper de servidor (NO es un server action): resuelve el User de la sesión.
// Lo usa la capa de auth/tenant, por eso vive en src/server, no en app/actions.
import { systemDb } from "@/server/db";

export type ApiResponse<T = any> = {
  status: number;
  data?: T;
  message: string;
};

export const getUser = async (id: string): Promise<ApiResponse> => {
  try {
    // systemDb: este lookup ES el paso que resuelve la sesión → tenant
    // (el cliente scoped lo necesita, no puede depender de sí mismo).
    const user = await systemDb.user.findUnique({ where: { id } });
    if (!user) return { status: 404, message: "User not found" };
    return { status: 200, data: user, message: "User fetched successfully" };
  } catch (error: any) {
    return { status: 500, message: error.message || "Failed to fetch user" };
  }
};
