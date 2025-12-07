# AI 翻译配置接口开发文档

## 📋 文档信息

- **版本**: v1.0
- **更新日期**: 2025-10-22
- **后端框架**: FastAPI
- **接口协议**: RESTful API
- **数据格式**: JSON
- **接口分组**: intelligent-translate

---

## 🎯 接口概述

本接口为AI翻译智能体提供翻译配置信息，包括支持的语言列表和翻译引擎列表。前端通过此接口动态获取配置，替代硬编码的配置数据。

**核心特性**:
- ✅ 返回支持的源语言和目标语言列表
- ✅ 返回支持的翻译引擎列表
- ✅ 返回支持的翻译场景列表
- ✅ 配置集中管理，便于后端动态调整
- ✅ 支持国际化语言名称

---

## 🔌 接口详情

### 获取翻译配置接口

#### 基本信息

```
GET /v2/toolkit/translate/config
Content-Type: application/json
```

> **注意**: 此接口路径应与翻译接口保持一致的命名空间（`/v2/toolkit/translate/`），便于统一管理。

#### 请求参数

无需参数，直接 GET 请求即可。

#### 请求示例

```bash
curl -X GET "http://192.168.0.103:10089/v2/toolkit/translate/config" \
  -H "Content-Type: application/json"
```

---

## 📤 响应格式

### 统一响应结构

```json
{
  "success": true,
  "message": "获取配置成功",
  "data": {
    "source_languages": [...],
    "target_languages": [...],
    "engines": [...],
    "scenes": [...]
  },
  "error_code": null
}
```

### 成功响应示例

```json
{
  "success": true,
  "message": "获取配置成功",
  "data": {
    "source_languages": [
      {
        "value": "auto",
        "label": "自动检测",
        "label_en": "Auto Detect"
      },
      {
        "value": "en",
        "label": "英文",
        "label_en": "English"
      },
      {
        "value": "zh",
        "label": "中文",
        "label_en": "Chinese"
      },
      {
        "value": "ja",
        "label": "日文",
        "label_en": "Japanese"
      },
      {
        "value": "ko",
        "label": "韩文",
        "label_en": "Korean"
      },
      {
        "value": "fr",
        "label": "法文",
        "label_en": "French"
      },
      {
        "value": "de",
        "label": "德文",
        "label_en": "German"
      },
      {
        "value": "es",
        "label": "西班牙文",
        "label_en": "Spanish"
      },
      {
        "value": "ru",
        "label": "俄文",
        "label_en": "Russian"
      },
      {
        "value": "ar",
        "label": "阿拉伯文",
        "label_en": "Arabic"
      },
      {
        "value": "pt",
        "label": "葡萄牙文",
        "label_en": "Portuguese"
      },
      {
        "value": "it",
        "label": "意大利文",
        "label_en": "Italian"
      }
    ],
    "target_languages": [
      {
        "value": "zh",
        "label": "中文",
        "label_en": "Chinese"
      },
      {
        "value": "en",
        "label": "label": "英文",
        "label_en": "English"
      },
      {
        "value": "ja",
        "label": "日文",
        "label_en": "Japanese"
      },
      {
        "value": "ko",
        "label": "韩文",
        "label_en": "Korean"
      },
      {
        "value": "fr",
        "label": "法文",
        "label_en": "French"
      },
      {
        "value": "de",
        "label": "德文",
        "label_en": "German"
      },
      {
        "value": "es",
        "label": "西班牙文",
        "label_en": "Spanish"
      },
      {
        "value": "ru",
        "label": "俄文",
        "label_en": "Russian"
      },
      {
        "value": "ar",
        "label": "阿拉伯文",
        "label_en": "Arabic"
      },
      {
        "value": "pt",
        "label": "葡萄牙文",
        "label_en": "Portuguese"
      },
      {
        "value": "it",
        "label": "意大利文",
        "label_en": "Italian"
      }
    ],
    "engines": [
      {
        "value": "google",
        "label": "Google Translate",
        "enabled": true
      },
      {
        "value": "deepl",
        "label": "DeepL",
        "enabled": true
      },
      {
        "value": "baidu",
        "label": "百度翻译",
        "enabled": true
      },
      {
        "value": "youdao",
        "label": "有道翻译",
        "enabled": true
      }
    ],
    "scenes": [
      {
        "value": "general",
        "label": "通用场景",
        "label_en": "General"
      },
      {
        "value": "medical",
        "label": "医学",
        "label_en": "Medical"
      },
      {
        "value": "computer",
        "label": "计算机",
        "label_en": "Computer Science"
      },
      {
        "value": "finance",
        "label": "金融经济",
        "label_en": "Finance & Economics"
      }
    ]
  },
  "error_code": null
}
```

### 错误响应示例

```json
{
  "success": false,
  "message": "服务暂时不可用",
  "data": null,
  "error_code": "SERVICE_UNAVAILABLE"
}
```

---

## 📊 数据模型说明

### LanguageOption 对象（语言选项）

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `value` | string | ✅ | 语言代码（ISO 639-1） | `"en"`, `"zh"`, `"auto"` |
| `label` | string | ✅ | 显示名称（中文） | `"英文"`, `"中文"` |
| `label_en` | string | ❌ | 显示名称（英文，可选） | `"English"`, `"Chinese"` |

### EngineOption 对象（翻译引擎选项）

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `value` | string | ✅ | 引擎标识符 | `"google"`, `"deepl"` |
| `label` | string | ✅ | 引擎显示名称 | `"Google Translate"`, `"DeepL"` |
| `enabled` | boolean | ✅ | 是否启用 | `true`, `false` |

**说明**:
- `enabled` 字段用于后端控制引擎的可用性
- 前端应只显示 `enabled: true` 的引擎选项
- 后端可以通过配置文件动态控制引擎是否启用

### SceneOption 对象（场景选项）

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `value` | string | ✅ | 场景标识符 | `"general"`, `"medical"` |
| `label` | string | ✅ | 场景显示名称（中文） | `"通用场景"`, `"医学"` |
| `label_en` | string | ❌ | 场景显示名称（英文，可选） | `"General"`, `"Medical"` |

---

## 🔧 技术实现建议

### 1. FastAPI 路由实现

```python
# apps/intelligent/v2/translate.py

from fastapi import APIRouter
from typing import List, Dict, Any

router = APIRouter(prefix="/v2/toolkit/translate", tags=["intelligent-translate"])

# ========== 配置常量 ==========
SOURCE_LANGUAGES = [
    {"value": "auto", "label": "自动检测", "label_en": "Auto Detect"},
    {"value": "en", "label": "英文", "label_en": "English"},
    {"value": "zh", "label": "中文", "label_en": "Chinese"},
    {"value": "ja", "label": "日文", "label_en": "Japanese"},
    {"value": "ko", "label": "韩文", "label_en": "Korean"},
    {"value": "fr", "label": "法文", "label_en": "French"},
    {"value": "de", "label": "德文", "label_en": "German"},
    {"value": "es", "label": "西班牙文", "label_en": "Spanish"},
    {"value": "ru", "label": "俄文", "label_en": "Russian"},
    {"value": "ar", "label": "阿拉伯文", "label_en": "Arabic"},
    {"value": "pt", "label": "葡萄牙文", "label_en": "Portuguese"},
    {"value": "it", "label": "意大利文", "label_en": "Italian"},
]

TARGET_LANGUAGES = [
    {"value": "zh", "label": "中文", "label_en": "Chinese"},
    {"value": "en", "label": "英文", "label_en": "English"},
    {"value": "ja", "label": "日文", "label_en": "Japanese"},
    {"value": "ko", "label": "韩文", "label_en": "Korean"},
    {"value": "fr", "label": "法文", "label_en": "French"},
    {"value": "de", "label": "德文", "label_en": "German"},
    {"value": "es", "label": "西班牙文", "label_en": "Spanish"},
    {"value": "ru", "label": "俄文", "label_en": "Russian"},
    {"value": "ar", "label": "阿拉伯文", "label_en": "Arabic"},
    {"value": "pt", "label": "葡萄牙文", "label_en": "Portuguese"},
    {"value": "it", "label": "意大利文", "label_en": "Italian"},
]

ENGINES = [
    {"value": "google", "label": "Google Translate", "enabled": True},
    {"value": "deepl", "label": "DeepL", "enabled": True},
    {"value": "baidu", "label": "百度翻译", "enabled": True},
    {"value": "youdao", "label": "有道翻译", "enabled": True},
]

SCENES = [
    {"value": "general", "label": "通用场景", "label_en": "General"},
    {"value": "medical", "label": "医学", "label_en": "Medical"},
    {"value": "computer", "label": "计算机", "label_en": "Computer Science"},
    {"value": "finance", "label": "金融经济", "label_en": "Finance & Economics"},
]

# ========== 响应模型 ==========
class TranslateConfigResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error_code: Optional[str] = None

# ========== 路由处理 ==========
@router.get("/config", response_model=TranslateConfigResponse)
async def get_translate_config():
    """
    获取翻译配置接口

    返回:
    - 支持的源语言列表
    - 支持的目标语言列表
    - 支持的翻译引擎列表
    - 支持的翻译场景列表
    """
    try:
        # 从配置文件或数据库读取配置（可选）
        # 这里直接返回常量配置

        return TranslateConfigResponse(
            success=True,
            message="获取配置成功",
            data={
                "source_languages": SOURCE_LANGUAGES,
                "target_languages": TARGET_LANGUAGES,
                "engines": ENGINES,
                "scenes": SCENES
            },
            error_code=None
        )
    except Exception as e:
        return TranslateConfigResponse(
            success=False,
            message=f"获取配置失败: {str(e)}",
            data=None,
            error_code="CONFIG_ERROR"
        )
```

---

### 2. 动态配置方案（可选）

如果需要支持动态配置（从数据库或配置文件读取），可以使用以下方案：

#### 方案 A: 从配置文件读取

```python
# config/translate_config.yaml

source_languages:
  - value: "auto"
    label: "自动检测"
    label_en: "Auto Detect"
  - value: "en"
    label: "英文"
    label_en: "English"
  # ... 其他语言

engines:
  - value: "google"
    label: "Google Translate"
    enabled: true
  - value: "deepl"
    label: "DeepL"
    enabled: false  # 可以动态控制启用/禁用
  # ... 其他引擎
```

```python
# 读取配置
import yaml

def load_translate_config():
    with open('config/translate_config.yaml', 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)

@router.get("/config")
async def get_translate_config():
    config = load_translate_config()
    return TranslateConfigResponse(
        success=True,
        message="获取配置成功",
        data=config,
        error_code=None
    )
```

#### 方案 B: 从数据库读取

```python
# models/translate_config.py

from sqlalchemy import Column, String, Boolean, Integer
from database import Base

class LanguageConfig(Base):
    __tablename__ = "translate_languages"

    id = Column(Integer, primary_key=True)
    value = Column(String(10), unique=True)
    label = Column(String(50))
    label_en = Column(String(50))
    lang_type = Column(String(10))  # 'source' or 'target'
    enabled = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

class EngineConfig(Base):
    __tablename__ = "translate_engines"

    id = Column(Integer, primary_key=True)
    value = Column(String(20), unique=True)
    label = Column(String(50))
    enabled = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
```

```python
# 从数据库读取
from sqlalchemy.orm import Session
from fastapi import Depends

@router.get("/config")
async def get_translate_config(db: Session = Depends(get_db)):
    # 查询数据库
    source_langs = db.query(LanguageConfig).filter(
        LanguageConfig.lang_type == 'source',
        LanguageConfig.enabled == True
    ).order_by(LanguageConfig.sort_order).all()

    engines = db.query(EngineConfig).filter(
        EngineConfig.enabled == True
    ).order_by(EngineConfig.sort_order).all()

    return TranslateConfigResponse(
        success=True,
        message="获取配置成功",
        data={
            "source_languages": [lang.to_dict() for lang in source_langs],
            "target_languages": [...],
            "engines": [engine.to_dict() for engine in engines],
            "scenes": SCENES  # 场景列表可以保持静态
        }
    )
```

---

## 🧪 测试示例

### 使用 curl 测试

```bash
curl -X GET "http://192.168.0.103:10089/v2/toolkit/translate/config" \
  -H "Content-Type: application/json"
```

### 使用 Python 测试

```python
import requests

url = "http://192.168.0.103:10089/v2/toolkit/translate/config"
response = requests.get(url)

if response.status_code == 200:
    data = response.json()
    print("配置获取成功!")
    print(f"支持的源语言数量: {len(data['data']['source_languages'])}")
    print(f"支持的翻译引擎数量: {len(data['data']['engines'])}")
    print(f"启用的引擎: {[e['label'] for e in data['data']['engines'] if e['enabled']]}")
else:
    print("配置获取失败:", response.text)
```

### 使用 JavaScript (前端) 测试

```javascript
// 在智能体的 bundle.js 中调用
async function fetchTranslateConfig() {
  try {
    const response = await fetch('http://192.168.0.103:10089/v2/toolkit/translate/config');
    const result = await response.json();

    if (result.success) {
      console.log('✅ 配置获取成功');
      console.log('源语言列表:', result.data.source_languages);
      console.log('目标语言列表:', result.data.target_languages);
      console.log('翻译引擎列表:', result.data.engines);
      console.log('场景列表:', result.data.scenes);

      return result.data;
    } else {
      console.error('❌ 配置获取失败:', result.message);
      return null;
    }
  } catch (error) {
    console.error('❌ 网络错误:', error);
    return null;
  }
}
```

---

## ⚠️ 错误码说明

| 错误码 | HTTP状态码 | 说明 | 解决方案 |
|--------|-----------|------|----------|
| `CONFIG_ERROR` | 500 | 配置读取失败 | 检查配置文件或数据库连接 |
| `SERVICE_UNAVAILABLE` | 503 | 服务暂时不可用 | 稍后重试 |

---

## 📝 前端集成示例

### 1. 初始化时获取配置

```javascript
// bundle.js - AITranslatorAgent 类

class AITranslatorAgent {
  constructor(context) {
    // ... 其他初始化代码

    // 配置数据（从接口获取）
    this.translateConfig = null;
  }

  async render() {
    // 1. 获取配置
    await this.loadTranslateConfig();

    // 2. 渲染 HTML
    this.renderHTML();

    // 3. 初始化事件
    this.initializeEventListeners();
  }

  async loadTranslateConfig() {
    try {
      const response = await fetch(`${this.API_BASE_URL}/v2/toolkit/translate/config`);
      const result = await response.json();

      if (result.success) {
        this.translateConfig = result.data;
        console.log('[AI Translator] 配置加载成功');
      } else {
        console.error('[AI Translator] 配置加载失败:', result.message);
        // 使用默认配置
        this.translateConfig = this.getDefaultConfig();
      }
    } catch (error) {
      console.error('[AI Translator] 配置加载错误:', error);
      // 使用默认配置
      this.translateConfig = this.getDefaultConfig();
    }
  }

  getDefaultConfig() {
    // 默认配置（作为降级方案）
    return {
      source_languages: [
        {value: 'auto', label: '自动检测'},
        {value: 'en', label: '英文'},
        {value: 'zh', label: '中文'},
        // ... 其他默认语言
      ],
      target_languages: [
        {value: 'zh', label: '中文'},
        {value: 'en', label: '英文'},
        // ... 其他默认语言
      ],
      engines: [
        {value: 'google', label: 'Google Translate', enabled: true},
        {value: 'deepl', label: 'DeepL', enabled: true},
        // ... 其他默认引擎
      ],
      scenes: [
        {value: 'general', label: '通用场景'},
        {value: 'medical', label: '医学'},
        // ... 其他默认场景
      ]
    };
  }
}
```

### 2. 动态渲染下拉框

```javascript
// 修改 createCustomSelect 方法，使用从接口获取的配置

renderHTML() {
  // 确保配置已加载
  if (!this.translateConfig) {
    console.error('[AI Translator] 配置未加载，无法渲染');
    return;
  }

  const { source_languages, target_languages, engines, scenes } = this.translateConfig;

  this.container.innerHTML = `
    <div class="trans-workspace">
      <div class="trans-workspace-inner">
        <div class="trans-config">
          <!-- 源语言选择 -->
          <div class="trans-config-group">
            ${this.createCustomSelect('source-lang', source_languages, 'auto')}
          </div>

          <!-- 目标语言选择 -->
          <div class="trans-config-group">
            ${this.createCustomSelect('target-lang', target_languages, 'zh')}
          </div>

          <!-- 翻译引擎选择（只显示启用的） -->
          <div class="trans-config-group">
            <p class="trans-config-label">翻译引擎</p>
            ${this.createCustomSelect(
              'trans-engine',
              engines.filter(e => e.enabled),
              'google'
            )}
          </div>

          <!-- 场景选择器 -->
          ${this.createCustomSelect('scene-selector', scenes, 'general')}
        </div>
        <!-- ... 其他内容 -->
      </div>
    </div>
  `;
}
```

---

## 🎯 使用场景

### 场景 1: 管理员动态添加新语言

1. 后端在配置中添加新语言（如泰语 `th`）
2. 前端重新加载配置
3. 新语言自动出现在下拉框中

### 场景 2: 临时禁用某个翻译引擎

1. 后端将某个引擎的 `enabled` 设置为 `false`
2. 前端重新加载配置
3. 该引擎自动从下拉框中移除

### 场景 3: 国际化支持

```javascript
// 根据用户语言选择显示名称
const userLang = navigator.language.startsWith('zh') ? 'zh' : 'en';

function getLanguageLabel(lang) {
  return userLang === 'zh' ? lang.label : (lang.label_en || lang.label);
}

// 渲染时使用
const options = source_languages.map(lang => ({
  value: lang.value,
  label: getLanguageLabel(lang)
}));
```

---

## 📂 相关文件

- **翻译接口文档**: `docs/dev/AI翻译_API.md`
- **翻译接口实现**: `apps/intelligent/v2/translate.py`
- **前端智能体**: `src/plugins/example/ai_translator/bundle.js`
- **配置文件示例**: `config/translate_config.yaml` (可选)

---

## 📞 常见问题

### Q1: 配置接口失败时如何处理？

A: 前端应实现降级方案，使用本地默认配置：

```javascript
async loadTranslateConfig() {
  try {
    const response = await fetch(...);
    // ... 正常处理
  } catch (error) {
    console.warn('使用默认配置');
    this.translateConfig = this.getDefaultConfig();
  }
}
```

### Q2: 是否需要缓存配置数据？

A: 建议缓存：
- **前端**: 可以使用 `localStorage` 缓存，设置过期时间（如 1 小时）
- **后端**: 可以使用 Redis 缓存配置，避免频繁读取数据库或文件

### Q3: 如何验证配置数据的有效性？

A: 后端应在返回配置前进行验证：
- 确保所有必填字段存在
- 验证 `value` 字段的唯一性
- 确保至少有一个启用的翻译引擎

### Q4: 配置更新后如何通知前端？

A: 可选方案：
1. **定时刷新**: 前端定期（如每小时）重新获取配置
2. **WebSocket 推送**: 后端配置更新时主动推送给前端
3. **版本号机制**: 配置带版本号，前端定期检查版本

---

## 🚀 部署建议

### 1. 启用 CORS

确保后端允许前端跨域访问：

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. 配置缓存

```python
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache

@router.get("/config")
@cache(expire=3600)  # 缓存 1 小时
async def get_translate_config():
    # ... 实现代码
```

### 3. 监控和日志

```python
import logging

logger = logging.getLogger(__name__)

@router.get("/config")
async def get_translate_config():
    logger.info("配置接口被调用")
    try:
        # ... 实现代码
        logger.info("配置返回成功")
    except Exception as e:
        logger.error(f"配置返回失败: {str(e)}")
        raise
```

---

**文档版本**: v1.0
**最后更新**: 2025-10-22
**作者**: AI Assistant
