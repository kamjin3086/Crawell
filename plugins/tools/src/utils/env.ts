export const isMobilePopup = (): boolean => {
    if (typeof window === 'undefined') return false;
  
    /* --------------------- 是否 popup.html --------------------- */
    const isPopup = /popup\.html(?:\?|#|$)/.test(window.location.href);
    if (!isPopup) return false;
  
    /* --------------------- 设备/环境特征 --------------------- */
    const ua = navigator.userAgent.toLowerCase();
  
    // 1) 常见移动 UA 关键词
    const MOBILE_UA_REGEX = /(android|iphone|ipad|ipod|mobile|tablet|blackberry|bb10|webos|opera mini|windows phone)/;
    const isMobileUA = MOBILE_UA_REGEX.test(ua);
  
    // 2) 触屏设备：pointer 为 coarse
    const isTouchPointer = (() => {
      try {
        return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      } catch (_) {
        return false;
      }
    })();
  
    // 3) 视口宽度较小（≤ 820px 视为平板及以下）
    const isNarrowViewport = window.innerWidth <= 820;
  
    // 4) Kiwi 浏览器特殊 UA（仍然算移动 UA，但保险起见保留）
    const isKiwi = ua.includes('kiwi');
  
    return isMobileUA || isTouchPointer || isNarrowViewport || isKiwi;
  }; 