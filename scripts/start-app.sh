#!/bin/bash

# Questech 应用启动脚本 (macOS/Linux)
# 解决端口冲突和启动失败问题

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

log $GREEN "🚀 Questech 应用启动脚本"
log $GREEN "================================"

# 获取脚本目录和项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

log $YELLOW "📁 工作目录: $PROJECT_ROOT"

# 检查并清理端口5173
log $YELLOW ""
log $YELLOW "🔍 检查端口5173占用情况..."

# 查找占用端口的进程
PIDS=$(lsof -ti:5173 2>/dev/null)

if [ -n "$PIDS" ]; then
    log $RED "⚠️  发现端口5173被占用，正在清理..."
    
    # 终止占用端口的进程
    for pid in $PIDS; do
        if kill -9 "$pid" 2>/dev/null; then
            log $RED "🔪 终止进程 PID: $pid"
        else
            log $YELLOW "⚠️  无法终止进程 $pid (可能已退出)"
        fi
    done
    
    # 等待端口释放
    sleep 2
    log $GREEN "✅ 端口清理完成"
else
    log $GREEN "✅ 端口5173空闲"
fi

# 检查并清理Electron进程
log $YELLOW ""
log $YELLOW "🔍 检查Electron进程..."

# 查找Electron进程
ELECTRON_PIDS=$(ps aux | grep -i electron | grep -v grep | awk '{print $2}' 2>/dev/null)

if [ -n "$ELECTRON_PIDS" ]; then
    log $RED "⚠️  发现Electron进程，正在清理..."
    
    for pid in $ELECTRON_PIDS; do
        if kill -9 "$pid" 2>/dev/null; then
            log $RED "🔪 终止Electron进程 PID: $pid"
        else
            log $YELLOW "⚠️  无法终止进程 $pid (可能已退出)"
        fi
    done
    
    sleep 1
    log $GREEN "✅ Electron进程清理完成"
else
    log $GREEN "✅ 没有发现Electron进程"
fi

# 检查node_modules
log $YELLOW ""
log $YELLOW "📦 检查依赖..."

if [ ! -d "node_modules" ]; then
    log $YELLOW "📦 node_modules不存在，正在安装依赖..."
    npm install
    
    if [ $? -ne 0 ]; then
        log $RED "❌ 依赖安装失败"
        exit 1
    fi
    
    log $GREEN "✅ 依赖安装完成"
else
    log $GREEN "✅ 依赖已存在"
fi

# 启动应用
log $YELLOW ""
log $GREEN "🚀 启动Questech应用..."
log $GREEN "================================"
log $YELLOW ""

# 首先尝试标准启动方式
log $CYAN "📝 使用标准方式启动..."
npm run electron:dev

# 检查启动结果
if [ $? -ne 0 ]; then
    log $YELLOW ""
    log $RED "❌ 标准启动失败"
    log $YELLOW "🔄 尝试备用启动方式..."
    
    # 备用方案：分步启动
    log $YELLOW "📝 启动Vite开发服务器..."
    
    # 后台启动Vite
    npm run dev &
    VITE_PID=$!
    
    # 等待Vite启动
    log $YELLOW "⏳ 等待Vite服务器启动..."
    
    # 检查服务器是否启动（最多等待30秒）
    for i in {1..30}; do
        if curl -s http://localhost:5173 >/dev/null 2>&1; then
            log $GREEN "✅ Vite服务器已启动"
            break
        fi
        
        if [ $i -eq 30 ]; then
            log $RED "❌ Vite服务器启动超时"
            kill $VITE_PID 2>/dev/null
            exit 1
        fi
        
        sleep 1
    done
    
    # 启动Electron
    log $YELLOW "🖥️  启动Electron应用..."
    npx electron .
    
    # 清理后台进程
    kill $VITE_PID 2>/dev/null
fi

log $YELLOW ""
log $GREEN "🎉 启动脚本执行完成"
