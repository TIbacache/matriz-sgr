import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { MarcaSemaforo } from "../components/Marca";
import "./login.css";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-pagina">
      <div className="login-tema">
        <ThemeToggle />
      </div>

      <form className="login-tarjeta card entrada" onSubmit={onSubmit}>
        <MarcaSemaforo />
        <h1 className="login-titulo">Matriz SGR</h1>
        <p className="login-subtitulo">
          Seguimiento territorial en tiempo real: tareas, metas y semáforos de cumplimiento.
        </p>

        <label className="etiqueta" htmlFor="email">
          Correo
        </label>
        <input
          id="email"
          className="campo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />

        <label className="etiqueta login-campo-password" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          className="campo"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && <p className="login-error">{error}</p>}

        <button className="btn-primario login-boton" type="submit" disabled={cargando}>
          {cargando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>

      <p className="login-pie">Origami SpA</p>
    </div>
  );
}
