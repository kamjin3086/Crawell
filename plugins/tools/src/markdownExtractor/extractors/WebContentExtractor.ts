import { ExtractorContext, ExtractResult, IContentExtractor } from '../interfaces/IContentExtractor';
import { ExtractorLogger } from '../utils/ExtractorLogger';
import { HtmlMarkdownConverter } from '../utils/HtmlMarkdownConverter';
import { TurndownConverter } from '../utils/TurndownConverter';
import { i18n } from '../../i18n';

/**
 * 专门用于网页内容提取的提取器
 * 与通用提取器的区别：
 * 1. 更激进地过滤不必要的内容，减少token消耗
 * 2. 提供更简洁、更适合AI理解的上下文
 * 3. 针对性优化转换逻辑
 */
export class WebContentExtractor implements IContentExtractor {
  name = 'WebContentExtractor';
  priority = 0; // 高优先级
  private converter: HtmlMarkdownConverter;

  constructor() {
    this.converter = new HtmlMarkdownConverter();
    ExtractorLogger.info(this.name, '初始化网页内容提取器');
  }

  async canExtract(context: ExtractorContext): Promise<boolean> {
    return true; // 始终可以提取
  }

  private getSelectorsToRemove(): string[] {
    const selectors: string[] = [
      'script',
      'style',
      'link[rel="stylesheet"]',
      'meta',
      'noscript',
      'svg',
      'img[src*="ad"], img[src*="banner"], img[src*="advertisement"]',
      '[aria-hidden="true"]',
      '[role="banner"]',
      '[role="complementary"]',
      '.hidden',
      '[style*="display: none"]',
      '[style*="visibility: hidden"]',
      'header',
      'footer',
      'nav',
      'aside',
      'iframe',
      '.cookie-banner',
      '.ad',
      '.advertisement',
      '.banner',
      '.social-links',
      '.related-posts',
      '.comments',
      'form',
      '.modal',
      '.popup'
    ];

    ExtractorLogger.info(this.name, '设置过滤选择器', { selectorsCount: selectors.length });
    return selectors;
  }

  private cleanupElement(element: HTMLElement): HTMLElement {
    const cleanElement = element.cloneNode(true) as HTMLElement;
    
    // 移除HTML注释节点
    this.removeComments(cleanElement);
    
    const selectorsToRemove = this.getSelectorsToRemove();

    ExtractorLogger.debug(this.name, '清理元素前的状态', {
      originalLength: cleanElement.innerHTML.length
    });

    try {
      cleanElement.querySelectorAll(selectorsToRemove.join(',')).forEach(el => {
        try {
          ExtractorLogger.debug(this.name, `移除元素: ${el.tagName}`, {
            class: el.className,
            id: el.id
          });
          el.remove();
        } catch (error) {
          ExtractorLogger.warn(this.name, `移除元素失败: ${el.tagName}`, error);
        }
      });
    } catch (error) {
      ExtractorLogger.error(this.name, '清理元素过程中发生错误', error);
    }

    // 特殊处理图片，移除src保留alt
    cleanElement.querySelectorAll('img').forEach(img => {
      const alt = img.getAttribute('alt') || i18n.t('markdownEditor.imagePlaceholder');
      const placeholder = document.createElement('span');
      placeholder.textContent = `[${alt}]`;
      img.parentNode?.replaceChild(placeholder, img);
    });

    this.removeEmptyNodes(cleanElement);
    this.removeComments(cleanElement);

    ExtractorLogger.debug(this.name, '清理元素后的状态', {
      cleanedLength: cleanElement.innerHTML.length
    });

    return cleanElement;
  }

  private findMainContent(element: HTMLElement): HTMLElement {
    // 寻找页面的主要内容区
    if (!element.ownerDocument?.defaultView) {
      return element;
    }

    // 优先查找带语义标记的主内容区域
    const mainContentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '#content',
      '.content',
      '.article',
      '.post',
      '.main-content',
      '.article-content',
      '.post-content'
    ];

    for (const selector of mainContentSelectors) {
      try {
        const mainContent = element.querySelector(selector);
        if (mainContent && mainContent.textContent?.trim() && mainContent.textContent.length > 100) {
          ExtractorLogger.info(this.name, `找到主要内容区域: ${selector}`);
          return mainContent as HTMLElement;
        }
      } catch (error) {
        ExtractorLogger.warn(this.name, `查找选择器${selector}失败`, error);
      }
    }

    // 如果找不到明确的主内容区域，尝试基于内容长度和密度进行启发式查找
    const contentElements: Array<{element: HTMLElement, score: number}> = [];
    
    // 查找可能的内容区域
    const potentialElements = element.querySelectorAll('div, section');
    potentialElements.forEach(el => {
      const textLength = el.textContent?.length || 0;
      const linkDensity = this.calculateLinkDensity(el as HTMLElement);
      
      // 启发式评分:
      // 高分: 文本多，链接密度低
      // 低分: 文本少，链接密度高
      const score = textLength * (1 - linkDensity);
      
      if (textLength > 200) {
        contentElements.push({
          element: el as HTMLElement,
          score
        });
      }
    });
    
    // 按分数排序，取最高分
    contentElements.sort((a, b) => b.score - a.score);
    
    if (contentElements.length > 0) {
      ExtractorLogger.info(this.name, `使用启发式方法找到内容区域`, {
        score: contentElements[0].score,
        textLength: contentElements[0].element.textContent?.length || 0
      });
      return contentElements[0].element;
    }

    // 如果所有方法都失败，返回原始元素
    ExtractorLogger.warn(this.name, '未找到明确的主要内容区域，使用整个文档');
    return element;
  }

  private calculateLinkDensity(element: HTMLElement): number {
    const text = element.textContent || '';
    const links = element.querySelectorAll('a');
    const linkText = Array.from(links).reduce((acc, link) => acc + (link.textContent?.length || 0), 0);
    
    return text.length > 0 ? linkText / text.length : 0;
  }

  private removeComments(element: HTMLElement) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_COMMENT,
      null
    );

    const commentsToRemove: Comment[] = [];
    let comment = walker.nextNode() as Comment;

    while (comment) {
      commentsToRemove.push(comment);
      comment = walker.nextNode() as Comment;
    }

    commentsToRemove.forEach(comment => {
      comment.remove();
    });

    // 注释节点已移除，无需再次通过 innerHTML 重写。
  }

  private removeEmptyNodes(element: HTMLElement) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_ELEMENT,
      null
    );

    const nodesToRemove: Element[] = [];
    let node = walker.nextNode() as Element;

    while (node) {
      if (this.isEmptyNode(node)) {
        nodesToRemove.push(node);
      }
      node = walker.nextNode() as Element;
    }

    nodesToRemove.forEach(node => {
      node.remove();
    });
  }

  private isEmptyNode(node: Element): boolean {
    const text = node.textContent?.trim() || '';
    return text === '' && !node.hasChildNodes();
  }

  async extract(context: ExtractorContext): Promise<ExtractResult> {
    try {
      ExtractorLogger.info(this.name, '开始提取网页内容');

      // 处理选中内容
      if (context.selection && context.selection.rangeCount > 0) {
        const range = context.selection.getRangeAt(0);
        const fragment = range.cloneContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(fragment);
        
        const cleanedDiv = this.cleanupElement(tempDiv);
        const markdown = await this.converter.convertFromFragment(cleanedDiv.innerHTML);
        
        return {
          content: markdown,
          extracted: true,
          metadata: {
            source: 'selection',
            url: context.originalUrl,
            length: markdown.length
          }
        };
      }

      // 处理整个页面内容
      const mainElement = this.findMainContent(context.element);
      const cleanedElement = this.cleanupElement(mainElement);
      
      // 获取页面标题和URL
      const title = document.title || '';
      const url = context.originalUrl || window.location.href;
      
      // 提取页面基本信息
      const pageInfo = `# ${title}\n\n${url}\n\n`;
      
      // 转换为Markdown
      const contentMarkdown = await this.converter.convertFromFragment(cleanedElement.innerHTML);
      
      // 合并页面信息和内容
      const fullMarkdown = pageInfo + contentMarkdown;
      
      return {
        content: fullMarkdown,
        extracted: true,
        metadata: {
          source: 'page',
          url: url,
          title: title,
          length: fullMarkdown.length
        }
      };
    } catch (error) {
      ExtractorLogger.error(this.name, '提取网页内容失败', error);
      
      return {
        content: `提取内容失败: ${error instanceof Error ? error.message : '未知错误'}`,
        extracted: false,
        metadata: {
          source: 'error'
        }
      };
    }
  }
} 