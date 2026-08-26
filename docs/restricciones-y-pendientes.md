# Restricciones y pendientes — Matriz SGR

**Actualizado**: 25 de agosto de 2026

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
| ~~Fórmula de "Objetivo al día"~~ **DESBLOQUEADO 25-08-2026** | — | El cliente la explicó en la reunión (01:05:31 y 00:35:17). Fórmula en [anotaciones-clase.md §1](anotaciones-clase.md). Falta solo el **nombre exacto de las columnas** de la planilla, que el cliente se comprometió a enviar por los profesores. |
| Matriz de roles definitiva | Definición del profesor | Ajustar middleware de autorización (los roles están centralizados en un solo módulo para que el cambio sea barato). |

## Riesgos aceptados y su tratamiento

1. ~~**CRÍTICO — "Objetivo al día" depende de datos de asistencia no definidos.**~~ **RESUELTO** el 25-08-2026 con la transcripción de la reunión: el cliente dictó la fórmula (descuento de días por licencia/vacaciones/compensatorios/emergencia y prorrateo de la meta). Ver [anotaciones-clase.md §1](anotaciones-clase.md). Ya no aplica la prohibición de calcular; sí sigue vigente **no inventar más allá de lo que el cliente dijo**.
2. **Rooms de Socket.io por unidad territorial se diseñan desde el primer commit** del backend (refactorizar después es costoso). Implementado en la capa de sockets desde Fase 2.
3. **Costo cero** (ver restricción 1).
