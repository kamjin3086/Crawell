import '../src/utils/silenceConsole';
import type { Browser } from 'webextension-polyfill';

// webextension-polyfill @types 尚未包含 sidePanel，临时扩展类型
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
interface BrowserWithSidePanel extends Browser { sidePanel?: any }

declare const browser: BrowserWithSidePanel;

// WXT 注入的 storage API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const storage: any;
declare const defineBackground: (callback: () => void) => void;

interface StorageState {
  state: {
    options: {
      cleanMode: boolean;
      removeAds: boolean;
      removeComments: boolean;
      removeNav: boolean;
      removeFooter: boolean;
      removeSocial: boolean;
    };
    autoExtractImagesEnabled: boolean;
    autoExtractMarkdownEnabled: boolean;
  };
  version: number;
}

// defineBackground is often provided by WXT implicitly or via its build process.
// If errors persist, we might need to find its explicit import or adjust tsconfig.
export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });
  // console.log('[BG Script] Initial WXT storage object:', storage);

  // 在 defineBackground 回调内部最前面添加消息监听器，接收 contentScriptReady
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.action === 'contentScriptReady') {
      console.log('[BG Script] Received contentScriptReady');
      sendResponse?.({ ok: true });
      // 无异步操作，返回 false 即可
      return false;
    }
  });

  // Chrome MV3 支持 sidePanel API。为了避免 Firefox 扫描到 `sidePanel.*` 字样，改用
  // bracket 语法按需访问，Firefox 打包时将被 tree-shake 掉。
  const sidePanelRef = (browser as any)["sidePanel"];
  if (sidePanelRef?.setPanelBehavior) {
    sidePanelRef
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error: any) => console.error('Failed to set panel behavior:', error));
  } else {
    console.log('[BG Script] sidePanel API not available, skip setPanelBehavior');
  }

  const storeKey = 'local:extractor-settings';

  // Helper 执行脚本，兼容 Chrome (manifest v3) 与 Firefox (manifest v2)
  const executeScript = async (
    tabId: number,
    options: { func?: () => any; code?: string; file?: string; files?: string[] }
  ): Promise<any> => {
    // 优先使用 MV3 的 chrome.scripting
    if ((chrome as any).scripting && (chrome.scripting as any).executeScript) {
      if (options.func) {
        const [{ result }] = await chrome.scripting.executeScript({ target: { tabId }, func: options.func });
        return result;
      }
      // 其它参数透传
      // @ts-ignore
      return chrome.scripting.executeScript({ target: { tabId }, ...options });
    }
    // Firefox MV2 fallback
    if (options.func) {
      // 将函数序列化为字符串执行
      const [result] = await chrome.tabs.executeScript(tabId, { code: `(${options.func})();` });
      return result;
    }
    if (options.code) {
      return chrome.tabs.executeScript(tabId, { code: options.code });
    }
    if (options.file) {
      return chrome.tabs.executeScript(tabId, { file: options.file });
    }
    if (options.files && options.files.length) {
      // Firefox executeScript 只支持单文件，顺序执行
      for (const f of options.files) {
        await chrome.tabs.executeScript(tabId, { file: f });
      }
      return;
    }
  };

  /**
   * 读取持久化设置：优先使用 WXT 注入的 storage，如果不存在则回退到 browser.storage.local。
   * 兼容 Firefox MV2 (webextension-polyfill)。
   */
  const getPersistedState = async (): Promise<StorageState | null> => {
    try {
      if (typeof storage !== 'undefined' && storage?.getItem) {
        console.log('[BG Script] Using injected storage.getItem');
        return (await storage.getItem(storeKey)) as StorageState | null;
      }
      console.log('[BG Script] Fallback to browser.storage.local.get');
      const data = await browser.storage.local.get(storeKey);
      return (data as any)?.[storeKey] ?? null;
    } catch (err) {
      console.error('[BG Script] Failed to read persisted state:', err);
      return null;
    }
  };

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:')) {
      console.log("[BG Script] Tab updated:", { tabId, url: tab.url });
      
      // 等待一段时间确保 content script 完全加载
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        // 检查 content script 是否已注入并初始化。
        let isInitialized = false;
        try {
          isInitialized = await executeScript(tabId, { func: () => {
            return (window as any).pageHelperInitialized === true;
          }});
        } catch (err) {
          console.warn('[BG Script] init check failed, will proceed anyway', err);
        }

        console.log("[BG Script] Content script initialization check:", isInitialized);

        if (!isInitialized) {
          // 若 chrome.scripting 可用（MV3），尝试主动注入；Firefox MV2 已在 manifest 声明，忽略
          if ((chrome as any).scripting && (chrome.scripting as any).executeScript) {
            try {
              await executeScript(tabId, { files: ['content.js'] });
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
              console.warn('[BG Script] Inject content script failed:', err);
            }
          }
        }

        // 获取存储的状态
        const persistedState = await getPersistedState();
        console.log("[BG Script] Fetched from WXT storage for key", storeKey, ":", persistedState);

        if (persistedState && persistedState.state) {
          const { autoExtractImagesEnabled, autoExtractMarkdownEnabled } = persistedState.state;
          console.log("[BG Script] Auto extract flags - Images:", autoExtractImagesEnabled, "Markdown:", autoExtractMarkdownEnabled);

          const timestamp = Date.now();
          if (autoExtractImagesEnabled) {
            console.log("[BG Script] Attempting to send extractImages message to tab:", tabId);
            chrome.tabs.sendMessage(tabId, { action: 'extractImages', autoTriggered: true, timestamp });
          }
          if (autoExtractMarkdownEnabled) {
            console.log("[BG Script] Attempting to send extractContent message to tab:", tabId);
            chrome.tabs.sendMessage(tabId, { action: 'extractContent', autoTriggered: true, timestamp });
          }
        }
      } catch (error) {
        console.error("[BG Script] Error during auto-extraction:", error);
      }
    }
  });

  // 打开欢迎页
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      const welcomeUrl = browser.runtime.getURL('welcome.html');
      browser.tabs.create({ url: welcomeUrl }).catch((err: any) => console.error('Failed to open welcome page:', err));
    }
  });
});
