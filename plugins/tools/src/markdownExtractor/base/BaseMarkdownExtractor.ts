import { IMarkdownExtractor } from '../interfaces/IMarkdownExtractor';
import { ExtractorOptions } from '../interfaces/IContentExtractor';
import { ExtractorLogger } from '../utils/ExtractorLogger';

export abstract class BaseMarkdownExtractor implements IMarkdownExtractor {
  protected readonly name: string;

  constructor(name: string) {
    this.name = name;
    ExtractorLogger.enable();
  }

  getName(): string {
    return this.name;
  }

  async extractToMarkdown(element: HTMLElement, options?: ExtractorOptions): Promise<string> {
    try {
      ExtractorLogger.info(this.name, '开始提取内容', {
        elementType: element.tagName,
        elementId: element.id,
        elementClasses: element.className,
        options
      });

      const result = await this.doExtract(element, options);

      ExtractorLogger.info(this.name, '提取完成', {
        contentLength: result.length
      });

      return result;
    } catch (error) {
      ExtractorLogger.error(this.name, '提取过程发生错误', error);
      throw error;
    }
  }

  abstract canHandle(element: HTMLElement): Promise<boolean>;
  protected abstract doExtract(element: HTMLElement, options?: ExtractorOptions): Promise<string>;
} 