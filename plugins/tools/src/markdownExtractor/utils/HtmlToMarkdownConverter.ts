import rehypeParse from 'rehype-parse';
// @ts-ignore - rehype-raw typings may not be present
import rehypeRaw from 'rehype-raw';
import rehypeRemark from 'rehype-remark';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';  // 支持GFM（GitHub Flavored Markdown）
import {unified} from 'unified';
import { ExtractorLogger } from './ExtractorLogger';

export class HtmlToMarkdownConverter {
  private processor: ReturnType<typeof unified>;

  constructor() {
    ExtractorLogger.info('HtmlToMarkdownConverter', '初始化转换器');
    
    this.processor = (unified() as any)
      .use(rehypeParse, {
        fragment: true,  // 支持HTML片段
        space: 'html',   // 使用HTML空白规则
        verbose: true    // 启用详细日志
      })
      // 解析 <div> 内的原始 HTML，确保完整内容被转换
      // @ts-ignore
      .use(rehypeRaw)
      .use(rehypeRemark, {
        handlers: {
          // 自定义处理器
          article: (h: any, node: any) => {
            ExtractorLogger.debug('HtmlToMarkdownConverter', '处理article元素', node);
            return h(node, 'root', node.children);
          },
          pre: (h: any, node: any) => {
            ExtractorLogger.debug('HtmlToMarkdownConverter', '处理pre元素', node);
            // 检查是否包含代码语言信息
            const className = node.properties.className || [];
            const language = className
              .find((cls: string) => cls.startsWith('language-') || cls.startsWith('lang-'))
              ?.split('-')[1] || '';
            
            return h(node, 'code', { lang: language }, node.children);
          }
        }
      })
      .use(remarkGfm)  // 支持表格、任务列表等GitHub风格的Markdown
      .use(remarkStringify, {
        bullet: '-',
        listItemIndent: 'one',
        emphasis: '_',
        strong: '**',
        fence: '```',
        rule: '-',
        ruleSpaces: false,
        ruleRepetition: 3,
        fences: true,
        incrementListMarker: true,
        stringLength: () => 80,  // 控制行长度
        tightDefinitions: true
      });

    ExtractorLogger.info('HtmlToMarkdownConverter', '转换器初始化完成', {
      processors: ['rehypeParse', 'rehypeRemark', 'remarkGfm', 'remarkStringify']
    });
  }

  /**
   * 预处理HTML内容
   */
  private preprocessHtml(html: string): string {
    ExtractorLogger.debug('HtmlToMarkdownConverter', '预处理HTML', {
      originalLength: html.length
    });

    // 移除多余的空白字符
    let processed = html.replace(/\s+/g, ' ');
    
    // 保护代码块中的格式
    processed = processed.replace(/<pre[^>]*>(.*?)<\/pre>/gs, (match) => {
      return match.replace(/\s+/g, '\n');
    });

    // 确保块级元素前后有换行
    processed = processed.replace(/(<\/(div|p|section|article|header|footer|main|aside|nav)>)(?!\n)/g, '$1\n');
    
    ExtractorLogger.debug('HtmlToMarkdownConverter', 'HTML预处理完成', {
      processedLength: processed.length
    });

    return processed;
  }

  /**
   * 后处理Markdown内容
   */
  private postprocessMarkdown(markdown: string): string {
    ExtractorLogger.debug('HtmlToMarkdownConverter', '后处理Markdown', {
      originalLength: markdown.length
    });

    // 移除连续的空行
    let processed = markdown.replace(/\n{3,}/g, '\n\n');
    
    // 确保代码块前后有空行
    processed = processed.replace(/([^\n])(```)/g, '$1\n$2');
    processed = processed.replace(/(```\w*\n.*?\n```)([^\n])/gs, '$1\n$2');
    
    // 修复列表格式
    processed = processed.replace(/^([*-])\s*([^\n]*)/gm, '$1 $2');

    ExtractorLogger.debug('HtmlToMarkdownConverter', 'Markdown后处理完成', {
      processedLength: processed.length
    });

    return processed.trim();
  }

  /**
   * 将HTML字符串转换为Markdown
   */
  async convertFromString(html: string): Promise<string> {
    try {
      ExtractorLogger.info('HtmlToMarkdownConverter', '开始转换HTML字符串', {
        inputLength: html.length
      });

      const preprocessed = this.preprocessHtml(html);
      const file = await this.processor.process(preprocessed);
      let markdown = String(file);
      markdown = this.postprocessMarkdown(markdown);

      ExtractorLogger.info('HtmlToMarkdownConverter', 'HTML字符串转换完成', {
        originalLength: html.length,
        preprocessedLength: preprocessed.length,
        markdownLength: markdown.length
      });

      return markdown;
    } catch (error) {
      ExtractorLogger.error('HtmlToMarkdownConverter', 'HTML字符串转换失败', error);
      throw error;
    }
  }

  /**
   * 将HTML元素转换为Markdown
   */
  async convertFromElement(element: HTMLElement): Promise<string> {
    try {
      ExtractorLogger.debug('HtmlToMarkdownConverter', '开始转换HTML元素', {
        tagName: element.tagName,
        innerHTML: element.innerHTML.length
      });

      const html = element.outerHTML;
      const markdown = await this.convertFromString(html);

      ExtractorLogger.debug('HtmlToMarkdownConverter', 'HTML元素转换完成', {
        outputLength: markdown.length
      });

      return markdown;
    } catch (error) {
      ExtractorLogger.error('HtmlToMarkdownConverter', 'HTML元素转换失败', error);
      throw error;
    }
  }

  /**
   * 将HTML片段转换为Markdown
   * 这个方法会自动处理不完整的HTML片段
   */
  async convertFromFragment(htmlFragment: string): Promise<string> {
    try {
      ExtractorLogger.debug('HtmlToMarkdownConverter', '开始转换HTML片段', {
        inputLength: htmlFragment.length
      });

      // 包装HTML片段以确保它是有效的HTML
      const wrappedHtml = `<div>${htmlFragment}</div>`;
      const markdown = await this.convertFromString(wrappedHtml);

      ExtractorLogger.debug('HtmlToMarkdownConverter', 'HTML片段转换完成', {
        outputLength: markdown.length
      });

      return markdown;
    } catch (error) {
      ExtractorLogger.error('HtmlToMarkdownConverter', 'HTML片段转换失败', error);
      throw error;
    }
  }
} 