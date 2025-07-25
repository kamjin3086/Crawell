// TurndownConverter.ts: 使用 Turndown + GFM 将 HTML 转 Markdown。支持可选 Readability 预提取
// @ts-ignore
import TurndownService from 'turndown'
// @ts-ignore
import { gfm } from 'turndown-plugin-gfm'
// @ts-ignore
import { Readability } from '@mozilla/readability'
import { ExtractorLogger } from './ExtractorLogger'

export class TurndownConverter {
  private service: TurndownService

  constructor () {
    this.service = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
    this.service.use(gfm)

    // 自定义 Rule：清理 <pre> 中多余缩进与空行，避免渲染大块留白
    this.service.addRule('trimPre', {
      filter: 'pre',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      replacement: (_content: any, node: any) => {
        const text = (node.textContent || '').replace(/\r/g, '') // 去掉 \r
        // 去掉尾部空白行
        let cleaned = text.replace(/\s+$/g, '')

        // 计算每行最小统一缩进（空格或制表符）
        const indents = cleaned
          .split('\n')
          .filter((l: any) => l.trim().length)
          .map((l: any) => (l.match(/^\s*/)?.[0].length) ?? 0)
        const minIndent = indents.length ? Math.min(...indents) : 0
        if (minIndent > 0) {
          const reg = new RegExp('^[\t ]{0,' + minIndent + '}', 'gm')
          cleaned = cleaned.replace(reg, '')
        }

        // 移除只包含空白的行，保留至多一个空行分段
        const lines = cleaned.split('\n')
        const finalLines: string[] = []
        let blankStreak = false
        for (const ln of lines) {
          if (ln.trim().length === 0) {
            if (!blankStreak) {
              finalLines.push('')
              blankStreak = true
            }
          } else {
            finalLines.push(ln)
            blankStreak = false
          }
        }
        cleaned = finalLines.join('\n')

        // 如果有效行数过少（<=3），大概率是目录伪代码块，直接省略
        const meaningful = finalLines.filter(l=>l.trim().length)
        if (meaningful.length <= 3) {
          return meaningful.join('\n')
        }

        return `\`\`\`\n${cleaned}\n\`\`\``
      }
    })
    ExtractorLogger.info('TurndownConverter', '初始化 Turndown + GFM')
  }

  /** 将 HTMLElement 转为 Markdown
   *  @param element   要转换的元素
   *  @param useReadability 若为 true，则用 Readability 提取正文再转换
   */
  convertFromElement (element: HTMLElement, useReadability = false): string {
    try {
      let html = element.outerHTML
      if (useReadability) {
        const doc = new DOMParser().parseFromString(html, 'text/html')
        const article = new Readability(doc).parse()
        if (article?.content) {
          html = article.content
        }
      }
      const md = this.service.turndown(html)
      return md.trim()
    } catch (err) {
      ExtractorLogger.error('TurndownConverter', '转换失败', err as any)
      throw err
    }
  }
} 