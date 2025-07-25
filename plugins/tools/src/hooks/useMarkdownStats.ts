import { useMemo } from 'react'

export interface Stats {
  wordCount: number
  imageCount: number
}

/**
 * 根据 Markdown 文本实时计算字数和图片数量
 * @param markdown 当前 Markdown 字符串
 * @param extractImageUrls 提取图片链接方法（复用 useImageCache 中实现）
 */
export const useMarkdownStats = (
  markdown: string,
  extractImageUrls: (text: string) => string[],
): Stats => {
  return useMemo(() => {
    const wordCount = markdown.replace(/[\s\n]/g, '').length
    const imageCount = extractImageUrls(markdown).length
    return { wordCount, imageCount }
  }, [markdown, extractImageUrls])
} 