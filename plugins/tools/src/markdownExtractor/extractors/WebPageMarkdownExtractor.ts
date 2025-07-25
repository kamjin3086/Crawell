import { BaseMarkdownExtractor } from '../base/BaseMarkdownExtractor';
import { ExtractorOptions } from '../interfaces/IContentExtractor';
import { ExtractorManager } from '../core/ExtractorManager';

export class WebPageMarkdownExtractor extends BaseMarkdownExtractor {
  private extractorManager: ExtractorManager;

  constructor() {
    super('WebPageMarkdownExtractor');
    this.extractorManager = new ExtractorManager();
  }

  async canHandle(element: HTMLElement): Promise<boolean> {
    // 网页提取器可以处理任何HTML内容
    return true;
  }

  protected async doExtract(element: HTMLElement, options?: ExtractorOptions): Promise<string> {
    return this.extractorManager.extract(element, undefined, options);
  }
} 