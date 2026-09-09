# Cargar el plan en Planner con el script — paso a paso

**Actualizado**: 8 de septiembre de 2026 · **Qué carga**: las **87 tareas** de [plan-desarrollo.csv](plan-desarrollo.csv) en el plan `DesarrolloSW-MuniLS-OrigamiSpA`

Sigue los pasos en orden. El paso 5 es una **simulación que no escribe nada**, y existe una forma de **deshacer** la carga (paso 8), así que ningún paso es irreversible.

> ⚠ **El tablero no está vacío y es compartido.** Héctor ya creó ocho tareas: «Presentación Profesor», las cinco de Diseño (GIT, Diseño MockUps, Modelo Entidad-Relación, Diagramas UML, Diagramas de Clase) y las dos de Etapas Terminadas. **El script no las toca**: omite toda tarea cuyo título ya exista. Lo que hace es llenar Ámbito, Requisitos, Desarrollo, Pruebas y Piloto, que hoy están casi vacíos.
>
> Lo que el script **no** hace está en la **tanda 6** de [entrega/guia-planner-hector.pdf](entrega/guia-planner-hector.pdf): la etiqueta «En revisión», adjuntar cada artefacto a su tarea, la captura del tablero y el enlace. Eso sigue siendo a mano, y es lo que decide si el trabajo se evalúa.

---

## Paso 1 — Abrir la terminal en la carpeta del proyecto

El script debe correr **dentro de la carpeta del repositorio**, si no, no encuentra el CSV.

**En VS Code** (lo más fácil, ya está abierto):

1. Menú **Terminal → Nuevo terminal**, o el atajo `Ctrl` + `` ` `` (la tecla del acento grave, arriba a la izquierda).
2. Abajo se abre un panel. Mira que en la esquina derecha diga **PowerShell**. Si dice *bash* o *cmd*, haz clic en la flechita `∨` junto al `+` y elige **PowerShell**.
3. Confirma dónde estás:

```powershell
cd c:\Users\zgf\Documents\Scripts\matriz-sgr
```

Para comprobarlo, escribe `ls` y Enter: deberías ver `backend`, `frontend`, `docs`, `scripts`.

---

## Paso 2 — Preparar PowerShell (solo la primera vez)

Los tres comandos van **uno por uno**, esperando que termine cada uno.

```powershell
# Que la galería de módulos se pueda alcanzar por TLS 1.2 (PowerShell 5.1 lo necesita)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# El proveedor que descarga módulos
Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Scope CurrentUser -Force

# Los dos módulos de Microsoft Graph que usa el script
Install-Module Microsoft.Graph.Authentication, Microsoft.Graph.Planner -Scope CurrentUser -Force
```

- El último demora **2 a 5 minutos** y muestra una barra de progreso. Es normal.
- Si pregunta si confías en el repositorio `PSGallery`, responde `S` (o `Y`) y Enter.
- `-Scope CurrentUser` significa que **no hace falta ser administrador** del equipo.

---

## Paso 3 — Permitir la ejecución de scripts (cada vez que abras una terminal nueva)

Windows bloquea los scripts por defecto. Esta línea lo permite **solo en esta ventana**; al cerrarla vuelve todo como estaba:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
```

No muestra nada si funcionó.

---

## Paso 4 — Los correos del equipo

El script asigna responsables si le pasas los dos correos institucionales:

| Letra en el CSV | Persona | Correo |
|---|---|---|
| `A` | Tomás | `tomas.ibacache@inacapmail.cl` |
| `B` | Héctor | `hector.vergara24@inacapmail.cl` |
| `Ambos` | los dos | — |

> ⚠ **Pasar los correos cambia los permisos que se piden.** Sin correos, el script solo pide `Tasks.ReadWrite`, que cualquier usuario aprueba por sí mismo. Con correos pide además `User.ReadBasic.All`, y **algunos tenants universitarios exigen aprobación del administrador para ese permiso**. Si INACAP lo bloquea, el inicio de sesión falla con un mensaje de «necesita aprobación del administrador» (`AADSTS65001` o similar).
>
> **No es un problema**: se corre sin correos y las 87 tareas se crean igual, sin asignar; después se asignan en Planner, que además permite seleccionar varias tarjetas a la vez. Por eso el paso 5 se hace **con** los correos: para que, si el permiso está bloqueado, lo descubras en la simulación y no a mitad de la carga real.

---

## Paso 5 — LA SIMULACIÓN (no escribe nada)

```powershell
.\scripts\cargar-plan-planner.ps1 -SoloSimular -EmailA tomas.ibacache@inacapmail.cl -EmailB hector.vergara24@inacapmail.cl
```

> El `.\` del principio es obligatorio en PowerShell: significa «el script que está en esta carpeta».

**Qué va a pasar, en orden:**

1. Se abre una ventana del navegador pidiendo iniciar sesión → usa **tu cuenta INACAP**, la misma con la que entras a Planner.
2. Aparece una pantalla de permisos de *Microsoft Graph Command Line Tools*. Haz clic en **Aceptar**.
3. Vuelves a la terminal y verás algo así:

```
Filas leídas del CSV: 87
Conectado como: tomas.ibacache@inacapmail.cl
Responsable A: Tomás Ibacache
Responsable B: Héctor Vergara
Plan encontrado: DesarrolloSW-MuniLS-OrigamiSpA
Buckets en el plan:
  - Ámbito
  - Requisitos de análisis o software
  - Diseño
  - Desarrollo
  - Pruebas
  - Piloto e implementación
  - Etapas Terminadas
  + [simulado] AMBITO | Reunión de levantamiento con el cliente (Muni La Serena) | ...
  ... (87 líneas)

Listo. Creadas: 87 | Omitidas: 0
(Fue una simulación: no se escribió nada en Planner)
```

### Las cuatro cosas que hay que revisar antes de seguir

1. **`Filas leídas del CSV: 87`.** Si dice otro número, el CSV no es el que corresponde.
2. **Los seis depósitos aparecen emparejados.** «Etapas Terminadas» aparece en la lista pero **no se empareja con ninguna clave del CSV, y eso está bien**: ahí solo vive lo que Héctor ya cerró. Si sale un aviso amarillo *«No se encontró bucket para la clave...»*, para: ese depósito fue renombrado y sus tareas se perderían.
3. **`Creadas: 87 | Omitidas: 0`.**
4. **Ninguna línea `+ [simulado]` repite un título que ya esté en el tablero.** Busca en la salida `Modelo Entidad`, `Diseño MockUps`, `Diagramas UML`, `Diagramas de Clase`, `GIT` y `Presentación Profesor`. **No deberían aparecer.** Si alguno aparece, es que el título de Héctor difiere en un acento del que trae el CSV y quedaría duplicado: avísame antes de cargar.

> **Si el inicio de sesión falla por permisos**, quita los dos correos y repite:
> ```powershell
> .\scripts\cargar-plan-planner.ps1 -SoloSimular
> ```

---

## Paso 6 — La carga de verdad

Cuando la simulación se vea bien, **exactamente el mismo comando sin `-SoloSimular`**:

```powershell
.\scripts\cargar-plan-planner.ps1 -EmailA tomas.ibacache@inacapmail.cl -EmailB hector.vergara24@inacapmail.cl
```

Demora **2 a 5 minutos**: crea las tareas una por una y a cada una le escribe su descripción. Verás una línea verde por tarea creada. Al terminar dirá `Creadas: 87 | Omitidas: 0`.

---

## Paso 7 — Comprobar que quedó bien

**Vuelve a correr la simulación.** Es la comprobación más barata que hay:

```powershell
.\scripts\cargar-plan-planner.ps1 -SoloSimular
```

Ahora debe decir **`Creadas: 0 | Omitidas: 87`** y listar las 87 como `= ya existe`. Si dice que crearía alguna, esa no se creó en el paso 6 y hay que revisar por qué.

Después abre el plan en el navegador y revisa:

| Qué mirar | Cómo debería verse |
|---|---|
| Ningún depósito vacío | Ámbito 9 · Requisitos 11 · Diseño 11 + las 5 de Héctor · Desarrollo 31 · Pruebas 15 · Piloto 10 |
| Las tareas terminadas | Aparecen tachadas y al fondo de su columna. Son 53 |
| Las tareas de Héctor | Intactas, con sus listas de comprobación |
| Vista **Gráficos** | Muestra el reparto por estado y por persona — es una buena captura para el informe |

---

## Paso 8 — Si algo sale mal: deshacer

El script puede revertir su propia carga. **Borra solo las tareas cuyo título está en el CSV**, así que las ocho de Héctor y cualquier otra creada a mano quedan intactas.

Primero, ver qué borraría (**no borra nada**):

```powershell
.\scripts\cargar-plan-planner.ps1 -Deshacer
```

Imprime dos listas: las que borraría y las que **no** se tocan. Revisa que las de Héctor estén en la segunda. Si está todo bien:

```powershell
.\scripts\cargar-plan-planner.ps1 -Deshacer -Confirmo
```

Después de deshacer se puede corregir el CSV y volver al paso 5.

---

## Paso 9 — Lo que el script no hace

Esto es lo que decide si el trabajo se evalúa, y va a mano. Está desarrollado en la **tanda 6** de [entrega/guia-planner-hector.pdf](entrega/guia-planner-hector.pdf):

- **Crear la etiqueta «En revisión»**, que es como cubrimos el cuarto estado que pide la rúbrica (Planner básico solo tiene tres).
- **Adjuntar cada artefacto a su tarea.** El docente dijo que solo revisará el Planner: lo que no esté adjunto ahí, no se evalúa. El mapa de qué va en cada tarea está en [entrega/planner-delta.md](entrega/planner-delta.md) §5.
- **Capturar el tablero** con los seis depósitos poblados, y copiar el **enlace directo** al plan. Los dos van en el informe.

---

## Errores frecuentes

| Lo que ves | Qué pasa |
|---|---|
| `No se encontró el plan 'DesarrolloSW-MuniLS-OrigamiSpA'` | El script lista los planes visibles para tu cuenta. Copia el nombre exacto de esa lista y pásalo con `-NombrePlan "<nombre>"` |
| `Tu cuenta no tiene planes visibles en Planner` | Iniciaste sesión con otra cuenta. Cierra sesión con `Disconnect-MgGraph` y repite |
| `AADSTS65001` o «necesita aprobación del administrador» | Es el permiso `User.ReadBasic.All`. Corre sin `-EmailA`/`-EmailB` y asigna los responsables a mano |
| `No se pudo buscar a <correo>` | El correo está mal escrito o el permiso está denegado. Las tareas se crean igual, sin asignar |
| `No se encontró bucket para la clave 'X'` | Un depósito fue renombrado en el tablero. **Esas tareas se omiten**: hay que ajustar el patrón en el script o el nombre del depósito |
| `Tarea creada pero sin descripción` | La tarea existe pero le faltó la nota. Se puede escribir a mano, o deshacer y repetir |
| `no se puede cargar porque la ejecución de scripts está deshabilitada` | Falta el paso 3, y hay que repetirlo en cada terminal nueva |
