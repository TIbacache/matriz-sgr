# Prompt para abrir una sesión nueva

Copiar y pegar tal cual. Se mantiene corto a propósito: **no repite lo que ya está en los documentos**, los señala. Actualizarlo al cerrar cada artefacto, junto con [siguiente-sesion.md](siguiente-sesion.md).

**Última actualización**: 10 de septiembre de 2026 · rama `entrega/analisis-diseno`, sin mergear a `main`
**Lo que abre**: la **entrega del 15 de septiembre** (primera evaluación de Análisis y Diseño, 100 pts). Van **25 puntos cubiertos**: criterio 1 preparado y criterio 2 hecho. El **criterio 3 está a medias** y se retoma ahí. Quedan además los criterios 4 a 7 y el informe.

---

```
Continuamos el proyecto SGR (Sistema de Gestión de Resultados), en
c:\Users\zgf\Documents\Scripts\matriz-sgr.

Estamos en la rama entrega/analisis-diseno, que NO está mergeada a main.
Esta sesión NO es de código: es la entrega del 15 de septiembre, que es de
análisis y diseño. La rúbrica lo dice literal: "Para esta entrega no se
evaluará conexión con base de datos ni consumo de API".

LEE PRIMERO, EN ESTE ORDEN:

1. docs/entrega/README.md — EL ESTADO. Qué criterio está listo, cuál falta,
   las decisiones ya tomadas para no rediscutirlas y lo que no se toca.
2. docs/plan-entrega-15-septiembre.md — EL PLAN. La rúbrica criterio por
   criterio, las tres decisiones (D-1 MySQL, D-2 alcance de los CU,
   D-3 escenarios alternativos), los 12 casos de uso ya elegidos con su actor
   y su pantalla, y el reparto entre las dos personas.
3. docs/rubrica-entrega-15-septiembre.md — LA RÚBRICA TRANSCRITA: los ocho
   criterios con su puntaje, la ficha mínima de cada caso de uso, la condición
   de los 10 mínimos y la cadena de artefactos. Los dos PDF originales están
   versionados en docs/: ante cualquier duda, mandan ellos.
4. CLAUDE.md — reglas del proyecto. Ojo la regla 20, que fija cómo se hacen
   los diagramas.
5. docs/requerimientos-oficiales.md — los 38 RF, 18 RNF, 13 RN, 10 CA y 31 HU.
   Su §10 son las 14 consultas abiertas: NO inventar esas respuestas.
6. docs/estado-proyecto.md — cuentas y roles (§1), contrato de la API (§3) y
   las pantallas (§6). De ahí salen los nombres que deben coincidir en todos
   los artefactos.

ANTES DE TOCAR CÓDIGO (no hace falta para los artefactos de diseño):
      cd backend && npm run build && npm run verificar:calculo
      npm run dev   (en otra terminal)
      npm run smoke && npm run verificar:api
      cd frontend && npm run build && npm run verificar:contraste
Deben dar 332 comprobaciones en verde (21 + 37 + 191 + 83).

QUÉ SIGUE, en este orden, porque las dependencias importan:

  3. CASO DE USO GENERAL (10 pts) — el DIAGRAMA GENERAL YA ESTÁ LISTO Y
     REVISADO: docs/entrega/puml/09-casos-uso-general.puml. Frontera explícita,
     los SEIS actores del PDF §3, los doce casos agrupados por los mismos cinco
     módulos M1-M5 del diagrama de requerimientos, las relaciones actor-caso de
     uso y los «include». NO REHACERLO: se rehizo tres veces y las correcciones
     están explicadas en docs/entrega/README.md §"Dónde quedó el criterio 3".
     Faltan dos cosas:
       a) Un SEGUNDO diagrama con los seis «extend» (CU-E1 a CU-E6), definidos
          en el plan §4. Van aparte porque son caminos condicionales: sumarlos
          al general lo llenan de ramas que solo ocurren a veces. Los «include»
          sí están en el general, porque son comportamiento compartido.
       b) El documento docs/entrega/casos-uso-general.md que los envuelve,
          con la tabla actor ↔ caso de uso y la correspondencia con los RF.
     Y CONFIRMAR una decisión ya tomada: no se dibuja generalización entre
     actores, porque los seis roles no forman jerarquía sino conjuntos que se
     solapan. Afirmar una herencia diría algo que el código no cumple. La
     rúbrica pide «include», «extend» O generalización, y las dos primeras
     están.
     El diagrama viejo de docs/diagramas.md §2 NO sirve: tiene 4 actores de 6
     y casos del modelo v1.

  4. LOS 12 CASOS DE USO ESPECÍFICOS (20 pts — el más caro y el más vacío).
     Están ELEGIDOS en el plan §4, con actor, RF y pantalla: CU-01 a CU-12,
     más tres «include» (CU-I1 validar RUT, CU-I2 generar código, CU-I3
     auditar) y seis «extend» (CU-E1 aviso de duplicidad, CU-E2 exigir
     observación, CU-E3 rechazar validación propia, CU-E4 conflicto 409,
     CU-E5 denegar por alcance con motivo, CU-E6 delegación sin medición).
     Cada uno necesita SU diagrama y SU ficha con los campos exactos de la
     rúbrica. Los flujos NO se inventan: salen del código y de las
     verificaciones que ya existen (backend/scripts/verificar-api-v2.ts).

  5. DIAGRAMA DE CLASES (15 pts). Con visibilidad (+/-/#), atributos tipados,
     métodos y multiplicidades. Los nombres deben coincidir con el DER y los
     CU: la rúbrica evalúa esa coherencia como criterio transversal.

  6. DER (10 pts). Desde backend/prisma/schema.prisma: son 16 entidades, no
     las 7 del diagrama viejo, que además incluye `metas` y la vista
     materializada que SE ELIMINARON en el Bloque C.

  7. SCRIPT SQL (10 pts) + su verificador. Ver D-1: se entrega MySQL traducido
     desde el esquema real, declarando las equivalencias de tipos. Escribir
     además un script que compruebe contra schema.prisma que no falta ni sobra
     ninguna tabla ni FK.

  8. MOCKUP (10 pts): faltan los escenarios alternativos. Tres ya son
     capturables (aviso de duplicidad, 403 con motivo escrito, delegación sin
     medición); el resto se produce ampliando frontend/scripts/mockups.mjs.

  9. INFORME con las cuatro tablas de trazabilidad (RF→CU, CU→mockup,
     CU→clase, CU→tabla), el enlace al repositorio y la captura del Planner.

 10. DOCUMENTACIÓN VIVA desfasada, que la rúbrica castiga por incoherencia:
     docs/diagramas.md (retirarlo o rehacerlo apuntando a docs/entrega/),
     README.md (dice "11 ADR" y son 15), docs/historias-usuario.md (decir que
     las 31 oficiales mandan sobre las 20 propias) y matriz-trazabilidad.md
     (agregar columna CU).

 11. AL CERRAR: publicar el estado del sistema para el compañero, que no tiene
     cuenta de Claude, como PDF versionado (docs/entrega/estado-del-sistema.pdf)
     con `npm run pdf`. Debe permitirle DISEÑAR LOS DIAGRAMAS ÉL MISMO:
     entidades con sus campos y relaciones, servicios con sus
     responsabilidades, actores, roles y alcances, las pantallas y qué hace
     cada una, y los 12 CU con su flujo. Es material de trabajo, no un resumen.

LO QUE NO SE TOCA (para que nadie lo abra "ya que estamos"):
- RF-025 ajustes, RF-028 tablero personal, RF-031 vista por cargos,
  RF-033 exportación, RF-035 comentarios, RF-037 alertas.
- Bloque D (Jest, RTL, CI) y Bloque E (despliegue).
- Los cabos sueltos Media de docs/siguiente-sesion.md.
- Las 14 consultas abiertas: NO se responden por cuenta propia.
- El Planner: NO volver a intentar automatizarlo. INACAP bloquea la aplicación
  Microsoft Graph Command Line Tools y ya está probado y documentado.

Reglas no negociables (están en CLAUDE.md; se repiten porque son las que más
se olvidan):
- Los diagramas de la entrega van en PlantUML, fuente en docs/entrega/puml/,
  PNG generado con `npm run puml`. Todo en español SALVO los estereotipos,
  que conservan el estándar UML/SysML. Mermaid NO sirve: parte el texto cada
  30 caracteres cortando palabras (regla 20).
- Ningún valor de negocio en el código: todo sale de `parametro` o de
  `CatalogoItem`. Prohibido fijar 90/91 días.
- Datos ficticios sin excepción, también en diagramas y fichas (regla 12).
- Marco legal chileno: Ley 21.663 y Leyes 19.628 / 21.719.
- Todo PATCH aplica bloqueo optimista con `version` → 409; todo write crítico
  audita; todo write emite su evento. Endpoint mudo = bug.
- Multi-tenant: toda query filtra por organizationId del JWT; recurso ajeno
  → 404, identificador mal formado → 400.
- Documentar al cerrar cada artefacto, en el archivo que corresponda.
- Flujo de git: rama por bloque → verificar en verde → documentar →
  git merge --no-ff → etiqueta anotada → push. En PowerShell,
  `git commit -F archivo.txt`: los here-strings rompen el comando. Y NUNCA
  editar documentación con Get-Content + Set-Content: corrompe los acentos.
- Nada de atribución de herramientas de IA en etiquetas, PR ni entregables.

Contexto que NO hay que volver a derivar (y que los diagramas viejos
contradicen, así que ojo al copiar de ellos):
- HAY UN SOLO CÁLCULO (Bloque C). `services/cumplimiento.ts` mide por
  FUNCIONARIO y `consolidarPeriodo()` lo agrega por delegación y por área del
  cargo. La vista materializada, la tabla `metas`, `/metas`,
  `/kpis/cumplimiento`, `/kpis/recalcular` y el cron SE ELIMINARON.
  `GET /kpis/tubo` se queda.
- Los umbrales del semáforo son 100% y 60% del OBJETIVO AL DÍA, y salen de
  `parametro`. Nunca fueron "verde ≥80, amarillo 50-79, rojo <50": eso está
  en docs/diagramas.md y está mal.
- La delegación es el PROMEDIO SIMPLE de sus funcionarios, y una sin nadie con
  metas NO cumple 0%: no tiene medición (ADR-014). La Pampa está así A
  PROPÓSITO en el seed.
- EL PANEL DE ACTIVIDAD ACOMPAÑA, NO VIGILA (ADR-015).
  `apoyo.companias@sgr.demo` tiene metas y CERO actividades a propósito: es el
  caso que RF-030 pide demostrar. No "arreglarlo".
- Son SEIS actores (PDF §3), no cuatro. Y el nombre técnico no es el
  municipal: `supervisor` se dice "Coordinador" y `gerente` se dice "Delegado".
- El modelo tiene 16 entidades. La fuente es backend/prisma/schema.prisma, no
  los diagramas viejos.
- La identidad visual está cerrada (Bloques D0 y D1) y no se reabre.
- CA-04, CA-06, CA-08 y CA-09 están CERRADOS. EP-01 está COMPLETA.
- El alcance de los datos de un vecino es una decisión LEGAL: ADR-012 y
  ADR-013. No ampliarlo sin respuesta a la consulta nº 12.

Trabaja por artefacto y al cerrar cada uno dame un informe breve (qué se hizo,
qué falta, decisiones, riesgos) y espera aprobación.
```
