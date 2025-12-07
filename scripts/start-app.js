#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 项目根目录
const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

log('🚀 Questech 应用启动脚本', 'green');
log('================================', 'green');
log(`📁 工作目录: ${projectRoot}`, 'yellow');

// 检查并终止占用端口的进程
function killPortProcess(port) {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const isMacOS = process.platform === 'darwin';

    let command;
    if (isWindows) {
      command = `netstat -ano | findstr :${port}`;
    } else {
      command = `lsof -ti:${port}`;
    }

    exec(command, (error, stdout) => {
      if (error || !stdout.trim()) {
        log(`✅ 端口${port}空闲`, 'green');
        resolve();
        return;
      }

      log(`⚠️  发现端口${port}被占用，正在清理...`, 'red');

      if (isWindows) {
        // Windows: 从netstat输出中提取PID
        const lines = stdout.trim().split('\n');
        const pids = new Set();

        lines.forEach(line => {
          const match = line.trim().match(/\s+(\d+)$/);
          if (match && match[1] !== '0') {
            pids.add(match[1]);
          }
        });

        if (pids.size === 0) {
          resolve();
          return;
        }

        let killed = 0;
        pids.forEach(pid => {
          exec(`taskkill /F /PID ${pid}`, (err) => {
            if (!err) {
              log(`🔪 终止进程 PID: ${pid}`, 'red');
            }
            killed++;
            if (killed === pids.size) {
              setTimeout(resolve, 2000); // 等待2秒
            }
          });
        });
      } else {
        // Unix/Linux/macOS
        const pids = stdout.trim().split('\n').filter(pid => pid);
        if (pids.length === 0) {
          resolve();
          return;
        }

        const killCommand = isMacOS ? `kill -9 ${pids.join(' ')}` : `kill -9 ${pids.join(' ')}`;
        exec(killCommand, (err) => {
          if (!err) {
            log(`🔪 终止进程 PID: ${pids.join(', ')}`, 'red');
          } else {
            log(`⚠️  部分进程可能无法终止: ${err.message}`, 'yellow');
          }
          setTimeout(resolve, 2000);
        });
      }
    });
  });
}

// 检查并清理Electron进程
function killElectronProcesses() {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const isMacOS = process.platform === 'darwin';

    let command;
    if (isWindows) {
      command = 'tasklist | findstr "electron.exe"';
    } else if (isMacOS) {
      command = 'ps aux | grep -i electron | grep -v grep';
    } else {
      command = 'ps aux | grep electron | grep -v grep';
    }

    exec(command, (error, stdout) => {
      if (error || !stdout.trim()) {
        log('✅ 没有发现Electron进程', 'green');
        resolve();
        return;
      }

      log('⚠️  发现Electron进程，正在清理...', 'red');

      if (isWindows) {
        exec('taskkill /F /IM electron.exe', (err) => {
          if (!err) {
            log('🔪 已终止所有Electron进程', 'red');
          }
          setTimeout(resolve, 1000);
        });
      } else {
        // macOS/Linux: 提取PID并终止
        const lines = stdout.trim().split('\n');
        const pids = [];

        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          if (parts.length > 1) {
            const pid = parts[1];
            if (pid && !isNaN(pid)) {
              pids.push(pid);
            }
          }
        });

        if (pids.length > 0) {
          exec(`kill -9 ${pids.join(' ')}`, (err) => {
            if (!err) {
              log(`🔪 终止Electron进程 PID: ${pids.join(', ')}`, 'red');
            }
            setTimeout(resolve, 1000);
          });
        } else {
          resolve();
        }
      }
    });
  });
}

// 检查URL是否可访问
function checkUrl(url, timeout = 1000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout }, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// 等待服务器启动
async function waitForServer(url, maxWait = 30000) {
  log('⏳ 等待服务器启动...', 'yellow');
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    if (await checkUrl(url)) {
      log('✅ 服务器已启动', 'green');
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  log('❌ 服务器启动超时', 'red');
  return false;
}

// 启动命令
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    log(`📝 执行命令: ${command} ${args.join(' ')}`, 'cyan');

    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: projectRoot,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`命令执行失败，退出码: ${code}`));
      }
    });

    child.on('error', reject);
  });
}

// 主启动流程
async function startApp() {
  try {
    // 1. 清理端口和进程
    log('\n🔍 检查端口占用情况...', 'yellow');
    await killPortProcess(5173);

    log('\n🔍 检查Electron进程...', 'yellow');
    await killElectronProcesses();

    // 2. 检查依赖
    log('\n📦 检查依赖...', 'yellow');
    if (!fs.existsSync(path.join(projectRoot, 'node_modules'))) {
      log('📦 node_modules不存在，正在安装依赖...', 'yellow');
      await runCommand('npm', ['install']);
      log('✅ 依赖安装完成', 'green');
    } else {
      log('✅ 依赖已存在', 'green');
    }

    // 3. 启动应用
    log('\n🚀 启动Questech应用...', 'green');
    log('================================', 'green');

    try {
      // 首先尝试标准启动方式
      await runCommand('npm', ['run', 'electron:dev']);
    } catch (error) {
      log('\n❌ 标准启动失败，尝试备用方式...', 'red');

      // 备用方案：分步启动
      log('📝 启动Vite开发服务器...', 'yellow');

      // 启动Vite（后台）
      const viteProcess = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe',
        shell: true,
        cwd: projectRoot
      });

      // 等待Vite启动
      if (await waitForServer('http://localhost:5173')) {
        log('🖥️  启动Electron应用...', 'yellow');
        await runCommand('npx', ['electron', '.']);
      } else {
        throw new Error('Vite服务器启动失败');
      }
    }

    log('\n🎉 启动脚本执行完成', 'green');

  } catch (error) {
    log(`\n❌ 启动失败: ${error.message}`, 'red');
    log('\n🔧 手动启动步骤:', 'yellow');
    log('1. 在终端中运行: npm run dev', 'cyan');
    log('2. 等待Vite启动后，在另一个终端中运行: npx electron .', 'cyan');
    process.exit(1);
  }
}

// 运行启动流程
startApp();
