/**
 * Electron 预加载脚本
 * 在渲染进程中安全地暴露 Node.js API
 */

const { contextBridge, ipcRenderer } = require('electron');

// 暴露受保护的方法给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 应用信息
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: (name) => ipcRenderer.invoke('get-app-path', name),
  getAppPaths: () => ipcRenderer.invoke('get-app-paths'),
  getSpecificPath: (pathType) => ipcRenderer.invoke('get-specific-path', pathType),

  // 对话框
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),

  // 外部操作
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showItemInFolder: (fullPath) => ipcRenderer.invoke('show-item-in-folder', fullPath),

  // 应用控制
  restartApp: () => ipcRenderer.invoke('restart-app'),
  quitApp: () => ipcRenderer.invoke('quit-app'),

  // 窗口控制
  setWindowTitle: (title) => ipcRenderer.invoke('set-window-title', title),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('toggle-maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  updateTitleBarOverlay: (colors) => ipcRenderer.invoke('update-title-bar-overlay', colors),

  // 菜单相关
  getMenuTemplate: () => ipcRenderer.invoke('get-menu-template'),
  menuItemClick: (menuId) => ipcRenderer.invoke('menu-item-click', menuId),

  // 事件监听
  onNavigateTo: (callback) => {
    ipcRenderer.on('navigate-to', (event, route) => callback(route));
  },

  // 打开设置模态框
  onOpenSettingsModal: (callback) => {
    ipcRenderer.on('open-settings-modal', () => callback());
  },

  // 移除事件监听
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // 平台信息
  platform: process.platform,
  arch: process.arch,
  isElectron: true,
  // 是否为开发模式（由主进程 / 环境变量决定）
  isDev: process.env.NODE_ENV === 'development' && !process.env.FORCE_PROD,
  // 方便调试的原始环境变量快照
  env: {
    NODE_ENV: process.env.NODE_ENV || '',
    FORCE_PROD: process.env.FORCE_PROD || ''
  },

  // Python执行
  executePython: (pythonPath, args, options = {}) => ipcRenderer.invoke('execute-python', pythonPath, args, options),
  executePythonCode: (pythonPath, code, options = {}) => ipcRenderer.invoke('execute-python-code', pythonPath, code, options),

  // 资源路径和环境检测
  getResourcePath: (relativePath) => ipcRenderer.invoke('get-resource-path', relativePath),
  isPackaged: () => ipcRenderer.invoke('is-packaged'),
  getAppBasePath: () => ipcRenderer.invoke('get-app-base-path'),

  // 文件写入辅助（快捷方法）
  // saveToDir(dirPath, fileName, data) -> 返回保存的完整路径
  saveToDir: (dirPath, fileName, data) => ipcRenderer.invoke('fs-save-to-dir', dirPath, fileName, data),

  // 智能体相关API
  // 目录操作
  ensureDirectory: (dirPath) => ipcRenderer.invoke('agent:ensure-directory', dirPath),
  readDirectory: (dirPath) => ipcRenderer.invoke('agent:read-directory', dirPath),
  deleteDirectory: (dirPath) => ipcRenderer.invoke('agent:delete-directory', dirPath),
  getDirectorySize: (dirPath) => ipcRenderer.invoke('agent:get-directory-size', dirPath),

  // 文件操作
  moveFile: (sourcePath, targetPath) => ipcRenderer.invoke('agent:move-file', sourcePath, targetPath),
  copyFile: (sourcePath, targetPath) => ipcRenderer.invoke('agent:copy-file', sourcePath, targetPath),
  setExecutable: (filePath) => ipcRenderer.invoke('agent:set-executable', filePath),
  calculateFileHash: (filePath) => ipcRenderer.invoke('agent:calculate-file-hash', filePath),
  cleanupOldFiles: (dirPath, maxAge) => ipcRenderer.invoke('agent:cleanup-old-files', dirPath, maxAge),

  // 软链接操作
  createSymlink: (targetPath, linkPath) => ipcRenderer.invoke('agent:create-symlink', targetPath, linkPath),

  // 进程操作
  spawnProcess: (exePath, args) => ipcRenderer.invoke('agent:spawn-process', exePath, args),

  // 通用invoke方法
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),

  // Apple 登录相关
  loginWithApple: () => ipcRenderer.invoke("login-with-apple"),

  // 监听 Apple 登录回调
  onAppleAuthCallback: (callback) => {
    ipcRenderer.on('apple-auth-callback', (_event, params) => callback(params));
  },

  // 移除 Apple 登录回调监听
  removeAppleAuthCallback: () => {
    ipcRenderer.removeAllListeners('apple-auth-callback');
  },

  // 文档窗口相关
  createDocumentWindow: (options) => ipcRenderer.invoke('create-document-window', options),
  closeDocumentWindow: (windowId) => ipcRenderer.invoke('close-document-window', windowId)

});

// 暴露文件系统API（受限）- 通过 IPC 调用主进程
contextBridge.exposeInMainWorld('fileAPI', {
  // 读取文件
  readFile: (filePath) => ipcRenderer.invoke('fs-read-file', filePath),

  // 写入文件
  writeFile: (filePath, content) => ipcRenderer.invoke('fs-write-file', filePath, content),

  // 检查文件是否存在
  exists: (filePath) => ipcRenderer.invoke('fs-exists', filePath),

  // 获取文件信息
  stat: (filePath) => ipcRenderer.invoke('fs-stat', filePath),

  // 确保目录存在（创建目录）
  ensureDir: (dirPath) => ipcRenderer.invoke('fs-ensure-dir', dirPath)
});

// 暴露路径工具 - 通过 IPC 调用主进程
contextBridge.exposeInMainWorld('pathAPI', {
  join: (...paths) => ipcRenderer.invoke('path-join', ...paths),
  dirname: (path) => ipcRenderer.invoke('path-dirname', path),
  basename: (path, ext) => ipcRenderer.invoke('path-basename', path, ext),
  extname: (path) => ipcRenderer.invoke('path-extname', path),
  resolve: (...paths) => ipcRenderer.invoke('path-resolve', ...paths),
  sep: ipcRenderer.invoke('path-sep')
});

// 暴露操作系统信息 - 通过 IPC 调用主进程
contextBridge.exposeInMainWorld('osAPI', {
  platform: () => ipcRenderer.invoke('os-platform'),
  arch: () => ipcRenderer.invoke('os-arch'),
  release: () => ipcRenderer.invoke('os-release'),
  homedir: () => ipcRenderer.invoke('os-homedir'),
  tmpdir: () => ipcRenderer.invoke('os-tmpdir')
});