# Guía paso a paso: cargar el plan en Planner con el script

> ⚠ **Esta no es la ruta elegida.** Desde el 8 de septiembre de 2026 el tablero se completa **a mano**, siguiendo [entrega/guia-planner-hector.pdf](entrega/guia-planner-hector.pdf). Este documento queda como respaldo, por si alguna vez conviene cargar en lote.
>
> Y una advertencia si se usa: el script deduplica **por título exacto**, y el tablero ya tiene ocho tareas creadas a mano. Un acento distinto entre el CSV y el título real crearía la tarea dos veces. Correr siempre `-SoloSimular` primero y revisar la salida completa.

Para alguien que nunca ha usado Planner ni ha corrido un script de PowerShell. Sigue los pasos en orden; ninguno borra nada y el paso 4 es una **simulación** que no escribe.

---

## Antes de empezar: ¿qué vamos a hacer?

Tienes un plan en Planner (`DesarrolloSW-MuniLS-OrigamiSpA`) con **6 columnas vacías** (Ámbito, Requisitos, Diseño, Desarrollo, Pruebas, Piloto). En Planner esas columnas se llaman **depósitos** (buckets).

Vamos a llenar esas columnas con las 58 tareas del plan, cada una con su fecha, en vez de escribirlas a mano una por una. Eso lo hace el script `cargar-plan-planner.ps1`, que lee el archivo `docs/plan-desarrollo.csv` y las va creando por ti.

---

## Paso 1 — Abrir la terminal en la carpeta correcta

El script debe correr **dentro de la carpeta del proyecto**, si no, no encuentra el CSV.

**En VS Code** (lo más fácil, ya lo tienes abierto):
1. Menú **Terminal → Nuevo terminal** (o el atajo `Ctrl` + `` ` ``, la tecla del acento grave, arriba a la izquierda del teclado).
2. Abajo se abre un panel negro. Mira que en la esquina derecha de ese panel diga **PowerShell**. Si dice otra cosa, haz clic en la flechita `∨` del `+` y elige *PowerShell*.
3. Escribe esto y presiona Enter para confirmar dónde estás parado:

```powershell
cd c:\Users\zgf\Documents\Scripts\matriz-sgr
```

Para comprobar que estás bien, escribe `ls` y presiona Enter: deberías ver las carpetas `backend`, `frontend`, `docs`, `scripts`.

---

## Paso 2 — Instalar los módulos (solo la primera vez)

Son las "piezas" que le permiten a PowerShell hablar con Microsoft 365. Copia y pega esta línea completa, Enter:

```powershell
Install-Module Microsoft.Graph.Authentication, Microsoft.Graph.Planner -Scope CurrentUser -Force
```

- Demora **2 a 5 minutos**. Verás una barra de progreso; es normal.
- Si pregunta *"¿Está seguro de que desea instalar los módulos desde 'PSGallery'?"* escribe `S` (o `Y`) y Enter.
- Si dice que el repositorio "no es de confianza", es normal: acepta.

**Esto se hace una sola vez.** La próxima vez saltas directo al paso 4.

---

## Paso 3 — Permitir la ejecución de scripts (solo la primera vez)

Windows bloquea scripts por defecto. Esta línea lo permite **solo en esta ventana de terminal** (al cerrarla vuelve todo como estaba, así que es seguro):

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
```

No muestra nada si funcionó. Si te aparece un error rojo, avísame.

---

## Paso 4 — LA SIMULACIÓN (esto no escribe nada) 🔍

Aquí está lo que preguntaste. El "modo simulación" es el texto `-SoloSimular` al final de la línea. Con eso el script **lee todo, se conecta, revisa tu plan y te muestra qué haría, pero no crea ninguna tarea**:

```powershell
.\scripts\cargar-plan-planner.ps1 -SoloSimular
```

> El `.\` del principio es obligatorio en PowerShell: significa "el script que está en esta carpeta".

**Qué va a pasar, en orden:**

1. Se abre una **ventana del navegador** pidiéndote iniciar sesión → usa tu **cuenta de la universidad** (la misma con la que entras a Planner).
2. Aparece una pantalla de permisos que dice algo como *"Microsoft Graph Command Line Tools quiere: Leer y escribir sus tareas"*. Haz clic en **Aceptar / Consentir**.
3. Vuelves a la terminal y verás algo así:

```
Filas leídas del CSV: 58
Conectado como: tunombre@universidad.cl
Plan encontrado: DesarrolloSW-MuniLS-OrigamiSpA
Buckets en el plan:
  - Ámbito
  - Requisitos de análisis o software
  - Diseño
  - Desarrollo
  - Pruebas
  - Piloto e implementación
  + [simulado] AMBITO | Reunión de levantamiento con el cliente | 2026-08-25 -> 2026-08-25 | Completado
  + [simulado] AMBITO | Documento maestro del proyecto | 2026-08-20 -> 2026-08-25 | Completado
  ... (58 líneas)

Listo. Creadas: 58 | Omitidas: 0
(Fue una simulación: no se escribió nada en Planner)
```

**Revisa dos cosas antes de seguir:**
- Que los 6 buckets aparezcan en la lista (si alguno falta, saldría un aviso amarillo).
- Que diga *Creadas: 58*.

Si en vez de eso ves un error, cópiamelo y lo resolvemos.

---

## Paso 5 — La carga de verdad

Cuando la simulación se vea bien, corre lo mismo **sin** `-SoloSimular`:

```powershell
.\scripts\cargar-plan-planner.ps1
```

Demora **1 a 3 minutos** (crea las tareas una por una). Al terminar dirá `Creadas: 58`.

### Si quieres que además asigne responsables

Reemplaza los correos por el tuyo y el de tu compañero (los de la universidad):

```powershell
.\scripts\cargar-plan-planner.ps1 -EmailA tunombre@universidad.cl -EmailB compañero@universidad.cl
```

Si tu universidad no permite buscar usuarios, el script te avisará y creará las tareas **sin asignar** — no falla, y luego las asignas a mano en Planner.

---

## Paso 6 — Mirar el resultado en Planner

Abre tu plan y prueba las cuatro vistas de arriba:

| Vista | Para qué sirve |
|---|---|
| **Panel** | Las columnas que ya conoces. Ahora cada depósito tendrá sus tarjetas. |
| **Cuadrícula** | Vista de tabla, la más cómoda para **cambiar fechas rápido**. |
| **Calendario** | Ve las tareas en un calendario mensual, útil para ver la carga por semana. |
| **Gráficos** | Muestra avance y reparto — es lo que le vas a mostrar al profesor. |

**Cosas útiles que puedes hacer:**
- **Clic en una tarjeta** → se abre el detalle con fecha de inicio, vencimiento, avance y las notas que escribí.
- **Arrastrar una tarjeta** de un depósito a otro, igual que en nuestro tubo de trabajo.
- **Cambiar una fecha**: clic en la tarea → campos *Fecha de inicio* y *Fecha de vencimiento*.
- **Marcar avance**: en la tarea, el campo *Progreso* (No iniciada / En curso / Completada).
- Las 23 tareas de las fases ya hechas llegan marcadas al **100%**, así el profesor ve el avance real.

---

## Si necesitas cambiar el plan después

Tienes dos caminos, ambos válidos:

**A) Cambios sueltos** → hazlos directo en Planner (arrastrar, cambiar fecha, marcar completada). Es lo normal día a día.

**B) Cambios grandes** (agregar 10 tareas, mover todo un sprint) → edita `docs/plan-desarrollo.csv` con Excel o VS Code y vuelve a correr el script. **No duplica nada**: las tareas que ya existen las omite y solo agrega las nuevas. Verás `= ya existe: ...` en gris para cada una que salta.

---

## Problemas frecuentes

| Lo que ves | Qué significa | Solución |
|---|---|---|
| `No se reconoce el término '.\scripts\...'` | No estás en la carpeta del proyecto | Repite el paso 1 (`cd c:\Users\zgf\Documents\Scripts\matriz-sgr`) |
| `No se puede cargar el archivo ... está deshabilitada la ejecución de scripts` | Falta el permiso de ejecución | Repite el paso 3 |
| `No se encontró el plan '...'` | El nombre no coincide exactamente | El script imprime la lista de tus planes: copia el nombre tal cual y agrégalo con `-NombrePlan "nombre exacto"` |
| `Connect-MgGraph : ... AADSTS65001` o "necesita aprobación del administrador" | Tu universidad restringe permisos | Corre sin `-EmailA/-EmailB`; si aun así falla, pide al profesor o a soporte TI que apruebe el permiso *Tasks.ReadWrite* |
| Aviso amarillo `No se encontró bucket para la clave X` | Un depósito tiene otro nombre | Dime cómo se llama exactamente y ajusto el script |
| Se cargaron tareas repetidas | Corriste el script dos veces con títulos distintos en el CSV | En Planner selecciona y elimina las sobrantes |
