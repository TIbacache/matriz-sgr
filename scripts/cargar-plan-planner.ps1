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
  Install-Module Microsoft.Graph.Planner, Microsoft.Graph.Groups, Microsoft.Graph.Users -Scope CurrentUser

.EXAMPLE
  # Ver qué haría, sin escribir nada en Planner:
  .\scripts\cargar-plan-planner.ps1 -SoloSimular

.EXAMPLE
  # Cargar de verdad, asignando responsables:
  .\scripts\cargar-plan-planner.ps1 -EmailA tomas@dominio.cl -EmailB companero@dominio.cl

.NOTES
En el CSV, la columna Responsable usa A / B / Ambos. Si no pasas los correos,
las tareas se crean sin asignar (se pueden asignar a mano en Planner).
#>
param(
    [string]$NombrePlan = "DesarrolloSW-MuniLS-OrigamiSpA",
    [string]$CsvPath = "$PSScriptRoot\..\docs\plan-desarrollo.csv",
    [string]$EmailA,
    [string]$EmailB,
    [switch]$SoloSimular
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
$avancePorEstado = @{ "Completado" = 100; "En curso" = 50; "Pendiente" = 0; "Bloqueado" = 0 }

if (-not (Test-Path $CsvPath)) { throw "No se encontró el CSV en $CsvPath" }
$filas = Import-Csv -Path $CsvPath -Delimiter ";" -Encoding UTF8
Write-Host "Filas leídas del CSV: $($filas.Count)" -ForegroundColor Cyan

Connect-MgGraph -Scopes "Tasks.ReadWrite", "Group.Read.All", "User.Read.All" | Out-Null

# Buscar el plan entre los grupos del usuario (el plan ya existe, no se crea)
$plan = $null
foreach ($grupo in (Get-MgGroup -All)) {
    try { $planes = Get-MgGroupPlannerPlan -GroupId $grupo.Id -ErrorAction Stop } catch { continue }
    $encontrado = $planes | Where-Object { $_.Title -eq $NombrePlan }
    if ($encontrado) { $plan = $encontrado; break }
}
if (-not $plan) { throw "No se encontró el plan '$NombrePlan'. Verifica el nombre exacto o que tengas acceso." }
Write-Host "Plan encontrado: $($plan.Title) [$($plan.Id)]" -ForegroundColor Green

# Mapear los buckets reales del plan a las claves del CSV
$bucketsReales = Get-MgPlannerPlanBucket -PlannerPlanId $plan.Id
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
        $u = Get-MgUser -Filter "mail eq '$($par.M)' or userPrincipalName eq '$($par.M)'" | Select-Object -First 1
        if ($u) { $usuarioPorLetra[$par.L] = $u.Id; Write-Host "Responsable $($par.L): $($u.DisplayName)" -ForegroundColor Green }
        else { Write-Warning "No se encontró el usuario $($par.M); esas tareas quedarán sin asignar." }
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

$existentes = Get-MgPlannerPlanTask -PlannerPlanId $plan.Id
$titulosExistentes = @($existentes | ForEach-Object { $_.Title })
$creadas = 0; $omitidas = 0

foreach ($fila in $filas) {
    if ($titulosExistentes -contains $fila.Titulo) {
        Write-Host "  = ya existe: $($fila.Titulo)" -ForegroundColor DarkGray
        $omitidas++
        continue
    }
    if (-not $bucketPorClave.ContainsKey($fila.BucketClave)) { $omitidas++; continue }

    $params = @{
        PlanId          = $plan.Id
        BucketId        = $bucketPorClave[$fila.BucketClave]
        Title           = $fila.Titulo
        PercentComplete = $avancePorEstado[$fila.Estado]
        Priority        = $prioridadPlanner[$fila.Prioridad]
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
