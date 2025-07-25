import React from 'react';
import ImageExtractorView from './ImageExtractorView';
import type { UseImageExtractorReturn } from '../hooks/useImageExtractor';

/**
 * GlassLegacyContent 复用旧版 ImageExtractorView 的分类网格、折叠、排序等复杂逻辑。
 * 通过 CSS 覆盖隐藏其自带的 toolbar / 底栏和灰色背景，只呈现图片列表部分。
 */
const GlassLegacyContent: React.FC<UseImageExtractorReturn> = (props) => {
  return (
    <div className="legacy-content flex-1 overflow-hidden">
      <ImageExtractorView {...props} />
    </div>
  );
};

export default GlassLegacyContent; 