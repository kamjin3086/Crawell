import { IMarkdownExtractor } from './interfaces/IMarkdownExtractor';
import { WebPageMarkdownExtractor } from './extractors/WebPageMarkdownExtractor';
import { ChatMarkdownExtractor } from './extractors/ChatMarkdownExtractor';
import { ExtractorLogger } from './utils/ExtractorLogger';

export class MarkdownExtractorFactory {
  private static extractors: IMarkdownExtractor[] = [];
  private static initialized = false;

  private static initialize() {
    if (!this.initialized) {
      this.extractors = [
        new WebPageMarkdownExtractor(),
        new ChatMarkdownExtractor()
      ];
      this.initialized = true;
      ExtractorLogger.info('MarkdownExtractorFactory', '初始化提取器列表', 
        this.extractors.map(e => e.getName()));
    }
  }

  static async getExtractor(element: HTMLElement): Promise<IMarkdownExtractor> {
    this.initialize();

    for (const extractor of this.extractors) {
      if (await extractor.canHandle(element)) {
        ExtractorLogger.info('MarkdownExtractorFactory', `选择提取器: ${extractor.getName()}`);
        return extractor;
      }
    }

    // 默认使用网页提取器
    ExtractorLogger.info('MarkdownExtractorFactory', '使用默认网页提取器');
    return new WebPageMarkdownExtractor();
  }
} 