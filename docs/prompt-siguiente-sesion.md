# Prompt para abrir una sesión nueva

Copiar y pegar tal cual. Se mantiene corto a propósito: **no repite lo que ya está en los documentos**, los señala. Actualizarlo al cerrar cada artefacto, junto con [siguiente-sesion.md](siguiente-sesion.md).

**Última actualización**: 10 de septiembre de 2026 · rama `entrega/analisis-diseno`, sin mergear a `main`
**Lo que abre**: la **entrega del 15 de septiembre** (primera evaluación de Análisis y Diseño, 100 pts). Van **100 puntos cubiertos y el informe escrito**: criterios 2 a 8 cerrados. Se retoma en la **documentación viva desfasada**, y queda cargar el Planner a mano.

---

```
Continuamos el proyecto SGR (Sistema de Gestión de Resultados), en
c:\Users\zgf\Documents\Scripts\matriz-sgr.

Estamos en la rama entrega/analisis-diseno, que NO está mergeada a main.
Esta sesión NO es de código de producto: es la entrega del 15 de septiembre,
de análisis y diseño. La rúbrica lo dice literal: "Para esta entrega no se
evaluará conexión con base de datos ni consumo de API".

LEE PRIMERO, EN ESTE ORDEN:

1. docs/entrega/README.md — EL ESTADO. Qué criterio está listo, las decisiones
   ya tomadas para no rediscutirlas y lo que no se toca. Sus secciones "Cómo
   quedó el criterio 3/4/5/6/7/8" y "Cómo quedó el informe" evitan rehacer
   trabajo ya discutido.
2. docs/entrega/informe.md — EL DOCUMENTO PARAGUAS, ya escrito. Si algo cambia
   en cualquier artefacto, este es el que hay que revisar también.
3. docs/rubrica-entrega-15-septiembre.md — LA RÚBRICA TRANSCRITA. Los dos PDF
   originales están versionados en docs/: ante la duda, mandan ellos.
4. CLAUDE.md — reglas del proyecto.

ANTES DE EMPEZAR, corre el verificador de coherencia. Debe dar 343 en verde:
      cd frontend && npm run verificar:entrega
Correrlo también DESPUÉS de cada artefacto. Sale con código 1 si algo se cae.
(Las 332 comprobaciones del software son otra cosa y no hace falta tocarlas:
esta entrega no evalúa el código corriendo.)

QUÉ SIGUE, en este orden:

  9. ~~INFORME~~ ✅ HECHO. docs/entrega/informe.md y su PDF. Trae las cuatro
     tablas de trazabilidad (RF→CU, CU→mockup, CU→clase+servicio, CU→tabla),
     el enlace al repositorio, la decisión D-1, los cuatro desvíos y las
     consultas abiertas. El verificador lo ata a sus fuentes.
     ⚠ TIENE UN HUECO MARCADO A PROPÓSITO: la captura del Planner del §10.
     Se llena cuando el tablero esté cargado, y hay que acordarse.

 10. DOCUMENTACIÓN VIVA desfasada, que la rúbrica castiga por incoherencia.
     ES LO SIGUIENTE:
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
- CU-I2 y CU-I3 NO tienen mockup, y las dos ausencias están argumentadas en
  el mapa del §8.1. CU-I3 es el desvío D-c: inventarle una pantalla a RF-036
  haría desaparecer del artefacto justo lo que falta construir.

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
- EL INFORME (docs/entrega/informe.md): está escrito y verificado. Solo se
  toca si cambia un artefacto que él resume, y en ese caso se cambian los dos.
  Su columna de servicios se derivó ENDPOINT POR ENDPOINT, no por los imports
  del archivo de rutas: un módulo atiende varios casos de uso.
- Los criterios 2 a 8: están cerrados y verificados. El script SQL ADEMÁS se
  ejecutó en MySQL 8.0.46 y en MariaDB 10.4 y 11.4 —la de XAMPP—, con las 13
  pruebas de restricciones en verde en los tres. NO hay que volver a probarlo
  salvo que cambie el esquema.
- LAS 17 PANTALLAS DEL MOCKUP (8 del camino feliz + 9 escenarios
  alternativos): están hechas, verificadas y miradas una por una. Solo se
  regeneran si cambia la interfaz.
- LOS TRES CASOS DELIBERADOS DEL SEED, que son los que hacen demostrables tres
  reglas: La Pampa sin medición (ADR-014), apoyo.companias con metas y cero
  actividades (ADR-015) y la evidencia que subió el coordinador y por eso no
  puede validar (RNF-005, CU-E3). Tocar uno obliga a rehacer su mockup.

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
- EL SEED TARDA ~20 MINUTOS y no imprime nada hasta el final: codifica a mano
  2.058 PNG de 800x600 con deflate nivel 9. No está colgado. Para saber si
  avanza, mirar el CPU del proceso, no la salida.
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
  metas NO cumple 0%: no tiene medición (ADR-014).
- EL PANEL DE ACTIVIDAD ACOMPAÑA, NO VIGILA (ADR-015).
- Son SEIS actores (PDF §3). `supervisor` se dice "Coordinador" y `gerente`
  se dice "Delegado". Las 23 cuentas están en docs/estado-proyecto.md §1, que
  es la fuente única. Todas usan la contraseña matriz123.
- La identidad visual está cerrada (Bloques D0 y D1) y no se reabre.
- CA-04, CA-06, CA-08 y CA-09 están CERRADOS. EP-01 está COMPLETA.
- docs/diagramas.md es HISTÓRICO y describe el modelo v1: 4 actores de 6, un
  cron que no existe y un ERD de 7 tablas con `metas` y la vista materializada.
  NO COPIAR NADA DE AHÍ.
- EL GENERADOR DE MOCKUPS SABE HACER CLIC. frontend/scripts/mockups.mjs tiene
  un hook `acciones({ page, api })` que opera la pantalla real y una segunda
  sesión contra el backend (así se provoca el 409 de verdad), y un `foco` que
  recorta el PNG a una franja alrededor del mensaje. Si el elemento de `foco`
  no aparece, REVIENTA A PROPÓSITO: guardar la pantalla normal con el nombre
  de un caso de error es un entregable que miente.

Trabaja por artefacto y al cerrar cada uno dame un informe breve (qué se hizo,
qué falta, decisiones, riesgos) y espera aprobación.
```
