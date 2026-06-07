# AI 同声传译助手 (guagua) - 项目开发总结报告

## 1. 项目概述
本项目旨在开发一款浏览器原生的 AI 实时同声传译助手，帮助用户在观看外语视频或参与会议时，实时获取中文翻译字幕。目前已完成核心全链路的打通，支持实时音频捕获、语音转文字 (ASR)、AI 纠错翻译以及沉浸式字幕展示。

## 2. 系统架构
系统采用 **“插件前端 + AI 后端”** 的解耦架构。
*   **前端 (Chrome Extension)**: 负责音频拦截、UI 渲染及交互。
*   **后端 (Python 服务)**: 负责高性能语音识别 (ASR) 与大模型翻译 (LLM)。

## 3. 已完成的核心工作

### 3.1 前端：Chrome 插件开发 (React + Vite + Manifest V3)
*   **环境搭建**: 引入了 `chrome-extension-boilerplate-react-vite` 开源脚手架，配置了 `pnpm` Monorepo 环境。
*   **音频捕获逻辑**: 
    *   实现了 **Offscreen API**，解决了 Manifest V3 无法直接处理音频流的限制。
    *   利用 `chrome.tabCapture` 精准拦截当前标签页音频，并使用 `MediaRecorder` 进行 500ms 切片。
    *   通过 **WebSocket** 建立与后端的实时二进制传输链路。
*   **沉浸式字幕 UI**:
    *   在网页中注入了高度集成的 React 组件（Content UI）。
    *   **拖拽功能**: 实现全屏范围内的自由拖拽，用户可根据需要调整位置。
    *   **样式自定义**: 实现了黑色半透明毛玻璃效果，并支持在 Popup 中实时切换字体颜色（白、黄、绿、青）。
*   **通信中转**: 优化了 Background 脚本的消息路由，确保后端数据能精准推送到当前活动网页。

### 3.2 后端：AI 处理引擎 (FastAPI + Faster-Whisper + DeepSeek)
*   **实时转录 (ASR)**: 
    *   集成 **Faster-Whisper** 模型，实现了毫秒级的本地语音转文字，无需 API Key 且隐私安全。
    *   优化了 WebM 音频流的 Buffer 处理，通过保留 Header 解决了流式解码报错问题。
*   **AI 翻译与纠错**:
    *   集成了 **DeepSeek API**，利用其强大的上下文理解能力，对识别出的文本进行实时翻译和语义纠错。
    *   设计了专业的同传 Prompt，确保翻译风格优雅、地道。

## 4. 关键技术突破 (解决了哪些坑)
*   **端口冲突**: 自动检测并切换到 8001 端口，避免开发环境冲突。
*   **流清理机制**: 解决了 `Cannot capture a tab with an active stream` 报错，确保每次启停都能彻底释放资源。
*   **Monorepo 依赖问题**: 修复了 `content-ui` 在打包时缺少 `@extension/storage` 的构建错误。
*   **路径定位**: 修正了 Offscreen 页面的绝对路径加载逻辑。

## 5. 当前文件结构说明
*   `/frontend/extension`: 插件源码。
    *   `/pages/offscreen`: 音频捕获核心。
    *   `/pages/content-ui`: 网页字幕组件。
    *   `/pages/popup`: 用户控制台（开关、调色）。
*   `/backend`: Python 后端源码。
    *   `main.py`: ASR 与翻译主逻辑。
    *   `requirements.txt`: 核心依赖。

## 6. 待继续优化的方向
*   **翻译延迟优化**: 接入异步流式翻译 (Streaming Response) 以进一步降低延迟。
*   **样式丰富化**: 增加字体大小调节、背景透明度调节等功能。
*   **离线翻译**: 考虑在本地运行轻量级翻译模型（如 NLLB）。

---
**开发者**: Gemini CLI 助手
**日期**: 2026年6月7日
