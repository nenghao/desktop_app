// PDF工具集 - 入口文件（开发模式专用）
// 注意：此文件仅用于开发模式，生产模式使用 bundle.js

// 重要：开发模式下，我们需要将 init 函数暴露到全局作用域
// 因为 new Function() 创建的函数无法访问闭包作用域

(function() {
  'use strict';

  console.log('📦 PDF工具集 - 开发模式（index.js）');

  // 模块加载状态
  let modulesLoaded = false;
  let loadingPromise = null;

  // 开发模式：动态加载各个模块文件
  function loadModules() {
    // 如果已经在加载中，返回同一个 Promise
    if (loadingPromise) {
      return loadingPromise;
    }

    // 如果已经加载完成，直接返回
    if (modulesLoaded) {
      return Promise.resolve();
    }

    const basePath = './standalone/pdf_tools';

    loadingPromise = (async () => {
      try {
        console.log('🔄 开始加载模块...');

        // 按依赖顺序加载模块
        await loadScript(`${basePath}/utils/helpers.js`);
        await loadScript(`${basePath}/utils/imageConverter.js`);
        await loadScript(`${basePath}/api/pdf-api.js`);
        await loadScript(`${basePath}/ui/panels.js`);
        await loadScript(`${basePath}/ui/file-list.js`);
        await loadScript(`${basePath}/ui/preview.js`);
        await loadScript(`${basePath}/ui/history.js`);
        await loadScript(`${basePath}/core/PDFToolsAgent.js`);

        modulesLoaded = true;
        console.log('✅ 所有模块加载完成');
      } catch (error) {
        console.error('❌ 模块加载失败:', error);
        loadingPromise = null; // 重置以允许重试
        throw error;
      }
    })();

    return loadingPromise;
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      // 检查是否已经加载
      const existingScript = document.querySelector(`script[src="${url}"]`);
      if (existingScript) {
        console.log('⏭️ 已加载(跳过):', url);
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = url;
      script.onload = () => {
        console.log('✓ 已加载:', url);
        resolve();
      };
      script.onerror = () => {
        console.error('✗ 加载失败:', url);
        reject(new Error(`无法加载脚本: ${url}`));
      };
      document.head.appendChild(script);
    });
  }

  // 动态加载外部库
  let librariesLoaded = false;
  let librariesLoadingPromise = null;

  function loadLibraries() {
    // 如果已经在加载中，返回同一个 Promise
    if (librariesLoadingPromise) {
      return librariesLoadingPromise;
    }

    // 如果已经加载完成，直接返回
    if (librariesLoaded) {
      return Promise.resolve();
    }

    const libraries = [
      'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    ];

    librariesLoadingPromise = (async () => {
      console.log('📚 加载PDF库...');

      for (const lib of libraries) {
        try {
          await loadScript(lib);
          console.log('✅ 已加载:', lib);
        } catch (error) {
          console.error('❌ 加载失败:', lib, error);
          librariesLoadingPromise = null; // 重置以允许重试
          throw error;
        }
      }

      // 配置 pdf.js worker
      if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      librariesLoaded = true;
    })();

    return librariesLoadingPromise;
  }

  // 初始化函数（开发模式）
  // 注意：这个函数会在第一次调用时加载所有依赖
  async function init(context) {
    const { container, agentData, config, services, utils } = context;

    console.log('🚀 初始化PDF工具集UI:', agentData.name);

    // 加载必要的库
    await loadLibraries();

    // 加载模块
    await loadModules();

    // 现在所有依赖都已加载，可以创建 PDFToolsAgent 实例
    const pdfTools = new PDFToolsAgent(context);
    await pdfTools.render();

    // 开发模式：动态添加开发模式标识
    addDevModeBadge(container);
  }

  // 动态添加开发模式标识
  function addDevModeBadge(container) {
    // 1. 注入 CSS 样式
    injectDevModeStyles();

    // 2. 添加标识元素
    const workspace = container.querySelector('.pdf-tools-workspace');
    if (!workspace) return;

    // 创建开发模式标识
    const badge = document.createElement('div');
    badge.className = 'pdf-dev-badge';
    badge.innerHTML = `
      <span class="pdf-dev-icon">🔧</span>
      <span class="pdf-dev-text">开发模式</span>
    `;

    // 插入到 workspace 的第一个位置
    workspace.insertBefore(badge, workspace.firstChild);

    console.log('✅ 开发模式标识已添加');
  }

  // 动态注入开发模式样式
  function injectDevModeStyles() {
    // 检查是否已经注入过
    if (document.getElementById('pdf-dev-mode-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'pdf-dev-mode-styles';
    style.textContent = `
      /* ========== 开发模式标识 ========== */
      .pdf-dev-badge {
        position: absolute;
        bottom: 10px;
        right: 10px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: linear-gradient(135deg, #b8f3b8ff 0%, #67f567ff 100%);
        opacity: 0.8;
        color: #000000ff;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(0, 255, 0, 0.3);
        z-index: 1000;
        animation: pulse-dev 2s ease-in-out infinite;
      }

      .pdf-dev-icon {
        font-size: 16px;
        animation: rotate-dev 3s linear infinite;
      }

      .pdf-dev-text {
        letter-spacing: 0.5px;
      }

      @keyframes pulse-dev {
        0%, 100% {
          box-shadow: 0 2px 8px rgba(0, 255, 0, 0.3);
        }
        50% {
          box-shadow: 0 2px 16px rgba(0, 255, 0, 0.6);
        }
      }

      @keyframes rotate-dev {
        0% {
          transform: rotate(0deg);
        }
        10% {
          transform: rotate(20deg);
        }
        20% {
          transform: rotate(-20deg);
        }
        30% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(0deg);
        }
      }
    `;

    document.head.appendChild(style);
    console.log('✅ 开发模式样式已注入');
  }

  // 开发模式特殊处理:将 init 挂载到全局作用域
  // AgentDetail.js 期望的格式是 window.__AGENT_INIT__[agentId]
  if (typeof window !== 'undefined') {
    if (!window.__AGENT_INIT__) {
      window.__AGENT_INIT__ = {};
    }
    window.__AGENT_INIT__.pdf_tools = init;
    console.log('✅ init 函数已挂载到 window.__AGENT_INIT__.pdf_tools');
  }

  // 注意:开发模式下不需要 return,因为 IIFE 的返回值无法被访问
  // 生产模式的 bundle.js 会直接将 init 赋值给变量
})();
