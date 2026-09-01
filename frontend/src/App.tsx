import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { TuboPage } from "./pages/TuboPage";
import { FichaPage } from "./pages/FichaPage";

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
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RutasProtegidas />}>
            <Route path="/" element={<TuboPage />} />
            <Route path="/ficha" element={<FichaPage />} />
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
  );
}
