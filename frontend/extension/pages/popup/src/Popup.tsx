import '@src/Popup.css';
import { t } from '@extension/i18n';
import { PROJECT_URL_OBJECT, useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage, subtitleSettingsStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton } from '@extension/ui';

const Popup = () => {
  const { isLight } = useStorage(exampleThemeStorage);
  const { fontColor } = useStorage(subtitleSettingsStorage);
  const logo = isLight ? 'popup/logo_vertical.svg' : 'popup/logo_vertical_dark.svg';

  const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT);

  const startTranslation = () => {
    chrome.runtime.sendMessage({ type: 'start-translation' });
  };

  const stopTranslation = () => {
    chrome.runtime.sendMessage({ type: 'stop-translation' });
  };

  const changeColor = (color: string) => {
    subtitleSettingsStorage.set({ fontColor: color, fontSize: 24 });
  };

  const colors = [
    { name: '白色', value: '#ffffff' },
    { name: '黄色', value: '#ffff00' },
    { name: '绿色', value: '#00ff00' },
    { name: '青色', value: '#00ffff' },
  ];

  return (
    <div className={cn('App', isLight ? 'bg-slate-50' : 'bg-gray-800')}>
      <header className={cn('App-header', isLight ? 'text-gray-900' : 'text-gray-100')}>
        <button onClick={goGithubSite}>
          <img src={chrome.runtime.getURL(logo)} className="App-logo" alt="logo" />
        </button>
        <p className="font-bold text-lg mb-2">
          AI 同声传译助手
        </p>
        
        <div className="flex gap-2 mb-4">
          <button
            className="rounded px-4 py-2 font-bold shadow bg-green-500 text-white hover:bg-green-600 transition-colors"
            onClick={startTranslation}>
            开始同传
          </button>
          <button
            className="rounded px-4 py-2 font-bold shadow bg-red-500 text-white hover:bg-red-600 transition-colors"
            onClick={stopTranslation}>
            停止
          </button>
        </div>

        <div className="flex flex-col items-center gap-2 mb-4">
          <span className="text-sm opacity-80">字幕颜色</span>
          <div className="flex gap-2">
            {colors.map((c) => (
              <button
                key={c.value}
                onClick={() => changeColor(c.value)}
                className={cn(
                  "w-6 h-6 rounded-full border-2",
                  fontColor === c.value ? "border-blue-500 scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        <ToggleButton className="mt-2">{t('toggleTheme')}</ToggleButton>
      </header>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
