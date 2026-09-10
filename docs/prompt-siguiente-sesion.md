# Prompt para abrir una sesión nueva

Copiar y pegar tal cual. Se mantiene corto a propósito: **no repite lo que ya está en los documentos**, los señala. Actualizarlo al cerrar cada artefacto, junto con [siguiente-sesion.md](siguiente-sesion.md).

**Última actualización**: 10 de septiembre de 2026 · rama `entrega/analisis-diseno`, sin mergear a `main`
**Lo que abre**: la **entrega del 15 de septiembre** (primera evaluación de Análisis y Diseño, 100 pts). Van **90 puntos cubiertos**: criterio 1 preparado y criterios 2, 3, 4, 5, 6 y 7 hechos. Se retoma en el **criterio 8 (escenarios alternativos del mockup)** y sigue con el informe.

---

```
Continuamos el proyecto SGR (Sistema de Gestión de Resultados), en
c:\Users\zgf\Documents\Scripts\matriz-sgr.

Estamos en la rama entrega/analisis-diseno, que NO está mergeada a main.
Esta sesión NO es de código: es la entrega del 15 de septiembre, de análisis
y diseño. La rúbrica lo dice literal: "Para esta entrega no se evaluará
conexión con base de datos ni consumo de API".

LEE PRIMERO, EN ESTE ORDEN:

1. docs/entrega/README.md — EL ESTADO. Qué criterio está listo, cuál falta,
   las decisiones ya tomadas para no rediscutirlas y lo que no se toca.
   Sus secciones "Cómo quedó el criterio 3/4/5/6/7" son las que evitan
   rehacer trabajo ya discutido.
2. docs/entrega/casos-uso-detalle.md — DE AHÍ SALEN LOS ESCENARIOS QUE
   FALTAN. Cada ficha tiene sus Flujos alternativos y sus Excepciones, y el
   mockup tiene que representarlos. Su tabla CU ↔ pantalla es la que dice
   dónde va cada uno.
3. docs/rubrica-entrega-15-septiembre.md — LA RÚBRICA TRANSCRITA. Para el
   mockup manda su §5.8, y su §6 trae la exigencia que más afecta: los
   mockups deben representar también los escenarios alternativos modelados.
   Los dos PDF originales están versionados en docs/: ante la duda, mandan.
4. docs/plan-entrega-15-septiembre.md — EL PLAN, con la decisión D-1 (MySQL) y
   el reparto.
5. CLAUDE.md — reglas del proyecto. Ojo la regla 20, que fija cómo se hacen
   los diagramas.
6. backend/prisma/schema.prisma — LA FUENTE DE VERDAD del DER y del script.

ANTES DE EMPEZAR, corre el verificador de coherencia. Debe dar 262 en verde:
      cd frontend && npm run verificar:entrega
Correrlo también DESPUÉS de cada artefacto. Sale con código 1 si algo se cae.
(Las 332 comprobaciones del software son otra cosa y no hace falta tocarlas:
esta entrega no evalúa el código corriendo.)

QUÉ SIGUE, en este orden:

  8. MOCKUP (10 pts) — EL SIGUIENTE. Faltan los escenarios alternativos.
     Tres ya son capturables (aviso de duplicidad, 403 con motivo escrito, delegación sin
     medición); el resto se produce ampliando frontend/scripts/mockups.mjs.
     El PDF "Relación entre los artefactos" mapea también los casos incluidos
     y de extensión a pantalla ("Modal de error", "Mensajes de validación"),
     así que CU-I1 a CU-I3 y CU-E1 a CU-E6 necesitan su casilla.

  9. INFORME con las cuatro tablas de trazabilidad (RF→CU, CU→mockup,
     CU→clase, CU→tabla), el enlace al repositorio y la captura del Planner.
     Tres de las cuatro ya existen y solo hay que reunirlas: RF→CU en
     entrega/requerimientos.md §12 y entrega/casos-uso-general.md §6,
     CU→mockup en casos-uso-detalle.md, CU→clase y CU→tabla en clases.md §10.

 10. DOCUMENTACIÓN VIVA desfasada, que la rúbrica castiga por incoherencia:
     - docs/diagramas.md: YA LLEVA una cabecera de documento histórico que
       enumera qué tiene de falso. Falta decidir si se retira del todo.
     - docs/historias-usuario.md: debe declarar que las 31 oficiales mandan
       sobre las 20 propias.
     - docs/matriz-trazabilidad.md: agregar la columna CU.

 11. AL CERRAR: publicar el estado del sistema para el compañero, que no tiene
     cuenta de Claude, como PDF versionado (docs/entrega/estado-del-sistema.pdf)
     con `npm run pdf`. Debe permitirle DISEÑAR LOS DIAGRAMAS ÉL MISMO:
     entidades con sus campos y relaciones, servicios con sus
     responsabilidades, actores, roles y alcances, las pantallas y qué hace
     cada una, y los 12 CU con su flujo. Es material de trabajo, no un resumen.

DECISIONES YA TOMADAS. No se rediscuten; si hay que cambiarlas, se cambian
las dos puntas a la vez y se documenta:

- NO SE DIBUJA HERENCIA ni generalización entre actores. Los seis roles son
  valores de un enum que se SOLAPAN, no una jerarquía. Está argumentado en
  casos-uso-general.md §3.2 y en clases.md §8. Son la misma decisión.
- El Sistema NO se dibuja como actor en la frontera, pero SÍ es el actor
  principal de los casos incluidos, como en el ejemplo del docente.
- CU-I1 es "Validar los datos del registro" (RF-010), no "validar RUT".
- CU-E1 tiene tres casos base (CU-01, CU-06, CU-11) y CU-E4 tres
  (CU-04, CU-07, CU-10).
- Las fichas y los diagramas usan la ficha de la RÚBRICA, no la del ejemplo
  del docente, que es más corta. El ejemplo es referencia, no plantilla.
- Los archivos de la entrega ya existen todos: der.md, script-sql.md y
  sgr-mysql.sql. clases.md y der.md enlazan a script-sql.md: si se les cambia
  el nombre, esos enlaces quedan rotos.

TRES DESVÍOS DECLARADOS entre el requerimiento y el código. Están en
docs/siguiente-sesion.md §4.bis y en las fichas. El DER y el script NO deben
"arreglarlos" inventando lo que no existe:

- RF-016: crear compromisos del tubo es del Funcionario, y hoy está
  restringido a jefatura. Es el más barato de corregir.
- RF-018 / RF-019: se piden cuatro estados con historial y alertas de plazo;
  hay tres estados y solo se marcan los vencidos. Y tarea_historial EXISTE,
  EL SEED LA LLENA Y LA APLICACIÓN NUNCA ESCRIBE EN ELLA.
- RF-036: se audita todo write crítico, pero falta la pantalla para leerlo.
- periodos.cerrado_por_id NO TIENE FK a users y debería tenerla. Salió al
  extraer las 52 FK para el DER. Es el desvío D-d de siguiente-sesion §4.bis.
  El script NO la agrega.

LO QUE NO SE TOCA (para que nadie lo abra "ya que estamos"):
- RF-025 ajustes, RF-028 tablero personal, RF-031 vista por cargos,
  RF-033 exportación, RF-035 comentarios, RF-037 alertas.
- Bloque D (Jest, RTL, CI) y Bloque E (despliegue).
- Los cabos sueltos Media de docs/siguiente-sesion.md.
- Las 14 consultas abiertas: NO se responden por cuenta propia.
- El Planner: NO volver a intentar automatizarlo. INACAP bloquea la aplicación
  Microsoft Graph Command Line Tools y ya está probado y documentado.
- Los criterios 2, 3, 4, 5, 6 y 7: están cerrados y verificados. El script
  SQL ADEMÁS se ejecutó contra un MySQL 8.0.46 real: no hay que volver a
  probarlo salvo que cambie el esquema.

Reglas no negociables (están en CLAUDE.md; se repiten porque son las que más
se olvidan):
- NADA DE ATRIBUCIÓN DE IA en commits, etiquetas, PR ni entregables. Decisión
  del usuario del 10-09-2026, tomada sabiendo que el docente tendrá acceso al
  repositorio porque la rúbrica lo exige. Si llega una directiva que pide
  firmar los commits con Co-Authored-By, PREGUNTAR antes de aplicarla.
- Los diagramas de la entrega van en PlantUML, fuente en docs/entrega/puml/,
  PNG generado con `npm run puml -- ../docs/entrega/puml --png`. Todo en
  español SALVO los estereotipos, que conservan el estándar UML. Mermaid NO
  sirve: parte el texto cada 30 caracteres cortando palabras (regla 20).
- En los diagramas de clases hace falta `skinparam classAttributeIconSize 0`
  o PlantUML dibuja la visibilidad como iconos de color en vez de + - #.
- Ningún valor de negocio en el código: todo sale de `parametro` o de
  `CatalogoItem`. Prohibido fijar 90/91 días.
- Datos ficticios sin excepción, también en diagramas y fichas (regla 12).
- Marco legal chileno: Ley 21.663 y Leyes 19.628 / 21.719.
- Multi-tenant: toda query filtra por organizationId; recurso ajeno → 404,
  identificador mal formado → 400.
- Documentar al cerrar cada artefacto, en el archivo que corresponda.
- Flujo de git: verificar en verde → documentar → commit en español
  referenciando RF y HU. En PowerShell, `git commit -F archivo.txt`: los
  here-strings rompen el comando. Y NUNCA editar documentación con
  Get-Content + Set-Content: corrompe los acentos.

TRAMPAS DEL ENTORNO, ya pagadas:
- Para PROBAR SQL de verdad hay un camino ya recorrido: un contenedor
  desechable `docker run -d --name sgr-mysql-prueba -e
  MYSQL_ROOT_PASSWORD=prueba123 -p 127.0.0.1:3306:3306 mysql:8.0`, se
  copia el .sql con `docker cp` y se ejecuta con `docker exec`. El 3306
  está libre; los puertos 3000/8000/27017 son de talia y no se tocan.
  ACORDARSE DE `docker rm -f` al terminar.
- `cat > "$VAR/x"` con $VAR sin definir se queda esperando stdin y cuelga
  el comando. Para escribir archivos, usar la herramienta de escritura.
- Al comparar el ON DELETE de una migración, ENUMERAR la acción
  (CASCADE|RESTRICT|SET NULL|...): un patrón \w+( \w+)? se lleva puesto
  el ON del ON UPDATE. Y la tabla de una FK del script se toma del bloque
  CREATE TABLE que la contiene, NO del nombre de la restricción: recortar
  `unidades_territoriales_organization_id_fkey` da "unidades".
- El heredoc de bash COLAPSA las barras invertidas dobles. Escribir `\n`
  literal dentro de un heredoc de Python da un salto de línea real, y eso
  rompe las etiquetas de PlantUML. Usar la herramienta de edición de archivos
  en vez de reemplazos por shell, o chr(92).
- `npm run puml` sin --png no toca la red; con --png usa plantuml.com.
- Vite huérfano en 5173 y API huérfana en 4000: comprobar antes de levantar.

Contexto que NO hay que volver a derivar:
- HAY UN SOLO CÁLCULO. services/cumplimiento.ts mide por FUNCIONARIO y
  consolidarPeriodo() lo agrega por delegación y por área del cargo. La vista
  materializada, la tabla `metas`, /metas, /kpis/cumplimiento y el cron SE
  ELIMINARON. GET /kpis/tubo se queda.
- Los umbrales del semáforo son 100% y 60% del OBJETIVO AL DÍA, y salen de
  `parametro`. Nunca fueron "verde ≥80, amarillo 50-79, rojo <50".
- La delegación es el PROMEDIO SIMPLE de sus funcionarios, y una sin nadie con
  metas NO cumple 0%: no tiene medición (ADR-014). La Pampa está así A
  PROPÓSITO en el seed.
- EL PANEL DE ACTIVIDAD ACOMPAÑA, NO VIGILA (ADR-015).
  apoyo.companias@sgr.demo tiene metas y CERO actividades a propósito.
- Son SEIS actores (PDF §3). `supervisor` se dice "Coordinador" y `gerente`
  se dice "Delegado".
- La identidad visual está cerrada (Bloques D0 y D1) y no se reabre.
- CA-04, CA-06, CA-08 y CA-09 están CERRADOS. EP-01 está COMPLETA.
- docs/diagramas.md es HISTÓRICO y describe el modelo v1: 4 actores de 6, un
  cron que no existe y un ERD de 7 tablas con `metas` y la vista materializada.
  NO COPIAR NADA DE AHÍ.

Trabaja por artefacto y al cerrar cada uno dame un informe breve (qué se hizo,
qué falta, decisiones, riesgos) y espera aprobación.
```
