export interface ExtractorOptions {
  cleanMode?: boolean;      // 是否启用清爽模式
  removeAds?: boolean;      // 是否移除广告
  removeComments?: boolean; // 是否移除评论
  removeNav?: boolean;      // 是否移除导航
  removeFooter?: boolean;   // 是否移除页脚
  removeSocial?: boolean;   // 是否移除社交分享按钮
  preserveFormatting?: boolean;
  includeMetadata?: boolean;
  /**
   * 是否过滤隐藏或极小图片（≤5×5 像素，或视口外图片）。
   * 默认 true。
   */
  filterSmallImages?: boolean;
}

export interface ExtractorContext {
  element: HTMLElement;
  selection?: Selection | null;
  originalUrl: string;
  options?: ExtractorOptions;
}

export interface ExtractResult {
  extracted: boolean;
  content: string;
  metadata?: Record<string, any>;
}

export interface IContentExtractor {
  readonly name: string;
  readonly priority: number;
  canExtract(context: ExtractorContext): Promise<boolean>;
  extract(context: ExtractorContext): Promise<ExtractResult>;
} 