import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { emitEvent, roomOrganizacion } from "../services/broadcast.js";

// Refresca la vista materializada de cumplimiento ponderado (Documento
// Maestro §2, arquitectura B: cron manual, sin triggers).
// CONCURRENTLY permite leer la vista mientras se refresca (requiere el
// índice único creado en la migración).
export async function refrescarCumplimiento(): Promise<void> {
  await prisma.$executeRawUnsafe(
    "REFRESH MATERIALIZED VIEW CONCURRENTLY cumplimiento_ponderado_vista"
  );
  // Avisar a todos los tenants conectados que hay cifras nuevas.
  const orgs = await prisma.organization.findMany({ select: { id: true } });
  for (const org of orgs) {
    emitEvent(roomOrganizacion(org.id), "cumplimiento:recalculado", {
      timestamp: new Date().toISOString(),
    });
  }
}

export function programarCronCumplimiento(): void {
  cron.schedule(env.cronCumplimiento, async () => {
    try {
      await refrescarCumplimiento();
      console.log(`[cron] cumplimiento recalculado ${new Date().toISOString()}`);
    } catch (err) {
      console.error("[cron] error al recalcular cumplimiento:", err);
    }
  });
  console.log(`[cron] recálculo de cumplimiento programado: ${env.cronCumplimiento}`);
}
