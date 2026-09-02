import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { TuboPage } from "./pages/TuboPage";
import { FichaPage } from "./pages/FichaPage";
import { BandejaPage } from "./pages/BandejaPage";
import { MetasPage } from "./pages/MetasPage";

// Carga perezosa: ECharts pesa; solo se descarga al entrar al dashboard,
// y el tubo (la pantalla de todos los días) queda liviano.
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);

function RutasProtegidas() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <Layout />;
}

export function App() {
  return (
    // reducedMotion="user": toda animación de motion respeta la preferencia
    // del sistema, igual que las de CSS (DESIGN §8.1.7).
    <MotionConfig reducedMotion="user">
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RutasProtegidas />}>
            <Route path="/" element={<TuboPage />} />
            <Route path="/ficha" element={<FichaPage />} />
            <Route path="/verificacion" element={<BandejaPage />} />
            {/* Sin guarda de rol: quien no puede configurar la ve en lectura
                con el motivo (DESIGN §8.2.8). El backend sigue siendo la
                autoridad — el PUT responde 403. */}
            <Route path="/metas" element={<MetasPage />} />
            <Route
              path="/dashboard"
              element={
                <Suspense fallback={<div className="skeleton" style={{ height: 320 }} />}>
                  <DashboardPage />
                </Suspense>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </MotionConfig>
  );
}
