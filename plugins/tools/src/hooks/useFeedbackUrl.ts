import { useEffect, useState } from 'react'
// eslint-disable-next-line import/no-relative-packages
import googleForms from '../../assets/googleforms.json'

/**
 * 构造谷歌表单反馈链接，附带扩展名称、版本、浏览器信息等。
 */
export function useFeedbackUrl(): string {
  const [url, setUrl] = useState<string>('https://docs.google.com/forms')

  useEffect(() => {
    try {
      const manifest = chrome?.runtime?.getManifest?.()
      if (manifest) {
        const lang = (chrome?.i18n?.getUILanguage?.() || navigator.language || 'en').toLowerCase()
        // @ts-ignore runtime json import
        const formBase = lang.startsWith('zh') ? (googleForms as any).zh : (googleForms as any).en
        const finalUrl = formBase
          .replace('NAME_PLACEHOLDER', encodeURIComponent(manifest.name))
          .replace('VERSION_PLACEHOLDER', encodeURIComponent(manifest.version))
          .replace('BROWSER_PLACEHOLDER', encodeURIComponent(navigator.userAgent))
        setUrl(finalUrl)
      }
    } catch {
      // silent
    }
  }, [])

  return url
} 