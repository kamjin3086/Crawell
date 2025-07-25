import { useCallback, useState } from 'react'
import { CachedImage } from '../components/Markdown/ImagePreview'

/** 单张图片、总缓存大小、数量限制 */
const CACHE_CONFIG = {
  MAX_SINGLE_IMAGE_SIZE: 2 * 1024 * 1024, // 2MB
  MAX_TOTAL_CACHE_SIZE: 20 * 1024 * 1024, // 20MB
  MAX_CACHE_COUNT: 30, // 最多缓存 30 张
}

/** 计算当前缓存占用大小 */
const calculateTotalCacheSize = (cache: Map<string, CachedImage>): number => {
  let total = 0
  for (const image of cache.values()) {
    total += image.size
  }
  return total
}

/**
 * 图片缓存逻辑封装。
 * 返回缓存 map、缓存函数、提取图片链接函数以及清理函数。
 */
export const useImageCache = () => {
  const [cachedImages, setCachedImages] = useState<Map<string, CachedImage>>(new Map())

  /** 清理缓存，确保容量或数量符合限制 */
  const cleanCache = useCallback(
    (cache: Map<string, CachedImage>, requiredSpace = 0): Map<string, CachedImage> => {
      if (cache.size === 0) return cache

      // 旧→新排序
      const entries = Array.from(cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)
      const newCache = new Map(cache)

      // 数量限制
      while (newCache.size > CACHE_CONFIG.MAX_CACHE_COUNT) {
        const [oldestKey] = entries.shift() || []
        if (oldestKey) newCache.delete(oldestKey)
      }

      // 空间限制
      let currentSize = calculateTotalCacheSize(newCache)
      while (currentSize > CACHE_CONFIG.MAX_TOTAL_CACHE_SIZE - requiredSpace && entries.length > 0) {
        const [oldestKey] = entries.shift() || []
        if (oldestKey) {
          const imageSize = newCache.get(oldestKey)?.size ?? 0
          newCache.delete(oldestKey)
          currentSize -= imageSize
        }
      }

      return newCache
    },
    [],
  )

  /** 下载并缓存图片，返回原始 src（无需替换调用方逻辑） */
  const cacheImage = useCallback(
    async (src: string): Promise<string> => {
      try {
        if (cachedImages.has(src)) {
          // 更新访问时间戳
          const existing = cachedImages.get(src)!
          setCachedImages((prev) => new Map(prev).set(src, { ...existing, timestamp: Date.now() }))
          return src
        }

        const response = await fetch(src)
        const blob = await response.blob()

        // 单张大小限制
        if (blob.size > CACHE_CONFIG.MAX_SINGLE_IMAGE_SIZE) return src

        // blob → base64
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })

        setCachedImages((prev) => {
          const prepared = cleanCache(prev, blob.size)

          // 空间仍不足
          if (calculateTotalCacheSize(prepared) + blob.size > CACHE_CONFIG.MAX_TOTAL_CACHE_SIZE) {
            return prev
          }
          prepared.set(src, {
            originalSrc: src,
            dataUrl,
            size: blob.size,
            timestamp: Date.now(),
          })
          return new Map(prepared)
        })
      } catch {
        /* 忽略错误，返回原地址 */
      }
      return src
    },
    [cachedImages, cleanCache],
  )

  /** 从 markdown 中提取图片链接（过滤 base64） */
  const extractImageUrls = useCallback((markdown: string): string[] => {
    const imageRegex = /!\[.*?\]\((.*?)\)/g
    const urls: string[] = []
    let match: RegExpExecArray | null
    while ((match = imageRegex.exec(markdown)) !== null) {
      if (match[1] && !match[1].startsWith('data:')) urls.push(match[1])
    }
    return urls
  }, [])

  const clearCache = useCallback(() => setCachedImages(new Map()), [])

  return {
    cachedImages,
    cacheImage,
    extractImageUrls,
    clearCache,
  }
} 