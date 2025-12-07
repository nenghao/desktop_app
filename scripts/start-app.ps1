# Questech 应用启动脚本
# 解决端口冲突和启动失败问题

Write-Host "🚀 Questech 应用启动脚本" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# 设置工作目录
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

Write-Host "📁 工作目录: $projectRoot" -ForegroundColor Yellow

# 检查并清理端口5173
Write-Host "🔍 检查端口5173占用情况..." -ForegroundColor Yellow
$port5173 = netstat -ano | findstr ":5173"
if ($port5173) {
    Write-Host "⚠️  发现端口5173被占用，正在清理..." -ForegroundColor Red
    
    # 提取PID并终止进程
    $pids = @()
    $port5173 | ForEach-Object {
        if ($_ -match '\s+(\d+)$') {
            $pid = $matches[1]
            if ($pid -ne "0" -and $pids -notcontains $pid) {
                $pids += $pid
            }
        }
    }
    
    foreach ($pid in $pids) {
        try {
            Write-Host "🔪 终止进程 PID: $pid" -ForegroundColor Red
            taskkill /F /PID $pid 2>$null
        }
        catch {
            Write-Host "⚠️  无法终止进程 $pid" -ForegroundColor Yellow
        }
    }
    
    # 等待端口释放
    Start-Sleep -Seconds 2
    Write-Host "✅ 端口清理完成" -ForegroundColor Green
} else {
    Write-Host "✅ 端口5173空闲" -ForegroundColor Green
}

# 检查并清理可能的Electron进程
Write-Host "🔍 检查Electron进程..." -ForegroundColor Yellow
$electronProcesses = Get-Process -Name "electron" -ErrorAction SilentlyContinue
if ($electronProcesses) {
    Write-Host "⚠️  发现Electron进程，正在清理..." -ForegroundColor Red
    $electronProcesses | ForEach-Object {
        try {
            Write-Host "🔪 终止Electron进程 PID: $($_.Id)" -ForegroundColor Red
            Stop-Process -Id $_.Id -Force
        }
        catch {
            Write-Host "⚠️  无法终止Electron进程 $($_.Id)" -ForegroundColor Yellow
        }
    }
    Start-Sleep -Seconds 1
    Write-Host "✅ Electron进程清理完成" -ForegroundColor Green
} else {
    Write-Host "✅ 没有发现Electron进程" -ForegroundColor Green
}

# 检查node_modules是否存在
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 node_modules不存在，正在安装依赖..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 依赖安装失败" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ 依赖安装完成" -ForegroundColor Green
}

# 启动应用
Write-Host "🚀 启动Questech应用..." -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# 使用npm run electron:dev启动
try {
    npm run electron:dev
}
catch {
    Write-Host "❌ 应用启动失败" -ForegroundColor Red
    Write-Host "🔄 尝试备用启动方式..." -ForegroundColor Yellow
    
    # 备用方案：分步启动
    Write-Host "📝 启动Vite开发服务器..." -ForegroundColor Yellow
    Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow -PassThru
    
    # 等待Vite启动
    Write-Host "⏳ 等待Vite服务器启动..." -ForegroundColor Yellow
    $timeout = 30
    $elapsed = 0
    do {
        Start-Sleep -Seconds 1
        $elapsed++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 1 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ Vite服务器已启动" -ForegroundColor Green
                break
            }
        }
        catch {
            # 继续等待
        }
        
        if ($elapsed -ge $timeout) {
            Write-Host "❌ Vite服务器启动超时" -ForegroundColor Red
            exit 1
        }
    } while ($true)
    
    # 启动Electron
    Write-Host "🖥️  启动Electron应用..." -ForegroundColor Yellow
    npx electron .
}

Write-Host "🎉 启动脚本执行完成" -ForegroundColor Green
