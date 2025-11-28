#!/bin/bash

# Questech macOS 启动脚本
# 专门为macOS优化的启动脚本

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 日志函数
log() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

log $GREEN "🚀 Questech macOS 启动脚本"
log $GREEN "================================"

# 获取脚本目录和项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

log $YELLOW "📁 工作目录: $PROJECT_ROOT"
log $BLUE "🖥️  平台: macOS $(sw_vers -productVersion 2>/dev/null || echo 'Unknown')"

# 检查必要工具
log $YELLOW ""
log $YELLOW "🔧 检查必要工具..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    log $RED "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    log $RED "❌ npm 未安装，请先安装 npm"
    exit 1
fi

# 检查lsof
if ! command -v lsof &> /dev/null; then
    log $YELLOW "⚠️  lsof 未找到，将跳过端口检查"
    SKIP_PORT_CHECK=true
else
    SKIP_PORT_CHECK=false
fi

log $GREEN "✅ 工具检查完成"

# 检查并清理端口5173
if [ "$SKIP_PORT_CHECK" = false ]; then
    log $YELLOW ""
    log $YELLOW "🔍 检查端口5173占用情况..."
    
    # 查找占用端口的进程
    PIDS=$(lsof -ti:5173 2>/dev/null)
    
    if [ -n "$PIDS" ]; then
        log $RED "⚠️  发现端口5173被占用，正在清理..."
        
        # 显示占用端口的进程信息
        log $CYAN "📋 占用端口的进程:"
        lsof -i:5173 2>/dev/null | head -10
        
        # 终止占用端口的进程
        for pid in $PIDS; do
            # 获取进程信息
            PROCESS_INFO=$(ps -p "$pid" -o comm= 2>/dev/null)
            
            if kill -TERM "$pid" 2>/dev/null; then
                log $RED "🔪 优雅终止进程 PID: $pid ($PROCESS_INFO)"
                sleep 1
                
                # 如果进程仍然存在，强制终止
                if kill -0 "$pid" 2>/dev/null; then
                    kill -KILL "$pid" 2>/dev/null
                    log $RED "💀 强制终止进程 PID: $pid"
                fi
            else
                log $YELLOW "⚠️  进程 $pid 可能已退出"
            fi
        done
        
        # 等待端口释放
        sleep 2
        log $GREEN "✅ 端口清理完成"
    else
        log $GREEN "✅ 端口5173空闲"
    fi
fi

# 检查并清理Electron进程
log $YELLOW ""
log $YELLOW "🔍 检查Electron进程..."

# 查找Electron进程（更精确的匹配）
ELECTRON_PIDS=$(pgrep -f "electron.*Questech\|electron.*new_app" 2>/dev/null)

if [ -n "$ELECTRON_PIDS" ]; then
    log $RED "⚠️  发现Electron进程，正在清理..."
    
    # 显示进程信息
    log $CYAN "📋 Electron进程:"
    ps -p $ELECTRON_PIDS -o pid,ppid,comm,args 2>/dev/null | head -10
    
    for pid in $ELECTRON_PIDS; do
        # 优雅终止
        if kill -TERM "$pid" 2>/dev/null; then
            log $RED "🔪 优雅终止Electron进程 PID: $pid"
            sleep 1
            
            # 如果进程仍然存在，强制终止
            if kill -0 "$pid" 2>/dev/null; then
                kill -KILL "$pid" 2>/dev/null
                log $RED "💀 强制终止Electron进程 PID: $pid"
            fi
        else
            log $YELLOW "⚠️  进程 $pid 可能已退出"
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

# 设置macOS特定的环境变量
export ELECTRON_IS_DEV=1
export NODE_ENV=development

# 首先尝试标准启动方式
log $CYAN "📝 使用标准方式启动..."
timeout 60 npm run electron:dev

# 检查启动结果
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ] && [ $EXIT_CODE -ne 124 ]; then
    log $YELLOW ""
    log $RED "❌ 标准启动失败 (退出码: $EXIT_CODE)"
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
        if curl -s -f http://localhost:5173 >/dev/null 2>&1; then
            log $GREEN "✅ Vite服务器已启动"
            break
        fi
        
        if [ $i -eq 30 ]; then
            log $RED "❌ Vite服务器启动超时"
            kill $VITE_PID 2>/dev/null
            exit 1
        fi
        
        sleep 1
        echo -n "."
    done
    
    echo ""
    
    # 启动Electron
    log $YELLOW "🖥️  启动Electron应用..."
    npx electron . &
    ELECTRON_PID=$!
    
    # 等待用户中断
    log $MAGENTA "📱 应用已启动，按 Ctrl+C 退出..."
    
    # 设置信号处理
    trap 'log $YELLOW "🛑 正在关闭应用..."; kill $VITE_PID $ELECTRON_PID 2>/dev/null; exit 0' INT TERM
    
    # 等待进程结束
    wait $ELECTRON_PID
    
    # 清理后台进程
    kill $VITE_PID 2>/dev/null
fi

log $YELLOW ""
log $GREEN "🎉 启动脚本执行完成"
