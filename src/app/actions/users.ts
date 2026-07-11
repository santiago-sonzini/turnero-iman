import { db, systemDb } from "@/server/db";

const prisma = db;

export type ApiResponse<T = any> = {
  status: number;
  data?: T;
  message: string;

};

export const getUser = async (id: string): Promise<ApiResponse> => {
  try {
    // systemDb: este lookup ES el paso que resuelve la sesión → tenant
    // (el cliente scoped lo necesita, no puede depender de sí mismo).
    const user = await systemDb.user.findUnique({
      where: { id },
    });

    if (!user) {
      return {
        status: 404,
        message: "User not found",
      };
    }
    return {
      status: 200,
      data: user,
      message: "User fetched successfully",
    };
  } catch (error: any) {
    return {
      status: 500,
      message: error.message || "Failed to fetch user",
    };
  }
};



export const getClientById = async (id: string): Promise<ApiResponse> => {
  try {
    const client = await prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      return {
        status: 404,
        message: "Client not found",
      };
    }

    return {
      status: 200,
      data: client,
      message: "Client fetched successfully",
    };
  } catch (error: any) {
    return {
      status: 500,
      message: error.message || "Failed to fetch client",
    };
  }
};


