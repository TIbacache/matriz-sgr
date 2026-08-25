import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { registrarIo } from "./services/broadcast.js";
import { configurarSockets } from "./sockets/index.js";
import { programarCronCumplimiento } from "./jobs/cumplimiento.js";
import { authRouter } from "./routes/auth.routes.js";
import { unidadesRouter } from "./routes/unidades.routes.js";
import { categoriasRouter } from "./routes/categorias.routes.js";
import { tareasRouter } from "./routes/tareas.routes.js";
import { metasRouter } from "./routes/metas.routes.js";
import { kpisRouter } from "./routes/kpis.routes.js";

const app = express();
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: "200kb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRouter);
app.use("/unidades", unidadesRouter);
app.use("/categorias", categoriasRouter);
app.use("/tareas", tareasRouter);
app.use("/metas", metasRouter);
app.use("/kpis", kpisRouter);

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
programarCronCumplimiento();

httpServer.listen(env.port, () => {
  console.log(`Matriz SGR backend escuchando en http://localhost:${env.port}`);
});
