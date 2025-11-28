# 应用路径使用指南

## 目录规划

### Roaming 目录（同步数据）
**路径**: `C:\Users\{username}\AppData\Roaming\Questech`

**用途**: 存储需要在多台设备间同步的用户数据
- 用户配置
- 偏好设置
- 账户信息
- 智能体配置

**访问方式**:
```javascript
import { pathService } from '@/services/PathService.js';

await pathService.initialize();
const userDataPath = pathService.getUserDataPath();
// C:\Users\xxx\AppData\Roaming\Questech
```

### Local 目录（本地数据）
**路径**: `C:\Users\{username}\AppData\Local\Questech`

**用途**: 存储本机特定的数据，不应跨设备同步

#### 1. Cache 目录
**路径**: `C:\Users\{username}\AppData\Local\Questech\Cache`

**用途**:
- API 响应缓存
- 图片缓存
- 临时下载文件

**访问方式**:
```javascript
const cachePath = pathService.getCachePath();
// C:\Users\xxx\AppData\Local\Questech\Cache
```

#### 2. Plugins 目录
**路径**: `C:\Users\{username}\AppData\Local\Questech\plugins`

**用途**:
- 已安装的智能体插件
- 插件依赖文件
- 插件配置（本地）

**访问方式**:
```javascript
const pluginsPath = pathService.getPluginsPath();
// C:\Users\xxx\AppData\Local\Questech\plugins
```

#### 3. Logs 目录
**路径**: `C:\Users\{username}\AppData\Local\Questech\logs`

**用途**:
- 应用运行日志
- 错误日志
- 调试日志

**访问方式**:
```javascript
const logsPath = pathService.getLogsPath();
// C:\Users\xxx\AppData\Local\Questech\logs
```

## 使用示例

### 初始化路径服务

```javascript
import { pathService } from '@/services/PathService.js';

// 在应用启动时初始化
async function initApp() {
  await pathService.initialize();
  pathService.printPaths(); // 打印所有路径配置
}
```

### 保存用户配置（Roaming）

```javascript
// 保存用户偏好设置到 Roaming 目录
async function saveUserPreferences(preferences) {
  const userDataPath = pathService.getUserDataPath();
  const configPath = await window.electronAPI.invoke('path-join', userDataPath, 'config.json');

  await window.electronAPI.fs.writeFile(
    configPath,
    JSON.stringify(preferences, null, 2)
  );
}
```

### 缓存 API 数据（Local）

```javascript
// 缓存智能体列表到 Local/Cache 目录
async function cacheAgentList(agents) {
  const cachePath = pathService.getCachePath();
  const cacheFile = await window.electronAPI.invoke('path-join', cachePath, 'agents-list.json');

  await window.electronAPI.fs.writeFile(
    cacheFile,
    JSON.stringify({
      data: agents,
      timestamp: Date.now()
    })
  );
}
```

### 安装插件（Local）

```javascript
// 安装插件到 Local/plugins 目录
async function installPlugin(pluginId, pluginData) {
  const pluginsPath = pathService.getPluginsPath();
  const pluginDir = await window.electronAPI.invoke('path-join', pluginsPath, pluginId);

  // 创建插件目录
  await window.electronAPI.ensureDirectory(pluginDir);

  // 保存插件文件
  const pluginFile = await window.electronAPI.invoke('path-join', pluginDir, 'plugin.json');
  await window.electronAPI.fs.writeFile(pluginFile, JSON.stringify(pluginData));
}
```

### 写入日志（Local）

```javascript
// 写入应用日志到 Local/logs 目录
async function writeLog(message) {
  const logsPath = pathService.getLogsPath();
  const logFile = await window.electronAPI.invoke('path-join', logsPath, `app-${new Date().toISOString().split('T')[0]}.log`);

  const logEntry = `[${new Date().toISOString()}] ${message}\n`;

  // 追加日志
  const fs = window.electronAPI.fs;
  const existingContent = await fs.exists(logFile)
    ? await fs.readFile(logFile)
    : '';

  await fs.writeFile(logFile, existingContent + logEntry);
}
```

## 最佳实践

### 1. 数据分类
- **Roaming**: 用户配置、偏好、账户信息
- **Local**: 缓存、插件、日志、临时文件

### 2. 缓存管理
```javascript
// 定期清理过期缓存
async function cleanOldCache() {
  const cachePath = pathService.getCachePath();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天

  await window.electronAPI.cleanupOldFiles(cachePath, maxAge);
}
```

### 3. 错误处理
```javascript
async function safeWriteFile(path, content) {
  try {
    await window.electronAPI.fs.writeFile(path, content);
    console.log('✅ 文件写入成功:', path);
  } catch (error) {
    console.error('❌ 文件写入失败:', error);
    // 降级到 LocalStorage 或内存缓存
  }
}
```

### 4. 路径检查
```javascript
// 使用前检查路径是否可用
if (!pathService.getUserDataPath()) {
  console.warn('用户数据路径不可用，使用默认配置');
  // 使用默认配置或降级方案
}
```

## 迁移指南

### 从旧路径迁移到新路径

如果应用之前使用了中文路径 `C:\Users\xxx\AppData\Roaming\奇境探索`，需要迁移数据：

```javascript
async function migrateFromOldPath() {
  const oldPath = 'C:\\Users\\xxx\\AppData\\Roaming\\奇境探索';
  const newPath = pathService.getUserDataPath();

  // 检查旧路径是否存在
  const exists = await window.electronAPI.fs.exists(oldPath);
  if (!exists) {
    console.log('无需迁移，旧路径不存在');
    return;
  }

  // 读取旧路径的文件
  const files = await window.electronAPI.readDirectory(oldPath);

  // 复制文件到新路径
  for (const file of files) {
    const oldFile = await window.electronAPI.invoke('path-join', oldPath, file);
    const newFile = await window.electronAPI.invoke('path-join', newPath, file);

    await window.electronAPI.copyFile(oldFile, newFile);
    console.log(`✅ 迁移文件: ${file}`);
  }

  console.log('✅ 数据迁移完成');
}
```

## 调试

### 打印所有路径
```javascript
pathService.printPaths();
```

### 输出示例
```
📁 应用路径配置:
  - 用户数据 (Roaming): C:\Users\power\AppData\Roaming\Questech
  - 缓存 (Local): C:\Users\power\AppData\Local\Questech\Cache
  - 插件 (Local): C:\Users\power\AppData\Local\Questech\plugins
  - 日志 (Local): C:\Users\power\AppData\Local\Questech\logs
  - 临时目录: C:\Users\power\AppData\Local\Temp
```
