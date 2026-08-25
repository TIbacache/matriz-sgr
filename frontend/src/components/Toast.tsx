import { useCallback, useRef, useState } from "react";

// Toast mínimo para errores (DESIGN §7): 5 segundos, sin dependencia externa.
export function useToast(): { toast: React.ReactNode; mostrarError: (msg: string) => void } {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrarError = useCallback((msg: string) => {
    setMensaje(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMensaje(null), 5000);
  }, []);

  const toast = mensaje ? (
    <div className="toast" role="alert">
      {mensaje}
    </div>
  ) : null;

  return { toast, mostrarError };
}
