@echo off
echo === 测试下载脚本 ===

REM 设置代理
echo 设置代理...
set http_proxy=http://127.0.0.1:7890
set https_proxy=http://127.0.0.1:7890
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890

REM 检查git
git --version
if errorlevel 1 (
    echo Git未找到
    pause
    exit /b 1
)

REM 创建目录
if not exist "third_party" mkdir "third_party"

REM 克隆仓库
echo 开始克隆...
git clone https://github.com/astral-sh/python-build-standalone third_party\python-build-standalone

REM 清理代理
git config --global --unset http.proxy
git config --global --unset https.proxy

echo 完成!
pause
