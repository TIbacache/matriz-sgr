import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen, SquareKanban } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import { MarcaSemaforo } from "./Marca";
import "./layout.css";

const ROL_LABEL: Record<string, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  gerente: "Gerente",
  usuario: "Funcionario",
};

const SIDEBAR_KEY = "matriz.sidebar";

export function Layout() {
  const { usuario, organizacionNombre, logout } = useAuth();
  const [colapsada, setColapsada] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "colapsada";
    } catch {
      return false;
    }
  });

  const alternarSidebar = () => {
    setColapsada((c) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, c ? "expandida" : "colapsada");
      } catch {
        /* modo privado */
      }
      return !c;
    });
  };

  return (
    <div className="layout">
      <aside className={colapsada ? "layout-sidebar layout-sidebar--colapsada" : "layout-sidebar"}>
        <div className="layout-marca">
          <MarcaSemaforo />
          <div className="layout-marca-textos">
            <span className="layout-marca-nombre">Matriz SGR</span>
            {organizacionNombre && <span className="layout-marca-org">{organizacionNombre}</span>}
          </div>
        </div>

        <nav className="layout-nav">
          <NavLink to="/" end className="layout-nav-item" title="Tubo de trabajo">
            <SquareKanban size={18} strokeWidth={1.5} />
            <span className="layout-nav-texto">Tubo de trabajo</span>
          </NavLink>
          <NavLink to="/dashboard" className="layout-nav-item" title="Dashboard">
            <LayoutDashboard size={18} strokeWidth={1.5} />
            <span className="layout-nav-texto">Dashboard</span>
          </NavLink>
        </nav>

        <div className="layout-pie">
          <div className="layout-acciones">
            <ThemeToggle />
            <button
              className="btn-icono"
              onClick={alternarSidebar}
              title={colapsada ? "Expandir menú" : "Colapsar menú"}
              aria-label={colapsada ? "Expandir menú" : "Colapsar menú"}
            >
              {colapsada ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
          <div className="layout-usuario">
            <span className="layout-usuario-avatar" title={usuario?.nombre}>
              {usuario?.nombre
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => p[0] ?? "")
                .join("")
                .toUpperCase()}
            </span>
            <div className="layout-usuario-info">
              <span className="layout-usuario-nombre">{usuario?.nombre}</span>
              <span className="layout-usuario-rol">
                {ROL_LABEL[usuario?.rol ?? ""] ?? usuario?.rol}
              </span>
            </div>
            <button className="btn-icono" onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
