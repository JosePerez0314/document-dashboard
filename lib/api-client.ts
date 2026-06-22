/**
 * Typed API client for document-dashboard backend
 * All fetch calls include credentials: "include" for httpOnly cookie auth
 */

export interface User {
  id: number;
  cedula: string;
  role: "ADMIN" | "REVISOR";
  created_at?: Date;
  updated_at?: Date;
}

export interface Expediente {
  id: number;
  nombre: string;
  status:
    | "PENDIENTE"
    | "EN_REVISION"
    | "CON_OBSERVACIONES"
    | "CORREGIDO"
    | "CONFIRMADO";
  revisor_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface ApiError {
  error: string;
}

export class ApiErrorResponse extends Error {
  constructor(
    public status: number,
    public data: ApiError,
  ) {
    super(data.error);
    this.name = "ApiErrorResponse";
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiErrorResponse(response.status, data as ApiError);
  }

  return data as T;
}

/**
 * GET /api/auth/me
 * Returns the current authenticated user, or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetchApi<User>("/api/auth/me");
    return response;
  } catch (error) {
    if (error instanceof ApiErrorResponse && error.status === 401) {
      return null;
    }
    throw error;
  }
}

/**
 * POST /api/auth/login
 * Authenticates a user by cedula
 */
export async function loginUser(cedula: string): Promise<User> {
  const response = await fetchApi<{ message: string; user: User }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ cedula }),
    },
  );
  return response.user;
}

/**
 * GET /api/auth
 * Returns all users (admin only)
 */
export async function getUsers(): Promise<User[]> {
  return fetchApi<User[]>("/api/auth");
}

/**
 * POST /api/auth
 * Creates a new user (admin only)
 */
export async function createUser(
  cedula: string,
  role?: "ADMIN" | "REVISOR",
): Promise<User> {
  return fetchApi<User>("/api/auth", {
    method: "POST",
    body: JSON.stringify({ cedula, role }),
  });
}

/**
 * GET /api/auth/[id]
 * Returns a single user by id
 */
export async function getUserById(id: number): Promise<User> {
  return fetchApi<User>(`/api/auth/${id}`);
}

/**
 * PUT /api/auth/[id]
 * Updates a user
 */
export async function updateUser(
  id: number,
  updates: { cedula?: string; role?: "ADMIN" | "REVISOR" },
): Promise<{ message: string; user: User }> {
  return fetchApi<{ message: string; user: User }>(`/api/auth/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

/**
 * GET /api/expedientes
 * Returns expedientes for the current user (filtered by revisor_id)
 */
export async function getExpedientes(): Promise<Expediente[]> {
  return fetchApi<Expediente[]>("/api/expedientes");
}

/**
 * POST /api/expedientes
 * Creates a new expediente
 */
export async function createExpediente(
  nombre: string,
  revisorId: number,
  comentario?: string,
): Promise<Expediente & { display_id: string }> {
  return fetchApi<Expediente & { display_id: string }>("/api/expedientes", {
    method: "POST",
    body: JSON.stringify({
      nombre,
      revisor_id: revisorId,
      comentario,
    }),
  });
}

/**
 * GET /api/expedientes/[id]
 * Returns a single expediente by id
 */
export async function getExpedienteById(id: number): Promise<Expediente> {
  return fetchApi<Expediente>(`/api/expedientes/${id}`);
}

/**
 * PUT /api/expedientes/[id]
 * Updates an expediente
 */
export async function updateExpediente(
  id: number,
  updates: {
    nombre?: string;
    status?:
      | "PENDIENTE"
      | "EN_REVISION"
      | "CON_OBSERVACIONES"
      | "CORREGIDO"
      | "CONFIRMADO";
    revisor_id?: number | null;
    comentario?: string;
  },
): Promise<{ message: string; expediente: Expediente }> {
  return fetchApi<{ message: string; expediente: Expediente }>(
    `/api/expedientes/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(updates),
    },
  );
}

/**
 * DELETE /api/expedientes/[id]
 * Deletes an expediente
 */
export async function deleteExpediente(
  id: number,
): Promise<{ message: string }> {
  return fetchApi<{ message: string }>(`/api/expedientes/${id}`, {
    method: "DELETE",
  });
}
