/**
 * Questech SPA 应用主入口
 * 负责应用的初始化和启动
 */

import { App } from './App.js';
import { ErrorHandler } from './utils/error-handler.js';
import { PerformanceMonitor } from './utils/performance.js';
import { initializeServices } from './services/index.js';

// 全局错误处理
window.addEventListener('error', (event) => {
  ErrorHandler.handleError(event.error, 'Global Error');
});

window.addEventListener('unhandledrejection', (event) => {
  ErrorHandler.handleError(event.reason, 'Unhandled Promise Rejection');
});

// 性能监控
const performanceMonitor = new PerformanceMonitor();
performanceMonitor.start();

/**
 * 应用启动函数
 */
async function startApp() {
  try {
    const appElement = document.getElementById('app');

    // 检查浏览器兼容性
    if (!checkBrowserCompatibility()) {
      throw new Error('浏览器不兼容，请使用现代浏览器');
    }

    // 🔥 关键优化: 快速初始化核心服务,不阻塞UI渲染
    const services = await initializeServices();

    // 创建应用实例
    const app = new App();

    // 初始化应用
    await app.initialize(services);

    // 🔥 直接挂载应用到DOM - 会立即显示骨架屏或缓存内容
    await app.mount(appElement);

    // 记录启动完成
    performanceMonitor.mark('app-ready');
    console.log('🚀 Questech SPA 启动完成');

    // 暴露到全局作用域
    window.app = app;
    if (import.meta.env.DEV) {
      window.performanceMonitor = performanceMonitor;
    }

    // 设置 Electron IPC 监听器（如果在 Electron 环境中）
    if (window.electronAPI) {
      // 监听设置模态框打开事件
      window.electronAPI.onOpenSettingsModal(() => {
        if (app.eventBus) {
          app.eventBus.emit('settings:modal:open');
        }
      });
    }

  } catch (error) {
    ErrorHandler.handleError(error, 'App Startup');
    showErrorBoundary(error);
  }
}

/**
 * 检查浏览器兼容性
 */
function checkBrowserCompatibility() {
  // 检查必需的API
  const requiredAPIs = [
    'Promise',
    'fetch',
    'localStorage',
    'sessionStorage',
    'addEventListener',
    'querySelector',
    'classList'
  ];

  for (const api of requiredAPIs) {
    if (!(api in window) && !(api in document) && !(api in Element.prototype)) {
      console.error(`缺少必需的API: ${api}`);
      return false;
    }
  }

  // 检查ES6+特性（不使用eval，更安全）
  try {
    // 测试箭头函数
    const testArrow = () => 'test';
    if (typeof testArrow !== 'function') throw new Error('Arrow functions not supported');

    // 测试模板字符串
    const testTemplate = `test ${1}`;
    if (testTemplate !== 'test 1') throw new Error('Template literals not supported');

    // 测试解构赋值
    const { a } = { a: 1 };
    if (a !== 1) throw new Error('Destructuring not supported');

    // 测试class语法
    class TestClass { }
    if (typeof TestClass !== 'function') throw new Error('Class syntax not supported');

    // 测试const/let
    const testConst = 1;
    let testLet = 2;
    if (testConst !== 1 || testLet !== 2) throw new Error('const/let not supported');

  } catch (e) {
    console.error('浏览器不支持ES6+特性:', e.message);
    return false;
  }

  return true;
}

/**
 * 显示错误边界
 */
function showErrorBoundary(error) {
  const errorBoundary = document.getElementById('error-boundary');
  const errorMessage = document.getElementById('error-message');

  if (errorBoundary && errorMessage) {
    errorMessage.textContent = error.message || '应用启动失败';
    errorBoundary.style.display = 'flex';

    // 绑定重新加载按钮
    const reloadBtn = document.getElementById('reload-app');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => {
        window.location.reload();
      });
    }

    // 绑定报告错误按钮
    const reportBtn = document.getElementById('report-error');
    if (reportBtn) {
      reportBtn.addEventListener('click', () => {
        ErrorHandler.reportError(error);
      });
    }
  }
}

/**
 * DOM加载完成后启动应用
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

// 导出启动函数（用于测试）
export { startApp };
