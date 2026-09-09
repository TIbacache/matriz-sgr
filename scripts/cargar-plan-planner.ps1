<#
.SYNOPSIS
Carga el plan de desarrollo de Matriz SGR en el Planner del equipo, usando los
buckets de la plantilla del profesor (Ámbito, Requisitos, Diseño, Desarrollo,
Pruebas, Piloto e implementación).

.DESCRIPTION
Lee docs/plan-desarrollo.csv y crea una tarea por fila con fecha de inicio,
fecha de vencimiento, prioridad, avance y descripción. Es RE-EJECUTABLE: si una
tarea ya existe (mismo título) la omite, así que se puede correr de nuevo tras
editar el CSV para agregar solo lo nuevo.

.PREREQUISITOS
  Install-Module Microsoft.Graph.Authentication, Microsoft.Graph.Planner -Scope CurrentUser

  Solo pide el permiso Tasks.ReadWrite (que un usuario normal puede aprobar por
  sí mismo). El permiso para buscar personas se pide únicamente si entregas
  correos con -EmailA/-EmailB; si tu universidad lo bloquea, carga el plan sin
  asignar y reparte las tareas a mano en Planner.

.EXAMPLE
  # Ver qué haría, sin escribir nada en Planner:
  .\scripts\cargar-plan-planner.ps1 -SoloSimular

.EXAMPLE
  # Cargar de verdad, asignando responsables:
  .\scripts\cargar-plan-planner.ps1 -EmailA tomas@dominio.cl -EmailB companero@dominio.cl

.EXAMPLE
  # Si la ventana de inicio de sesión no aparece (terminal de VS Code):
  .\scripts\cargar-plan-planner.ps1 -SoloSimular -Dispositivo

.EXAMPLE
  # Ver qué borraría si hubiera que deshacer la carga (no borra nada):
  .\scripts\cargar-plan-planner.ps1 -Deshacer

.EXAMPLE
  # Deshacer de verdad. Solo borra tareas cuyo título esté en el CSV, así que
  # las que se crearon a mano en el tablero quedan intactas:
  .\scripts\cargar-plan-planner.ps1 -Deshacer -Confirmo

.NOTES
En el CSV, la columna Responsable usa A / B / Ambos. Si no pasas los correos,
las tareas se crean sin asignar (se pueden asignar a mano en Planner).
#>
param(
    [string]$NombrePlan = "DesarrolloSW-MuniLS-OrigamiSpA",
    [string]$CsvPath = "$PSScriptRoot\..\docs\plan-desarrollo.csv",
    [string]$EmailA,
    [string]$EmailB,
    [switch]$SoloSimular,
    # Inicia sesión con código de dispositivo en vez de abrir una ventana. Útil
    # en el terminal de VS Code, donde la ventana de inicio de sesión queda
    # detrás y parece que el script se colgó.
    [switch]$Dispositivo,
    # Deshacer una carga: borra del plan las tareas cuyo título esté en el CSV.
    # Como compara por título exacto, no toca las tareas creadas a mano que no
    # estén en el CSV. Sin -Confirmo solo las lista.
    [switch]$Deshacer,
    [switch]$Confirmo
)

$ErrorActionPreference = "Stop"

# Quita acentos y pasa a minúsculas, para emparejar nombres de bucket sin
# depender de cómo el profesor los escribió ni del truncado de la interfaz.
function Normalizar([string]$texto) {
    if (-not $texto) { return "" }
    $d = $texto.Normalize([Text.NormalizationForm]::FormD)
    $sb = New-Object Text.StringBuilder
    foreach ($c in $d.ToCharArray()) {
        if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$sb.Append($c)
        }
    }
    return $sb.ToString().ToLowerInvariant().Trim()
}

# Clave del CSV -> fragmento con el que empieza el bucket real en Planner
$patronBucket = @{
    "AMBITO"     = "ambito"
    "REQUISITOS" = "requisitos"
    "DISENO"     = "diseno"
    "DESARROLLO" = "desarrollo"
    "PRUEBAS"    = "pruebas"
    "PILOTO"     = "piloto"
}

$prioridadPlanner = @{ "Urgente" = 1; "Importante" = 3; "Media" = 5; "Baja" = 9 }
# Planner básico solo distingue No iniciada / En curso / Completada por el
# porcentaje. La rúbrica pide cuatro estados, así que "En revisión" se carga
# como 75% y además se le pone una etiqueta de color a mano en el tablero
# (ver docs/entrega/planner-delta.md).
$avancePorEstado = @{ "Completado" = 100; "En revisión" = 75; "En curso" = 50; "Pendiente" = 0; "Bloqueado" = 0 }

if (-not (Test-Path $CsvPath)) { throw "No se encontró el CSV en $CsvPath" }
$filas = Import-Csv -Path $CsvPath -Delimiter ";" -Encoding UTF8
Write-Host "Filas leídas del CSV: $($filas.Count)" -ForegroundColor Cyan

# Permisos mínimos: Tasks.ReadWrite basta para leer y escribir en los planes a
# los que ya tienes acceso. El de personas solo se pide si vas a asignar.
$permisos = @("Tasks.ReadWrite")
if ($EmailA -or $EmailB) { $permisos += "User.ReadBasic.All" }

$conexion = @{ Scopes = $permisos }

# En Windows, Connect-MgGraph abre por defecto la ventana nativa del Web Account
# Manager, que en un terminal incrustado (VS Code) queda DETRÁS de la ventana y
# parece que el script se colgó. Con -Dispositivo se usa el flujo de código de
# dispositivo: imprime una URL y un código para pegar en el navegador, sin
# ventanas que se escondan. El nombre del parámetro cambió entre versiones del
# módulo, así que se detecta cuál acepta el que está instalado.
if ($Dispositivo) {
    $conectar = Get-Command Connect-MgGraph
    if ($conectar.Parameters.ContainsKey("UseDeviceCode")) { $conexion.UseDeviceCode = $true }
    elseif ($conectar.Parameters.ContainsKey("UseDeviceAuthentication")) { $conexion.UseDeviceAuthentication = $true }
    else { Write-Warning "Este módulo no admite el código de dispositivo. Se abrirá la ventana normal (revisa Alt+Tab)." }
    # El mensaje con la URL y el código lo emite MSAL por el flujo de
    # Information, que PowerShell silencia por defecto: sin esto la terminal
    # se queda en blanco esperando un código que nunca imprime.
    $conexion.InformationAction = "Continue"
    Write-Host "Modo código de dispositivo: copia la URL y el código que aparecen abajo." -ForegroundColor Yellow
}
else {
    Write-Host "Se abrirá una ventana de inicio de sesión. Si no la ves, prueba Alt+Tab: en VS Code suele quedar detrás." -ForegroundColor Yellow
}

Connect-MgGraph @conexion | Out-Null
Write-Host "Conectado como: $((Get-MgContext).Account)" -ForegroundColor Green

# Buscar el plan entre los que el usuario ya tiene (/me/planner/plans).
# Se consulta por REST para no depender del módulo de Grupos ni de permisos
# de directorio, que en tenants universitarios suelen requerir aprobación.
$respuesta = Invoke-MgGraphRequest -Method GET -Uri "/v1.0/me/planner/plans"
$misPlanes = @($respuesta.value)
if (-not $misPlanes) { throw "Tu cuenta no tiene planes visibles en Planner." }

$plan = $misPlanes | Where-Object { $_.title -eq $NombrePlan } | Select-Object -First 1
if (-not $plan) {
    Write-Host "Planes disponibles para tu cuenta:" -ForegroundColor Yellow
    $misPlanes | ForEach-Object { Write-Host "  - $($_.title)" }
    throw "No se encontró el plan '$NombrePlan'. Copia el nombre exacto de la lista de arriba y pásalo con -NombrePlan."
}
$planId = $plan.id
Write-Host "Plan encontrado: $($plan.title)" -ForegroundColor Green

# Mapear los buckets reales del plan a las claves del CSV
$bucketsReales = Get-MgPlannerPlanBucket -PlannerPlanId $planId
Write-Host "Buckets en el plan:" -ForegroundColor Cyan
$bucketsReales | ForEach-Object { Write-Host "  - $($_.Name)" }

$bucketPorClave = @{}
foreach ($clave in $patronBucket.Keys) {
    $patron = $patronBucket[$clave]
    $b = $bucketsReales | Where-Object { (Normalizar $_.Name).StartsWith($patron) } | Select-Object -First 1
    if ($b) { $bucketPorClave[$clave] = $b.Id }
    else { Write-Warning "No se encontró bucket para la clave '$clave' (patrón '$patron'). Esas tareas se omitirán." }
}

# Resolver responsables (opcional)
$usuarioPorLetra = @{}
foreach ($par in @(@{ L = "A"; M = $EmailA }, @{ L = "B"; M = $EmailB })) {
    if ($par.M) {
        try {
            $u = Invoke-MgGraphRequest -Method GET -Uri "/v1.0/users/$($par.M)"
            $usuarioPorLetra[$par.L] = $u.id
            Write-Host "Responsable $($par.L): $($u.displayName)" -ForegroundColor Green
        }
        catch {
            Write-Warning "No se pudo buscar a $($par.M) (¿permiso denegado o correo incorrecto?). Esas tareas quedarán sin asignar; puedes asignarlas a mano en Planner."
        }
    }
}

function Nuevo-Asignacion([string]$responsable) {
    $ids = switch ($responsable) {
        "A" { @($usuarioPorLetra["A"]) }
        "B" { @($usuarioPorLetra["B"]) }
        "Ambos" { @($usuarioPorLetra["A"], $usuarioPorLetra["B"]) }
        default { @() }
    }
    $ids = $ids | Where-Object { $_ }
    if (-not $ids) { return $null }
    $asig = @{}
    foreach ($id in $ids) {
        $asig[$id] = @{ "@odata.type" = "#microsoft.graph.plannerAssignment"; "orderHint" = " !" }
    }
    return $asig
}

# Mediodía UTC para que Planner no corra la fecha un día por zona horaria
function ComoFechaUtc([string]$fecha) {
    if (-not $fecha) { return $null }
    return [datetime]::SpecifyKind([datetime]::ParseExact("$fecha 12:00", "yyyy-MM-dd HH:mm", $null), [DateTimeKind]::Utc)
}

$existentes = Get-MgPlannerPlanTask -PlannerPlanId $planId
$titulosExistentes = @($existentes | ForEach-Object { $_.Title })
$creadas = 0; $omitidas = 0

# ------------------------------------------------------------------ Deshacer
if ($Deshacer) {
    $titulosCsv = @($filas | ForEach-Object { $_.Titulo })
    $aBorrar = @($existentes | Where-Object { $titulosCsv -contains $_.Title })

    if (-not $aBorrar) {
        Write-Host "No hay ninguna tarea del CSV en el plan. Nada que deshacer." -ForegroundColor Green
        return
    }

    Write-Host ""
    Write-Host "Tareas del plan que coinciden con el CSV ($($aBorrar.Count)):" -ForegroundColor Yellow
    $aBorrar | ForEach-Object { Write-Host "  - $($_.Title)" }

    $intactas = @($existentes | Where-Object { $titulosCsv -notcontains $_.Title })
    Write-Host ""
    Write-Host "NO se tocan ($($intactas.Count)):" -ForegroundColor Cyan
    $intactas | ForEach-Object { Write-Host "  - $($_.Title)" }

    if (-not $Confirmo) {
        Write-Host ""
        Write-Host "Esto fue solo un listado. Para borrarlas de verdad, repite el comando agregando -Confirmo" -ForegroundColor Yellow
        return
    }

    $borradas = 0
    foreach ($t in $aBorrar) {
        try {
            Remove-MgPlannerTask -PlannerTaskId $t.Id -IfMatch $t.AdditionalProperties["@odata.etag"] -ErrorAction Stop
            Write-Host "  - borrada: $($t.Title)" -ForegroundColor DarkGray
            $borradas++
        }
        catch {
            Write-Warning "No se pudo borrar '$($t.Title)': $($_.Exception.Message)"
        }
    }
    Write-Host ""
    Write-Host "Borradas: $borradas de $($aBorrar.Count)." -ForegroundColor Cyan
    return
}

foreach ($fila in $filas) {
    if ($titulosExistentes -contains $fila.Titulo) {
        Write-Host "  = ya existe: $($fila.Titulo)" -ForegroundColor DarkGray
        $omitidas++
        continue
    }
    if (-not $bucketPorClave.ContainsKey($fila.BucketClave)) { $omitidas++; continue }

    # Un estado o una prioridad mal escritos en el CSV dejarían la tarea sin
    # avance ni prioridad sin avisar: es mejor decirlo y seguir con el valor neutro.
    if (-not $avancePorEstado.ContainsKey($fila.Estado)) {
        Write-Warning "Estado desconocido '$($fila.Estado)' en '$($fila.Titulo)'. Se carga como Pendiente."
    }
    if (-not $prioridadPlanner.ContainsKey($fila.Prioridad)) {
        Write-Warning "Prioridad desconocida '$($fila.Prioridad)' en '$($fila.Titulo)'. Se carga como Media."
    }
    $avance = if ($avancePorEstado.ContainsKey($fila.Estado)) { $avancePorEstado[$fila.Estado] } else { 0 }
    $prioridad = if ($prioridadPlanner.ContainsKey($fila.Prioridad)) { $prioridadPlanner[$fila.Prioridad] } else { 5 }

    $params = @{
        PlanId          = $planId
        BucketId        = $bucketPorClave[$fila.BucketClave]
        Title           = $fila.Titulo
        PercentComplete = $avance
        Priority        = $prioridad
    }
    $inicio = ComoFechaUtc $fila.Inicio
    $vence = ComoFechaUtc $fila.Vence
    if ($inicio) { $params.StartDateTime = $inicio }
    if ($vence) { $params.DueDateTime = $vence }
    $asignacion = Nuevo-Asignacion $fila.Responsable
    if ($asignacion) { $params.Assignments = $asignacion }

    if ($SoloSimular) {
        Write-Host "  + [simulado] $($fila.BucketClave) | $($fila.Titulo) | $($fila.Inicio) -> $($fila.Vence) | $($fila.Estado)"
        $creadas++
        continue
    }

    $tarea = New-MgPlannerTask @params
    # La descripción va en los detalles, que exigen el ETag de la tarea
    $descripcion = "$($fila.Notas)`n`nEstado: $($fila.Estado) | Responsable: $($fila.Responsable)"
    try {
        $detalle = Get-MgPlannerTaskDetail -PlannerTaskId $tarea.Id
        Update-MgPlannerTaskDetail -PlannerTaskId $tarea.Id -IfMatch $detalle.AdditionalProperties["@odata.etag"] `
            -Description $descripcion -PreviewType "description" | Out-Null
    }
    catch {
        Write-Warning "Tarea creada pero sin descripción: $($fila.Titulo)"
    }
    Write-Host "  + $($fila.Titulo)" -ForegroundColor Green
    $creadas++
}

Write-Host ""
Write-Host "Listo. Creadas: $creadas | Omitidas: $omitidas" -ForegroundColor Cyan
if ($SoloSimular) { Write-Host "(Fue una simulación: no se escribió nada en Planner)" -ForegroundColor Yellow }
else { Write-Host "Abre https://tasks.office.com para ver el plan '$NombrePlan'." }
