import { ExtractorContext, ExtractResult, IContentExtractor } from '../interfaces/IContentExtractor';
import { ExtractorLogger } from '../utils/ExtractorLogger';
import { TurndownConverter } from '../utils/TurndownConverter';
import { i18n } from '../../i18n';

export class ImageExtractor implements IContentExtractor {
  name = 'ImageExtractor';
  priority = 2;

  async canExtract(context: ExtractorContext): Promise<boolean> {
    const images = context.element.querySelectorAll('img');
    const canExtract = images.length > 0;
    ExtractorLogger.debug(this.name, `检查是否可以提取图片`, {
      imageCount: images.length,
      canExtract
    });
    return canExtract;
  }

  async extract(context: ExtractorContext): Promise<ExtractResult> {
    const images = Array.from(context.element.querySelectorAll('img'));
    if (images.length === 0) {
      ExtractorLogger.warn(this.name, '未找到图片元素');
      return { content: '', extracted: false };
    }

    const filterEnabled = context.options?.filterSmallImages !== false; // 默认启用过滤

    ExtractorLogger.info(this.name, `开始提取${images.length}张图片`, { filterEnabled });

    const processed: string[] = [];

    const isVisibleInViewport = (el: HTMLImageElement) => {
      const rect = el.getBoundingClientRect();
      return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
    };

    const getBestSrc = (img: HTMLImageElement): string | null => {
      // 1) 自定义懒加载属性
      const dataAttrs = ['data-original', 'data-src', 'data-lazy-src', 'data-uri'];
      for (const attr of dataAttrs) {
        const val = img.getAttribute(attr);
        if (val) return val;
      }
      // 2) srcset（取第一个 url）
      const srcset = img.getAttribute('srcset');
      if (srcset) {
        const first = srcset.split(',')[0]?.trim().split(' ')[0];
        if (first) return first;
      }
      // 3) fallback to src
      return img.getAttribute('src') || img.src || null;
    };

    images.forEach(img => {
      const srcRaw = getBestSrc(img);
      if (!srcRaw) return;

      // 尺寸与可见性过滤
      if (filterEnabled) {
        const width = img.naturalWidth || img.width || img.getBoundingClientRect().width;
        const height = img.naturalHeight || img.height || img.getBoundingClientRect().height;

        // 过滤极小图片 (≤5px)
        if (width <= 5 || height <= 5) return;

        // 过滤视口外图片
        if (!isVisibleInViewport(img)) return;
      }

      let absoluteSrc: string;
      try {
        absoluteSrc = new URL(srcRaw, context.originalUrl).href;
      } catch {
        absoluteSrc = srcRaw; // fallback 可能是 data URI or invalid relative still ok
      }

      const alt = img.alt || i18n.t('markdownEditor.imagePlaceholder');
      const title = img.title || img.getAttribute('data-title') || '';
      processed.push(`![${alt}](${absoluteSrc})${title ? ` "${title}"` : ''}`);
    });

    ExtractorLogger.info(this.name, '图片提取完成', {
      originalCount: images.length,
      afterFilter: processed.length,
      filterEnabled
    });

    return {
      content: processed.join('\n\n'),
      extracted: processed.length > 0,
      metadata: {
        imageCount: processed.length
      }
    };
  }
} 