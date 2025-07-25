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

  // 在大多数 Chromium 浏览器中，侧边栏与当前 window 相同
  let tabs = await queryTabs({ active: true, currentWindow: true });
  if (tabs.length) return tabs[0];

  // Firefox 侧边栏属于独立 window，需要回退到 lastFocusedWindow
  tabs = await queryTabs({ active: true, lastFocusedWindow: true });
  if (tabs.length) return tabs[0];

  // 仍然无法获取时，最后尝试跨所有窗口查询
  tabs = await queryTabs({ active: true });
  return tabs[0];
} 