<#
.SYNOPSIS
  Stops anything listening on the ports used by start-local.ps1
  (Azurite 10000-10002, Functions 7071, Vite 5173, SWA emulator 4280).
#>
$ports = @(10000, 10001, 10002, 7071, 5173, 4280)
$stopped = 0
foreach ($p in $ports) {
  Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    if ($proc -and $_.OwningProcess -gt 4) {
      Write-Host "Stopping $($proc.ProcessName) (pid $($_.OwningProcess)) on port $p"
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
      $stopped++
    }
  }
}
if ($stopped -eq 0) { Write-Host 'Nothing was running.' } else { Write-Host 'Done.' }
