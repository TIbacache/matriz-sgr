// Cliente de API con fetch: agrega el JWT y normaliza errores.
export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setToken(t: string | null) {
  token = t;
}
// El AuthProvider registra aquí el logout: cualquier 401 cierra sesión.
export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
}

async function procesar<T>(res: Response): Promise<T> {
  if (res.status === 401 && onUnauthorized) onUnauthorized();
  if (!res.ok) {
    let mensaje = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) mensaje = body.error;
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new ApiError(res.status, mensaje);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  return procesar<T>(res);
}

/**
 * Subida de evidencia (RF-012). El backend recibe el archivo **crudo**, no
 * multipart: el `Content-Type` es el tipo real del archivo y el cuerpo es el
 * archivo. El nombre viaja en la query y es solo un metadato para mostrar —
 * la ruta en disco la deriva el servidor del código de la actividad, así que
 * nada de lo que mande el cliente decide dónde se escribe (RNF-017).
 */
export async function subirArchivo<T>(path: string, archivo: File): Promise<T> {
  const separador = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API_URL}${path}${separador}nombre=${encodeURIComponent(archivo.name)}`, {
    method: "POST",
    headers: {
      "Content-Type": archivo.type || "application/octet-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: archivo,
  });
  return procesar<T>(res);
}

/**
 * Descarga el archivo de una evidencia. Va por fetch y no por un `<img src>`
 * porque el endpoint exige el JWT: las evidencias no se sirven como estáticos
 * públicos (RNF-017, acceso controlado). Quien llama debe revocar el object
 * URL que cree con este blob.
 */
export async function obtenerBlob(path: string): Promise<Blob> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 401 && onUnauthorized) onUnauthorized();
  if (!res.ok) throw new ApiError(res.status, `No se pudo abrir el archivo (${res.status})`);
  return res.blob();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
