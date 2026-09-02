import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { MarcaSemaforo } from "../components/Marca";
import { FaroSerena } from "../components/FaroSerena";
import "./login.css";

// Login en dos paneles (DESIGN §10.4): a un lado la identidad —heráldico, la
// frase del producto y el faro—, al otro el formulario sobre superficie
// sólida, para que ninguna imagen le quite contraste a un solo campo (§10.5.1).
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
      <section className="login-panel" aria-label="Sistema de Gestión de Resultados">
        <div className="login-panel-cabecera">
          <span className="login-panel-marca">
            <MarcaSemaforo mono />
            <span className="login-panel-nombre">SGR</span>
          </span>
          <span className="login-panel-desc">Sistema de Gestión de Resultados</span>
        </div>

        {/* La frase del producto (DESIGN §10.4.bis): nombra el trabajo real,
            no el software. Una sola, y aquí es donde vive. */}
        <p className="login-panel-frase">
          Lo que se atiende, se registra;
          <br />
          lo que se registra, avanza.
        </p>

        <div className="login-panel-arte">
          <FaroSerena activo={cargando} />
        </div>

        {/* DESIGN §10.5.5: identidad propia, sin escudo, ejercicio académico */}
        <p className="login-panel-pie">
          Ejercicio académico de Origami SpA para INACAP, con datos ficticios. Paleta y tipografía según
          las Normas Gráficas de La Serena 2019; no usa el escudo municipal.
        </p>
      </section>

      <section className="login-formulario">
        <div className="login-tema">
          <ThemeToggle />
        </div>

        <form className="login-tarjeta card entrada" onSubmit={onSubmit}>
          <h1 className="login-titulo">Ingresar</h1>
          <p className="login-subtitulo">Con la cuenta que te asignó tu delegación.</p>

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

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button className="btn-primario login-boton" type="submit" disabled={cargando}>
            {cargando ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <p className="login-pie">Origami SpA</p>
      </section>
    </div>
  );
}
