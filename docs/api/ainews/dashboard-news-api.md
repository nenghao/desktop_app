curl --location '192.168.0.103:10089/v2/content/aigc/'

response：
{
    "success": true,
    "message": "success",
    "data": {
        "todayNews": {
            "section": "today-news",
            "title": "今日要闻2",
            "icon": "📰",
            "displayType": "horizontal-with-date",
            "url": "/static/todaynews.html",
            "items": [
                {
                    "id": "news_001",
                    "title": "中共中央召开党外人士座谈会 习近平主持",
                    "source": "新华社",
                    "publishTime": "2025-10-31T08:00:00Z",
                    "url": "https://example.com/news/001",
                    "category": "politics"
                },
                {
                    "id": "news_002",
                    "title": "此行间：中国新坐标",
                    "source": "人民日报",
                    "publishTime": "2025-10-31T09:30:00Z",
                    "url": "https://example.com/news/002",
                    "category": "economy"
                }
            ],
            "meta": {
                "date": "2025-11-06",
                "dayOfWeek": "星期四",
                "totalCount": 5,
                "hasMore": false
            }
        },
        "aiNews": {
            "section": "ai-news",
            "title": "AI 资讯",
            "icon": "🔔",
            "displayType": "vertical-list",
            "url": "/static/ainews.html",
            "items": [
                {
                    "id": "1",
                    "title": "软银与 OpenAI 重磅合资本月成立新公司",
                    "source": "AIbase基地",
                    "publishTime": "2025-11-05 11:47:15",
                    "url": "https://news.aibase.com/zh/news/22544",
                    "category": "ai-news",
                    "number": 1,
                    "summary": "软银与OpenAI本月将合资成立新公司，深化AI领域合作，共同投入资金与技术资源，推动人工智能技术的研发与商业化应用。",
                    "tags": [],
                    "readCount": 5051,
                    "likeCount": 0
                },
                {
                    "id": "2",
                    "title": "全球首个跨本体全域环视导航大模型 NavFoM 发布",
                    "source": "AIbase基地",
                    "publishTime": "2025-11-05 11:33:48",
                    "url": "https://news.aibase.com/zh/news/22543",
                    "category": "ai-news",
                    "number": 2,
                    "summary": "银河通用联合多所高校推出全球首个跨本体全域环视导航基座大模型NavFoM。该模型整合视觉与语言导航、目标导向导航、视觉追踪及自动驾驶等任务于统一框架，支持室内外全场景应用。",
                    "tags": [],
                    "readCount": 4864,
                    "likeCount": 0
                },
                {
                    "id": "3",
                    "title": "美团“全能猫”横空出世！LongCat-Flash-Omni多模态大模型开源即登顶，实时交互快到离谱",
                    "source": "AIbase基地",
                    "publishTime": "2025-11-05 11:23:57",
                    "url": "https://news.aibase.com/zh/news/22542",
                    "category": "ai-news",
                    "number": 3,
                    "summary": "美团开源多模态大模型LongCat-Flash-Omni实现技术突破，在多项基准测试中超越闭源竞品，达到业界领先水平。该模型支持文本、语音、图像、视频的实时融合处理，具备近乎零延迟的交互能力，将本地化多模态AI应用推向新高度。",
                    "tags": [],
                    "readCount": 5114,
                    "likeCount": 0
                },
                {
                    "id": "4",
                    "title": "谷歌Gemini平台即将推出Nano Banana2，图像生成技术再升级",
                    "source": "AIbase基地",
                    "publishTime": "2025-11-05 11:17:41",
                    "url": "https://news.aibase.com/zh/news/22541",
                    "category": "ai-news",
                    "number": 4,
                    "summary": "谷歌即将在未来几周发布AI图像生成模型Nano Banana2（代号GEMPIX2），其官网公告显示该模型由DeepMind团队开发，旨在提升图像创作效率和精准度，加速谷歌在生成式AI领域的创新进程。",
                    "tags": [],
                    "readCount": 7182,
                    "likeCount": 0
                },
                {
                    "id": "5",
                    "title": "上海银行推出首个沪语交互 AI 应用，助力智慧养老金融服务",
                    "source": "AIbase基地",
                    "publishTime": "2025-11-05 11:11:00",
                    "url": "https://news.aibase.com/zh/news/22540",
                    "category": "ai-news",
                    "number": 5,
                    "summary": "上海财跃星辰等企业与上海银行签署战略合作协议，推出国内首个完整沪语交互AI应用，助力养老金融与方言智能体系建设，为习惯方言的老年群体提供更便捷金融服务。",
                    "tags": [],
                    "readCount": 5992,
                    "likeCount": 0
                }
            ],
            "meta": {
                "totalCount": 20,
                "hasMore": true,
                "updateTime": "2025-11-06T12:11:42.993679Z"
            }
        },
        "aiDailyReport": {
            "section": "ai-daily-report",
            "title": "AI 日报",
            "icon": "📊",
            "displayType": "vertical-list",
            "url": "/static/aidaily.html",
            "items": [
                {
                    "id": "1",
                    "title": "1、昆仑万维SkyReels V3模型上线!一站式聚合Sora2、Veo3.1等顶尖AI视频能力",
                    "source": "站长之家",
                    "publishTime": "2025-11-04 15:35:38",
                    "url": "https://news.aibase.com/zh/daily/22506",
                    "category": "daily-report",
                    "number": 1,
                    "hotScore": 0,
                    "commentCount": 0
                },
                {
                    "id": "2",
                    "title": "2、月之暗面推Kimi Linear模型：处理长上下文速度提高了2.9倍",
                    "source": "站长之家",
                    "publishTime": "2025-11-04 15:35:38",
                    "url": "https://news.aibase.com/zh/daily/22506",
                    "category": "daily-report",
                    "number": 2,
                    "hotScore": 0,
                    "commentCount": 0
                },
                {
                    "id": "3",
                    "title": "3、MiniMax Music 2.0 正式发布，音乐创作迎来新纪元",
                    "source": "站长之家",
                    "publishTime": "2025-11-04 15:35:38",
                    "url": "https://news.aibase.com/zh/daily/22506",
                    "category": "daily-report",
                    "number": 3,
                    "hotScore": 0,
                    "commentCount": 0
                },
                {
                    "id": "4",
                    "title": "4、字节跳动新举措！推出豆包股激励计划，吸引大模型人才",
                    "source": "站长之家",
                    "publishTime": "2025-11-04 15:35:38",
                    "url": "https://news.aibase.com/zh/daily/22506",
                    "category": "daily-report",
                    "number": 4,
                    "hotScore": 0,
                    "commentCount": 0
                },
                {
                    "id": "5",
                    "title": "5、苹果 iOS 27 开发进展：AI 功能将迎来重大升级",
                    "source": "站长之家",
                    "publishTime": "2025-11-04 15:35:38",
                    "url": "https://news.aibase.com/zh/daily/22506",
                    "category": "daily-report",
                    "number": 5,
                    "hotScore": 0,
                    "commentCount": 0
                }
            ],
            "meta": {
                "reportDate": "2025-11-06",
                "totalCount": 20,
                "hasMore": true,
                "generatedTime": "2025-11-06T12:11:42.993679Z"
            }
        }
    }
}