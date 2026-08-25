import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./layout.css";

const ROL_LABEL: Record<string, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  gerente: "Gerente",
  usuario: "Funcionario",
};

export function Layout() {
  const { usuario, organizacionNombre, logout } = useAuth();

  return (
    <div className="layout">
      <aside className="layout-sidebar">
        <div className="layout-marca">
          <span className="layout-marca-nombre">Matriz SGR</span>
          {organizacionNombre && <span className="layout-marca-org">{organizacionNombre}</span>}
        </div>
        <nav className="layout-nav">
          <NavLink to="/" end className="layout-nav-item">
            Tubo de trabajo
          </NavLink>
          <NavLink to="/dashboard" className="layout-nav-item">
            Dashboard
          </NavLink>
        </nav>
        <div className="layout-usuario">
          <div className="layout-usuario-info">
            <span className="layout-usuario-nombre">{usuario?.nombre}</span>
            <span className="layout-usuario-rol">{ROL_LABEL[usuario?.rol ?? ""] ?? usuario?.rol}</span>
          </div>
          <button className="btn-secundario layout-salir" onClick={logout}>
            Salir
          </button>
        </div>
      </aside>
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
