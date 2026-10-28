# StayScape local setup: run from the project root using PowerShell.
$ErrorActionPreference = 'Stop'
Write-Host 'StayScape Setup' -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 22 LTS from https://nodejs.org, then reopen your terminal.' }
Write-Host 'Installing project dependencies...'
npm install
if ($LASTEXITCODE -ne 0) { throw 'Root npm install failed' }
npm run install:all
if ($LASTEXITCODE -ne 0) { throw 'Client/server npm install failed' }
if (-not (Test-Path 'server\.env')) {
  Copy-Item 'server\.env.example' 'server\.env'
  $secret = node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  $demoPassword = node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"
  $content = Get-Content 'server\.env' -Raw
  $content = $content.Replace('REPLACE_WITH_RANDOM_STRING_AT_LEAST_32_CHARACTERS', $secret.Trim())
  $content = $content.Replace('REPLACE_WITH_PRIVATE_PASSWORD', $demoPassword.Trim())
  [System.IO.File]::WriteAllText('server\.env', $content, [System.Text.UTF8Encoding]::new($false))
  Write-Host 'Generated private local JWT and demo-host secrets in server\.env.' -ForegroundColor Green
} else {
  Write-Host 'Preserved existing server\.env. Confirm it contains DATABASE_URL and SEED_DEMO_PASSWORD.' -ForegroundColor Yellow
}
Write-Host 'Install and start PostgreSQL 18, then create the local stayscape database:' -ForegroundColor Yellow
Write-Host 'psql -U postgres -c "CREATE DATABASE stayscape;"'
Write-Host 'Set DATABASE_URL in server\.env to your PostgreSQL credentials.' -ForegroundColor Yellow
Write-Host 'Then run: npm run migrate; npm run seed' -ForegroundColor Green
Write-Host 'Finally run: npm run dev' -ForegroundColor Green
Write-Host 'Open: http://localhost:5173' -ForegroundColor Cyan
