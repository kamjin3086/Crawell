import { useEffect } from 'react'

/**
 * 初始化主题：根据系统偏好自动给 <html> 添加 / 移除 `dark` class，
 * 并在系统主题改变时实时同步。
 */
export function initTheme() {
  // 浏览器环境保护
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const mq = window.matchMedia('(prefers-color-scheme: dark)')

  const apply = () => {
    document.documentElement.classList.toggle('dark', mq.matches)
  }

  // 初次应用
  apply()

  // 监听系统主题变化
  mq.addEventListener('change', apply)
}

/**
 * React Hook：在组件挂载时自动调用 initTheme。
 */
function useSystemTheme() {
  useEffect(() => {
    initTheme()
  }, [])
} 