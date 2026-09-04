import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { registrarIo } from "./services/broadcast.js";
import { configurarSockets } from "./sockets/index.js";
import { authRouter } from "./routes/auth.routes.js";
import { unidadesRouter } from "./routes/unidades.routes.js";
import { categoriasRouter } from "./routes/categorias.routes.js";
import { tareasRouter } from "./routes/tareas.routes.js";
import { kpisRouter } from "./routes/kpis.routes.js";
import { usuariosRouter } from "./routes/usuarios.routes.js";
import { periodosRouter } from "./routes/periodos.routes.js";
import { cargosRouter, itemsRouter } from "./routes/cargos.routes.js";
import { metasItemRouter } from "./routes/metas-item.routes.js";
import { actividadesRouter } from "./routes/actividades.routes.js";
import { evidenciasRouter } from "./routes/evidencias.routes.js";
import { cumplimientoRouter } from "./routes/cumplimiento.routes.js";
import { catalogosRouter } from "./routes/catalogos.routes.js";
import { vecinosRouter } from "./routes/vecinos.routes.js";
import { atencionesSocialesRouter } from "./routes/atenciones-sociales.routes.js";

const app = express();
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: "200kb" }));

// Índice para quien abra la API en el navegador: esto es solo la API,
// la interfaz web vive en el frontend (puerto 5173 en desarrollo).
app.get("/", (_req, res) =>
  res.json({
    servicio: "Matriz SGR API",
    nota: "Esta es la API. La interfaz web es el frontend (http://localhost:5173 en desarrollo).",
    endpoints: {
      publicos: ["GET /health", "POST /auth/login"],
      conToken: [
        "GET /auth/me",
        "GET|POST|PATCH|DELETE /unidades",
        "GET|POST|PATCH|DELETE /categorias",
        "GET|POST|PATCH|DELETE /tareas",
        "GET /kpis/tubo",
        "GET /usuarios",
      ],
      modeloV2: [
        "GET|POST|PATCH /periodos · POST /periodos/:id/cierre · POST /periodos/:id/reapertura",
        "GET|POST|PATCH /cargos",
        "GET|POST|PATCH /items",
        "GET|POST|PATCH|DELETE /metas-item · PUT /metas-item (conjunto de un funcionario)",
        "GET|POST|PATCH /actividades · POST /actividades/:id/anulacion",
        "POST /actividades/:id/evidencias (cuerpo = archivo crudo)",
        "GET /evidencias?estado=pendiente · GET /evidencias/:id/archivo",
        "POST /evidencias/:id/validacion",
        "GET /cumplimiento/:periodoId · GET /cumplimiento/:periodoId/consolidado",
        "GET /catalogos?catalogo=formato_evidencia",
        "GET /vecinos?q= · GET|PATCH /vecinos/:id (ficha del vecino, ADR-008)",
      ],
    },
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRouter);
app.use("/unidades", unidadesRouter);
app.use("/categorias", categoriasRouter);
app.use("/tareas", tareasRouter);
app.use("/kpis", kpisRouter);
app.use("/usuarios", usuariosRouter);
// Modelo v2 — el eje actividad → código → evidencia → validación → puntaje.
app.use("/periodos", periodosRouter);
app.use("/cargos", cargosRouter);
app.use("/items", itemsRouter);
// Metas por funcionario × ítem × período (RF-007). El `/metas` v1 (unidad ×
// categoría) murió con el Bloque C, junto con la vista materializada.
app.use("/metas-item", metasItemRouter);
app.use("/actividades", actividadesRouter);
app.use("/evidencias", evidenciasRouter);
app.use("/cumplimiento", cumplimientoRouter);
app.use("/catalogos", catalogosRouter);
app.use("/atenciones-sociales", atencionesSocialesRouter);
// Ficha del vecino: la pantalla con más datos personales. Su alcance por rol
// es una decisión legal, no de comodidad (ADR-012).
app.use("/vecinos", vecinosRouter);

// Manejador de errores al final: Express 5 captura rechazos async solo.
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[error]", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: env.corsOrigin },
  // Límite de payload por mensaje: 100KB (Documento Maestro §9).
  maxHttpBufferSize: 100 * 1024,
});

registrarIo(io);
configurarSockets(io);

httpServer.listen(env.port, () => {
  console.log(`Matriz SGR backend escuchando en http://localhost:${env.port}`);
});
