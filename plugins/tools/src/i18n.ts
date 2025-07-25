import { createI18n } from '@wxt-dev/i18n';
// Fallback: createI18n will use messages loaded by @wxt-dev/i18n module at runtime.
const LANGUAGE_STORAGE_KEY = 'ph-tools-locale';

export const i18n: any = createI18n();

// 兼容旧代码：暴露 setLocale，实现方式为写入 localStorage 后刷新
function applyLocale(locale: string | null) {
  if (typeof window === 'undefined') return;
  if (!locale || locale === 'auto') {
    chrome.storage.local.remove(LANGUAGE_STORAGE_KEY);
  } else {
    chrome.storage.local.set({ [LANGUAGE_STORAGE_KEY]: locale });
  }
  // 页面刷新以让浏览器重新读取 messages.json 文件
  window.location.reload();
}

// 挂到 i18n 对象上，供现有代码调用
i18n.setLocale = (locale: string) => applyLocale(locale);

// 同时导出独立函数，便于未来直接使用
const setLocale = (locale: string) => applyLocale(locale);

// 初始化时读取本地语言设置
const storedLocale = typeof window !== 'undefined' ? localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;
if (storedLocale && storedLocale !== 'auto') {
  // 直接存，不刷新
  // 保证首次载入就使用正确 messages。
} 