# 数据缓存与API服务架构设计文档

## 一、概述

### 1.1 背景
当前应用使用静态JSON文件（`/data/agents-data.json` 和 `/data/sidebar-config.json`）作为数据源。需要改造为：
- 从实际API接口获取数据
- 实现本地缓存机制
- 支持后台静默更新
- 版本对比和更新提示

### 1.2 目标
- ✅ 快速启动：优先使用本地缓存
- ✅ 数据新鲜：后台静默检查更新
- ✅ 用户体验：发现新版本时提示重启
- ✅ 离线可用：网络失败时使用缓存

### 1.3 参考文档
- API接口文档：`docs/dev/agent-store.md`
- 配置接口文档：`docs/dev/app-config.md`
- 参考实现：`src/services/UserApiService.js`

---

## 二、架构设计

### 2.1 文件结构

```
src/services/
├── storage.js                    # 底层存储服务（已有）
├── ConfigCacheService.js         # 应用配置缓存（已有，用于设置）
├── DataCacheService.js           # 新增：数据缓存服务
├── UserApiService.js             # 用户认证API（已有）
├── AgentApiService.js            # 新增：智能体数据API
├── AppConfigApiService.js        # 新增：应用配置API
└── AgentDataService.js           # 改造：智能体数据服务
```

### 2.2 模块职责

| 模块 | 职责 | 状态 |
|------|------|------|
| `storage.js` | 底层localStorage封装 | 已有 |
| `ConfigCacheService.js` | 管理应用设置缓存（主题、聊天参数等） | 已有 |
| `DataCacheService.js` | 管理智能体数据和配置的缓存 | 新增 |
| `UserApiService.js` | 处理用户认证相关API | 已有 |
| `AgentApiService.js` | 处理智能体数据相关API | 新增 |
| `AppConfigApiService.js` | 处理应用配置相关API | 新增 |
| `AgentDataService.js` | 智能体数据业务逻辑 | 改造 |

---

## 三、详细设计

### 3.1 DataCacheService（数据缓存服务）

#### 3.1.1 职责
- 管理智能体数据和应用配置的本地缓存
- 提供版本对比功能
- 处理缓存的读写和更新
- 管理缓存元数据

#### 3.1.2 缓存Key设计

```javascript
// 数据缓存
'agents_data'           // 智能体数据
'sidebar_config'        // 侧边栏配置

// 元数据缓存
'agents_data_meta'      // 智能体数据元数据
'sidebar_config_meta'   // 侧边栏配置元数据
```

#### 3.1.3 缓存数据结构

```javascript
// 数据缓存格式
{
  "version": "1.0.0",
  "last_updated": "2025-01-06T10:00:00Z",
  "data": { /* 实际数据 */ }
}

// 元数据格式
{
  "version": "1.0.0",
  "cached_at": "2025-01-06T12:00:00Z",
  "last_checked": "2025-01-06T12:30:00Z",
  "update_available": false,
  "new_version": null
}
```

#### 3.1.4 核心方法

```javascript
class DataCacheService {
  constructor(storageService)
  
  // 智能体数据缓存
  saveAgentsData(data, version)
  getAgentsData()
  getAgentsDataVersion()
  hasAgentsCache()
  
  // 侧边栏配置缓存
  saveSidebarConfig(data, version)
  getSidebarConfig()
  getSidebarConfigVersion()
  hasSidebarCache()
  
  // 版本对比
  compareVersion(localVersion, remoteVersion)
  isNewerVersion(v1, v2)
  
  // 元数据管理
  getCacheMetadata(cacheKey)
  updateCacheMetadata(cacheKey, metadata)
  markUpdateAvailable(cacheKey, newVersion)
  
  // 缓存清理
  clearAgentsCache()
  clearSidebarCache()
  clearAllDataCache()
  
  // 工具方法
  getCacheInfo()
}
```

---

### 3.2 AgentApiService（智能体API服务）

#### 3.2.1 职责
- 处理智能体相关的API请求
- 管理认证Token
- 处理请求错误和重试

#### 3.2.2 API端点

```javascript
// 基础配置
baseURL: '/api/'  // 使用代理路径

// 端点列表
GET /v2/agents/?platform={platform}&arch={arch}  // 获取智能体列表
GET /v2/agents/{agentId}/                        // 获取智能体详情（可选）
GET /v2/agents/search/?q={query}                 // 搜索智能体（可选）
```

#### 3.2.3 请求参数

**获取智能体列表：**
```javascript
{
  platform: 'win' | 'mac' | 'linux',
  arch: 'amd64' | 'arm64' | 'x86'
}
```

**请求头：**
```javascript
{
  'Accept': '*/*',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Authorization': 'Bearer {access_token}',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache'
}
```

#### 3.2.4 响应格式

```javascript
{
  "version": "1.0.0",
  "last_updated": "2025-01-06T10:00:00Z",
  "categories": {
    "power_agent_tools": {
      "id": "power_agent_tools",
      "name": "工具类",
      "description": "实用工具类智能体",
      "agents": [
        {
          "id": "math_calculator",
          "name": "数学计算器",
          "version": "1.0.0",
          "type": "python",
          "status": "available",
          // ... 其他字段
        }
      ]
    }
  }
}
```

#### 3.2.5 核心方法

```javascript
class AgentApiService {
  constructor()
  
  // 基础请求方法（参考UserApiService）
  async request(method, url, data, params, options)
  async get(url, params, options)
  async post(url, data, options)
  
  // 智能体相关API
  async fetchAgentsData(platform, arch, token)
  async getAgentDetail(agentId, token)
  async searchAgents(query, token)
  
  // 带认证的请求
  async requestWithAuth(method, url, data, params, token)
  
  // 错误处理
  handleApiError(error)
}
```

---

### 3.3 AppConfigApiService（应用配置API服务）

#### 3.3.1 职责
- 处理应用配置相关的API请求
- 包括侧边栏配置等

#### 3.3.2 API端点

```javascript
// 基础配置
baseURL: '/api/'

// 端点列表
GET /v2/config/sidebar/  // 获取侧边栏配置
```

#### 3.3.3 响应格式

```javascript
{
  "success": true,
  "message": "获取侧边栏配置成功",
  "data": {
    "version": "1.0.0",
    "last_updated": "2025-01-06T10:00:00Z",
    "categories": [
      {
        "id": "dashboard",
        "name": "小纸条",
        "icon": "home",
        "route": "/",
        "type": "page",
        "order": 1
      }
      // ... 其他分类
    ]
  }
}
```

#### 3.3.4 核心方法

```javascript
class AppConfigApiService {
  constructor()
  
  // 基础请求方法
  async request(method, url, data, params, options)
  async get(url, params, options)
  
  // 配置相关API
  async fetchSidebarConfig(token)
  async fetchAppSettings(token)
  
  // 带认证的请求
  async requestWithAuth(method, url, data, params, token)
  
  // 错误处理
  handleApiError(error)
}
```

---

### 3.4 AgentDataService（改造）

#### 3.4.1 改造要点

**新增依赖：**
```javascript
import { DataCacheService } from './DataCacheService.js';
import { AgentApiService } from './AgentApiService.js';
import { userManager } from './UserManager.js';
```

**新增属性：**
```javascript
this.dataCacheService = new DataCacheService();
this.agentApiService = new AgentApiService();
this.updateCheckInterval = null;
this.updateAvailable = false;
this.newVersion = null;
```

#### 3.4.2 初始化流程

```javascript
async initialize() {
  // 1. 检查是否有缓存
  if (this.dataCacheService.hasAgentsCache()) {
    // 2. 使用缓存数据
    const cachedData = this.dataCacheService.getAgentsData();
    this.agentsData = cachedData.data;
    console.log('✅ 使用缓存数据，版本:', cachedData.version);
    
    // 3. 后台静默检查更新
    this.checkForUpdates();
  } else {
    // 4. 无缓存，直接请求API
    console.log('📡 无缓存，从API获取数据');
    await this.fetchAndCacheData();
  }
}
```

#### 3.4.3 获取并缓存数据

```javascript
async fetchAndCacheData() {
  try {
    const token = userManager.getAccessToken();
    const { platform, arch } = this.getPlatformInfo();
    
    // 请求API
    const data = await this.agentApiService.fetchAgentsData(platform, arch, token);
    
    // 保存到缓存
    this.dataCacheService.saveAgentsData(data, data.version);
    
    // 更新内存数据
    this.agentsData = data;
    
    console.log('✅ 数据获取并缓存成功，版本:', data.version);
  } catch (error) {
    console.error('❌ 获取数据失败:', error);
    
    // 如果有缓存，使用缓存
    if (this.dataCacheService.hasAgentsCache()) {
      const cachedData = this.dataCacheService.getAgentsData();
      this.agentsData = cachedData.data;
      console.log('⚠️ 使用缓存数据作为降级方案');
    } else {
      // 使用默认数据
      this.agentsData = this.getDefaultData();
      console.log('⚠️ 使用默认数据');
    }
  }
}
```

#### 3.4.4 检查更新

```javascript
async checkForUpdates() {
  try {
    const token = userManager.getAccessToken();
    const { platform, arch } = this.getPlatformInfo();
    
    // 请求最新数据
    const remoteData = await this.agentApiService.fetchAgentsData(platform, arch, token);
    
    // 获取本地版本
    const localVersion = this.dataCacheService.getAgentsDataVersion();
    const remoteVersion = remoteData.version;
    
    console.log('🔍 版本对比:', { local: localVersion, remote: remoteVersion });
    
    // 对比版本
    if (this.dataCacheService.compareVersion(localVersion, remoteVersion)) {
      console.log('🆕 发现新版本:', remoteVersion);
      
      // 保存新数据到缓存
      this.dataCacheService.saveAgentsData(remoteData, remoteVersion);
      
      // 标记更新可用
      this.dataCacheService.markUpdateAvailable('agents_data', remoteVersion);
      this.updateAvailable = true;
      this.newVersion = remoteVersion;
      
      // 发送更新通知
      this.notifyUpdate(remoteVersion);
    } else {
      console.log('✅ 已是最新版本');
    }
  } catch (error) {
    console.warn('⚠️ 静默更新检查失败，继续使用缓存数据:', error);
  }
}
```

#### 3.4.5 平台检测

```javascript
getPlatformInfo() {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform.toLowerCase();
  
  // 检测操作系统
  let os = 'win';
  if (platform.includes('mac')) {
    os = 'mac';
  } else if (platform.includes('linux')) {
    os = 'linux';
  }
  
  // 检测架构
  let arch = 'amd64';
  if (userAgent.includes('arm') || userAgent.includes('aarch64')) {
    arch = 'arm64';
  } else if (userAgent.includes('x86') && !userAgent.includes('x86_64')) {
    arch = 'x86';
  }
  
  console.log('🖥️ 平台信息:', { platform: os, arch });
  return { platform: os, arch };
}
```

#### 3.4.6 更新通知

```javascript
notifyUpdate(newVersion) {
  // 发送事件通知
  if (this.eventBus) {
    this.eventBus.emit('data:update-available', {
      type: 'agents',
      version: newVersion,
      message: `智能体数据已更新到 v${newVersion}`,
      action: 'reload'
    });
  }
}
```

---

### 3.5 Sidebar.js（改造）

#### 3.5.1 改造 loadSidebarConfig 方法

```javascript
async loadSidebarConfig() {
  try {
    // 1. 检查缓存
    if (this.dataCacheService.hasSidebarCache()) {
      // 2. 使用缓存
      const cachedConfig = this.dataCacheService.getSidebarConfig();
      this.sidebarConfig = cachedConfig.data;
      console.log('✅ 使用缓存的侧边栏配置，版本:', cachedConfig.version);
      
      // 3. 后台检查更新
      this.checkConfigUpdate();
    } else {
      // 4. 无缓存，请求API
      console.log('📡 无缓存，从API获取侧边栏配置');
      await this.fetchAndCacheConfig();
    }
  } catch (error) {
    console.error('❌ 加载侧边栏配置失败:', error);
    this.sidebarConfig = this.getDefaultConfig();
  }
}
```

#### 3.5.2 获取并缓存配置

```javascript
async fetchAndCacheConfig() {
  try {
    const token = userManager.getAccessToken();
    const response = await this.appConfigApiService.fetchSidebarConfig(token);
    
    if (response.success && response.data) {
      // 保存到缓存
      this.dataCacheService.saveSidebarConfig(response.data, response.data.version);
      
      // 更新内存数据
      this.sidebarConfig = response.data;
      
      console.log('✅ 侧边栏配置获取并缓存成功');
    }
  } catch (error) {
    console.error('❌ 获取侧边栏配置失败:', error);
    
    // 降级处理
    if (this.dataCacheService.hasSidebarCache()) {
      const cachedConfig = this.dataCacheService.getSidebarConfig();
      this.sidebarConfig = cachedConfig.data;
    } else {
      this.sidebarConfig = this.getDefaultConfig();
    }
  }
}
```

---

## 四、数据流程

### 4.1 应用启动流程

```
应用启动
    ↓
AgentDataService.initialize()
    ↓
检查本地缓存
    ├─ 有缓存
    │   ├─ 读取缓存数据
    │   ├─ 渲染界面（快速启动）
    │   └─ 后台静默请求API
    │       ├─ 对比版本
    │       │   ├─ 版本相同 → 结束
    │       │   └─ 版本不同 → 更新缓存 + 显示提示
    │       └─ 请求失败 → 继续使用缓存
    │
    └─ 无缓存
        ├─ 请求API
        │   ├─ 成功 → 保存缓存 + 渲染界面
        │   └─ 失败 → 使用默认数据
        └─ 渲染界面
```

### 4.2 版本对比逻辑

```javascript
compareVersion(localVersion, remoteVersion) {
  // 如果本地没有版本，认为需要更新
  if (!localVersion) return true;
  
  // 如果远程没有版本，不更新
  if (!remoteVersion) return false;
  
  // 简单字符串对比（可以使用semver库）
  return localVersion !== remoteVersion;
}
```

### 4.3 更新提示流程

```
检测到新版本
    ↓
保存新数据到缓存
    ↓
发送事件: data:update-available
    ↓
App.js 监听事件
    ↓
显示更新提示（Toast/Modal）
    ├─ 用户点击"立即重启"
    │   └─ window.location.reload()
    │
    └─ 用户点击"稍后提醒"
        └─ 关闭提示
```

---

## 五、错误处理

### 5.1 网络请求失败

```javascript
try {
  const data = await agentApiService.fetchAgentsData(...);
} catch (error) {
  // 1. 检查是否有缓存
  if (dataCacheService.hasAgentsCache()) {
    // 使用缓存数据
    const cachedData = dataCacheService.getAgentsData();
    this.agentsData = cachedData.data;
    console.warn('⚠️ API请求失败，使用缓存数据');
  } else {
    // 使用默认数据
    this.agentsData = this.getDefaultData();
    console.warn('⚠️ API请求失败且无缓存，使用默认数据');
  }
}
```

### 5.2 缓存损坏

```javascript
try {
  const cachedData = dataCacheService.getAgentsData();
} catch (error) {
  console.error('❌ 缓存数据损坏:', error);
  // 清除损坏的缓存
  dataCacheService.clearAgentsCache();
  // 重新从API获取
  await this.fetchAndCacheData();
}
```

### 5.3 Token过期

```javascript
// 在API请求失败时检查
if (error.message.includes('401') || error.message.includes('Unauthorized')) {
  console.warn('⚠️ Token可能已过期');
  // 使用缓存数据
  // 提示用户重新登录
}
```

---

## 六、开发步骤

### 阶段一：基础设施（第1-2天）
1. ✅ 创建 `DataCacheService.js`
2. ✅ 编写单元测试
3. ✅ 验证缓存读写功能

### 阶段二：API服务（第3-4天）
1. ✅ 创建 `AgentApiService.js`
2. ✅ 创建 `AppConfigApiService.js`
3. ✅ 测试API请求功能
4. ✅ 处理认证和错误

### 阶段三：业务改造（第5-6天）
1. ✅ 改造 `AgentDataService.js`
2. ✅ 改造 `Sidebar.js`
3. ✅ 集成缓存和API服务
4. ✅ 测试启动流程

### 阶段四：更新机制（第7天）
1. ✅ 实现版本对比逻辑
2. ✅ 实现更新提示UI
3. ✅ 实现重启更新功能
4. ✅ 测试更新流程

### 阶段五：测试和优化（第8-9天）
1. ✅ 测试各种场景
2. ✅ 性能优化
3. ✅ 错误处理完善
4. ✅ 文档更新

---

## 七、注意事项

### 7.1 认证Token管理
- Token从 `UserManager` 获取
- 使用 `userManager.getAccessToken()`
- Token过期时使用缓存数据

### 7.2 跨域问题
- 使用代理路径 `/api/`
- 确保后端配置CORS
- 或配置开发服务器代理

### 7.3 数据安全
- 不在localStorage存储敏感数据
- Token单独管理
- 考虑数据加密（可选）

### 7.4 兼容性
- localStorage可能不可用
- 需要降级方案
- 使用默认数据兜底

### 7.5 性能优化
- 缓存预加载
- 避免重复请求
- 使用Promise缓存

---

## 八、测试用例

### 8.1 缓存测试
- ✅ 保存和读取缓存
- ✅ 版本对比
- ✅ 缓存清理
- ✅ 缓存损坏处理

### 8.2 API测试
- ✅ 正常请求
- ✅ 网络失败
- ✅ Token过期
- ✅ 超时处理

### 8.3 业务测试
- ✅ 首次启动（无缓存）
- ✅ 二次启动（有缓存）
- ✅ 版本更新
- ✅ 离线模式

---

## 九、配置示例

### 9.1 API配置

```javascript
// src/config/api-config.js
export const apiConfig = {
  baseURL: '/api/',
  timeout: 30000,
  endpoints: {
    agents: '/v2/agents/',
    sidebarConfig: '/v2/config/sidebar/'
  },
  cache: {
    enabled: true,
    ttl: 3600000, // 1小时
  },
  update: {
    checkOnStartup: true,
    silentUpdate: true,
    notifyUser: true
  }
};
```

### 9.2 缓存配置

```javascript
// DataCacheService 配置
{
  prefix: 'Questech_data_',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
  enableCompression: false,
  enableEncryption: false
}
```

---

## 十、附录

### 10.1 相关文件
- `docs/dev/agent-store.md` - 智能体API文档
- `docs/dev/app-config.md` - 配置API文档
- `src/services/UserApiService.js` - 参考实现

### 10.2 版本历史
- v1.0.0 (2025-01-09) - 初始版本

### 10.3 待办事项
- [ ] 实现增量更新（可选）
- [ ] 添加数据压缩（可选）
- [ ] 添加数据加密（可选）
- [ ] 实现自动重试机制
- [ ] 添加更详细的日志

