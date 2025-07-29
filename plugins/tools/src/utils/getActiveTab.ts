export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  // 使用 callback 形式封装为 Promise，兼容 Chrome/Firefox
  const queryTabs = (queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> => {
    // 某些浏览器的 chrome.tabs.query 仅支持回调风格
    return new Promise((resolve) => {
      try {
        // @ts-ignore - 允许 callback 方式
        chrome.tabs.query(queryInfo, (tabs: chrome.tabs.Tab[]) => {
          resolve(tabs);
        });
      } catch (_) {
        // 理论上不会触发，但以防万一
        resolve([]);
      }
    });
  };

  const invalidPrefixes = [
    'chrome://',
    'edge://',
    'about:',
    'data:',
    'chrome-extension://',
    'kiwi-extension://', // Kiwi 浏览器的扩展页面协议
    'devtools://',
    'view-source:'
  ];
  const isInternal = (url?: string) => !url || invalidPrefixes.some((pre) => url.startsWith(pre));

  const pickValid = (tabs: chrome.tabs.Tab[]): chrome.tabs.Tab | undefined =>
    tabs.find((t) => !isInternal(t.url));

  /* ---------------------------- 普通场景 ----------------------------- */
  let tabs = await queryTabs({ active: true, currentWindow: true });
  let tab = pickValid(tabs);
  if (tab) return tab;

  /* ---------------------------- 回退场景 1 ----------------------------- */
  // Firefox side panel / 部分浏览器可能属于 lastFocusedWindow
  tabs = await queryTabs({ active: true, lastFocusedWindow: true });
  tab = pickValid(tabs);
  if (tab) return tab;

  /* ---------------------------- 回退场景 2 ----------------------------- */
  // 当前活动标签是扩展页面（例如 popup.html 在手机端打开为 Tab），
  // 尝试寻找同窗口最近访问且非扩展页面的标签作为目标。
  const allTabs = await queryTabs({ windowId: chrome.windows.WINDOW_ID_CURRENT } as chrome.tabs.QueryInfo);
  const candidates = allTabs
    .filter((t) => !isInternal(t.url))
    .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
  if (candidates.length) return candidates[0];

  /* ---------------------------- 最后一搏 ----------------------------- */
  // 跨所有窗口寻找最近访问的非扩展页面
  const globalTabs = await queryTabs({});
  const globalCandidate = globalTabs
    .filter((t) => !isInternal(t.url))
    .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
  return globalCandidate;
} 