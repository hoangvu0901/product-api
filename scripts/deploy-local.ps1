$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $projectDir "docker-compose-prod.yaml"
$logFile = Join-Path $projectDir "deploy-local.log"

function Write-Log {
    param([string]$Message)

    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
    Add-Content -Path $logFile -Value $line -Encoding utf8
    Write-Host $line
}

function Invoke-Docker {
    param([string[]]$DockerArgs)

    $previousPreference = $ErrorActionPreference

    try {
        # Docker ghi tien trinh vao stderr.
        # Kiem tra ma thoat thay vi coi moi dong stderr la loi.
        $ErrorActionPreference = "Continue"
        $output = & docker @DockerArgs 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    $output | Out-File -FilePath $logFile -Append -Encoding utf8

    if ($exitCode -ne 0) {
        throw "Docker failed (exit code $exitCode): $($DockerArgs -join ' ')"
    }
}

try {
    Set-Location $projectDir

    Write-Log "Checking Docker Hub for updates"

    if (-not (Test-Path $composeFile)) {
        throw "Khong tim thay docker-compose-prod.yaml"
    }

    if (-not (Test-Path (Join-Path $projectDir ".env.docker"))) {
        throw "Khong tim thay .env.docker"
    }

    Get-Command docker -ErrorAction Stop | Out-Null

    Invoke-Docker -DockerArgs @("info")

    Invoke-Docker -DockerArgs @(
        "compose", "-f", $composeFile,
        "pull", "api"
    )

    Invoke-Docker -DockerArgs @(
        "compose", "-f", $composeFile,
        "up", "-d", "--no-build",
        "--wait", "--wait-timeout", "120"
    )

    $health = Invoke-RestMethod `
        -Uri "http://127.0.0.1:3000/health" `
        -TimeoutSec 5

    if (
        $health.status -ne "healthy" -or
        $health.database -ne "connected"
    ) {
        throw "API healthcheck failed"
    }

    Write-Log "Deployment checked: API and MongoDB healthy"
    exit 0
}
catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    exit 1
}