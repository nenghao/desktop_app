@echo off
echo ========================================
echo 重启Electron应用
echo ========================================
echo.

echo 1. 停止现有的Electron进程...
taskkill /f /im electron.exe 2>nul
taskkill /f /im Questech.exe 2>nul
timeout /t 2 /nobreak >nul

echo 2. 清理缓存...
if exist "%APPDATA%\Questech" (
    echo 清理应用数据缓存...
    rmdir /s /q "%APPDATA%\Questech" 2>nul
)

echo 3. 启动Electron应用...
echo 请等待应用启动...
npm run electron

echo.
echo 如果应用启动失败，请检查：
echo 1. 是否已安装依赖 (npm install)
echo 2. Python环境是否正确配置
echo 3. 查看控制台错误信息
echo.
pause
