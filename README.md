# 🎙️ Guagua - AI 实时同声传译助手

浏览器原生的 AI 同声传译 Chrome 插件，帮助你在观看外语视频或参与会议时，实时获取中文翻译字幕。

## ✨ 功能

- 🔴 **实时音频捕获** — 精准拦截当前标签页音频，无需额外设备
- 🧠 **本地语音识别** — 基于 Faster-Whisper，毫秒级转写，隐私安全
- 🤖 **AI 流式翻译** — DeepSeek 大模型实时翻译，边识别边显示
- 🎨 **沉浸式字幕** — 毛玻璃半透明字幕框，支持拖拽和颜色切换
- 🚀 **增量处理** — 只翻译新增内容，不重复处理历史音频

## 🏗️ 系统架构

```
浏览器标签页音频
      │
      ▼
┌─────────────────┐     WebSocket      ┌─────────────────┐
│  Chrome 插件     │ ◄──────────────► │  Python 后端     │
│  (前端)          │   音频流 + 字幕    │  (AI 引擎)       │
│                 │                   │                 │
│  Offscreen API  │                   │  Faster-Whisper  │
│  Content UI     │                   │  DeepSeek API    │
│  Popup 控制     │                   │  FastAPI         │
└─────────────────┘                   └─────────────────┘
```

## 📁 项目结构

```
guagua/
├── backend/                  # Python 后端
│   ├── main.py              # ASR + 翻译主逻辑
│   └── requirements.txt     # Python 依赖
├── frontend/extension/       # Chrome 插件
│   ├── chrome-extension/    # 插件主体 & Background
│   ├── pages/
│   │   ├── offscreen/       # 音频捕获核心
│   │   ├── content-ui/      # 网页字幕组件
│   │   └── popup/           # 用户控制台
│   └── packages/            # 共享库
└── spec.md                  # 需求规格
```

## 🚀 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- pnpm
- Chrome 浏览器

### 1. 启动后端

```bash
cd backend
pip install -r requirements.txt

# 设置 DeepSeek API Key
# Windows PowerShell:
$env:DEEPSEEK_API_KEY = "your-api-key"
# macOS / Linux:
export DEEPSEEK_API_KEY="your-api-key"

python main.py
```

后端默认运行在 `http://localhost:8001`

### 2. 构建并加载插件

```bash
cd frontend/extension
pnpm install
pnpm run dev
```

然后在 Chrome 中：
1. 打开 `chrome://extensions`
2. 开启 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择 `frontend/extension/dist` 目录

### 3. 开始使用

1. 打开任意英文视频/音频页面
2. 点击浏览器工具栏的插件图标
3. 点击 **开始同传**
4. 中文字幕会出现在页面底部

## 🎮 使用说明

| 按钮 | 功能 |
|------|------|
| 开始同传 | 开始捕获音频并翻译 |
| 停止 | 停止翻译，字幕消失 |
| 颜色按钮 | 切换字幕字体颜色（白/黄/绿/青） |

字幕框支持**鼠标拖拽**，可以放到任意位置。

## 🛠️ 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | React + TypeScript + Vite |
| 插件规范 | Chrome Extension Manifest V3 |
| 音频捕获 | Offscreen API + tabCapture |
| ASR | Faster-Whisper (tiny) |
| 翻译 | DeepSeek Chat API (流式) |
| 后端框架 | FastAPI + WebSocket |

## ⚠️ 注意事项

- 首次加载 ASR 模型时会自动下载（约 150MB），请耐心等待
- 翻译质量取决于 DeepSeek API，需要稳定的网络连接
- 仅支持 Chrome 系浏览器（Edge、Chromium 等）
- API Key 通过环境变量传入，不要硬编码在代码中

## 📝 License

MIT
