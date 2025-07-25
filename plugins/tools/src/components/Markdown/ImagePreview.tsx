import React, { useState, useEffect, useRef } from 'react'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@pagehelper/common/src/components/ui/hover-card'
import { cn } from '@pagehelper/common/src/lib/utils'
import { Image as ImageIcon, RotateCw } from 'lucide-react'
import { i18n } from '../../i18n';
import { motion } from 'framer-motion'

/**
 * 单张图片的缓存信息
 */
export interface CachedImage {
  originalSrc: string
  dataUrl: string
  alt?: string
  size: number
  timestamp: number
}

interface ImagePreviewProps {
  /** 原图片地址 */
  src: string
  /** 图片 alt 文本 */
  alt?: string
  /** 已缓存图片 Map */
  cachedImages: Map<string, CachedImage>
}

/**
 * 图片预览组件。
 * 1. 鼠标悬停时显示大图
 * 2. 优先使用缓存中的 base64 数据，减少网络请求
 */
const ImagePreview: React.FC<ImagePreviewProps> = ({ src, alt, cachedImages }) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const preloadRef = useRef<HTMLImageElement | null>(null)

  const cachedImage = cachedImages.get(src)
  const displaySrc = cachedImage?.dataUrl || src

  // 预加载图片，加载完成后再显示避免闪烁
  useEffect(() => {
    if (!preloadRef.current) {
      preloadRef.current = new Image()
      preloadRef.current.src = displaySrc
      preloadRef.current.onload = () => setIsLoaded(true)
    }
  }, [displaySrc])

  return (
    <HoverCard openDelay={0} closeDelay={0}>
      <HoverCardTrigger
        asChild
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-all duration-200',
            'bg-slate-100 text-slate-800 hover:bg-slate-200',
            'dark:bg-slate-700/50 dark:text-slate-200 dark:hover:bg-slate-700/70',
            isHovered && 'ring-2 ring-blue-400 ring-opacity-50',
          )}
        >
          <ImageIcon className="w-4 h-4" />
          {alt || i18n.t('markdownEditor.imagePlaceholder')}
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        className="p-0 overflow-hidden"
        style={{
          maxWidth: isLoaded ? preloadRef.current?.naturalWidth : 400,
          maxHeight: isLoaded ? preloadRef.current?.naturalHeight : 300,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative"
        >
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
              <RotateCw className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          )}
          <motion.img
            src={displaySrc}
            alt={alt}
            className={cn(
              'w-full h-full object-contain rounded-md transition-opacity duration-200',
              !isLoaded && 'opacity-0',
            )}
            initial={false}
            animate={{ opacity: isLoaded ? 1 : 0 }}
            style={{
              maxWidth: isLoaded ? preloadRef.current?.naturalWidth : 400,
              maxHeight: isLoaded ? preloadRef.current?.naturalHeight : 300,
            }}
          />
        </motion.div>
      </HoverCardContent>
    </HoverCard>
  )
}

export default ImagePreview 