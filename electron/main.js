/**
 * Electron 主进程
 */

const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const isDev = process.env.NODE_ENV === 'development' && !process.env.FORCE_PROD;
const contextMenu = require('electron-context-menu').default;

contextMenu({
  showSearchWithGoogle: false,
  showCopyImageAddress: false,
  showSaveImageAs: false,
  showInspectElement: isDev,

  // 覆盖默认菜单
  menu: (actions, props, browserWindow) => {
    const isTextSelected = props.selectionText.trim().length > 0;
    const isEditable = props.isEditable;

    const items = [];

    // 输入框中的剪切/复制/粘贴
    if (isEditable) {
      items.push(
        actions.cut(),
        actions.copy(),
        actions.paste(),
      );

      // 输入框才显示 select all
      items.push(actions.selectAll());
    }

    // 文本被选中 → 显示复制
    if (!isEditable && isTextSelected) {
      items.push(actions.copy());
      items.push(actions.selectAll()); // 如果你希望文本选中时也能 select all
    }

    // 如果一个条目都没有，返回空菜单（不会显示右键）
    return items.length > 0 ? items : [];
  }
});

// 设置应用名称(用于内部路径、缓存等，使用英文)
// 注意：这个名称会影响用户数据目录路径（如 C:\Users\xxx\AppData\Roaming\Questech）
// 而显示给用户的名称（桌面图标、窗口标题等）通过 productName 在 package.json 中配置
app.setName('Questech');

// 应用路径配置
const APP_PATHS = {
  // 用户配置目录 (Roaming) - 用于存储用户设置、偏好、账户信息等需要同步的数据
  userData: app.getPath('userData'),  // C:\Users\xxx\AppData\Roaming\Questech

  // 缓存目录 (Local) - 用于存储缓存、临时文件、下载的插件等不应同步的大文件
  cache: app.getPath('cache'),        // C:\Users\xxx\AppData\Local\Questech\Cache

  // 临时目录
  temp: app.getPath('temp'),          // C:\Users\xxx\AppData\Local\Temp

  // 日志目录 (Local) - 应用日志
  logs: path.join(app.getPath('userData'), '..', '..', 'Local', 'Questech', 'logs'),

  // 插件目录 (Local) - 已安装的插件
  plugins: path.join(app.getPath('userData'), '..', '..', 'Local', 'Questech', 'plugins')
};

// 确保必要的目录存在
Object.entries(APP_PATHS).forEach(([key, dirPath]) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✅ 创建目录 [${key}]:`, dirPath);
    }
  } catch (error) {
    console.error(`❌ 创建目录 [${key}] 失败:`, error);
  }
});

console.log('📁 应用路径配置:');
console.log('  - 用户数据 (Roaming):', APP_PATHS.userData);
console.log('  - 缓存 (Local):', APP_PATHS.cache);
console.log('  - 插件 (Local):', APP_PATHS.plugins);
console.log('  - 日志 (Local):', APP_PATHS.logs);

// 引入智能体IPC处理器
const { registerAgentIPCHandlers } = require('./agent-ipc-handlers.js');

// 定义获取资源路径的辅助函数
function getAssetPath(relativePath) {
  if (isDev) {
    return path.join(__dirname, '../', relativePath);
  } else {
    // 在打包后的应用中，图标文件可能在不同位置
    if (process.platform === 'darwin') {
      // macOS: 图标通常在 Resources 目录
      return path.join(process.resourcesPath, relativePath);
    } else {
      // Windows/Linux: 在应用目录
      return path.join(app.getAppPath(), relativePath);
    }
  }
}

// 定义获取资源URL的辅助函数
function getResourcePath(relativePath) {
  // avatar SVG资源特殊处理
  if (relativePath.startsWith('src/assets/avatar/') || relativePath.startsWith('assets/avatar/')) {
    // 标准化路径
    const normalizedPath = relativePath.replace('src/assets/avatar/', '').replace('assets/avatar/', '');

    if (isDev) {
      // 开发模式：直接返回相对路径
      return `file://${path.join(__dirname, '../src/assets/avatar', normalizedPath).replace(/\\/g, '/')}`;
    } else {
      // 生产模式：返回打包后的路径
      return `file://${path.join(app.getAppPath(), 'assets/avatar', normalizedPath).replace(/\\/g, '/')}`;
    }
  }

  // 其他资源的默认处理
  const assetPath = getAssetPath(relativePath);
  return `file://${assetPath.replace(/\\/g, '/')}`;
}

// 保持对窗口对象的全局引用
let mainWindow;
let debugWindow; // 调试窗口
let documentWindows = new Map(); // 存储文档窗口 {id: BrowserWindow}

/**
 * 创建文档查看窗口
 */
function createDocumentWindow(options = {}) {
  const {
    title = '文档查看',
    url,
    width = 800,
    height = 600,
    x,
    y
  } = options;

  console.log(`📄 创建文档窗口: ${title}`);

  // 创建新窗口
  const docWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    title,
    show: false, // 先不显示，等内容加载后再显示
    icon: getAssetPath('src/assets/icons/AppIcon_win.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
      webSecurity: true
    },
    frame: true,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff'
  });

  // 禁用缓存
  docWindow.webContents.session.clearCache();

  // 异步加载URL，不阻塞返回
  if (url) {
    // 添加时间戳参数强制刷新
    const urlWithTimestamp = url.includes('?')
      ? `${url}&_t=${Date.now()}`
      : `${url}?_t=${Date.now()}`;

    docWindow.loadURL(urlWithTimestamp).catch(err => {
      console.error(`❌ 加载URL失败: ${url}`, err);
    });

    // 页面准备好后显示窗口
    docWindow.once('ready-to-show', () => {
      docWindow.show();
      docWindow.focus();
    });
  } else {
    // 如果没有URL，直接显示
    docWindow.show();
  }

  // 生成唯一ID
  const windowId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  documentWindows.set(windowId, docWindow);

  // 窗口关闭时清理
  docWindow.on('closed', () => {
    documentWindows.delete(windowId);
    console.log(`📄 文档窗口已关闭: ${title}`);
  });

  // 阻止导航到其他URL（可选）
  docWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    // 允许在同一域名下导航
    const currentUrl = new URL(url);
    const newUrl = new URL(navigationUrl);

    if (currentUrl.origin !== newUrl.origin) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // 处理新窗口打开
  docWindow.webContents.setWindowOpenHandler(({ url: newUrl }) => {
    shell.openExternal(newUrl);
    return { action: 'deny' };
  });

  console.log(`✅ 文档窗口已创建: ${windowId}`);
  return windowId;
}

/**
 * 打开双面板演示窗口，仅在开发模式
 */
function openSplitPanelDemo() {
  if (!isDev) return;

  // 创建双面板演示窗口
  const splitPanelWindow = new BrowserWindow({
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: '双面板演示 - 奇境探索',
    icon: getAssetPath('src/assets/icons/AppIcon_win.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // 允许加载本地文件
      allowRunningInsecureContent: true
    },
    backgroundColor: '#ffffff'
  });

  // 加载双面板演示文件
  const demoFilePath = path.join(__dirname, '../examples/split-panel-demo.html');
  console.log(`📁 加载双面板演示文件: ${demoFilePath}`);
  splitPanelWindow.loadFile(demoFilePath);

  splitPanelWindow.webContents.openDevTools({ mode: 'right' });

  // 窗口关闭时清理引用
  splitPanelWindow.on('closed', () => {
    console.log('🖼️  双面板演示窗口已关闭');
  });

  console.log('✅ 双面板演示窗口已打开');
}

/**
 * 创建主窗口
 */
async function createMainWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false, // 先不显示，等加载完成后再显示
    icon: getAssetPath('src/assets/icons/AppIcon_win.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      sandbox: false // 如果设为 true，需要确保 preload 脚本兼容
    },
    // 所有平台都使用原生标题栏和菜单栏
    frame: true,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff'
  });

  // 加载应用
  console.log('📝 开始加载应用...');
  if (isDev) {
    // 开发模式：连接到Vite开发服务器
    // 使用更灵活的端口检测
    const possiblePorts = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180];

    async function findVitePort() {
      // 先尝试从环境变量获取端口
      const vitePort = process.env.VITE_PORT || 5173;

      // 实际检测当前运行中的Vite服务
      const http = require('http');

      for (const port of possiblePorts) {
        try {
          const response = await new Promise((resolve, reject) => {
            const req = http.get(`http://localhost:${port}`, (res) => {
              resolve({ port, status: res.statusCode });
            });
            req.on('error', reject);
            req.setTimeout(1000, () => {
              req.destroy();
              reject(new Error('Timeout'));
            });
          });

          if (response.status >= 200 && response.status < 400) {
            return port;
          }
        } catch (error) {
          // 端口不可用，继续尝试下一个
        }
      }

      return vitePort; // 回退到配置端口
    }

    findVitePort().then(port => {
      const devUrl = `http://localhost:${port}`;
      console.log(`🔗 连接到开发服务器: ${devUrl}`);

      return mainWindow.loadURL(devUrl);
    }).then(() => {
      console.log(`✅ 成功连接到开发服务器`);
    }).catch((error) => {
      console.error('❌ 无法连接到开发服务器，回退到生产模式', error);
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });

    // 打开开发者工具
    mainWindow.webContents.openDevTools({ mode: 'right' });
  } else {
    // 生产模式：加载构建后的文件
    console.log('📁 加载构建文件');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

    // 生产模式禁用开发者工具（防止用户打开）
    mainWindow.webContents.on('devtools-opened', () => {
      if (!isDev) {
        mainWindow.webContents.closeDevTools();
      }
    });
  }

  // 设置 Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };

    // 设置 Content Security Policy
    responseHeaders['Content-Security-Policy'] = [
      isDev
        ? [
          "default-src 'self' data: blob: http: ws: http://192.168.0.103:10089 https://static.baizesz.com",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: http: http://192.168.0.103:10089 https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com",
          "style-src 'self' 'unsafe-inline' http: http://192.168.0.103:10089",
          "img-src 'self' data: blob: http: http://192.168.0.103:10089 https://static.baizesz.com",
          "connect-src 'self' http: ws: http://192.168.0.103:10089 ws://192.168.0.103:10089 https://static.baizesz.com",
          "font-src 'self' data: http:192.168.0.103:10089",
          "media-src 'self' data: blob: http:192.168.0.103:10089",
          "worker-src 'self' blob:",
          "child-src 'self' blob:",
          "object-src 'none'",
          "base-uri 'self'"
        ].join('; ')
        : [
          "default-src 'self' data: blob: https:",
          "script-src 'self' 'unsafe-inline' blob: https://api.baizesz.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com",
          "style-src 'self' 'unsafe-inline' https://api.baizesz.com",
          "img-src 'self' data: blob: https: https://api.baizesz.com https://static.baizesz.com",
          "connect-src 'self' https: https://api.baizesz.com https://static.baizesz.com",
          "font-src 'self' data: https://api.baizesz.com",
          "media-src 'self' data: blob: https://api.baizesz.com",
          "worker-src 'self' blob:",
          "child-src 'self' blob:",
          "object-src 'none'",
          "base-uri 'self'"
        ].join('; ')
    ];

    callback({
      responseHeaders
    });
  });

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    console.log('✅ 窗口准备就绪，正在显示...');
    mainWindow.show();
    mainWindow.focus();

    // 检查窗口状态
    setTimeout(() => {
      console.log('🔍 窗口状态检查:');
      console.log('  - 是否可见:', mainWindow.isVisible());
      console.log('  - 是否最小化:', mainWindow.isMinimized());
      console.log('  - 是否聚焦:', mainWindow.isFocused());
      console.log('  - 窗口位置:', mainWindow.getBounds());

      // 确保窗口在主显示器上并居中
      const { screen } = require('electron');
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;

      mainWindow.setPosition(
        Math.floor((width - 1200) / 2),
        Math.floor((height - 800) / 2)
      );

      // 强制置顶并聚焦
      // mainWindow.setAlwaysOnTop(true);
      // setTimeout(() => {
      //   mainWindow.setAlwaysOnTop(false);
      //   mainWindow.focus();
      //   console.log('🎯 窗口已重新定位并聚焦');
      // }, 1000);
    }, 1000);
  });

  // 添加页面加载事件监听
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ 页面加载完成');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ 页面加载失败:', errorCode, errorDescription);
  });

  // 添加DOM加载完成事件
  mainWindow.webContents.on('dom-ready', () => {
    console.log('✅ DOM加载完成');

    // 在开发模式下打开并停靠开发者工具到右侧
    // if (isDev) {
    //   mainWindow.webContents.openDevTools({ mode: 'right' });
    // }
  });

  // 当窗口关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 阻止导航到外部URL
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // 允许的来源列表
    const allowedOrigins = isDev
      ? [
        'http://localhost:5173',
        'http://192.168.0.103:10089',
        'file://'
      ]
      : [
        'https://api.baizesz.com',
        'file://'
      ];

    if (!allowedOrigins.includes(parsedUrl.origin)) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // 在 createMainWindow 函数中添加快捷键监听
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (isDev) {
      // Ctrl+R 或 F5 刷新
      if ((input.control && input.key.toLowerCase() === 'r') || input.key === 'F5') {
        mainWindow.reload();
      }
      // Ctrl+Shift+R 强制刷新
      if (input.control && input.shift && input.key.toLowerCase() === 'r') {
        mainWindow.webContents.reloadIgnoringCache();
      }
      // F12 开发者工具
      if (input.key === 'F12') {
        mainWindow.webContents.toggleDevTools();
      }
    } else {
      // 生产模式：禁用调试快捷键
      if (input.key === 'F12' ||
        (input.control && input.shift && input.key.toLowerCase() === 'i') ||
        (input.control && input.shift && input.key.toLowerCase() === 'j')) {
        event.preventDefault();
      }
    }
  });
}

/**
 * 打开插件调试窗口
 */
function openPluginDebugger() {
  // 如果调试窗口已存在，则聚焦
  if (debugWindow && !debugWindow.isDestroyed()) {
    debugWindow.focus();
    return;
  }

  // 创建调试窗口
  debugWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: '插件调试器',
    icon: getAssetPath('src/assets/icons/icon.png'),
    webPreferences: {
      nodeIntegration: true, // 调试窗口需要访问文件系统
      contextIsolation: false,
      enableRemoteModule: false,
      webSecurity: false, // 允许加载本地文件
      allowRunningInsecureContent: true
    },
    backgroundColor: '#f5f5f5'
  });

  // 加载调试页面
  if (isDev) {
    // 先加载主页面
    debugWindow.loadURL('http://localhost:5173/');

    // 等待页面加载完成后再导航到调试路由
    debugWindow.webContents.once('did-finish-load', () => {
      debugWindow.webContents.executeJavaScript(`
        window.location.hash = '#/debug-plugin';
      `);
      console.log('🐛 [Main] 已设置调试窗口路由: #/debug-plugin');
    });
  } else {
    debugWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: '/debug-plugin'
    });
  }

  // 自动打开开发者工具
  debugWindow.webContents.openDevTools({ mode: 'right' });

  // 窗口关闭时清理引用
  debugWindow.on('closed', () => {
    debugWindow = null;
  });

  console.log('🐛 [Main] 插件调试窗口已打开');
}

/**
 * 处理菜单项点击的通用函数
 * 注意：编辑、视图、窗口等基础菜单项使用 Electron 的 role 自动处理，不需要在这里实现
 */
function handleMenuClick(menuId) {
  console.log('🔍 handleMenuClick 被调用:', menuId);

  // Windows 平台需要手动处理 role 菜单项（因为使用的是自定义菜单栏）
  // macOS 和 Linux 使用原生菜单栏，role 菜单项会自动处理
  // if (process.platform === 'win32') {
  //   const roleActions = {
  //     'undo': () => mainWindow.webContents.undo(),
  //     'redo': () => mainWindow.webContents.redo(),
  //     'cut': () => mainWindow.webContents.cut(),
  //     'copy': () => mainWindow.webContents.copy(),
  //     'paste': () => mainWindow.webContents.paste(),
  //     'selectall': () => mainWindow.webContents.selectAll(),
  //     'reload': () => mainWindow.reload(),
  //     'forceReload': () => mainWindow.webContents.reloadIgnoringCache(),
  //     'toggleDevTools': () => mainWindow.webContents.toggleDevTools(),
  //     'resetZoom': () => mainWindow.webContents.setZoomLevel(0),
  //     'zoomIn': () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5),
  //     'zoomOut': () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5),
  //     'toggleFullscreen': () => mainWindow.setFullScreen(!mainWindow.isFullScreen()),
  //     'minimize': () => mainWindow.minimize(),
  //     'close': () => mainWindow.close(),
  //     'zoom': () => mainWindow.maximize(),
  //     'front': () => mainWindow.moveTop()
  //   };

  //   if (roleActions[menuId]) {
  //     roleActions[menuId]();
  //     return;
  //   }
  // }

  // 处理自定义菜单项（所有平台通用）
  switch (menuId) {
    case 'about':
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '关于 奇境探索',
        message: '奇境探索',
        detail: 'AI 智能体系统\n版本: 1.0.0',
        buttons: ['确定']
      });
      break;
    case 'preferences':
      mainWindow.webContents.send('open-settings-modal');
      break;
    case 'quit':
      app.quit();
      break;
    case 'debug-plugin':
      if (isDev) {
        openPluginDebugger();
      }
      break;
    case 'load-split-panel-demo':
      if (isDev) {
        openSplitPanelDemo();
      }
      break;
    case 'reload-debug-window':
      if (isDev && debugWindow && !debugWindow.isDestroyed()) {
        debugWindow.reload();
      }
      break;
    case 'learn-more':
      shell.openExternal('https://github.com/nenhall/Questech');
      break;
    default:
      console.log('未知菜单项:', menuId);
  }
}

/**
 * 获取菜单模板数据
 */
function getMenuTemplate() {
  // 根据平台设置快捷键前缀
  const cmdKey = process.platform === 'darwin' ? 'Command' : 'Ctrl';
  const cmdOrCtrl = process.platform === 'darwin' ? 'Command' : 'Ctrl';

  const menuTemplate = [
    {
      label: process.platform === 'darwin' || process.platform === 'win32' ? '关于' : '',
      icon: process.platform !== 'darwin' && process.platform !== 'win32' ? path.join(__dirname, '../src/assets/icons/png/32x32.png') : undefined,
      submenu: [
        {
          id: 'about',
          label: '关于 奇境探索',
          accelerator: '',
          click: () => handleMenuClick('about')
        },
        { type: 'separator' },
        {
          id: 'preferences',
          label: '偏好设置',
          accelerator: `${cmdOrCtrl}+,`,
          click: () => handleMenuClick('preferences')
        },
        { type: 'separator' },
        {
          id: 'quit',
          label: process.platform === 'darwin' ? '退出 奇境探索' : '退出',
          accelerator: `${cmdKey}+Q`,
          click: () => handleMenuClick('quit')
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { id: 'undo', label: '撤销', role: 'undo' },
        { id: 'redo', label: '重做', role: 'redo' },
        { type: 'separator' },
        { id: 'cut', label: '剪切', role: 'cut' },
        { id: 'copy', label: '复制', role: 'copy' },
        { id: 'paste', label: '粘贴', role: 'paste' },
        { id: 'selectall', label: '全选', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        // 生产环境移除开发者工具相关菜单项
        ...(isDev ? [
          { id: 'reload', label: '重新加载', role: 'reload' },
          { id: 'forceReload', label: '强制重新加载', role: 'forceReload' },
          { id: 'toggleDevTools', label: '开发者工具', role: 'toggleDevTools' },
          { type: 'separator' }
        ] : []),
        { id: 'resetZoom', label: '实际大小', role: 'resetZoom' },
        { id: 'zoomIn', label: '放大', role: 'zoomIn' },
        { id: 'zoomOut', label: '缩小', role: 'zoomOut' },
        { type: 'separator' },
        { id: 'toggleFullscreen', label: '全屏', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { id: 'minimize', label: '最小化', role: 'minimize' },
        { id: 'close', label: '关闭', role: 'close' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        { id: 'learn-more', label: '学习更多', accelerator: '', click: () => handleMenuClick('learn-more') }
      ]
    }
  ];

  // macOS 特殊处理
  if (process.platform === 'darwin') {
    // 找到偏好设置的位置
    const preferencesIndex = menuTemplate[0].submenu.findIndex(item => item.id === 'preferences');

    if (preferencesIndex > -1) {
      // 在偏好设置之后插入服务菜单
      menuTemplate[0].submenu.splice(preferencesIndex + 1, 0, {
        id: 'services',
        label: '服务',
        submenu: []
      });
    }

    // 找到窗口菜单的索引（可能因为添加了 Debug 菜单而改变）
    const windowMenuIndex = menuTemplate.findIndex(menu => menu.label === '窗口');
    menuTemplate[windowMenuIndex].submenu = [
      { id: 'close', label: '关闭', role: 'close' },
      { id: 'minimize', label: '最小化', role: 'minimize' },
      { id: 'zoom', label: '缩放', role: 'zoom' },
      { type: 'separator' },
      { id: 'front', label: '将 奇境探索 置于前台', role: 'front' }
    ];
  }

  // 仅在开发环境添加 Debug 菜单
  if (isDev) {
    // 在"帮助"菜单之后插入 Debug 菜单
    menuTemplate.push({
      label: 'Debug',
      submenu: [
        { id: 'debug-plugin', label: '调试插件...', accelerator: `${cmdOrCtrl}+Shift+D`, click: () => handleMenuClick('debug-plugin') },
        { id: 'load-split-panel-demo', label: '加载双面板示例', accelerator: `${cmdOrCtrl}+Shift+P`, click: () => handleMenuClick('load-split-panel-demo') },
        { type: 'separator' },
        { id: 'reload-debug-window', label: '重新加载调试窗口', accelerator: `${cmdOrCtrl}+Shift+R`, click: () => handleMenuClick('reload-debug-window') }
      ]
    });
  }

  return menuTemplate;
}

/**
 * 注册自定义协议处理
 */
function registerCustomProtocol() {
  const PROTOCOL = 'questech';

  // 设置为默认协议客户端
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }

  console.log('🔗 已注册自定义协议:', PROTOCOL + '://');

  // Windows 和 Linux: 处理第二个实例启动（协议唤起时）
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    console.log('⚠️ 已有应用实例在运行，退出当前实例');
    app.quit();
  } else {
    app.on('second-instance', (_event, commandLine, workingDirectory) => {
      console.log('🔔 检测到第二个实例启动:', { commandLine, workingDirectory });

      // 聚焦主窗口
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }

      // 在 Windows/Linux 上，协议 URL 在命令行参数中
      const protocolUrl = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`));
      if (protocolUrl) {
        console.log('📥 接收到协议 URL:', protocolUrl);
        handleProtocolUrl(protocolUrl);
      }
    });
  }

  // macOS: 处理 open-url 事件
  app.on('open-url', (event, url) => {
    event.preventDefault();
    console.log('📥 macOS open-url 事件:', url);

    if (url.startsWith(`${PROTOCOL}://`)) {
      handleProtocolUrl(url);
    }
  });
}

/**
 * 处理自定义协议 URL
 */
function handleProtocolUrl(url) {
  try {
    const parsedUrl = new URL(url);
    console.log('🔍 解析协议 URL:', {
      protocol: parsedUrl.protocol,
      host: parsedUrl.host,
      pathname: parsedUrl.pathname,
      search: parsedUrl.search
    });

    // 处理 Apple 登录回调: questech://auth/apple?code=xxx&state=xxx
    if (parsedUrl.host === 'auth' && parsedUrl.pathname === '/apple') {
      handleAppleAuthCallback(parsedUrl);
    } else {
      console.warn('⚠️ 未知的协议路径:', parsedUrl.href);
    }
  } catch (error) {
    console.error('❌ 解析协议 URL 失败:', error);
  }
}

/**
 * 处理 Apple 登录回调
 */
async function handleAppleAuthCallback(parsedUrl) {
  // 先尝试正常解析
  let params = Object.fromEntries(parsedUrl.searchParams);

  // 检查是否有 HTML 实体编码问题（如 &amp;）
  if (Object.keys(params).some(key => key.includes('amp;'))) {
    console.warn('⚠️ 检测到 HTML 实体编码问题，尝试修复...');

    // 重新解析：将 &amp; 替换为 &
    const cleanSearch = parsedUrl.search.replace(/&amp;/g, '&');
    const cleanParams = new URLSearchParams(cleanSearch);
    params = Object.fromEntries(cleanParams);

    console.log('✅ 参数已修复:', Object.keys(params));
  }

  console.log('🍎 处理 Apple 登录回调:', {
    hasToken: !!params.token,
    hasRefreshToken: !!params.refresh_token,
    hasUserIdentifier: !!params.user_identifier
  });

  // 发送数据到渲染进程
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('apple-auth-callback', params);
    console.log('✅ 已发送 Apple 登录数据到渲染进程');
  }
}

/**
 * IPC Handlers - 必须在 app.whenReady() 之前注册
 */

// 确保目录存在（创建目录）
ipcMain.handle('fs-ensure-dir', async (_event, dirPath) => {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
    return true;
  } catch (error) {
    console.error('❌ 创建目录失败:', error);
    throw error;
  }
});

/**
 * 应用事件处理
 */

// 当 Electron 完成初始化并准备创建浏览器窗口时调用
app.whenReady().then(() => {
  // 注册自定义协议处理（用于 Apple 登录等 OAuth 回调）
  registerCustomProtocol();

  // 注册智能体IPC处理器
  registerAgentIPCHandlers();

  createMainWindow();

  // 设置菜单
  // 所有平台都设置应用菜单：
  // - Windows: 菜单隐藏在标题栏中，可通过 Alt 键调出
  // - macOS 和 Linux: 显示在系统原生菜单栏
  Menu.setApplicationMenu(Menu.buildFromTemplate(getMenuTemplate()));

  // macOS 特殊处理：当点击 dock 图标时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  // macOS 上，除非用户明确按下 Cmd + Q，否则应用和菜单栏会保持活跃
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 安全：阻止新窗口创建
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

/**
 * IPC 事件处理
 */

// 获取应用版本
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// 获取应用路径
ipcMain.handle('get-app-path', (event, name) => {
  return app.getPath(name);
});

// 获取应用路径配置（推荐使用此接口）
ipcMain.handle('get-app-paths', () => {
  return APP_PATHS;
});

// 获取特定类型的路径
ipcMain.handle('get-specific-path', (_event, pathType) => {
  if (APP_PATHS[pathType]) {
    return APP_PATHS[pathType];
  }
  throw new Error(`未知的路径类型: ${pathType}`);
});

// 更新标题栏覆盖层颜色
// 注意：Windows 使用完全自定义的标题栏（frame: false），不使用 titleBarOverlay
// 这个处理器保留是为了兼容性，但实际上不做任何操作
ipcMain.handle('update-title-bar-overlay', () => {
  // Windows 使用自定义 TitleBar 组件，不需要更新原生标题栏覆盖层
  // macOS/Linux 使用原生标题栏，也不需要这个功能
  console.log('ℹ️ update-title-bar-overlay 调用已忽略（使用自定义标题栏）');
});

// 显示消息框
ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

// 显示打开文件对话框
ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// 显示保存文件对话框
ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

// 打开外部链接
ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});

// 显示项目在文件夹中
ipcMain.handle('show-item-in-folder', (event, fullPath) => {
  shell.showItemInFolder(fullPath);
});

// 重启应用
ipcMain.handle('restart-app', () => {
  app.relaunch();
  app.exit();
});

// 退出应用
ipcMain.handle('quit-app', () => {
  app.quit();
});

// 资源路径和环境检测相关IPC处理
// 获取资源路径
ipcMain.handle('get-resource-path', (event, relativePath) => {
  return getResourcePath(relativePath);
});

// 检测是否为打包应用
ipcMain.handle('is-packaged', () => {
  return app.isPackaged;
});

// 获取应用基础路径
ipcMain.handle('get-app-base-path', () => {
  if (app.isPackaged) {
    return process.resourcesPath;
  } else {
    return path.join(__dirname, '..');
  }
});

// Python执行相关IPC处理
const { spawn } = require('child_process');

// 执行Python脚本
ipcMain.handle('execute-python', async (event, pythonPath, args = [], options = {}) => {
  return new Promise((resolve) => {
    console.log(`🐍 执行Python脚本: ${pythonPath}`, args);

    const pythonProcess = spawn(pythonPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: options.cwd || process.cwd(),
      timeout: options.timeout || 30000,
      env: options.env || process.env
    });

    let output = '';
    let errorOutput = '';
    let resolved = false;

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      const stderrData = data.toString();
      errorOutput += stderrData;
      // 将 stderr 输出到控制台，这样可以看到调试信息
      console.log(`🐍 Python stderr: ${stderrData.trim()}`);
    });

    pythonProcess.on('close', (code) => {
      if (resolved) return;
      resolved = true;

      if (code === 0) {
        console.log(`✅ Python脚本执行成功: ${output.trim()}`);
        resolve({
          success: true,
          output: output.trim(),
          error: null,
          exitCode: code
        });
      } else {
        console.error(`❌ Python脚本执行失败 (退出码: ${code}):`, errorOutput);
        resolve({
          success: false,
          output: null,
          error: errorOutput.trim() || `进程退出码: ${code}`,
          exitCode: code
        });
      }
    });

    pythonProcess.on('error', (error) => {
      if (resolved) return;
      resolved = true;

      console.error('❌ Python进程启动失败:', error);
      resolve({
        success: false,
        output: null,
        error: error.message,
        exitCode: -1
      });
    });

    // 超时处理
    const timeoutId = setTimeout(() => {
      if (resolved) return;
      resolved = true;

      console.warn('⚠️ Python进程执行超时，强制终止');
      pythonProcess.kill();
      resolve({
        success: false,
        output: null,
        error: '执行超时',
        exitCode: -1
      });
    }, options.timeout || 30000);

    // 清理超时定时器
    pythonProcess.on('close', () => {
      clearTimeout(timeoutId);
    });
  });
});

// 打开双面板演示窗口
ipcMain.handle('open-split-panel-demo', () => {
  openSplitPanelDemo();
  return true;
});

// 执行Python代码字符串
ipcMain.handle('execute-python-code', async (event, pythonPath, code, options = {}) => {
  return new Promise((resolve) => {
    console.log(`🐍 执行Python代码 (前100字符):`, code.substring(0, 100));

    const pythonProcess = spawn(pythonPath, ['-c', code], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: options.cwd || process.cwd(),
      timeout: options.timeout || 30000,
      env: options.env || process.env
    });

    let output = '';
    let errorOutput = '';
    let resolved = false;

    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(`🐍 Python stdout:`, text.trim());
    });

    pythonProcess.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      console.log(`🐍 Python stderr:`, text.trim());
    });

    pythonProcess.on('close', (code) => {
      if (resolved) return;
      resolved = true;

      console.log(`🐍 Python进程退出，退出码: ${code}`);
      console.log(`🐍 stdout 长度: ${output.length}, stderr 长度: ${errorOutput.length}`);

      if (code === 0) {
        console.log(`✅ Python代码执行成功`);
        resolve({
          success: true,
          output: output.trim(),
          error: null,
          exitCode: code
        });
      } else {
        console.error(`❌ Python代码执行失败 (退出码: ${code})`);
        console.error(`❌ stdout:`, output);
        console.error(`❌ stderr:`, errorOutput);
        resolve({
          success: false,
          output: output.trim() || null,
          error: errorOutput.trim() || output.trim() || `进程退出码: ${code}`,
          exitCode: code
        });
      }
    });

    pythonProcess.on('error', (error) => {
      if (resolved) return;
      resolved = true;

      console.error('❌ Python进程启动失败:', error);
      resolve({
        success: false,
        output: null,
        error: error.message,
        exitCode: -1
      });
    });

    // 超时处理
    const timeoutId = setTimeout(() => {
      if (resolved) return;
      resolved = true;

      console.warn('⚠️ Python进程执行超时，强制终止');
      pythonProcess.kill();
      resolve({
        success: false,
        output: null,
        error: '执行超时',
        exitCode: -1
      });
    }, options.timeout || 30000);

    // 清理超时定时器
    pythonProcess.on('close', () => {
      clearTimeout(timeoutId);
    });
  });
});

// 插件系统相关IPC处理
let pluginSystem = null;

// 初始化插件系统
let pluginSystemInitialized = false;

async function initializePluginSystem() {
  if (!pluginSystemInitialized) {
    try {

      if (!pluginSystem) {
        const module = await import('../src/main/plugin-system/index.mjs');
        pluginSystem = module.pluginSystem;
      }

      // 动态导入插件系统
      // if (!pluginSystem) {
      //   const pluginModule = require('../src/main/plugin-system/index.js');
      //   pluginSystem = pluginModule.pluginSystem;
      // }

      await pluginSystem.initialize();
      pluginSystemInitialized = true;
      console.log('✅ 插件系统已初始化');
    } catch (error) {
      console.error('❌ 插件系统初始化失败:', error);
      throw error;
    }
  }
}

// 获取插件列表
ipcMain.handle('plugin-get-list', async () => {
  await initializePluginSystem();
  return await pluginSystem.getPluginList();
});

// 搜索插件
ipcMain.handle('plugin-search', async (event, query) => {
  await initializePluginSystem();
  return await pluginSystem.searchPlugins(query);
});

// 获取插件详情
ipcMain.handle('plugin-get-details', async (event, pluginId) => {
  await initializePluginSystem();
  return await pluginSystem.getPluginDetails(pluginId);
});

// 安装插件
ipcMain.handle('plugin-install', async (event, pluginId, options = {}) => {
  await initializePluginSystem();
  return await pluginSystem.installPlugin(pluginId, options);
});

// 卸载插件
ipcMain.handle('plugin-uninstall', async (event, pluginId) => {
  await initializePluginSystem();
  return await pluginSystem.uninstallPlugin(pluginId);
});

// 启动插件
ipcMain.handle('plugin-start', async (event, pluginId, options = {}) => {
  await initializePluginSystem();
  return await pluginSystem.startPlugin(pluginId, options);
});

// 停止插件
ipcMain.handle('plugin-stop', async (event, pluginId) => {
  await initializePluginSystem();
  return await pluginSystem.stopPlugin(pluginId);
});

// 重启插件
ipcMain.handle('plugin-restart', async (event, pluginId, options = {}) => {
  await initializePluginSystem();
  return await pluginSystem.restartPlugin(pluginId, options);
});

// 获取已安装插件
ipcMain.handle('plugin-get-installed', async () => {
  await initializePluginSystem();
  return pluginSystem.getInstalledPlugins();
});

// 获取运行中插件
ipcMain.handle('plugin-get-running', async () => {
  await initializePluginSystem();
  return pluginSystem.getRunningPlugins();
});

// 更新插件列表
ipcMain.handle('plugin-update-list', async () => {
  await initializePluginSystem();
  return await pluginSystem.updatePluginList();
});

// 获取下载进度
ipcMain.handle('plugin-get-download-progress', async (event, downloadId) => {
  await initializePluginSystem();
  return pluginSystem.getDownloadProgress(downloadId);
});

// 取消下载
ipcMain.handle('plugin-cancel-download', async (event, downloadId) => {
  await initializePluginSystem();
  return await pluginSystem.cancelDownload(downloadId);
});

// 获取系统统计信息
ipcMain.handle('plugin-get-statistics', async () => {
  await initializePluginSystem();
  return pluginSystem.getSystemStatistics();
});

// 注意：侧边栏配置现在通过 HTTP 请求获取，不再需要 IPC 处理
// 如果将来需要特殊的文件访问权限，可以重新启用此处理程序

// 设置窗口标题
ipcMain.handle('set-window-title', (event, title) => {
  if (mainWindow) {
    mainWindow.setTitle(title);
  }
});

// 最小化窗口
ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

// 最大化/还原窗口
ipcMain.handle('toggle-maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

// 关闭窗口
ipcMain.handle('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// 获取菜单模板（移除 click 处理器，以便通过 IPC 传递）
ipcMain.handle('get-menu-template', () => {
  const template = getMenuTemplate();

  // 递归移除菜单模板中的 click 处理器（函数无法通过 IPC 序列化）
  const removeClickHandlers = (items) => {
    return items.map(item => {
      const cleanItem = { ...item };
      delete cleanItem.click;

      if (cleanItem.submenu) {
        cleanItem.submenu = removeClickHandlers(cleanItem.submenu);
      }

      return cleanItem;
    });
  };

  return removeClickHandlers(template);
});

// 处理菜单项点击（供 Windows 自定义菜单栏使用）
ipcMain.handle('menu-item-click', async (event, menuId) => {
  handleMenuClick(menuId);
});

// 切换 DevTools (用于调试窗口)
ipcMain.on('open-devtools', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) {
    // 切换 DevTools 的打开/关闭状态
    if (window.webContents.isDevToolsOpened()) {
      window.webContents.closeDevTools();
      console.log('🐛 [Main] DevTools 已关闭');
    } else {
      window.webContents.openDevTools({ mode: 'right' });
      console.log('🐛 [Main] DevTools 已打开');
    }
  }
});

// 添加文件系统相关的 IPC 处理程序
// fs 和 os 模块已在文件开头声明

// 文件系统 API
ipcMain.handle('fs-read-file', async (event, filePath) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    return content;  // 直接返回内容，不包装在对象中
  } catch (error) {
    // 如果文件不存在，返回 null 而不是抛出错误（避免白屏）
    if (error.code === 'ENOENT') {
      console.warn('⚠️ 文件不存在:', filePath);
      return null;
    }
    console.error('❌ 读取文件失败:', error);
    throw error;  // 其他错误仍然抛出
  }
});

ipcMain.handle('fs-write-file', async (event, filePath, content) => {
  try {
    // 如果content是字符串，使用utf8编码；如果是Buffer/Uint8Array，不指定编码
    const options = typeof content === 'string' ? 'utf8' : undefined;
    await fs.promises.writeFile(filePath, content, options);
    // 成功时不返回任何值（或返回undefined）
  } catch (error) {
    console.error('❌ 写入文件失败:', error);
    throw error;  // 抛出错误而不是返回错误对象
  }
});

// 将二进制数据保存到指定目录并返回完整路径
ipcMain.handle('fs-save-to-dir', async (event, dirPath, fileName, data) => {
  try {
    // 确保目录存在
    await fs.promises.mkdir(dirPath, { recursive: true });

    const fullPath = path.join(dirPath, fileName);

    // data 可能是 Uint8Array 或 ArrayBuffer，确保转换为 Buffer
    let buffer;
    if (Buffer.isBuffer(data)) {
      buffer = data;
    } else if (data && data.buffer instanceof ArrayBuffer) {
      buffer = Buffer.from(new Uint8Array(data));
    } else if (data instanceof Uint8Array) {
      buffer = Buffer.from(data);
    } else {
      // 如果是字符串，直接写入文本
      buffer = Buffer.from(String(data));
    }

    await fs.promises.writeFile(fullPath, buffer);
    return fullPath;
  } catch (error) {
    console.error('❌ fs-save-to-dir 保存失败:', error);
    throw error;
  }
});

// 复制文件（方便渲染器调用）
ipcMain.handle('fs-copy-file', async (event, src, dest) => {
  try {
    await fs.promises.copyFile(src, dest);
    return true;
  } catch (error) {
    console.error('❌ fs-copy-file 失败:', error);
    throw error;
  }
});

ipcMain.handle('fs-exists', async (event, filePath) => {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('fs-stat', async (event, filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    // 直接返回stats对象，不包装
    return {
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      mtime: stats.mtime,
      ctime: stats.ctime
    };
  } catch (error) {
    console.error('❌ 获取文件信息失败:', error);
    throw error;  // 抛出错误而不是返回错误对象
  }
});

// 路径 API
ipcMain.handle('path-join', (event, ...paths) => {
  return path.join(...paths);
});

ipcMain.handle('path-dirname', (event, filePath) => {
  return path.dirname(filePath);
});

ipcMain.handle('path-basename', (event, filePath, ext) => {
  return path.basename(filePath, ext);
});

ipcMain.handle('path-extname', (event, filePath) => {
  return path.extname(filePath);
});

ipcMain.handle('path-resolve', (event, ...paths) => {
  return path.resolve(...paths);
});

ipcMain.handle('path-sep', () => {
  return path.sep;
});

// 操作系统 API
ipcMain.handle('os-platform', () => {
  return os.platform();
});

ipcMain.handle('os-arch', () => {
  return os.arch();
});

ipcMain.handle('os-release', () => {
  return os.release();
});

ipcMain.handle('os-homedir', () => {
  return os.homedir();
});

ipcMain.handle('os-tmpdir', () => {
  return os.tmpdir();
});

// 开发者工具相关 API
ipcMain.handle('open-dev-tools', () => {
  if (mainWindow) {
    mainWindow.webContents.openDevTools();
  }
});

ipcMain.handle('reload-window', () => {
  if (mainWindow) {
    mainWindow.reload();
  }
});

// apple login
ipcMain.handle("login-with-apple", async () => {
  const clientId = "com.baizesz.signin.web";
  const redirectURI = encodeURIComponent(
    "https://baizesz.com/auth/apple/callback"
  );
  const state = Math.random().toString(36).slice(2);

  const url =
    `https://appleid.apple.com/auth/authorize?` +
    `response_type=code&` +
    `response_mode=form_post&` + // ✅ 必须加
    `client_id=${clientId}&` +
    `redirect_uri=${redirectURI}&` +
    `scope=name%20email&` +
    `state=${state}`;
  shell.openExternal(url);
});

// 创建文档窗口
ipcMain.handle('create-document-window', (event, options) => {
  return createDocumentWindow(options);
});

// 关闭指定文档窗口
ipcMain.handle('close-document-window', (event, windowId) => {
  const window = documentWindows.get(windowId);
  if (window && !window.isDestroyed()) {
    window.close();
    return true;
  }
  return false;
});

// 开发模式下的热重载支持
if (isDev) {
  // 使用内置的文件监听实现热重载
  const chokidar = require('chokidar');

  // 监听源文件变化
  const watcher = chokidar.watch([
    path.join(__dirname, '../src'),
    path.join(__dirname, '../index.html'),
    path.join(__dirname, '../vite.config.js')
  ], {
    ignored: [
      /node_modules/,
      /src\/plugins\//,  // 排除 Python 依赖文件
      /__pycache__/,                 // 排除 Python 缓存
      /\.pyc$/,                      // 排除 Python 编译文件
      /\.pyo$/,                      // 排除 Python 优化文件
      /\.dll$/,                      // 排除 DLL 文件
      /\.so$/,                       // 排除 SO 文件
      /\.dylib$/                     // 排除 DYLIB 文件
    ],
    persistent: true
  });

  watcher.on('change', (filePath) => {
    console.log(`📝 文件已更改: ${filePath}`);
    console.log('🔄 重新加载应用...');

    // 重新加载渲染进程
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.reload();
    }
  });

  watcher.on('ready', () => {
    console.log('✅ 文件监听已启动');
  });

  // 应用退出时关闭监听
  app.on('before-quit', async () => {
    watcher.close();

    // 清理插件系统
    if (pluginSystemInitialized) {
      try {
        await pluginSystem.cleanup();
        console.log('✅ 插件系统已清理');
      } catch (error) {
        console.error('❌ 清理插件系统失败:', error);
      }
    }
  });
}
