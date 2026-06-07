import { useEffect, useState, useRef } from 'react';
import { useStorage } from '@extension/shared';
import { subtitleSettingsStorage } from '@extension/storage';

export default function App() {
  const [visible, setVisible] = useState(false);
  const [subtitle, setSubtitle] = useState('');
  const [original, setOriginal] = useState('');
  const { fontColor } = useStorage(subtitleSettingsStorage);

  // 拖拽相关状态
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 400, y: window.innerHeight - 150 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    console.log('[SubtitleUI] Component mounted, version 4.0 (Show/Hide + Streaming)');

    const listener = (message: any) => {
      switch (message.type) {
        case 'show-subtitle':
          console.log('[SubtitleUI] Showing subtitle');
          setVisible(true);
          setSubtitle('等待同传开始...');
          setOriginal('');
          break;
        case 'hide-subtitle':
          console.log('[SubtitleUI] Hiding subtitle');
          setVisible(false);
          setSubtitle('');
          setOriginal('');
          break;
        case 'new-subtitle':
          console.log('[SubtitleUI] New subtitle received:', message.data);
          if (message.data.status === 'original') {
            // 增量原文
            setOriginal(message.data.text || '');
          } else if (message.data.status === 'streaming') {
            // 流式翻译中
            setSubtitle(message.data.text || '翻译中...');
          } else if (message.data.status === 'final') {
            // 最终翻译结果
            setSubtitle(message.data.translated_text || message.data.text || '翻译中...');
            setOriginal(message.data.original_text || '');
          }
          break;
        case 'ping':
          // Background 在检测 content script 是否存活
          console.log('[SubtitleUI] Ping received from background');
          break;
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    chrome.runtime.sendMessage({ type: 'content-script-ready' });

    // 心跳：每 5 秒发送一次 ready 消息
    const heartbeatInterval = setInterval(() => {
      chrome.runtime.sendMessage({ type: 'content-script-ready' }).catch(() => {
        console.log('[SubtitleUI] Heartbeat failed, clearing interval');
        clearInterval(heartbeatInterval);
      });
    }, 5000);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      clearInterval(heartbeatInterval);
    };
  }, []);

  // 拖拽处理函数
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y,
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // 不可见时不渲染任何内容
  if (!visible) return null;

  return (
    <div
      onMouseDown={handleMouseDown}
      className="fixed z-[2147483647] flex flex-col items-center gap-2 select-none shadow-2xl"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '800px',
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'all 0.1s ease-out',
      }}
    >
      {/* 翻译字幕 */}
      <div className="px-6 py-3 rounded-xl bg-black/85 backdrop-blur-lg border border-white/20 text-center w-full">
        <p
          className="text-2xl font-bold leading-relaxed tracking-wide drop-shadow-lg"
          style={{ color: fontColor || '#ffffff' }}
        >
          {subtitle || '等待同传开始...'}
        </p>
      </div>

      {/* 原文字幕 */}
      {original && (
        <div className="px-4 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-center border border-white/10 max-w-[90%] mx-auto">
          <p className="text-gray-300 text-sm italic">{original}</p>
        </div>
      )}
    </div>
  );
}
