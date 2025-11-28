# Questech 启动脚本

为了解决频繁的启动失败问题，我们提供了多种可靠的启动方式，支持Windows、macOS和Linux。

## 🚀 推荐启动方式

### 1. 智能启动（推荐）
自动检测平台并选择最佳启动方式：
```bash
npm run start
# 或
npm run start:auto
```

### 2. 平台特定启动

#### macOS
```bash
npm run start:macos
# 或直接运行
bash scripts/start-macos.sh
```

#### Windows
```bash
npm run start:windows
# 或双击运行
scripts\start-app.bat
# 或PowerShell
.\scripts\start-app.ps1
```

#### Linux
```bash
npm run start:linux
# 或直接运行
bash scripts/start-app.sh
```

### 3. 通用Node.js脚本
```bash
npm run start:node
```

## 🔧 脚本功能

所有启动脚本都会自动执行以下操作：

### 通用功能
1. **端口清理**：检查并终止占用5173端口的进程
2. **进程清理**：清理可能残留的Electron进程
3. **依赖检查**：确保node_modules存在，如不存在则自动安装
4. **智能启动**：
   - 首先尝试标准启动方式（`npm run electron:dev`）
   - 如果失败，自动切换到备用启动方式
   - 备用方式：先启动Vite，等待就绪后启动Electron

### macOS特有功能
- **优雅进程终止**：先发送SIGTERM信号，再使用SIGKILL强制终止
- **精确进程匹配**：使用pgrep精确匹配Electron进程
- **系统版本检测**：显示macOS版本信息
- **工具依赖检查**：检查lsof、curl等必要工具
- **超时保护**：防止启动过程无限等待
- **信号处理**：正确处理Ctrl+C中断信号

## 🛠️ 手动启动（备用方案）

如果所有脚本都失败，可以手动分步启动：

1. **启动Vite开发服务器**：
   ```bash
   npm run dev
   ```

2. **等待Vite启动完成**（看到"ready in XXXms"消息）

3. **在新终端中启动Electron**：
   ```bash
   npx electron .
   ```

## 🐛 常见问题解决

### 问题1：端口被占用
```bash
# Windows
netstat -ano | findstr :5173
taskkill /F /PID <PID>

# macOS/Linux
lsof -ti:5173 | xargs kill -9
# 或查看详细信息
lsof -i:5173
```

### 问题2：权限问题
```bash
# macOS: 脚本执行权限
chmod +x scripts/start-macos.sh

# Windows PowerShell: 执行策略
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 问题3：macOS特有问题
```bash
# Gatekeeper阻止Electron运行
sudo spctl --master-disable  # 临时禁用（不推荐）
# 或在系统偏好设置 > 安全性与隐私中允许

# 缺少命令行工具
xcode-select --install

# 端口权限问题（1024以下端口）
sudo lsof -ti:5173 | xargs sudo kill -9
```

### 问题4：依赖问题
```bash
# 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install

# macOS: 清理npm缓存
npm cache clean --force
```

### 问题5：Electron进程残留
```bash
# macOS: 查找并清理所有Electron进程
ps aux | grep -i electron | grep -v grep
pkill -f electron

# 强制清理特定应用的Electron进程
pkill -f "electron.*Questech"
```

## 📝 脚本说明

- **start-app.js**：跨平台Node.js脚本，功能最完整
- **start-app.ps1**：Windows PowerShell脚本，功能丰富
- **start-app.bat**：Windows批处理文件，兼容性最好

选择适合您系统的脚本使用即可。
