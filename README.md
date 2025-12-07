# Questech SPA - 新架构应用

这是Questech的全新SPA（单页应用）架构实现，采用现代化的前端技术栈和模块化设计。

## 🏗️ 架构特点

- **SPA架构**: 单页应用，流畅的用户体验
- **模块化设计**: 组件化开发，易于维护和扩展
- **智能体系统**: 支持动态加载和管理上百个智能体
- **主题系统**: 完整的颜色管理和深浅模式支持
- **性能优化**: 懒加载、代码分割、缓存机制

## 📁 目录结构

```
new_app/
├── index.html                  # 应用入口页面
├── package.json               # 项目配置和依赖
├── vite.config.js             # 构建配置
├── src/
│   ├── main.js                # 应用启动入口
│   ├── App.js                 # 主应用类
│   ├── config/                # 配置文件
│   │   ├── app-config.js      # 应用配置
│   │   └── agent-registry.js  # 智能体注册表
│   ├── core/                  # 核心系统
│   │   ├── Router.js          # 路由管理器
│   │   ├── StateManager.js    # 状态管理器
│   │   ├── ComponentLoader.js # 组件加载器
│   │   ├── EventBus.js        # 事件总线
│   │   └── AgentManager.js    # 智能体管理器
│   ├── router/                # 路由配置
│   │   └── index.js           # 路由定义
│   ├── data/                  # 数据层
│   │   └── agents-data.js     # 智能体数据源
│   ├── views/                 # 视图组件
│   │   ├── agents/            # 智能体相关视图
│   │   │   ├── AgentStore.js  # 智能体商店
│   │   │   └── AgentDetail.js # 智能体详情
│   │   ├── Dashboard.js       # 仪表板
│   │   ├── ChatView.js        # 聊天视图
│   │   ├── SettingsView.js    # 设置视图
│   │   └── NotFound.js        # 404页面
│   ├── components/            # 组件库
│   │   ├── layout/            # 布局组件
│   │   │   ├── ContentArea.js # 内容区域
│   │   │   ├── Sidebar.js     # 侧边栏
│   │   │   ├── Header.js      # 头部
│   │   │   ├── AgentSidebar.js # 智能体侧边栏
│   │   │   └── AgentCardList.js # 智能体卡片列表
│   │   └── common/            # 通用组件
│   │       ├── AgentCard.js   # 智能体卡片
│   │       ├── LoadingSpinner.js # 加载动画
│   │       ├── NotificationCenter.js # 全局通知管理器
│   │       ├── NotificationContainer.js # 通知容器
│   │       └── NotificationItem.js # 通知项组件
│   ├── assets/                # 静态资源
│   │   └── styles/            # 样式文件
│   │       ├── reset.css      # 样式重置
│   │       ├── variables.css  # CSS变量
│   │       ├── main.css       # 主样式
│   │       ├── colors/        # 颜色系统
│   │       ├── themes/        # 主题文件
│   │       ├── components/    # 组件样式
│   │       │   └── agent-card.css # 智能体卡片样式
│   │       └── views/         # 视图样式
│   │           ├── agent-store.css # 智能体商店样式
│   │           └── agent-detail.css # 智能体详情样式
│   └── utils/                 # 工具函数
│       ├── error-handler.js   # 错误处理
│       └── performance.js     # 性能监控
```

## 🚀 快速开始

### 安装依赖
```bash
cd new_app
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 预览构建结果
```bash
npm run preview
```

## 🎯 核心功能

### 1. 路由系统
- 支持嵌套路由和动态参数
- 路由守卫和中间件
- 智能体路由自动注册

### 2. 状态管理
- 中央状态存储
- 响应式状态更新
- 状态持久化

### 3. 组件系统
- 动态组件加载
- 组件缓存机制
- 懒加载支持

### 4. 智能体系统
- 标准化智能体接口
- 动态加载和卸载
- 生命周期管理

### 5. 主题系统
- 浅色/深色/自动主题
- 完整的颜色管理
- 智能体主题色

### 6. 全局通知系统
- 类似Flutter SnackBar的通知体验
- 支持成功、错误、警告、信息四种类型
- 自动消失和手动关闭
- 鼠标悬停暂停计时
- 主题自适应和响应式设计

## 🔧 开发指南

### 智能体开发
1. **数据定义**: 在 `src/data/agents-data.js` 中添加智能体数据
2. **视图组件**: 在 `src/views/agents/` 中创建视图组件
3. **样式文件**: 在 `src/styles/views/` 中添加对应样式
4. **路由配置**: 在 `src/router/index.js` 中配置路由

### 添加新智能体
1. 在 `src/data/agents-data.js` 中添加智能体数据
2. 在 `src/config/agent-registry.js` 中注册智能体
3. 创建智能体功能组件
4. 实现标准化接口

### 自定义主题
1. 在 `src/styles/themes/` 中创建主题文件
2. 定义颜色变量
3. 在主题管理器中注册

### 添加新路由
1. 在 `src/router/index.js` 中定义路由
2. 创建对应的视图组件
3. 配置路由元信息

### 使用全局通知
```javascript
// 通过EventBus触发
eventBus.emit('notification:show', {
    message: '操作成功',
    type: 'success'
});

// 直接调用NotificationManager
const notification = app.getService('notificationCenter');
notification.success('操作成功');
notification.error('操作失败');
notification.warning('警告信息');
notification.info('提示信息');
```

## 📋 最近更新

### v1.1.0 - 文件结构优化 (2025-08-06)
- ✅ **重构智能体视图**: 将智能体相关视图统一移动到 `views/agents/` 目录
- ✅ **统一数据源**: 创建 `data/agents-data.js` 统一管理智能体数据
- ✅ **清理重复代码**: 删除重复的 `AgentDetailView.js` 和 `AgentListView.js`
- ✅ **优化目录结构**: 按功能模块重新组织文件结构
- ✅ **更新引用路径**: 同步更新所有相关的导入路径

### v1.2.0 - 全局通知系统 (2025-01-08)
- ✅ **全局通知管理器**: 实现类似Flutter SnackBar的通知系统
- ✅ **多种通知类型**: 支持成功、错误、警告、信息四种类型
- ✅ **智能交互**: 自动消失、手动关闭、悬停暂停等功能
- ✅ **主题适配**: 完美适配浅色/深色主题
- ✅ **EventBus集成**: 通过事件总线统一管理通知
- ✅ **测试页面**: 提供完整的功能测试页面

## 📊 性能特性

- **代码分割**: 按路由和智能体分割代码
- **懒加载**: 组件和智能体按需加载
- **缓存机制**: 智能的组件和数据缓存
- **性能监控**: 内置性能监控和分析

## 🛠️ 技术栈

- **构建工具**: Vite
- **模块系统**: ES6 Modules
- **样式**: CSS Variables + 现代CSS
- **状态管理**: 自研轻量级状态管理
- **路由**: 自研SPA路由器

## 📝 开发状态

### ✅ 已完成
- [x] 基础架构搭建
- [x] 核心系统组件
- [x] 路由系统
- [x] 状态管理
- [x] 主题系统
- [x] 构建配置
- [x] 布局组件
- [x] 视图组件
- [x] 智能体数据层
- [x] 智能体商店和详情页
- [x] 文件结构整理
- [x] 全局通知系统

### 🚧 进行中
- [ ] 智能体功能实现
- [ ] API集成
- [ ] 用户认证系统

### 📋 待开发
- [ ] 示例智能体
- [ ] 测试用例
- [ ] 文档完善
- [ ] 性能优化

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License
