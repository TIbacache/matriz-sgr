import { useEffect, useState } from "react";
import { obtenerBlob } from "./api";

// Carga el archivo de una evidencia y lo entrega como object URL.
//
// Existe como hook porque el archivo NO se puede enlazar con un `src` directo:
// el endpoint exige el JWT (RNF-017, acceso controlado). Y porque un object URL
// que no se revoca es una fuga de memoria — aquí se revoca siempre, tanto al
// cambiar de evidencia como al desmontar.

interface Estado {
  url: string | null;
  cargando: boolean;
  error: string | null;
}

export function useArchivoEvidencia(evidenciaId: string | null): Estado {
  const [estado, setEstado] = useState<Estado>({ url: null, cargando: false, error: null });

  useEffect(() => {
    if (!evidenciaId) {
      setEstado({ url: null, cargando: false, error: null });
      return;
    }
    let objectUrl: string | null = null;
    let vigente = true;
    setEstado({ url: null, cargando: true, error: null });

    obtenerBlob(`/evidencias/${evidenciaId}/archivo`)
      .then((blob) => {
        if (!vigente) return;
        objectUrl = URL.createObjectURL(blob);
        setEstado({ url: objectUrl, cargando: false, error: null });
      })
      .catch((e) => {
        if (!vigente) return;
        setEstado({
          url: null,
          cargando: false,
          error: e instanceof Error ? e.message : "No se pudo abrir el archivo",
        });
      });

    return () => {
      vigente = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [evidenciaId]);

  return estado;
}
