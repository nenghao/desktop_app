/**
 * Electron 适配器
 * 提供跨平台的API接口
 * 支持 Electron 和 Web 环境
 */

import { isElectron, isWeb } from './platform-detector.js';

export class ElectronAdapter {
  constructor() {
    this.isElectron = isElectron();
    this.isWeb = isWeb();
    this.platform = this.isElectron && window.electronAPI?.platform ? window.electronAPI.platform : 'web';
  }

  /**
   * 检查是否在Electron环境中
   */
  isElectronApp() {
    return this.isElectron;
  }

  /**
   * 检查是否在Web环境中
   */
  isWebApp() {
    return this.isWeb;
  }
  
  /**
   * 获取平台信息
   */
  getPlatform() {
    return this.platform;
  }
  
  /**
   * 获取应用版本
   */
  async getAppVersion() {
    if (this.isElectron) {
      return await window.electronAPI.getAppVersion();
    }
    return '2.0.0-web';
  }
  
  /**
   * 显示消息框
   */
  async showMessageBox(options) {
    if (this.isElectron) {
      return await window.electronAPI.showMessageBox(options);
    } else {
      // Web环境使用浏览器原生对话框
      const message = options.message + (options.detail ? '\n\n' + options.detail : '');
      
      if (options.type === 'question') {
        return { response: confirm(message) ? 0 : 1 };
      } else {
        alert(message);
        return { response: 0 };
      }
    }
  }
  
  /**
   * 显示文件选择对话框
   */
  async showOpenDialog(options) {
    if (this.isElectron) {
      return await window.electronAPI.showOpenDialog(options);
    } else {
      // Web环境使用文件输入
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = options.properties?.includes('multiSelections');
        
        if (options.filters) {
          const extensions = options.filters.flatMap(filter => 
            filter.extensions.map(ext => `.${ext}`)
          );
          input.accept = extensions.join(',');
        }
        
        input.onchange = (e) => {
          const files = Array.from(e.target.files);
          resolve({
            canceled: files.length === 0,
            filePaths: files.map(file => file.path || file.name)
          });
        };
        
        input.click();
      });
    }
  }
  
  /**
   * 显示文件保存对话框
   */
  async showSaveDialog(options) {
    if (this.isElectron) {
      return await window.electronAPI.showSaveDialog(options);
    } else {
      // Web环境使用下载
      const filename = options.defaultPath || 'download.txt';
      return {
        canceled: false,
        filePath: filename
      };
    }
  }
  
  /**
   * 打开外部链接
   */
  async openExternal(url) {
    if (this.isElectron) {
      await window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  }
  
  /**
   * 读取文件
   */
  async readFile(filePath) {
    if (this.isElectron) {
      return await window.fileAPI.readFile(filePath);
    } else {
      throw new Error('Web环境不支持直接读取文件');
    }
  }
  
  /**
   * 写入文件
   */
  async writeFile(filePath, content) {
    if (this.isElectron) {
      return await window.fileAPI.writeFile(filePath, content);
    } else {
      // Web环境使用下载
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true };
    }
  }
  
  /**
   * 检查文件是否存在
   */
  async fileExists(filePath) {
    if (this.isElectron) {
      return await window.fileAPI.exists(filePath);
    } else {
      return false; // Web环境无法检查文件系统
    }
  }
  
  /**
   * 获取文件信息
   */
  async getFileStats(filePath) {
    if (this.isElectron) {
      return await window.fileAPI.stat(filePath);
    } else {
      throw new Error('Web环境不支持获取文件信息');
    }
  }
  
  /**
   * 重启应用
   */
  async restartApp() {
    if (this.isElectron) {
      await window.electronAPI.restartApp();
    } else {
      window.location.reload();
    }
  }
  
  /**
   * 退出应用
   */
  async quitApp() {
    if (this.isElectron) {
      await window.electronAPI.quitApp();
    } else {
      window.close();
    }
  }
  
  /**
   * 设置窗口标题
   */
  async setWindowTitle(title) {
    if (this.isElectron) {
      await window.electronAPI.setWindowTitle(title);
    } else {
      document.title = title;
    }
  }
  
  /**
   * 最小化窗口
   */
  async minimizeWindow() {
    if (this.isElectron) {
      await window.electronAPI.minimizeWindow();
    }
    // Web环境无法最小化窗口
  }
  
  /**
   * 最大化/还原窗口
   */
  async toggleMaximizeWindow() {
    if (this.isElectron) {
      await window.electronAPI.toggleMaximizeWindow();
    }
    // Web环境无法控制窗口大小
  }
  
  /**
   * 关闭窗口
   */
  async closeWindow() {
    if (this.isElectron) {
      await window.electronAPI.closeWindow();
    } else {
      window.close();
    }
  }
  
  /**
   * 获取应用路径
   */
  async getAppPath(name) {
    if (this.isElectron) {
      return await window.electronAPI.getAppPath(name);
    } else {
      return null; // Web环境无应用路径概念
    }
  }
  
  /**
   * 获取操作系统信息
   */
  getOSInfo() {
    if (this.isElectron) {
      return {
        platform: window.osAPI.platform(),
        arch: window.osAPI.arch(),
        release: window.osAPI.release(),
        homedir: window.osAPI.homedir(),
        tmpdir: window.osAPI.tmpdir()
      };
    } else {
      return {
        platform: 'web',
        arch: 'unknown',
        release: 'unknown',
        homedir: null,
        tmpdir: null
      };
    }
  }
  
  /**
   * 路径操作
   */
  path = {
    join: (...paths) => {
      if (this.isElectron) {
        return window.pathAPI.join(...paths);
      } else {
        return paths.join('/');
      }
    },
    
    dirname: (path) => {
      if (this.isElectron) {
        return window.pathAPI.dirname(path);
      } else {
        return path.substring(0, path.lastIndexOf('/'));
      }
    },
    
    basename: (path, ext) => {
      if (this.isElectron) {
        return window.pathAPI.basename(path, ext);
      } else {
        const name = path.substring(path.lastIndexOf('/') + 1);
        return ext ? name.replace(ext, '') : name;
      }
    },
    
    extname: (path) => {
      if (this.isElectron) {
        return window.pathAPI.extname(path);
      } else {
        const lastDot = path.lastIndexOf('.');
        return lastDot > 0 ? path.substring(lastDot) : '';
      }
    }
  };
}

// 创建全局实例
export const electronAdapter = new ElectronAdapter();
