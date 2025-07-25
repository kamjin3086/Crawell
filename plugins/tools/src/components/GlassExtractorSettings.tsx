import React, { useEffect, useMemo, useState } from 'react'
import { Trash2, ExternalLink, X } from 'lucide-react'
import { SimpleSwitch } from './SimpleSwitch'
import { useExtractorStore } from '../store/extractorStore'
import { i18n } from '../i18n'
import { useFeedbackUrl } from '../hooks/useFeedbackUrl'
import CrawellLogoMono from '../../assets/crawell-mono.svg'

/* -------------------------------------------------------------------------- */
/*                                UI helpers                                 */
/* -------------------------------------------------------------------------- */

const Section: React.FC<{ title: string; desc: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <div className="space-y-5 pb-6 border-b border-gray-200 last:border-none settings-section">
    <div className="space-y-1">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">{desc}</p>
    </div>
    {children}
  </div>
)

const Row: React.FC<{ title: string; desc?: string; children: React.ReactNode }> = ({ title, desc, children }) => (
  <div className="flex justify-between items-center py-3">
    <div>
      <p className="font-medium text-slate-700 dark:text-slate-200 text-sm">{title}</p>
      {desc && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{desc}</p>}
    </div>
    {children}
  </div>
)

/* -------------------------------------------------------------------------- */
/*                                Main comp                                   */
/* -------------------------------------------------------------------------- */

interface Props { onClose?: () => void }

export const GlassExtractorSettings: React.FC<Props> = ({ onClose }) => {
  const { options, updateOptions } = useExtractorStore()

  const [version, setVersion] = useState<string>('-')
  const feedbackUrl = useFeedbackUrl()

  /* ---------------------------- version ----------------------------- */
  useEffect(() => {
    const manifest = chrome?.runtime?.getManifest?.()
    if (manifest) setVersion(manifest.version)
  }, [])

  const links = useMemo(
    () => [
      { href: '/privacy.html', text: i18n.t('general.privacyPolicy') },
      { href: '/terms.html', text: i18n.t('general.termsOfService') },
      { href: feedbackUrl, text: i18n.t('general.feedback') },
    ],
    [feedbackUrl]
  )

  /* ----------------------------- handlers ------------------------------- */
  const toggleOption = (key: keyof typeof options) => (checked: boolean) => updateOptions({ [key]: checked })

  const clearData = () => {
    if (window.confirm(i18n.t('settings.data.confirm'))) {
      localStorage.clear()
      chrome.storage.local.clear();
      indexedDB.databases?.().then((dbs) => dbs?.forEach((db) => db.name && indexedDB.deleteDatabase(db.name)))
      caches.keys().then((ks) => ks.forEach((k) => caches.delete(k)))
      // 为了让用户感知变化，刷新页面
      window.location.reload()
    }
  }

  /* ---------------------------------------------------------------------- */
  /*                                   UI                                   */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="glass-setting-card w-full max-w-sm mx-auto rounded-xl shadow-lg overflow-y-auto max-h-[78vh] settings-scroll">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700/50 sticky top-0 z-20 bg-slate-100 dark:bg-slate-900/70 rounded-t-xl backdrop-blur-md">
        <div className="flex items-center gap-2 select-none">
          <img src={CrawellLogoMono} alt="logo" className="w-5 h-5 dark:invert dark:opacity-80" />
        </div>
        {onClose && (
          <button
            aria-label="关闭"
            className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-6 space-y-6">
        {/* 清理模式 */}
        <Section title={i18n.t('settings.cleanMode.title')} desc={i18n.t('settings.cleanMode.desc')}>
          <Row title={i18n.t('settings.cleanMode.enableTitle')} desc={i18n.t('settings.cleanMode.enableDesc')}>
            <SimpleSwitch id="clean" checked={options.cleanMode} onChange={toggleOption('cleanMode')} />
          </Row>
          {options.cleanMode && (
            <div className="pl-4 border-l-2 border-black/10 dark:border-white/10 space-y-1 pt-2">
              <Row title={i18n.t('settings.cleanMode.removeAds')}>
                <SimpleSwitch id="ads" checked={options.removeAds} onChange={toggleOption('removeAds')} />
              </Row>
              <Row title={i18n.t('settings.cleanMode.removeComments')}>
                <SimpleSwitch id="comments" checked={options.removeComments} onChange={toggleOption('removeComments')} />
              </Row>
              <Row title={i18n.t('settings.cleanMode.removeNav')}>
                <SimpleSwitch id="nav" checked={options.removeNav} onChange={toggleOption('removeNav')} />
              </Row>
              <Row title={i18n.t('settings.cleanMode.removeFooter')}>
                <SimpleSwitch id="footer" checked={options.removeFooter} onChange={toggleOption('removeFooter')} />
              </Row>
              <Row title={i18n.t('settings.cleanMode.removeSocial')}>
                <SimpleSwitch id="social" checked={options.removeSocial} onChange={toggleOption('removeSocial')} />
              </Row>
            </div>
          )}
        </Section>

        {/* 图片过滤 */}
        <Section title={i18n.t('settings.imageFilter.title')} desc={i18n.t('settings.imageFilter.desc')}>
          <Row title={i18n.t('settings.imageFilter.enableTitle')}>
            <SimpleSwitch id="filterSmallImages" checked={options.filterSmallImages} onChange={toggleOption('filterSmallImages')} />
          </Row>
        </Section>

        {/* 数据管理 */}
        <Section title={i18n.t('settings.data.title')} desc={i18n.t('settings.data.desc')}>
          <button
            onClick={clearData}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-4 py-2.5 text-sm font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors focus:outline-none"
          >
            <Trash2 className="w-4 h-4" />
            {i18n.t('settings.data.clearAll')}
          </button>
        </Section>

        {/* 关于与支持 */}
        <Section title={i18n.t('settings.about.title')} desc={i18n.t('settings.about.desc')}>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">{i18n.t('general.version')}</span>
              <span className="font-medium text-slate-800">{version}</span>
            </div>
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex justify-between items-center text-sm font-medium text-blue-600 hover:text-blue-700 group"
              >
                <span>{l.text}</span>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </a>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

export default GlassExtractorSettings 