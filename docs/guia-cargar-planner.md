# Cargar el plan en Planner con el script — no se puede en INACAP

> # 🚫 Esta ruta está descartada
>
> **Probado el 9 de septiembre de 2026 y no funciona con las cuentas `@inacapmail.cl`.** El tenant de INACAP tiene desactivado el consentimiento de usuario para la aplicación **Microsoft Graph Command Line Tools**, que es la que usa cualquier script de PowerShell contra Microsoft 365. El inicio de sesión termina siempre en:
>
> > **Need admin approval** — *Microsoft Graph Command Line Tools needs permission to access resources in your organization that only an admin can grant.*
>
> No es un problema del script ni de un permiso concreto. Se probó **sin** `-EmailA`/`-EmailB`, pidiendo solo `Tasks.ReadWrite` —el permiso mínimo, que en un tenant normal aprueba el propio usuario— y también lo bloquea. Se probó además con código de dispositivo, que evita la ventana nativa de Windows: mismo resultado. **Está bloqueada la aplicación entera, no el permiso.**
>
> Desbloquearlo exige que un administrador de INACAP conceda consentimiento a esa aplicación para todo el tenant. No es una gestión razonable a una semana de la entrega, y tampoco es nuestra decisión pedirla.
>
> 👉 **La ruta que sí funciona es cargar el tablero a mano: [entrega/guia-planner-hector.pdf](entrega/guia-planner-hector.pdf)**, que trae el contenido exacto de cada una de las 87 tarjetas repartido en seis tandas.
>
> Este documento se conserva por dos razones: deja constancia de lo que se intentó y por qué no se pudo —que es justo lo que hay que poder responder si preguntan por qué no se automatizó— y sirve tal cual si algún día el proyecto se mueve a un tenant donde el consentimiento esté permitido.

**Qué cargaría**: las **87 tareas** de [plan-desarrollo.csv](plan-desarrollo.csv) en el plan `DesarrolloSW-MuniLS-OrigamiSpA`.

> ⚠ **El tablero no está vacío y es compartido.** Héctor ya creó ocho tareas: «Presentación Profesor», las cinco de Diseño (GIT, Diseño MockUps, Modelo Entidad-Relación, Diagramas UML, Diagramas de Clase) y las dos de Etapas Terminadas. **El script no las tocaría**: omite toda tarea cuyo título ya exista.

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

> ⚠ **INACAP bloquea el permiso que hace falta para asignar. Confirmado el 9 de septiembre de 2026.**
>
> Sin correos, el script solo pide `Tasks.ReadWrite`, que cualquier usuario aprueba por sí mismo. Con correos pide además `User.ReadBasic.All`, y ahí el inicio de sesión termina en **«Se necesita la aprobación del administrador»**: solo un administrador de INACAP puede concederlo.
>
> **Entonces la carga va sin correos.** Las 87 tareas se crean igual, sin responsable asignado, y los responsables se ponen después en Planner, que permite seleccionar varias tarjetas a la vez. La columna `Responsable` del CSV (A / B / Ambos) queda además escrita en la descripción de cada tarea, así que no se pierde la información: solo hay que aplicarla.

---

## Paso 5 — LA SIMULACIÓN (no escribe nada)

```powershell
.\scripts\cargar-plan-planner.ps1 -SoloSimular -Dispositivo
```

> **Por qué así y no con los correos**: `-Dispositivo` evita el intermediario de cuentas de Windows, que en el terminal de VS Code esconde la ventana o falla con «Unexpected response from the server». Y sin `-EmailA`/`-EmailB` no se pide `User.ReadBasic.All`, que INACAP no deja aprobar (paso 4).

> El `.\` del principio es obligatorio en PowerShell: significa «el script que está en esta carpeta».

**Si la terminal se queda en blanco después de «Modo código de dispositivo»**, el script está desactualizado: ese mensaje sale por la salida normal y no por consola, así que el `| Out-Null` que tenía se lo tragaba. Corregido el 9 de septiembre de 2026 — se comprueba con `git log -1 --oneline scripts/cargar-plan-planner.ps1`.

También se puede iniciar sesión **antes** y correr el script después: si ya hay sesión con los permisos necesarios, el script no vuelve a pedirla.

```powershell
Connect-MgGraph -Scopes "Tasks.ReadWrite" -UseDeviceCode
.\scripts\cargar-plan-planner.ps1 -SoloSimular
```

**Qué va a pasar, en orden:**

1. La terminal imprime una dirección (`https://microsoft.com/devicelogin`) y un **código de nueve caracteres**.
2. Abres esa dirección en el navegador, pegas el código e inicias sesión. Si te pregunta el tipo de cuenta, es **«Cuenta laboral o educativa»**: `tomas.ibacache@inacapmail.cl` la asigna INACAP, no es una cuenta personal de Microsoft.
3. Aparece la pantalla de permisos de *Microsoft Graph Command Line Tools* pidiendo leer y escribir tus tareas. **Aceptar**.
4. La terminal sigue sola y verás algo así:

```
Filas leídas del CSV: 87
Modo código de dispositivo: copia la URL y el código que aparecen abajo.
Conectado como: tomas.ibacache@inacapmail.cl
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

### Si el inicio de sesión se cuelga o falla

Los tres tropiezos que aparecieron de verdad el 9 de septiembre de 2026, en orden:

| Lo que pasa | Por qué | Qué hacer |
|---|---|---|
| La terminal se queda quieta tras `ADVERTENCIA: Sign in by Web Account Manager (WAM) is enabled...` | El inicio de sesión abre una **ventana nativa de Windows**, no una pestaña, y en el terminal de VS Code queda **detrás** | `Alt`+`Tab`, o mirar la barra de tareas. Casi siempre está ahí esperando |
| «Se necesita la aprobación del administrador» | Se pasaron los correos, y eso agrega el permiso `User.ReadBasic.All` que INACAP no deja aprobar | Correr **sin** `-EmailA`/`-EmailB`, como en el comando de arriba |
| «Se produjo un error» · `Unexpected response from the server` | El intermediario de cuentas de Windows, que suele quedar en mal estado tras cancelar un consentimiento | `Disconnect-MgGraph -ErrorAction SilentlyContinue` y repetir con `-Dispositivo`, que no lo usa |

También sirve correr todo en una **ventana de PowerShell fuera de VS Code** (tecla Windows → `PowerShell` → Enter → `cd c:\Users\zgf\Documents\Scripts\matriz-sgr`), donde la ventana de inicio de sesión sí aparece al frente. Recuerda repetir el paso 3 en esa terminal nueva.

---

## Paso 6 — La carga de verdad

Cuando la simulación se vea bien, **exactamente el mismo comando sin `-SoloSimular`**:

```powershell
.\scripts\cargar-plan-planner.ps1 -Dispositivo
```

Demora **2 a 5 minutos**: crea las tareas una por una y a cada una le escribe su descripción. Verás una línea verde por tarea creada. Al terminar dirá `Creadas: 87 | Omitidas: 0`.

---

## Paso 7 — Comprobar que quedó bien

**Vuelve a correr la simulación.** Es la comprobación más barata que hay:

```powershell
.\scripts\cargar-plan-planner.ps1 -SoloSimular -Dispositivo
```

Ahora debe decir **`Creadas: 0 | Omitidas: 87`** y listar las 87 como `= ya existe`. Si dice que crearía alguna, esa no se creó en el paso 6 y hay que revisar por qué.

Después abre el plan en el navegador y revisa:

| Qué mirar | Cómo debería verse |
|---|---|
| Ningún depósito vacío | Ámbito 9 · Requisitos 11 · Diseño 11 + las 5 de Héctor · Desarrollo 31 · Pruebas 15 · Piloto 10 |
| Las tareas terminadas | Aparecen tachadas y al fondo de su columna. Son 53 |
| Las tareas de Héctor | Intactas, con sus listas de comprobación |
| Vista **Gráficos** | Muestra el reparto por estado y por persona — es una buena captura para el informe |

### Asignar los responsables

Como la carga va sin correos, las 87 tareas quedan **sin asignar**. La información no se perdió: cada tarea lleva al final de su descripción una línea `Responsable: A / B / Ambos`, y el reparto completo está en la columna `Responsable` de [plan-desarrollo.csv](plan-desarrollo.csv) — **A es Tomás, B es Héctor**.

Lo más rápido es la vista **Cuadrícula** de Planner: agrupa por depósito, permite seleccionar varias tareas a la vez y asignarlas de una. Conviene hacerlo antes de la captura del tablero, porque «responsables asignados» es uno de los puntos que la rúbrica evalúa.

---

## Paso 8 — Si algo sale mal: deshacer

El script puede revertir su propia carga. **Borra solo las tareas cuyo título está en el CSV**, así que las ocho de Héctor y cualquier otra creada a mano quedan intactas.

Primero, ver qué borraría (**no borra nada**):

```powershell
.\scripts\cargar-plan-planner.ps1 -Deshacer -Dispositivo
```

Imprime dos listas: las que borraría y las que **no** se tocan. Revisa que las de Héctor estén en la segunda. Si está todo bien:

```powershell
.\scripts\cargar-plan-planner.ps1 -Deshacer -Confirmo -Dispositivo
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
| `Sign in by Web Account Manager (WAM) is enabled...` y no pasa nada más | La ventana de inicio de sesión quedó detrás de VS Code. `Alt`+`Tab`, o repetir con `-Dispositivo`. Ver el recuadro del paso 5 |
| «Se necesita la aprobación del administrador» | El permiso `User.ReadBasic.All`. **Confirmado en INACAP el 9 de septiembre de 2026.** Correr sin `-EmailA`/`-EmailB` y asignar los responsables a mano en Planner |
| «Se produjo un error» · `Unexpected response from the server` | El intermediario de cuentas de Windows, no INACAP. `Disconnect-MgGraph -ErrorAction SilentlyContinue` y repetir con `-Dispositivo` |
| Los acentos salen rotos (`leÃ­das`, `cÃ³digo`) | PowerShell 5.1 lee el `.ps1` como ANSI si no tiene BOM. El script se guarda **con BOM UTF-8** justamente por esto; si alguien lo reescribe sin BOM, vuelve a pasar |
