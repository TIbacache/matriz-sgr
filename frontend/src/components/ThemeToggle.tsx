import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "matriz.tema";

function temaActual(): "claro" | "oscuro" {
  return document.documentElement.dataset.theme === "oscuro" ? "oscuro" : "claro";
}

function aplicar(tema: "claro" | "oscuro") {
  if (tema === "oscuro") document.documentElement.dataset.theme = "oscuro";
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem(KEY, tema);
  } catch {
    /* modo privado */
  }
}

// El script inline de index.html ya aplicó el tema antes del primer paint;
// este componente solo lo alterna y lo sincroniza entre pestañas.
export function ThemeToggle() {
  const [tema, setTema] = useState<"claro" | "oscuro">(temaActual);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && (e.newValue === "claro" || e.newValue === "oscuro")) {
        aplicar(e.newValue);
        setTema(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const alternar = () => {
    const nuevo = tema === "oscuro" ? "claro" : "oscuro";
    aplicar(nuevo);
    setTema(nuevo);
  };

  return (
    <button
      className="btn-icono"
      onClick={alternar}
      title={tema === "oscuro" ? "Tema claro" : "Tema oscuro"}
      aria-label={tema === "oscuro" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
    >
      {tema === "oscuro" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
