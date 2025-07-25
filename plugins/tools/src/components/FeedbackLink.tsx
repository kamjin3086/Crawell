import React from 'react'
import { HelpCircle } from 'lucide-react'
import { useFeedbackUrl } from '../hooks/useFeedbackUrl'
import { i18n } from '../i18n'

interface Props {
  text?: string
  variant?: 'inline' | 'button'
  className?: string
}

/**
 * 通用反馈链接组件，根据 variant 输出不同样式。
 */
export const FeedbackLink: React.FC<Props> = ({ text = i18n.t('help.contact.form'), variant = 'inline', className = '' }) => {
  const url = useFeedbackUrl()

  if (variant === 'button') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border border-slate-300 dark:border-slate-600 text-sm transition-colors hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-white/10 dark:text-slate-200 ${className}`}
      >
        <HelpCircle className="w-5 h-5 text-blue-500" />
        <span className="text-sm font-medium">{text}</span>
      </a>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1 text-blue-600 hover:underline ${className}`}
    >
      <HelpCircle className="w-4 h-4" />
      {text}
    </a>
  )
} 