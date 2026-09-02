import { useState, type ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LayoutGroup, motion } from "motion/react";
import {
  BadgeCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  SquareKanban,
  Target,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import { MarcaSemaforo } from "./Marca";
import { SiluetaSerena } from "./SiluetaSerena";
import "./layout.css";

// Ítem del menú con el marcador de activo COMPARTIDO: al cambiar de pantalla
// el fondo se desliza de un ítem al otro (layoutId de motion) en vez de
// aparecer y desaparecer. MotionConfig en App lo apaga con reduced-motion.
function ItemNav({ to, end, titulo, children }: { to: string; end?: boolean; titulo: string; children: ReactNode }) {
  return (
    <NavLink to={to} end={end} className="layout-nav-item" title={titulo}>
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              className="layout-nav-marcador"
              layoutId="nav-activo"
              transition={{ type: "spring", stiffness: 520, damping: 42 }}
            />
          )}
          {children}
        </>
      )}
    </NavLink>
  );
}

const ROL_LABEL: Record<string, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  gerente: "Gerente",
  usuario: "Funcionario",
  verificador: "Verificador",
  consulta: "Consulta",
};

const SIDEBAR_KEY = "matriz.sidebar";

/** Espejo de requireRol("verificador", "supervisor", "admin") del backend. */
const PUEDEN_VALIDAR = ["verificador", "supervisor", "admin"];
/** Espejo de requireRol("admin", "supervisor") en /metas-item (RF-007). */
const PUEDEN_CONFIGURAR = ["admin", "supervisor"];

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
          <MarcaSemaforo mono />
          <div className="layout-marca-textos">
            <span className="layout-marca-nombre">SGR</span>
            {organizacionNombre && <span className="layout-marca-org">{organizacionNombre}</span>}
          </div>
        </div>

        <LayoutGroup id="nav">
          <nav className="layout-nav">
            <ItemNav to="/" end titulo="Tubo de trabajo">
              <SquareKanban size={18} strokeWidth={1.5} />
              <span className="layout-nav-texto">Tubo de trabajo</span>
            </ItemNav>
            <ItemNav to="/ficha" titulo="Ficha personal">
              <ClipboardList size={18} strokeWidth={1.5} />
              <span className="layout-nav-texto">Ficha personal</span>
            </ItemNav>
            {/* La bandeja solo aparece para quien puede validar (RNF-005): un
                menú que ofrece lo que el rol no puede hacer confunde. */}
            {PUEDEN_VALIDAR.includes(usuario?.rol ?? "") && (
              <ItemNav to="/verificacion" titulo="Bandeja de verificación">
                <BadgeCheck size={18} strokeWidth={1.5} />
                <span className="layout-nav-texto">Verificación</span>
              </ItemNav>
            )}
            {/* Configurar metas es tarea de administración: el menú no ofrece lo
                que este rol no puede hacer (mismo criterio que la bandeja). */}
            {PUEDEN_CONFIGURAR.includes(usuario?.rol ?? "") && (
              <ItemNav to="/metas" titulo="Configuración de metas">
                <Target size={18} strokeWidth={1.5} />
                <span className="layout-nav-texto">Metas</span>
              </ItemNav>
            )}
            <ItemNav to="/dashboard" titulo="Dashboard">
              <LayoutDashboard size={18} strokeWidth={1.5} />
              <span className="layout-nav-texto">Dashboard</span>
            </ItemNav>
          </nav>
        </LayoutGroup>

        {/* La ciudad al fondo de la barra: nunca debajo de un texto */}
        <div className="layout-silueta">
          <SiluetaSerena />
        </div>

        <div className="layout-pie">
          <div className="layout-acciones">
            <ThemeToggle />
            <button
              className="btn-icono layout-colapso"
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
