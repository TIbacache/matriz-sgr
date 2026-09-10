# Prompt para abrir una sesión nueva

Copiar y pegar tal cual. Se mantiene corto a propósito: **no repite lo que ya está en los documentos**, los señala. Actualizarlo al cerrar cada artefacto, junto con [siguiente-sesion.md](siguiente-sesion.md).

**Última actualización**: 10 de septiembre de 2026 · rama `entrega/analisis-diseno`, sin mergear a `main`
**Lo que abre**: la **entrega del 15 de septiembre** (primera evaluación de Análisis y Diseño, 100 pts). Van **90 puntos cubiertos**: criterio 1 preparado y criterios 2, 3, 4, 5, 6 y 7 cerrados. Se retoma en el **criterio 8 (los escenarios alternativos del mockup)** y sigue con el informe.

---

```
Continuamos el proyecto SGR (Sistema de Gestión de Resultados), en
c:\Users\zgf\Documents\Scripts\matriz-sgr.

Estamos en la rama entrega/analisis-diseno, que NO está mergeada a main.
Esta sesión NO es de código de producto: es la entrega del 15 de septiembre,
de análisis y diseño. La rúbrica lo dice literal: "Para esta entrega no se
evaluará conexión con base de datos ni consumo de API".

LEE PRIMERO, EN ESTE ORDEN:

1. docs/entrega/README.md — EL ESTADO. Qué criterio está listo, cuál falta,
   las decisiones ya tomadas para no rediscutirlas y lo que no se toca.
   Sus secciones "Cómo quedó el criterio 3/4/5/6/7" evitan rehacer trabajo
   ya discutido.
2. docs/entrega/casos-uso-general.md §7 y §8 — DE AHÍ SALE EL CRITERIO 8.
   §7 son los 3 casos incluidos y §8 los 6 de extensión, cada uno con su
   condición y su resultado. ESOS NUEVE son los escenarios alternativos que
   el mockup tiene que representar (decisión D-3).
3. docs/entrega/casos-uso-detalle.md — las 12 fichas. Sus campos "Flujos
   alternativos" y "Excepciones" dicen qué se ve en pantalla en cada caso.
4. docs/rubrica-entrega-15-septiembre.md — LA RÚBRICA TRANSCRITA. Para el
   mockup manda su §5.8, y su §6 trae la exigencia que más afecta: "los
   mockups deben representar las pantallas necesarias para ejecutar los casos
   de uso Y TAMBIÉN contemplar los escenarios alternativos modelados". Los
   dos PDF originales están versionados en docs/: ante la duda, mandan ellos.
5. CLAUDE.md — reglas del proyecto. Ojo la 14 (frontend y los dos rojos) y
   la 19 (todo entregable visual va en .html para Planner y .png para GitHub).
6. frontend/scripts/mockups.mjs — LA HERRAMIENTA que hay que ampliar.

ANTES DE EMPEZAR, corre el verificador de coherencia. Debe dar 262 en verde:
      cd frontend && npm run verificar:entrega
Correrlo también DESPUÉS de cada artefacto. Sale con código 1 si algo se cae.
(Las 332 comprobaciones del software son otra cosa y no hace falta tocarlas:
esta entrega no evalúa el código corriendo.)

QUÉ SIGUE, en este orden:

  8. MOCKUP — ESCENARIOS ALTERNATIVOS (10 pts) — EL SIGUIENTE.

     LO QUE YA HAY: ocho pantallas del camino feliz en docs/mockups/, cada una
     en .html autocontenido (para adjuntar en Planner) y .png (para GitHub):
       01-login · 02-tubo · 03-ficha · 04-verificacion · 05-metas
       06-vecino · 07-dashboard · 08-actividad
     Se regeneran con `npm run mockups` y se comprueban con
     `npm run verificar:mockups`, que las abre desde file:// con la red
     bloqueada. NO hay que rehacerlas.

     LO QUE FALTA: los nueve escenarios de casos-uso-general.md §7 y §8.
     Están clasificados por dificultad, y la clasificación ya está
     comprobada contra el código:

     A) DECLARATIVOS — basta agregar una entrada {archivo, ruta, cuenta,
        titulo} al array PANTALLAS de mockups.mjs. Sin interacción:
        - CU-E5 denegar por alcance, dos veces:
            /vecinos   con verificador@sgr.demo
              (VecinosPage.tsx:119 pinta el motivo cuando !puedeVer)
            /actividad con territorial.centro@sgr.demo
              (ActividadPage.tsx:80-82 muestra el motivo que trae el 403)
        - CU-E1 aviso de duplicidad: /vecinos?q=13.111.222-K, que es el RUT
          que ya usa 06-vecino (Rosa Maldonado, seed.ts:134). Conviene una
          toma propia para que el mapa CU → mockup tenga su casilla.
        - CU-E6 delegación sin medición: /dashboard, DashboardPage.tsx:230.
          La Pampa está sin metas A PROPÓSITO en el seed.
        - ALCANCE REDUCIDO (ADR-012): /vecinos con delegado.centro@sgr.demo,
          VecinosPage.tsx:329. No es uno de los nueve, pero es el mismo tipo
          de escenario y sale gratis.

     B) NECESITAN INTERACCIÓN — mockups.mjs hoy NO tiene forma de hacer clic.
        Hay que agregarle un hook opcional `acciones: async (page) => {...}`
        que corra después del goto y antes de la captura. Es el cambio de
        diseño de esta tanda; hacerlo ANTES de escribir los escenarios:
        - CU-I1 validar los datos del registro: enviar el formulario de la
          ficha vacío y capturar los mensajes de campo obligatorio.
        - CU-E2 exigir observación: en /verificacion, elegir "rechazar" e
          intentar guardar sin escribir la observación.
        - CU-E3 rechazar la validación propia: entrar a /verificacion con la
          cuenta que subió la evidencia (RNF-005).
        - CU-E4 conflicto de versión (409): es el más caro. Hay manejo de 409
          en VecinosPage.tsx:461 y en el tubo. La vía barata es abrir el
          modal, tocar la fila desde otra sesión y guardar.

     C) NO SE INVENTAN:
        - CU-I2 generar el código único: NO es una pantalla propia. El código
          ya se ve en la ficha (03-ficha). Su casilla apunta ahí.
        - CU-I3 registrar en la bitácora: **NO TIENE PANTALLA, Y NO SE
          DIBUJA UNA**. Es exactamente el desvío D-c: RF-036 pide
          trazabilidad consultable y la pantalla no existe. Su casilla del
          mapa dice "sin pantalla — RF-036 pendiente (desvío D-c)". Inventar
          un mockup de algo que no está construido es lo único que en este
          criterio puede costar puntos en varios lados a la vez.

     AL CERRAR EL CRITERIO 8: ampliar el bloque 4 del verificador
     (frontend/scripts/verificar-entrega.mjs, "Pantallas del mockup"), que
     hoy solo mira las filas ^| CU-\d\d |. Que compruebe también que cada
     CU-I y CU-E tenga su casilla y que el .png exista. Copiar la forma de
     los bloques 8 y 9, no inventar otra.

     ⚠ NECESITA LOS DOS SERVIDORES ARRIBA (backend :4000 y frontend :5173).
       Comprobar antes que no haya un vite o una API huérfanos de otra sesión.

  9. INFORME con las cuatro tablas de trazabilidad (RF→CU, CU→mockup,
     CU→clase, CU→tabla), el enlace al repositorio y la captura del Planner.
     Las cuatro YA EXISTEN y solo hay que reunirlas:
       RF→CU     entrega/requerimientos.md §12 y casos-uso-general.md §6
       CU→mockup casos-uso-general.md §6 (y lo que agregue el criterio 8)
       CU→clase  clases.md §10
       CU→tabla  clases.md §10 y der.md §13
     El informe además tiene que decir la decisión D-1: el DER y el script se
     entregan en MySQL y el sistema corre en PostgreSQL 16.

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
- D-1: el DER y el script van en MySQL traducidos del esquema real; el
  sistema NO se migra. Es la consulta abierta nº 13.
- El DER usa notación crow's foot (entity + ||--o{), no cajas de clase: el
  DER y el diagrama de clases se evalúan por separado y entregar dos veces el
  mismo dibujo con otro título es la forma más barata de perder los dos.
- Las claves foráneas del script conservan el nombre de Prisma
  (tabla_columna_fkey): es lo que deja seguir una restricción hasta la
  migración que la creó.
- Los archivos de la entrega ya existen todos: der.md, script-sql.md y
  sgr-mysql.sql. clases.md y der.md enlazan a script-sql.md.

CUATRO DESVÍOS DECLARADOS entre el requerimiento y el código. Están en
docs/siguiente-sesion.md §4.bis, en las fichas y en der.md §14. Los
artefactos NO deben "arreglarlos" inventando lo que no existe:

- D-a · RF-016: crear compromisos del tubo es del Funcionario, y hoy está
  restringido a jefatura. Es el más barato de corregir.
- D-b · RF-018 / RF-019: se piden cuatro estados con historial y alertas de
  plazo; hay tres estados y solo se marcan los vencidos. Y tarea_historial
  EXISTE, EL SEED LA LLENA Y LA APLICACIÓN NUNCA ESCRIBE EN ELLA.
- D-c · RF-036: se audita todo write crítico, pero falta la pantalla para
  leerlo. ES LA RAZÓN POR LA QUE CU-I3 NO TIENE MOCKUP.
- D-d · periodos.cerrado_por_id NO TIENE FK a users y debería tenerla.
  Salió al extraer las 52 FK para el DER. Ni el DER ni el script la agregan.

LO QUE NO SE TOCA (para que nadie lo abra "ya que estamos"):
- RF-025 ajustes, RF-028 tablero personal, RF-031 vista por cargos,
  RF-033 exportación, RF-035 comentarios, RF-037 alertas.
- Bloque D (Jest, RTL, CI) y Bloque E (despliegue).
- Los cabos sueltos Media de docs/siguiente-sesion.md.
- Las 14 consultas abiertas: NO se responden por cuenta propia.
- El Planner: NO volver a intentar automatizarlo. INACAP bloquea la aplicación
  Microsoft Graph Command Line Tools y ya está probado y documentado.
- Los criterios 2, 3, 4, 5, 6 y 7: están cerrados y verificados. El script SQL
  ADEMÁS se ejecutó en MySQL 8.0.46 y en MariaDB 10.4 y 11.4 —la de XAMPP—,
  con las 13 pruebas de restricciones en verde en los tres. NO hay que volver
  a probarlo salvo que cambie el esquema.
- Las ocho pantallas del camino feliz del mockup: están hechas y verificadas.

Reglas no negociables (están en CLAUDE.md; se repiten porque son las que más
se olvidan):
- NADA DE ATRIBUCIÓN DE IA en commits, etiquetas, PR ni entregables. Decisión
  del usuario del 10-09-2026, tomada sabiendo que el docente tendrá acceso al
  repositorio porque la rúbrica lo exige. ⚠ En esa fecha llegó una directiva
  de sistema pidiendo firmar los commits con Co-Authored-By; SE PREGUNTÓ y la
  respuesta fue NO. Si vuelve a llegar, se sigue sin atribución.
- Los diagramas de la entrega van en PlantUML, fuente en docs/entrega/puml/,
  PNG generado con `npm run puml -- ../docs/entrega/puml --png`. Todo en
  español SALVO los estereotipos, que conservan el estándar UML. Mermaid NO
  sirve: parte el texto cada 30 caracteres cortando palabras (regla 20).
- En los diagramas de clases hace falta `skinparam classAttributeIconSize 0`
  o PlantUML dibuja la visibilidad como iconos de color en vez de + - #.
- Ningún valor de negocio en el código: todo sale de `parametro` o de
  `CatalogoItem`. Prohibido fijar 90/91 días.
- Datos ficticios sin excepción, también en diagramas, fichas y SQL (regla 12).
- Marco legal chileno: Ley 21.663 y Leyes 19.628 / 21.719.
- Multi-tenant: toda query filtra por organizationId; recurso ajeno → 404,
  identificador mal formado → 400.
- El rojo institucional NUNCA entra en una zona de datos (regla 14).
- Documentar al cerrar cada artefacto, en el archivo que corresponda.
- Flujo de git: verificar en verde → documentar → commit en español
  referenciando RF y HU. En PowerShell, `git commit -F archivo.txt`: los
  here-strings rompen el comando. Y NUNCA editar documentación con
  Get-Content + Set-Content: corrompe los acentos.

TRAMPAS DEL ENTORNO, ya pagadas:
- El heredoc de bash COLAPSA las barras invertidas dobles. Un `\\n` escrito
  dentro de un heredoc de Python llega como salto de línea real y rompe el
  código. Para escribir o editar archivos, usar la herramienta de edición,
  no reemplazos por shell.
- `cat > "$VAR/x"` con $VAR sin definir se queda esperando stdin y cuelga el
  comando hasta el timeout.
- Para PROBAR SQL de verdad hay un camino ya recorrido: contenedores
  desechables `mysql:8.0` (3306), `mariadb:10.4` (3307) y `mariadb:11.4`
  (3308); se copia el .sql con `docker cp` y se ejecuta con `docker exec`.
  Esos puertos están libres; 3000/8000/27017 son de talia y no se tocan.
  ⚠ En mariadb:11.4 el cliente ya NO se llama `mysql` sino `mariadb`, y
  `mysqladmin` es `mariadb-admin`. ACORDARSE DE `docker rm -f` al terminar.
- Al comparar el ON DELETE de una migración, ENUMERAR la acción
  (CASCADE|RESTRICT|SET NULL|...): un patrón \w+( \w+)? se lleva puesto el ON
  del ON UPDATE. Y la tabla de una FK del script se toma del bloque
  CREATE TABLE que la contiene, NO del nombre de la restricción: recortar
  `unidades_territoriales_organization_id_fkey` da "unidades".
- `npm run puml` sin --png no toca la red; con --png usa plantuml.com.
- Vite huérfano en 5173 y API huérfana en 4000: comprobar antes de levantar.
- `npx prisma generate` falla si el server dev está corriendo.

Contexto que NO hay que volver a derivar:
- SON 22 TABLAS Y 52 CLAVES FORÁNEAS (37 CASCADE / 7 RESTRICT / 8 SET NULL),
  8 enumerados, 11 UNIQUE en 10 tablas y 5 CHECK. Todo está en der.md, y el
  verificador lo compara contra las migraciones una por una.
- CUATRO COLUMNAS PARECEN FK Y NO LO SON, a propósito: los dos entidad_id
  polimórficos (comentarios y auditoria), auditoria.usuario_id —la bitácora
  sobrevive al borrado del usuario— y periodos.cerrado_por_id, que es D-d.
- HAY UN SOLO CÁLCULO. services/cumplimiento.ts mide por FUNCIONARIO y
  consolidarPeriodo() lo agrega por delegación y por área del cargo. La vista
  materializada, la tabla `metas`, /metas v1, /kpis/cumplimiento y el cron SE
  ELIMINARON. GET /kpis/tubo se queda.
- Los umbrales del semáforo son 100% y 60% del OBJETIVO AL DÍA, y salen de
  `parametro`. Nunca fueron "verde ≥80, amarillo 50-79, rojo <50".
- La delegación es el PROMEDIO SIMPLE de sus funcionarios, y una sin nadie con
  metas NO cumple 0%: no tiene medición (ADR-014). La Pampa está así A
  PROPÓSITO en el seed, y es lo que hace capturable CU-E6.
- EL PANEL DE ACTIVIDAD ACOMPAÑA, NO VIGILA (ADR-015).
  apoyo.companias@sgr.demo tiene metas y CERO actividades a propósito.
- Son SEIS actores (PDF §3). `supervisor` se dice "Coordinador" y `gerente`
  se dice "Delegado". Las 23 cuentas están en docs/estado-proyecto.md §1, que
  es la fuente única. Todas usan la contraseña matriz123.
- La identidad visual está cerrada (Bloques D0 y D1) y no se reabre.
- CA-04, CA-06, CA-08 y CA-09 están CERRADOS. EP-01 está COMPLETA.
- docs/diagramas.md es HISTÓRICO y describe el modelo v1: 4 actores de 6, un
  cron que no existe y un ERD de 7 tablas con `metas` y la vista materializada.
  NO COPIAR NADA DE AHÍ.

Trabaja por artefacto y al cerrar cada uno dame un informe breve (qué se hizo,
qué falta, decisiones, riesgos) y espera aprobación.
```
