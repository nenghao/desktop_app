postman request '192.168.0.103:10089/config/downloads/?platform=linux' \
  --header 'Accept: */*' \
  --header 'Accept-Language: zh-CN,zh;q=0.9' \
  --header 'Cache-Control: no-cache' \
  --header 'Connection: keep-alive' \
  --header 'Content-Type: application/json' \
  --header 'DNT: 1' \
  --header 'Origin: http://192.168.0.103:3000' \
  --header 'Pragma: no-cache' \
  --header 'Referer: http://192.168.0.103:3000/' \
  --header 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0' \
  --body ''

  response：
  {
    "success": true,
    "message": "获取下载链接成功",
    "data": {
        "latest_version": "1.0.2",
        "release_notes": "新版本包含多项功能改进和bug修复",
        "platforms": [
            {
                "platform": "windows",
                "description": "支持 Windows 10 及以上版本，提供完整的桌面应用体验",
                "downloads": [
                       {
                        "type": "store",
                        "architecture": "universal",
                        "url": "https://www.baizesz.com/app/download/windows/questech-1.0.2-x64.exe",
                        "size": "125MB",
                        "description": "应用商店"
                    },
                    {
                        "type": "exe",
                        "architecture": "AMD64",
                        "url": "https://www.baizesz.com/app/download/windows/questech-1.0.2-x64.exe",
                        "size": "125MB",
                        "description": "安装包"
                    },
                    {
                        "type": "portable",
                        "architecture": "AMD64",
                        "url": "https://www.baizesz.com/app/download/windows/questech-1.0.2-x64-portable.zip",
                        "size": "118MB",
                        "description": "便携版"
                    },
                    {
                        "type": "exe",
                        "architecture": "ARM64",
                        "url": "https://www.baizesz.com/app/download/windows/questech-1.0.2-x64.exe",
                        "size": "125MB",
                        "description": "安装包"
                    },
                    {
                        "type": "portable",
                        "architecture": "ARM64",
                        "url": "https://www.baizesz.com/app/download/windows/questech-1.0.2-x64-portable.zip",
                        "size": "118MB",
                        "description": "便携版"
                    }
                ]
            },
            {
                "platform": "macos",
                "description": "支持 macOS 11 及以上版本，原生适配 Apple Silicon",
                "downloads": [
                    {
                        "type": "dmg",
                        "architecture": "universal",
                        "url": "https://www.baizesz.com/app/download/macos/questech-1.0.2-universal.dmg",
                        "size": "142MB",
                        "description": "通用包"
                    },
                    {
                        "type": "dmg",
                        "architecture": "Intel x86_64",
                        "url": "https://www.baizesz.com/app/download/macos/questech-1.0.2-intel.dmg",
                        "size": "138MB",
                        "description": "专用"
                    },
                    {
                        "type": "dmg",
                        "architecture": "Apple Silicon",
                        "url": "https://www.baizesz.com/app/download/macos/questech-1.0.2-arm.dmg",
                        "size": "135MB",
                        "description": "专用"
                    }
                ]
            },
            {
                "platform": "linux",
                "description": "支持 Ubuntu 20.04+、Fedora 35+ 等主流发行版",
                "downloads": [
                    {
                        "type": "deb",
                        "architecture": "AMD64",
                        "url": "https://www.baizesz.com/app/download/linux/questech_1.0.2_amd64.deb",
                        "size": "98MB",
                        "description": "Debian/Ubuntu 安装包"
                    },
                    {
                        "type": "rpm",
                        "architecture": "AMD64",
                        "url": "https://www.baizesz.com/app/download/linux/questech-1.0.2-1.x86_64.rpm",
                        "size": "95MB",
                        "description": "RedHat/CentOS 安装包"
                    },
                    {
                        "type": "AppImage",
                        "architecture": "AMD64",
                        "url": "https://www.baizesz.com/app/download/linux/Questech-1.0.2.AppImage",
                        "size": "108MB",
                        "description": "AppImage格式"
                    },
                    {
                        "type": "deb",
                        "architecture": "ARM64",
                        "url": "https://www.baizesz.com/app/download/linux/questech_1.0.2_arm64.deb",
                        "size": "94MB",
                        "description": "Debian/Ubuntu 安装包"
                    },
                    {
                        "type": "AppImage",
                        "architecture": "ARM64",
                        "url": "https://www.baizesz.com/app/download/linux/Questech-1.0.2-arm64.AppImage",
                        "size": "102MB",
                        "description": "AppImage格式"
                    }
                ]
            },
            {
                "platform": "android",
                "description": "支持 Android 8.0 及以上版本，适配各种屏幕尺寸",
                "downloads": [
                    {
                        "type": "apk",
                        "architecture": "UNIVERSAL",
                        "url": "https://www.baizesz.com/app/download/android/questech-1.0.2.apk",
                        "size": "45MB",
                        "description": "apk"
                    }
                ]
            },
            {
                "platform": "ios",
                "description": "支持 iOS 15.0 及以上版本，iPhone 和 iPad 通用",
                "downloads": [
                    {
                        "type": "store",
                        "architecture": "UNIVERSAL",
                        "url": "https://apps.apple.com/app/id123456789",
                        "size": "-",
                        "description": "App Store 下载"
                    }
                ]
            }
        ]
    }
}