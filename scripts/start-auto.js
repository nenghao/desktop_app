#!/usr/bin/env node

/**
 * Questech 智能启动脚本
 * 自动检测平台并选择最佳启动方式
 */

const { spawn } = require('child_process');
const path = require('path');

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

log('🚀 Questech 智能启动脚本', 'green');
log('================================', 'green');
log(`📁 工作目录: ${projectRoot}`, 'yellow');
log(`🖥️  平台: ${process.platform}`, 'blue');

// 根据平台选择启动脚本
function getStartScript() {
  switch (process.platform) {
    case 'darwin':
      return {
        command: 'bash',
        args: ['scripts/start-macos.sh'],
        name: 'macOS专用启动脚本'
      };
    
    case 'win32':
      return {
        command: 'node',
        args: ['scripts/start-app.js'],
        name: 'Windows启动脚本'
      };
    
    case 'linux':
      return {
        command: 'bash',
        args: ['scripts/start-app.sh'],
        name: 'Linux启动脚本'
      };
    
    default:
      return {
        command: 'node',
        args: ['scripts/start-app.js'],
        name: '通用Node.js启动脚本'
      };
  }
}

// 启动应用
async function startApp() {
  const script = getStartScript();
  
  log(`\n🎯 选择启动方式: ${script.name}`, 'cyan');
  log(`📝 执行命令: ${script.command} ${script.args.join(' ')}`, 'cyan');
  log('', 'reset');
  
  try {
    const child = spawn(script.command, script.args, {
      stdio: 'inherit',
      shell: true,
      cwd: projectRoot
    });
    
    // 处理进程退出
    child.on('close', (code) => {
      if (code === 0) {
        log('\n🎉 应用正常退出', 'green');
      } else {
        log(`\n❌ 应用异常退出，退出码: ${code}`, 'red');
        
        // 提供备用建议
        log('\n💡 备用启动方式:', 'yellow');
        log('1. 手动启动: npm run electron:dev', 'cyan');
        log('2. 分步启动:', 'cyan');
        log('   - 终端1: npm run dev', 'cyan');
        log('   - 终端2: npx electron .', 'cyan');
        log('3. 平台特定启动:', 'cyan');
        
        switch (process.platform) {
          case 'darwin':
            log('   - npm run start:macos', 'cyan');
            break;
          case 'win32':
            log('   - npm run start:windows', 'cyan');
            log('   - scripts\\start-app.bat', 'cyan');
            break;
          case 'linux':
            log('   - npm run start:linux', 'cyan');
            break;
        }
      }
    });
    
    child.on('error', (error) => {
      log(`\n❌ 启动失败: ${error.message}`, 'red');
      process.exit(1);
    });
    
    // 处理中断信号
    process.on('SIGINT', () => {
      log('\n🛑 收到中断信号，正在关闭...', 'yellow');
      child.kill('SIGINT');
    });
    
    process.on('SIGTERM', () => {
      log('\n🛑 收到终止信号，正在关闭...', 'yellow');
      child.kill('SIGTERM');
    });
    
  } catch (error) {
    log(`\n❌ 启动失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 运行启动流程
startApp();
