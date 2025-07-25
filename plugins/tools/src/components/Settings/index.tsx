import { Settings2, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@pagehelper/common/src/components/ui/button'
import GlassExtractorSettings from '../GlassExtractorSettings'


/**
 * 使用原生 React 实现的简易弹窗，避免 Radix Portal 在侧边栏中的渲染问题。
 */
export default function Settings() {
  const [open, setOpen] = useState(false)

  // ESC 键关闭
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  return (
    <>
      {/* 触发按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className="hover:bg-zinc-100/80 transition-all duration-200"
        onClick={() => setOpen(true)}
      >
        <Settings2 className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
      </Button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[9999]"
          onClick={() => setOpen(false)}
        >
          {/* 直接渲染玻璃拟态设置面板 */}
          <div onClick={(e)=>e.stopPropagation()} className="max-h-[80vh] overflow-y-auto">
            <GlassExtractorSettings />
          </div>
        </div>
      )}
    </>
  )
} 