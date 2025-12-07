@echo off
chcp 65001 >nul
title Questech 启动脚本

echo.
echo 🚀 Questech 应用启动脚本
echo ================================

:: 切换到项目根目录
cd /d "%~dp0\.."
echo 📁 工作目录: %CD%

:: 检查并清理端口5173
echo.
echo 🔍 检查端口5173占用情况...
netstat -ano | findstr ":5173" >nul
if %errorlevel% equ 0 (
    echo ⚠️  发现端口5173被占用，正在清理...
    
    :: 获取占用端口的PID并终止
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173"') do (
        if not "%%a"=="0" (
            echo 🔪 终止进程 PID: %%a
            taskkill /F /PID %%a >nul 2>&1
        )
    )
    
    :: 等待端口释放
    timeout /t 2 /nobreak >nul
    echo ✅ 端口清理完成
) else (
    echo ✅ 端口5173空闲
)

:: 检查并清理Electron进程
echo.
echo 🔍 检查Electron进程...
tasklist | findstr "electron.exe" >nul
if %errorlevel% equ 0 (
    echo ⚠️  发现Electron进程，正在清理...
    taskkill /F /IM electron.exe >nul 2>&1
    timeout /t 1 /nobreak >nul
    echo ✅ Electron进程清理完成
) else (
    echo ✅ 没有发现Electron进程
)

:: 检查node_modules
echo.
echo 📦 检查依赖...
if not exist "node_modules" (
    echo 📦 node_modules不存在，正在安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
) else (
    echo ✅ 依赖已存在
)

:: 启动应用
echo.
echo 🚀 启动Questech应用...
echo ================================
echo.

:: 首先尝试标准启动方式
echo 📝 使用标准方式启动...
npm run electron:dev

:: 如果失败，提供备用选项
if %errorlevel% neq 0 (
    echo.
    echo ❌ 标准启动失败
    echo 🔄 是否尝试备用启动方式？ [Y/N]
    set /p choice=
    if /i "%choice%"=="Y" (
        echo.
        echo 📝 使用备用方式启动...
        echo 🔧 请手动执行以下命令：
        echo.
        echo 1. 在新终端中运行: npm run dev
        echo 2. 等待Vite启动后，在另一个终端中运行: npx electron .
        echo.
    )
)

echo.
echo 🎉 启动脚本执行完成
pause
