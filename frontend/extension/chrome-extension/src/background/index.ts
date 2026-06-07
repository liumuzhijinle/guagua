import 'webextension-polyfill';

console.log('Background loaded');

// 维护活跃的 content script tab 集合
const activeContentScriptTabs = new Set<number>();

async function setupOffscreen() {
  // @ts-ignore
  if (await chrome.offscreen.hasDocument?.()) {
    return;
  }

  // @ts-ignore
  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL('offscreen/index.html'),
    reasons: ['USER_MEDIA'],
    justification: 'Capturing tab audio for AI translation',
  });
}

// 注入 content-ui 脚本到目标 tab
async function ensureContentScriptInjected(tabId: number): Promise<void> {
  try {
    // 先尝试发消息测试连接是否已存在
    await chrome.tabs.sendMessage(tabId, { type: 'ping' });
    console.log('[Background] Content script already loaded in tab:', tabId);
    activeContentScriptTabs.add(tabId);
    return;
  } catch {
    // 连接不存在，需要注入
    console.log('[Background] Injecting content-ui script into tab:', tabId);
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-ui/all.iife.js'],
    });
    console.log('[Background] Content-ui script injected successfully into tab:', tabId);
    activeContentScriptTabs.add(tabId);

    // 给 content script 一点时间初始化
    await new Promise(resolve => setTimeout(resolve, 300));
  } catch (err: any) {
    console.error('[Background] Failed to inject content script:', err.message);
  }
}

// 停止活动流 - 通过 offscreen 清理
async function releaseActiveStream(): Promise<void> {
  try {
    // 通知 offscreen 停止捕获
    await chrome.runtime.sendMessage({
      type: 'stop-capturing',
      target: 'offscreen',
    });
    // 等待资源释放
    await new Promise(resolve => setTimeout(resolve, 200));
  } catch {
    // offscreen 可能不存在，忽略
  }
}

chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (message.type === 'start-translation') {
    // 1. 先停止旧的捕获，确保链路干净
    await releaseActiveStream();

    await setupOffscreen();

    const tabId = message.tabId || (await chrome.tabs.query({ active: true, currentWindow: true }))[0]?.id;

    if (!tabId) {
      console.error('No active tab found');
      return;
    }

    // 2. 先确保 content script 已注入到目标页面
    await ensureContentScriptInjected(tabId);

    // 3. 通知 content-ui 显示字幕
    chrome.tabs.sendMessage(tabId, { type: 'show-subtitle' }).catch(() => {});

    // 4. 获取流 ID 并发送给 Offscreen
    // @ts-ignore
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (streamId) => {
      if (chrome.runtime.lastError) {
        console.error('tabCapture error:', chrome.runtime.lastError.message);
        return;
      }
      chrome.runtime.sendMessage({
        type: 'start-capturing',
        target: 'offscreen',
        data: streamId,
      });
    });
  } else if (message.type === 'stop-translation') {
    await releaseActiveStream();

    // 通知 content-ui 隐藏字幕
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: 'hide-subtitle' }).catch(() => {});
      }
    });
  } else if (message.type === 'new-subtitle') {
    // 核心转发逻辑：收到 Offscreen 的字幕后，转发给当前活动的网页
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        console.log('[Background] Routing subtitle to tab:', activeTab.id);
        chrome.tabs.sendMessage(activeTab.id, message).catch((err) => {
          console.error('[Background] Failed to send message to tab:', err.message);
          // 如果发送失败，从活跃集合中移除
          activeContentScriptTabs.delete(activeTab.id!);
        });
      }
    });
  } else if (message.type === 'content-script-ready') {
    console.log('[Background] Content script reported ready, tab:', sender.tab?.id);
    if (sender.tab?.id) {
      activeContentScriptTabs.add(sender.tab.id);
    }
  }
});
