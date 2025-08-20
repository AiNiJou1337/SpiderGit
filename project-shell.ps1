# Project Shell - Persistent Environment
Write-Host "=== SpiderGit Project Shell ===" -ForegroundColor Green

# Set up environment
Set-Location "d:\ProJect\spiderGit"
$env:CONDA_NO_PLUGINS = "true"
$env:CONDA_AUTO_ACTIVATE_BASE = "false"
$env:PATH = "C:\Windows\system32;C:\Windows;C:\Windows\System32\Wbem;C:\Program Files\Git\cmd;D:\IT_software\node.js;C:\Program Files\Python38\Scripts;C:\Program Files\Python38"
$env:NODE_ENV = "development"

Write-Host "Environment configured successfully!" -ForegroundColor Green
Write-Host "Node.js: $(node --version)" -ForegroundColor Cyan
Write-Host "npm: $(npm --version)" -ForegroundColor Cyan
Write-Host "Python: $(python --version)" -ForegroundColor Cyan
Write-Host ""

# Interactive menu
do {
    Write-Host "=== Available Commands ===" -ForegroundColor Yellow
    Write-Host "1. Start dev server (npm run dev)"
    Write-Host "2. Database migration (npm run prisma:push)"
    Write-Host "3. Generate Prisma client (npm run prisma:generate)"
    Write-Host "4. Test Python scraper"
    Write-Host "5. Open new PowerShell window"
    Write-Host "6. Show environment info"
    Write-Host "0. Exit"
    Write-Host ""
    
    $choice = Read-Host "Enter your choice (0-6)"
    
    switch ($choice) {
        "1" {
            Write-Host "Starting development server..." -ForegroundColor Green
            npm run dev
        }
        "2" {
            Write-Host "Running database migration..." -ForegroundColor Green
            npm run prisma:push
        }
        "3" {
            Write-Host "Generating Prisma client..." -ForegroundColor Green
            npm run prisma:generate
        }
        "4" {
            Write-Host "Testing Python scraper..." -ForegroundColor Green
            python backend/scraper/keyword_scraper.py --help
        }
        "5" {
            Write-Host "Opening new PowerShell window..." -ForegroundColor Green
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'd:\ProJect\spiderGit'; `$env:CONDA_NO_PLUGINS='true'; `$env:PATH='C:\Windows\system32;C:\Windows;C:\Windows\System32\Wbem;C:\Program Files\Git\cmd;D:\IT_software\node.js;C:\Program Files\Python38\Scripts;C:\Program Files\Python38'; Write-Host 'Project environment ready!' -ForegroundColor Green"
        }
        "6" {
            Write-Host ""
            Write-Host "=== Environment Info ===" -ForegroundColor Cyan
            Write-Host "Current Directory: $(Get-Location)"
            Write-Host "Node.js: $(node --version)"
            Write-Host "npm: $(npm --version)"
            Write-Host "Python: $(python --version)"
            Write-Host "CONDA_NO_PLUGINS: $env:CONDA_NO_PLUGINS"
            Write-Host ""
        }
        "0" {
            Write-Host "Goodbye!" -ForegroundColor Green
            break
        }
        default {
            Write-Host "Invalid choice. Please try again." -ForegroundColor Red
        }
    }
    
    if ($choice -ne "0") {
        Write-Host ""
        Read-Host "Press Enter to continue"
        Clear-Host
    }
    
} while ($choice -ne "0")
