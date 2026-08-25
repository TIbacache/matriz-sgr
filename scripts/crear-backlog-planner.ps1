<#
Crea el plan "Matriz SGR" en Microsoft Planner con sus buckets y tareas,
leyendo docs/backlog-planner.csv.

Requisitos (una sola vez):
  Install-Module Microsoft.Graph.Planner, Microsoft.Graph.Groups -Scope CurrentUser

Uso (con la cuenta del dominio universitario):
  .\scripts\crear-backlog-planner.ps1 -GroupName "Matriz SGR"

El plan de Planner debe colgar de un Grupo M365 (Team). Si el grupo no existe,
créalo primero en Teams/Outlook con la cuenta universitaria y pasa su nombre aquí.
#>
param(
    [Parameter(Mandatory = $true)] [string]$GroupName,
    [string]$PlanTitle = "Matriz SGR",
    [string]$CsvPath = "$PSScriptRoot\..\docs\backlog-planner.csv"
)

Connect-MgGraph -Scopes "Tasks.ReadWrite", "Group.Read.All"

$group = Get-MgGroup -Filter "displayName eq '$GroupName'"
if (-not $group) { throw "No se encontró el grupo M365 '$GroupName'. Créalo en Teams primero." }

# Reutiliza el plan si ya existe (el script es re-ejecutable)
$plan = Get-MgGroupPlannerPlan -GroupId $group.Id | Where-Object { $_.Title -eq $PlanTitle }
if (-not $plan) {
    $plan = New-MgPlannerPlan -Owner $group.Id -Title $PlanTitle
    Write-Host "Plan creado: $($plan.Id)"
}

$filas = Import-Csv -Path $CsvPath -Delimiter ";"

# Buckets en orden de fase (Planner los muestra en orden inverso de creación)
$nombresBuckets = $filas.Bucket | Select-Object -Unique
[array]::Reverse($nombresBuckets)
$bucketsExistentes = Get-MgPlannerPlanBucket -PlannerPlanId $plan.Id
$buckets = @{}
foreach ($nombre in $nombresBuckets) {
    $b = $bucketsExistentes | Where-Object { $_.Name -eq $nombre }
    if (-not $b) { $b = New-MgPlannerBucket -PlanId $plan.Id -Name $nombre }
    $buckets[$nombre] = $b.Id
}

$tareasExistentes = Get-MgPlannerPlanTask -PlannerPlanId $plan.Id
foreach ($fila in $filas) {
    if ($tareasExistentes | Where-Object { $_.Title -eq $fila.Titulo }) { continue }
    New-MgPlannerTask -PlanId $plan.Id -BucketId $buckets[$fila.Bucket] `
        -Title $fila.Titulo `
        -Details @{ description = "Historia: $($fila.Historia) | Prioridad: $($fila.Prioridad)" } | Out-Null
    Write-Host "Tarea creada: [$($fila.Bucket)] $($fila.Titulo)"
}

Write-Host "Listo. Abre https://tasks.office.com para ver el plan '$PlanTitle'."
