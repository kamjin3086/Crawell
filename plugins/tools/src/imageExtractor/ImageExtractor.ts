export class ImageExtractor {
  // 极小像素，如 1×1/2×2 等透明追踪像素，默认排除
  private static readonly MIN_TRACKING_SIZE = 5;

  async extract(element: HTMLElement): Promise<string[]> {
    try {
      // 获取所有图片元素
      const imgElements = element.querySelectorAll('img');
      const images = new Set<string>();

      // 处理 <img> 标签
      imgElements.forEach(img => {
        const src = this.getImageUrl(img);
        if (!src) return;

        // 过滤极小像素 1×1 等
        const width = img.naturalWidth || img.width || img.getBoundingClientRect().width;
        const height = img.naturalHeight || img.height || img.getBoundingClientRect().height;

        if (width <= ImageExtractor.MIN_TRACKING_SIZE || height <= ImageExtractor.MIN_TRACKING_SIZE) return;

        // 过滤视口外图片
        const rect = img.getBoundingClientRect();
        const inViewport = rect.right > 0 && rect.bottom > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
        if (!inViewport) return;

        if (this.isValidImageSrc(src)) {
          images.add(src);
        }
      });

      // 处理背景图片
      const elementsWithBg = element.querySelectorAll('*');
      elementsWithBg.forEach(el => {
        const bgImage = window.getComputedStyle(el).backgroundImage;
        if (bgImage && bgImage !== 'none') {
          const matches = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
          if (matches && matches[1]) {
            const src = this.getAbsoluteUrl(matches[1]);
            if (src) {
              images.add(src);
            }
          }
        }
      });

      return Array.from(images);
    } catch (error) {
      console.error('Error extracting images:', error);
      throw error;
    }
  }

  private isValidImageSrc(src: string): boolean {
    return !!src && !src.startsWith('data:') && !src.startsWith('chrome-extension://');
  }

  private getImageUrl(img: HTMLImageElement): string | null {
    // 优先使用懒加载真实地址
    const dataAttrs = ['data-original', 'data-src', 'data-lazy-src', 'data-uri'];
    for (const attr of dataAttrs) {
      const v = img.getAttribute(attr);
      if (v) return this.getAbsoluteUrl(v);
    }

    // srcset: 取列表第一个
    const srcset = img.getAttribute('srcset');
    if (srcset) {
      const first = srcset.split(',')[0]?.trim().split(' ')[0];
      if (first) return this.getAbsoluteUrl(first);
    }

    // fallback to src
    const normalSrc = img.getAttribute('src') || img.src;
    return normalSrc ? this.getAbsoluteUrl(normalSrc) : null;
  }

  private getAbsoluteUrl(url: string): string | null {
    if (!url) return null;
    try {
      return new URL(url, window.location.href).href;
    } catch {
      return url; // 如果无法解析，返回原始值（可能是 base64 或协议相对等）
    }
  }
} 