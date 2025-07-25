import React from 'react'
import { Button } from '@pagehelper/common/src/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@pagehelper/common/src/components/ui/tooltip'
import { cn } from '@pagehelper/common/src/lib/utils'
import { Edit2, FileText, Image as ImageIcon, Archive } from 'lucide-react'
import type { Stats } from '../../hooks/useMarkdownStats'
import { i18n } from '../../i18n'

interface Props {
  output: string
  showSource: boolean
  toggleShowSource: () => void
  stats: Stats
  onDownloadZip: () => void
}

/**
 * Markdown 编辑器底部工具栏
 */
export const EditorFooter: React.FC<Props> = ({
  output,
  showSource,
  toggleShowSource,
  stats,
  onDownloadZip,
}) => {
  if (!output) return null
  const { t } = i18n
  return (
    <div className="bottom-toolbar mt-4 p-2 rounded-xl flex items-center justify-between text-xs">
      <div className="flex items-center gap-3">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={toggleShowSource}
                variant="ghost"
                size="sm"
                className={cn(
                  'h-6 px-2 text-xs hover:bg-slate-50 dark:hover:bg-white/10 dark:hover:text-slate-100',
                  showSource && 'bg-blue-50 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400'
                )}
              >
                <Edit2 className="h-3.5 w-3.5 mr-1" />
                {showSource ? t('editorFooter.preview') : t('editorFooter.edit')}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {t('editorFooter.toggleTooltip')}
            </TooltipContent>
          </Tooltip>

          <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />

          {/* 字数 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <FileText className="h-3.5 w-3.5" />
                <span>{stats.wordCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {t('editorFooter.wordCountTooltip')}
            </TooltipContent>
          </Tooltip>

          {/* 图片数 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <ImageIcon className="h-3.5 w-3.5" />
                <span>{stats.imageCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {t('editorFooter.imageCountTooltip')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* 右侧：下载 */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onDownloadZip}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs hover:bg-slate-50 dark:hover:bg-white/10 dark:hover:text-slate-100"
            >
              <Archive className="h-3.5 w-3.5 mr-1" />
              {t('editorFooter.download')}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {t('editorFooter.downloadTooltip')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
} 