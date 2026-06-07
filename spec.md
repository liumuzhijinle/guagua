站在巨人的肩膀上做二次开发，是最高效的笔试/面试实战策略。对于 Vue/React 技术栈，GitHub 上有大量成熟的 Chrome Extension Boilerplate（例如 `vitesse-webext` 或 `chrome-extension-boilerplate-react-vite`）。你可以直接克隆这些模板，将精力全部集中在“音频捕获”和“字幕渲染”的核心业务逻辑上。

为你量身定制了一份《AI 同声传译助手 Chrome 插件》的 `spec.md`（产品与技术规格说明书）。这份文档按照正规工程规范编写，你可以直接作为项目的 README 或设计文档提交给面试官。

---

```markdown
# 核心规格说明书 (Spec): AI 同声传译助手 Chrome 插件

## 1. 产品概述 (Product Overview)
**名称:** guagua
**定位:** 一款浏览器原生的 AI 实时同声传译工具。
**核心价值:** 帮助用户在观看无字幕外语视频、参与网页端国际会议（如 Web Zoom/Google Meet）时，跨越语言障碍。通过动态纠错技术，提供媲美人类同传的流畅字幕体验。

## 2. 系统架构 (Architecture)
系统采用 **“轻前端（插件） + 重后端（AI 引擎）”** 的解耦架构。

### 2.1 前端：Chrome Extension (Manifest V3)
* **框架选型:** Vue 3 / React + Vite (基于开源 Boilerplate 二次开发)
* **核心模块:**
  * **Popup (控制台):** 提供用户交互界面（开关控制、语言选择、极速/精准模式切换）。
  * **Background Service Worker:** 负责核心生命周期管理、`tabCapture` 音频流捕获，以及维持与后端的 WebSocket 长连接。
  * **Content Script:** 注入到目标网页，负责在视频层或页面顶层渲染“沉浸式动态字幕”。

### 2.2 后端：Python AI 服务 (另置)
* **框架:** FastAPI (提供 WebSocket 接口)。
* **处理链路:** 接收 WebM/PCM 音频流 -> VAD 降噪分段 -> ASR (Faster-Whisper) -> LLM 实时翻译与上下文纠错 -> 将带状态的文本推回前端。

## 3. 核心功能与交互说明 (Core Features & UX)

### 3.1 页面原生音频捕获 (Tab Audio Capture)
* **机制:** 调用 Chrome 原生的 `chrome.tabCapture` API，无损拦截当前标签页播放的所有音频流，不受物理环境噪音干扰。
* **处理:** 将捕获的 MediaStream 转换为适当的采样率（如 16kHz），通过 WebSocket 实时推流至 Python 后端。

### 3.2 动态纠错字幕渲染 (Dynamic Subtitle Rendering)
* **视觉层级:** Content Script 在当前网页 DOM 中插入一个高层级的 `div` 容器，支持鼠标拖拽改变位置。
* **双轨展示逻辑 (重点用户体验):**
  * **草稿态 (Draft):** 接收到后端初步识别的文本，以**浅灰色**展示，代表 AI 正在处理中。
  * **定稿态 (Final):** 接收到后端 LLM 结合长上下文纠正后的最终文本，平滑过渡为**白色并带高亮阴影**，确认不再更改。
* **交互:** 当句子过长时，字幕容器应具备自动滚动机制。

## 4. 数据接口协议 (WebSocket Protocol)

前端与后端通过 JSON 格式在 WebSocket 通道进行高频通讯。

**Client -> Server (上行):**
* **类型:** 二进制音频块 (Audio Chunks)
* **参数:** 采样率、时间戳。

**Server -> Client (下行):**
* **类型:** 结构化文本片段 (JSON)
```json
{
  "chunk_id": "msg_001",
  "status": "draft",  // 或 "final"
  "original_text": "And the core problem is...",
  "translated_text": "核心问题在于...",
  "is_correction": false // 如果为 true，前端需覆盖更新该 chunk_id 的内容
}

```

## 5. 开源项目改造指南 (Implementation Strategy)

1. **基础脚手架:** Fork 并 clone 开源模板库（如 `antfu/vitesse-webext`）。
2. **权限配置 (Manifest 调整):**
确保 `manifest.json` 中包含以下必要权限：
* `"permissions": ["tabCapture", "activeTab", "storage"]`
* `"host_permissions": ["<all_urls>"]`


3. **通信桥接:** 在 Background 脚本中实现 `chrome.tabCapture.capture` 获取流，并使用 `MediaRecorder` API 将流切片（每 500ms 一块）发往 WebSocket。
4. **UI 注入:** 在 Content Script 中引入 TailwindCSS 或原生 CSS 写一个漂亮的半透明黑色圆角字幕框。



```

```