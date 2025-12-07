// OCR 构建脚本
// 将 shared/ 和 ocr/ 下的源文件打包成 standalone/ocr/bundle.js

const fs = require('fs');
const path = require('path');

console.log('🔨 开始构建 OCR...\n');

// 目录定义
const standaloneDir = path.join(__dirname, '..');  // standalone/
const sharedDir = path.join(standaloneDir, 'shared');  // standalone/shared/
const ocrDir = __dirname;  // standalone/ocr/
const outputFile = path.join(__dirname, 'bundle.js');

// 按依赖顺序定义需要打包的文件
const sourceFiles = [
  // 1. 共享工具函数
  { path: path.join(sharedDir, 'utils/helpers.js'), name: 'shared/utils/helpers.js' },
  { path: path.join(sharedDir, 'utils/imageConverter.js'), name: 'shared/utils/imageConverter.js' },

  // 2. 共享 UI 组件
  { path: path.join(sharedDir, 'ui/file-list.js'), name: 'shared/ui/file-list.js' },
  { path: path.join(sharedDir, 'ui/preview.js'), name: 'shared/ui/preview.js' },
  { path: path.join(sharedDir, 'ui/history.js'), name: 'shared/ui/history.js' },

  // 3. 共享 API
  { path: path.join(sharedDir, 'api/base-api.js'), name: 'shared/api/base-api.js' },

  // 4. OCR 特有代码
  { path: path.join(ocrDir, 'api/ocr-api.js'), name: 'ocr/api/ocr-api.js' },
  { path: path.join(ocrDir, 'ui/ocr-panels.js'), name: 'ocr/ui/ocr-panels.js' },
  { path: path.join(ocrDir, 'core/OCRAgent.js'), name: 'ocr/core/OCRAgent.js' }
];

try {
  // 读取所有源文件
  let bundledCode = '';

  console.log('📦 正在合并模块...\n');

  sourceFiles.forEach(file => {
    if (!fs.existsSync(file.path)) {
      console.error(`❌ 文件不存在: ${file.name}`);
      process.exit(1);
    }

    console.log(`  ✓ ${file.name}`);

    let content = fs.readFileSync(file.path, 'utf8');

    // 移除每个文件的导出代码（开发模式使用）
    content = content.replace(/\/\/ 导出（开发模式使用）[\s\S]*?window\.\w+\s*=\s*\w+;?\s*}/g, '');

    // 添加文件分隔注释
    bundledCode += `\n// ==================== ${file.name} ====================\n`;
    bundledCode += content;
    bundledCode += '\n';
  });

  console.log('\n📝 正在生成 bundle.js...\n');

  // 生成符合CSP安全策略的格式
  // 使用全局函数注册方式，避免使用 eval 或 new Function()
  const finalCode = `(function() {
  'use strict';

${bundledCode}

  // 动态加载外部库
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // 检查是否已经加载
      const existingScript = document.querySelector(\`script[src="\${src}"]\`);
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(\`Failed to load script: \${src}\`));
      document.head.appendChild(script);
    });
  }

  async function loadLibraries() {
    const libraries = [
      'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    ];

    console.log('📚 加载PDF库...');

    for (const lib of libraries) {
      try {
        await loadScript(lib);
        console.log('✅ 已加载:', lib);
      } catch (error) {
        console.error('❌ 加载失败:', lib, error);
        throw error;
      }
    }

    // 配置 pdf.js worker
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  }

  async function init(context) {
    const { container, agentData, config, services, utils } = context;

    console.log('🚀 初始化OCR:', agentData.name);

    // 加载必要的库
    await loadLibraries();

    const ocrAgent = new OCRAgent(context);
    await ocrAgent.render();
  }

  // 注册到全局命名空间（使用智能体ID）
  // 这样可以避免使用 eval 或 new Function()，符合 CSP 安全策略
  window.__AGENT_INIT__ = window.__AGENT_INIT__ || {};
  window.__AGENT_INIT__['ocr'] = init;
  
  console.log('[OCR Bundle] 已注册到 window.__AGENT_INIT__.ocr');
})();
`;

  // 写入bundle.js
  fs.writeFileSync(outputFile, finalCode, 'utf8');

  // 获取文件大小
  const stats = fs.statSync(outputFile);
  const fileSizeInKB = (stats.size / 1024).toFixed(2);

  console.log('✅ 构建完成！\n');
  console.log(`📄 输出文件: ${path.relative(ocrDir, outputFile)}`);
  console.log(`📊 文件大小: ${fileSizeInKB} KB\n`);
  console.log('💡 提示: 现在可以在生产环境中使用 bundle.js 了！');

} catch (error) {
  console.error('\n❌ 构建失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}
