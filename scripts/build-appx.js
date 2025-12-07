// "artifactName": "${productName}-${version}-${arch}.${ext}",
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

async function buildAppXPackages() {
  console.log('开始构建 AppX 包...');

  // 创建临时配置，只构建 AppX x64
  console.log('构建 x64 版本...');
  const tempConfigX64 = {
    build: {
      ...require('../package.json').build,
      win: {
        ...require('../package.json').build.win,
        target: [
          {
            target: "appx",
            arch: "x64"
          }
        ]
      }
    }
  };

  fs.writeFileSync('electron-builder-temp.json', JSON.stringify(tempConfigX64.build, null, 2));
  await execPromise('npm run build && electron-builder --config electron-builder-temp.json --publish=never');

  // 将 x64 包重命名
  const x64Path = 'release/奇境探索-1.0.0.appx';
  const x64NewPath = 'release/奇境探索-1.0.0-x64.appx';
  if (fs.existsSync(x64Path)) {
    fs.renameSync(x64Path, x64NewPath);
    console.log(`x64 AppX 包已重命名: ${x64NewPath}`);
  }

  // 创建临时配置，只构建 AppX arm64
  console.log('构建 arm64 版本...');
  const tempConfigARM64 = {
    build: {
      ...require('../package.json').build,
      win: {
        ...require('../package.json').build.win,
        target: [
          {
            target: "appx",
            arch: "arm64"
          }
        ]
      }
    }
  };

  fs.writeFileSync('electron-builder-temp.json', JSON.stringify(tempConfigARM64.build, null, 2));
  await execPromise('npm run build && electron-builder --config electron-builder-temp.json --publish=never');

  // 将 arm64 包重命名
  const arm64Path = 'release/奇境探索-1.0.0.appx';
  const arm64NewPath = 'release/奇境探索-1.0.0-arm64.appx';
  if (fs.existsSync(arm64Path)) {
    fs.renameSync(arm64Path, arm64NewPath);
    console.log(`arm64 AppX 包已重命名: ${arm64NewPath}`);
  }

  // 清理临时文件
  if (fs.existsSync('electron-builder-temp.json')) {
    fs.unlinkSync('electron-builder-temp.json');
  }

  console.log('AppX 包构建完成！');
  console.log('生成的文件:');
  console.log('- 奇境探索-1.0.0-x64.appx (Intel/AMD 64位)');
  console.log('- 奇境探索-1.0.0-arm64.appx (ARM 64位)');
}

function execPromise(command) {
  return new Promise((resolve, reject) => {
    const child = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`执行错误: ${error}`);
        reject(error);
        return;
      }
      resolve(stdout);
    });

    child.stdout.on('data', (data) => {
      console.log(data.toString());
    });

    child.stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}

buildAppXPackages().catch(console.error);