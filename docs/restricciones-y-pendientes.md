# Restricciones y pendientes — Matriz SGR

**Actualizado**: 31 de agosto de 2026

## Restricciones del equipo (Origami SpA)

1. **Costo cero durante el desarrollo.** Somos estudiantes: solo herramientas gratuitas o free tier.
   - Tipografías: Google Fonts (Space Grotesk, Public Sans). **GT America descartada** (de pago).
   - Repos e imágenes: GitHub privado + ghcr.io (gratis para el uso del proyecto).
   - Único gasto aceptado al final: **una VPS (AWS o Hostinger) solo si es necesaria para la entrega**. Nada más se paga (aparte de Claude Code, que ya está cubierto).
   - Toda decisión de librería/servicio debe pasar este filtro antes de adoptarse.

2. **Equipo**: Origami SpA. El Planner del equipo lo creó otro integrante; aún no tenemos acceso.

## Pendientes (bloqueados por terceros)

| Pendiente | Bloqueado por | Acción cuando se destrabe |
|---|---|---|
| ~~Cargar backlog en Planner~~ **DESBLOQUEADO 26-08-2026** | — | Ya hay acceso al plan `DesarrolloSW-MuniLS-OrigamiSpA` con la plantilla del profesor (buckets: Ámbito, Requisitos, Diseño, Desarrollo, Pruebas, Piloto e implementación). Plan completo en [plan-desarrollo.md](plan-desarrollo.md); cargar con `scripts/cargar-plan-planner.ps1` (usar `-SoloSimular` primero). |
| ~~Fórmula de "Objetivo al día"~~ **DESBLOQUEADO 25-08-2026** | — | El cliente la explicó en la reunión (01:05:31 y 00:35:17); confirmada por RN-007 del PDF y **verificada con los datos reales** de la planilla. |
| ~~Nombres exactos de las columnas~~ **DESBLOQUEADO 31-08-2026** | — | Estaban en las capturas del PPT que enviaron los profesores. Extraídas y documentadas en [estructura-planilla-real.md](estructura-planilla-real.md): columnas de pestaña personal, área social, tubo, semáforo y resumen, más los catálogos completos de tipo/subatención y gestiones. |
| ~~Matriz de roles definitiva~~ **DESBLOQUEADO 31-08-2026** | — | El PDF §3 define 6 actores: Administrador, Coordinador del sistema, Delegado/jefatura, Funcionario, **Verificador** y **Usuario de consulta**. Faltan los dos últimos en nuestro enum `Rol`. |
| **7 consultas abiertas al docente** | Definición del docente (PO) | Listadas en [requerimientos-oficiales.md §10](requerimientos-oficiales.md). Las principales: valor oficial de los ajustes por felicitación/reclamo (el PDF dice −20%/−30%, la planilla +10%/−20%), si el tope de 150% se aplica o solo se informa, y si "Ingresado" es un estado real. El PDF exige documentarlas, no resolverlas en silencio. |

## Restricción nueva del PDF (§Condiciones del caso)

3. **Prohibido usar datos reales.** *"Solo se utilizarán datos ficticios o anonimizados. Está prohibido cargar información real de ciudadanos o funcionarios."* ⚠ Nuestro seed actual usa nombres tomados de las capturas (Javier Godoy, Juan Francisco Labra, etc.) → **debe reemplazarse por datos ficticios antes de la entrega**. Aplica también a capturas de pantalla en informes.

## Riesgos aceptados y su tratamiento

1. ~~**CRÍTICO — "Objetivo al día" depende de datos de asistencia no definidos.**~~ **RESUELTO** el 25-08-2026 con la transcripción de la reunión: el cliente dictó la fórmula (descuento de días por licencia/vacaciones/compensatorios/emergencia y prorrateo de la meta). Ver [anotaciones-clase.md §1](anotaciones-clase.md). Ya no aplica la prohibición de calcular; sí sigue vigente **no inventar más allá de lo que el cliente dijo**.
2. **Rooms de Socket.io por unidad territorial se diseñan desde el primer commit** del backend (refactorizar después es costoso). Implementado en la capa de sockets desde Fase 2.
3. **Costo cero** (ver restricción 1).
