import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';
import {unified} from 'unified';
import { ExtractorLogger } from './ExtractorLogger';
import { i18n } from '../../i18n';

/**
 * 专门为AI聊天对话上下文优化的HTML到Markdown转换器
 * 与通用转换器的区别：
 * 1. 过滤图片URL和CSS等内容以减少token消耗
 * 2. 移除可能无用的HTML元素
 * 3. 优化输出格式，提供更简洁的上下文
 */
export class HtmlMarkdownConverter {
  private processor: any;

  constructor() {
    ExtractorLogger.info('HtmlMarkdownConverter', '初始化AI聊天优化转换器');
    
    this.processor = unified()
      .use(rehypeParse, {
        fragment: true,  // 支持HTML片段
        space: 'html',   // 使用HTML空白规则
        verbose: true    // 启用详细日志
      })
      // @ts-ignore - 忽略类型问题，因为我们提供了自定义的handlers
      .use(rehypeRemark, {
        // 自定义处理器配置，针对AI聊天进行优化
        handlers: {
          // 过滤图片，只保留 alt 文本
          img: (h: any, node: any) => {
            ExtractorLogger.debug('HtmlMarkdownConverter', '过滤图片元素，只保留alt文本');
            const alt = node.properties.alt || i18n.t('markdownEditor.imagePlaceholder');
            return h(node, 'text', `[${alt}]`);
          },
          
          // 过滤样式标签
          style: () => {
            ExtractorLogger.debug('HtmlMarkdownConverter', '移除样式标签');
            return null; // 完全移除此元素
          },
          
          // 过滤script标签
          script: () => {
            ExtractorLogger.debug('HtmlMarkdownConverter', '移除脚本标签');
            return null; // 完全移除此元素
          },
          
          // 过滤svg标签
          svg: () => {
            ExtractorLogger.debug('HtmlMarkdownConverter', '移除SVG标签');
            return null; // 完全移除此元素
          },
          
          // 忽略iframe，替换为简单描述
          iframe: (h: any, node: any) => {
            ExtractorLogger.debug('HtmlMarkdownConverter', '替换iframe为简单描述');
            const title = node.properties.title || '嵌入内容';
            return h(node, 'text', `[嵌入内容: ${title}]`);
          },
          
          // 简化表格处理，表格往往消耗大量token
          table: (h: any, node: any) => {
            ExtractorLogger.debug('HtmlMarkdownConverter', '简化表格处理');
            // 如果表格非常大，可以考虑进一步简化或提供摘要
            return h(node, 'root', node.children);
          },
          
          // 保持文章结构
          article: (h: any, node: any) => {
            ExtractorLogger.debug('HtmlMarkdownConverter', '处理article元素');
            return h(node, 'root', node.children);
          },
          
          // 优化代码块处理
          pre: (h: any, node: any) => {
            ExtractorLogger.debug('HtmlMarkdownConverter', '处理pre元素');
            // 检查代码语言信息
            const className = node.properties.className || [];
            const language = className
              .find((cls: string) => cls.startsWith('language-') || cls.startsWith('lang-'))
              ?.split('-')[1] || '';
            
            return h(node, 'code', { lang: language }, node.children);
          }
        }
      })
      .use(remarkGfm)  // 支持GitHub风格的Markdown
      // @ts-ignore - 忽略类型问题，因为我们提供了自定义的配置
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

    ExtractorLogger.info('HtmlMarkdownConverter', '转换器初始化完成');
  }

  /**
   * 预处理HTML内容，移除可能无用的元素
   */
  private preprocessHtml(html: string): string {
    ExtractorLogger.debug('HtmlMarkdownConverter', '预处理HTML', {
      originalLength: html.length
    });

    // 移除多余的空白字符
    let processed = html.replace(/\s+/g, ' ');
    
    // 移除所有CSS样式属性和内联样式
    processed = processed.replace(/style="[^"]*"/g, '');
    processed = processed.replace(/class="[^"]*"/g, '');
    
    // 移除可能的跟踪代码和不必要的属性
    processed = processed.replace(/data-[^=]*="[^"]*"/g, '');
    processed = processed.replace(/onclick="[^"]*"/g, '');
    processed = processed.replace(/onload="[^"]*"/g, '');
    
    // 移除HTML注释
    processed = processed.replace(/<!--[\s\S]*?-->/g, '');
    
    // 保护代码块中的格式
    processed = processed.replace(/<pre[^>]*>(.*?)<\/pre>/gs, (match) => {
      return match.replace(/\s+/g, '\n');
    });

    // 确保块级元素前后有换行
    processed = processed.replace(/(<\/(div|p|section|article|header|footer|main|aside|nav)>)(?!\n)/g, '$1\n');
    
    ExtractorLogger.debug('HtmlMarkdownConverter', 'HTML预处理完成', {
      processedLength: processed.length
    });

    return processed;
  }

  /**
   * 后处理Markdown内容，使其更简洁和适合AI处理
   */
  private postprocessMarkdown(markdown: string): string {
    ExtractorLogger.debug('HtmlMarkdownConverter', '后处理Markdown', {
      originalLength: markdown.length
    });

    // 移除连续的空行，保留最多一个空行
    let processed = markdown.replace(/\n{3,}/g, '\n\n');
    
    // 确保代码块前后有空行
    processed = processed.replace(/([^\n])(```)/g, '$1\n$2');
    processed = processed.replace(/(```\w*\n.*?\n```)([^\n])/gs, '$1\n$2');
    
    // 修复列表格式
    processed = processed.replace(/^([*-])\s*([^\n]*)/gm, '$1 $2');
    
    // 移除可能的重复标题
    const headingLines = processed.split('\n').filter(line => /^#{1,6}\s/.test(line));
    if (headingLines.length > 5) {
      // 如果标题过多，考虑精简
      ExtractorLogger.debug('HtmlMarkdownConverter', '标题过多，进行精简');
      // 这里可以实现更复杂的标题精简逻辑
    }

    // 限制总长度，如果超出一定长度，可以考虑进一步精简
    const maxLength = 10000; // 根据需要调整
    if (processed.length > maxLength) {
      ExtractorLogger.debug('HtmlMarkdownConverter', '内容过长，进行截断');
      processed = processed.substring(0, maxLength) + '\n\n... (内容已截断)';
    }

    ExtractorLogger.debug('HtmlMarkdownConverter', 'Markdown后处理完成', {
      processedLength: processed.length
    });

    return processed.trim();
  }

  /**
   * 将HTML字符串转换为适合AI聊天的Markdown
   */
  async convertFromString(html: string): Promise<string> {
    try {
      ExtractorLogger.info('HtmlMarkdownConverter', '开始转换HTML字符串', {
        inputLength: html.length
      });

      const preprocessed = this.preprocessHtml(html);
      const file = await this.processor.process(preprocessed);
      let markdown = String(file);
      markdown = this.postprocessMarkdown(markdown);

      ExtractorLogger.info('HtmlMarkdownConverter', 'HTML字符串转换完成', {
        originalLength: html.length,
        preprocessedLength: preprocessed.length,
        markdownLength: markdown.length
      });

      return markdown;
    } catch (error) {
      ExtractorLogger.error('HtmlMarkdownConverter', 'HTML字符串转换失败', error);
      throw error;
    }
  }

  /**
   * 将HTML元素转换为适合AI聊天的Markdown
   */
  async convertFromElement(element: HTMLElement): Promise<string> {
    try {
      ExtractorLogger.debug('HtmlMarkdownConverter', '开始转换HTML元素', {
        tagName: element.tagName,
        innerHTML: element.innerHTML.length
      });

      const html = element.outerHTML;
      const markdown = await this.convertFromString(html);

      ExtractorLogger.debug('HtmlMarkdownConverter', 'HTML元素转换完成', {
        outputLength: markdown.length
      });

      return markdown;
    } catch (error) {
      ExtractorLogger.error('HtmlMarkdownConverter', 'HTML元素转换失败', error);
      throw error;
    }
  }

  /**
   * 将HTML片段转换为适合AI聊天的Markdown
   * 这个方法会自动处理不完整的HTML片段
   */
  async convertFromFragment(htmlFragment: string): Promise<string> {
    try {
      ExtractorLogger.debug('HtmlMarkdownConverter', '开始转换HTML片段', {
        inputLength: htmlFragment.length
      });

      // 包装HTML片段以确保它是有效的HTML
      const wrappedHtml = `<div>${htmlFragment}</div>`;
      const markdown = await this.convertFromString(wrappedHtml);

      ExtractorLogger.debug('HtmlMarkdownConverter', 'HTML片段转换完成', {
        outputLength: markdown.length
      });

      return markdown;
    } catch (error) {
      ExtractorLogger.error('HtmlMarkdownConverter', 'HTML片段转换失败', error);
      throw error;
    }
  }
} 