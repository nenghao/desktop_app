/**
 * 智能体相关的IPC处理器
 * 提供文件操作、哈希计算、软链接等功能
 */

const { ipcMain } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

/**
 * 注册智能体相关的IPC处理器
 */
function registerAgentIPCHandlers() {
  console.log('📡 注册智能体IPC处理器...');

  // ==================== 目录操作 ====================

  /**
   * 确保目录存在
   */
  ipcMain.handle('agent:ensure-directory', async (event, dirPath) => {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`✅ 目录已创建: ${dirPath}`);
    } catch (error) {
      console.error('❌ 创建目录失败:', error);
      throw error;
    }
  });

  /**
   * 读取目录内容
   */
  ipcMain.handle('agent:read-directory', async (event, dirPath) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile()
      }));
    } catch (error) {
      console.error('❌ 读取目录失败:', error);
      throw error;
    }
  });

  /**
   * 删除目录（递归）
   */
  ipcMain.handle('agent:delete-directory', async (event, dirPath) => {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      console.log(`✅ 目录已删除: ${dirPath}`);
    } catch (error) {
      console.error('❌ 删除目录失败:', error);
      throw error;
    }
  });

  /**
   * 获取目录大小
   */
  ipcMain.handle('agent:get-directory-size', async (event, dirPath) => {
    try {
      const size = await getDirectorySize(dirPath);
      return size;
    } catch (error) {
      console.error('❌ 获取目录大小失败:', error);
      throw error;
    }
  });

  // ==================== 文件操作 ====================

  /**
   * 移动文件
   */
  ipcMain.handle('agent:move-file', async (event, sourcePath, targetPath) => {
    try {
      // 确保目标目录存在
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      // 移动文件
      await fs.rename(sourcePath, targetPath);
      console.log(`✅ 文件已移动: ${sourcePath} -> ${targetPath}`);
    } catch (error) {
      console.error('❌ 移动文件失败:', error);
      throw error;
    }
  });

  /**
   * 复制文件
   */
  ipcMain.handle('agent:copy-file', async (event, sourcePath, targetPath) => {
    try {
      // 确保目标目录存在
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      // 复制文件
      await fs.copyFile(sourcePath, targetPath);
      console.log(`✅ 文件已复制: ${sourcePath} -> ${targetPath}`);
    } catch (error) {
      console.error('❌ 复制文件失败:', error);
      throw error;
    }
  });

  /**
   * 设置文件为可执行
   */
  ipcMain.handle('agent:set-executable', async (event, filePath) => {
    try {
      // 仅在Unix系统上设置可执行权限
      if (process.platform !== 'win32') {
        await fs.chmod(filePath, 0o755);
        console.log(`✅ 已设置可执行权限: ${filePath}`);
      }
    } catch (error) {
      console.error('❌ 设置可执行权限失败:', error);
      throw error;
    }
  });

  /**
   * 计算文件哈希（SHA256）
   */
  ipcMain.handle('agent:calculate-file-hash', async (event, filePath) => {
    try {
      const hash = await calculateFileHash(filePath);
      return hash;
    } catch (error) {
      console.error('❌ 计算文件哈希失败:', error);
      throw error;
    }
  });

  /**
   * 清理旧文件
   */
  ipcMain.handle('agent:cleanup-old-files', async (event, dirPath, maxAge) => {
    try {
      const deletedCount = await cleanupOldFiles(dirPath, maxAge);
      return deletedCount;
    } catch (error) {
      console.error('❌ 清理旧文件失败:', error);
      throw error;
    }
  });

  // ==================== 软链接操作 ====================

  /**
   * 创建软链接
   */
  ipcMain.handle('agent:create-symlink', async (event, targetPath, linkPath) => {
    try {
      // 删除已存在的软链接
      try {
        await fs.unlink(linkPath);
      } catch (error) {
        // 忽略不存在的错误
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // 创建软链接
      // Windows需要管理员权限，或者使用junction
      if (process.platform === 'win32') {
        // Windows上使用junction（不需要管理员权限）
        await fs.symlink(targetPath, linkPath, 'junction');
      } else {
        // Unix系统使用符号链接
        await fs.symlink(targetPath, linkPath);
      }

      console.log(`✅ 软链接已创建: ${linkPath} -> ${targetPath}`);
    } catch (error) {
      console.error('❌ 创建软链接失败:', error);
      throw error;
    }
  });

  // ==================== 进程操作 ====================

  /**
   * 启动子进程
   */
  ipcMain.handle('agent:spawn-process', async (event, exePath, args) => {
    return new Promise((resolve, reject) => {
      console.log(`⚙️ 启动进程: ${exePath}`, args);

      const childProcess = spawn(exePath, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      childProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve({
            output: output,
            exitCode: code
          });
        } else {
          reject(new Error(errorOutput || `进程退出码: ${code}`));
        }
      });

      childProcess.on('error', (error) => {
        reject(error);
      });
    });
  });

  console.log('✅ 智能体IPC处理器注册完成');
}

// ==================== 辅助函数 ====================

/**
 * 计算文件SHA256哈希
 */
async function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = require('fs').createReadStream(filePath);

    stream.on('data', (data) => {
      hash.update(data);
    });

    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });

    stream.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 递归计算目录大小
 */
async function getDirectorySize(dirPath) {
  let totalSize = 0;

  async function calculateSize(currentPath) {
    const stats = await fs.stat(currentPath);

    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      const entries = await fs.readdir(currentPath);
      for (const entry of entries) {
        await calculateSize(path.join(currentPath, entry));
      }
    }
  }

  await calculateSize(dirPath);
  return totalSize;
}

/**
 * 清理旧文件
 */
async function cleanupOldFiles(dirPath, maxAge) {
  let deletedCount = 0;
  const now = Date.now();

  try {
    const entries = await fs.readdir(dirPath);

    for (const entry of entries) {
      const filePath = path.join(dirPath, entry);
      const stats = await fs.stat(filePath);

      if (stats.isFile()) {
        const age = now - stats.mtime.getTime();
        if (age > maxAge) {
          await fs.unlink(filePath);
          deletedCount++;
          console.log(`🗑️ 删除旧文件: ${entry}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ 清理旧文件时出错:', error);
  }

  return deletedCount;
}

module.exports = {
  registerAgentIPCHandlers
};

