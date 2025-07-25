import React from 'react';
import {
  RotateCcw,
  Sparkles,
  Layers,
  Filter,
  SortAsc,
  SortDesc,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Image as ImageIcon,
} from 'lucide-react';
import { i18n } from '../../i18n';
import { cn } from '@pagehelper/common/src/lib/utils';
import type { UseImageExtractorReturn } from '../hooks/useImageExtractor';
import { formatFileSize } from '../utils/imageUtils';
import GlassLegacyContent from './GlassLegacyContent';
import { FilterDialog } from './FilterDialog';
import { DownloadDialog, type DownloadConfig, DEFAULT_CONFIG } from './DownloadDialog';
import { AnimatePresence, motion } from 'framer-motion';
import { useExtractorStore } from '../../store/extractorStore';

import CrawellMonoLogo from '../../../assets/crawell-mono.svg';

interface ViewProps extends UseImageExtractorReturn {
  /** 主题：light | dark */
  theme?: 'light' | 'dark';
  onShowSettings?: () => void;
  onShowHelp?: () => void;
}

/* global storage */
declare const storage: {
  getItem<T = any>(key: string): Promise<T | null>;
  setItem(key: string, value: any): Promise<void>;
};

const STORAGE_KEY = 'local:imageExtractor.downloadConfig' as const;

const generateDefaultZipName = (): string => {
  const now = new Date();
  return `images-${now.toISOString().replace(/[:.]/g, '-').slice(0,19)}`;
};

/** 根据 crawell_design_finish.html 复刻的图片抓取界面 */
const GlassImageExtractorView: React.FC<ViewProps> = ({
  /* hook 返回 */
  images,
  filteredImages,
  selected: selectedImages,
  isExtracting,
  isDownloading,
  downloadProgress,
  error,
  extract,
  download,
  toggleSelect,
  selectAll,
  unselectAll,
  invertSelect,
  autoExtractImagesEnabled,
  toggleAutoExtractImages,
  filterOptions,
  updateFilters,
  formats,
  formatCounts,
  sizeCounts,
  fileSizeCounts,
  accumulateModeEnabled,
  toggleAccumulateMode,
  /* ---- 外部 props ---- */
  theme = 'light',
  onShowSettings,
  onShowHelp,
}) => {
  /* 去重键与原 hook 保持一致 */
  const imageKey = (img: any) => {
    const name = img.src.split('/').pop()?.split('?')[0] || img.src;
    return `${name}-${img.size}`;
  };

  /* ---------------- 计算选中信息 ---------------- */
  const selectedCount = React.useMemo(() => selectedImages.size, [selectedImages]);
  const selectedSize = React.useMemo(() => {
    let total = 0;
    filteredImages.forEach((img) => {
      const name = imageKey(img);
      if (selectedImages.has(name)) total += img.size;
    });
    return total;
  }, [selectedImages, filteredImages]);

  const [ascOrder, setAscOrder] = React.useState(true);
  const toggleSort = () => setAscOrder((p) => !p);

  const sortedFilteredImages = React.useMemo(() => {
    const arr = [...filteredImages];
    arr.sort((a, b) => {
      // 默认按文件大小排序，可根据需要调整
      return ascOrder ? a.size - b.size : b.size - a.size;
    });
    return arr;
  }, [filteredImages, ascOrder]);

  const [showFilter, setShowFilter] = React.useState(false);
  // TODO: filter dialog implementation reuse original when ready

  const handleResetFilters = () => {
    updateFilters({
      ...filterOptions,
      selectedSizes: [],
      selectedFileSizes: [],
      formats: [],
    });
  };

  const [showDownloadDialog, setShowDownloadDialog] = React.useState(false);

  // zustand downloadConfig
  const downloadConfigStore = useExtractorStore((s:any)=>s.downloadConfig);
  const setDownloadConfig = useExtractorStore((s:any)=>s.setDownloadConfig);

  // 首次加载同步 storage 到 store
  React.useEffect(()=>{
    (async()=>{
      if(downloadConfigStore) return;
      try{
        const raw = await storage.getItem<DownloadConfig>(STORAGE_KEY);
        if(raw) setDownloadConfig(raw);
      }catch(e){ console.error('load cfg',e); }
    })();
  },[]);

  return (
    <div className="flex flex-col h-full relative">
      {/* Toolbar */}
      <div className="toolbar flex items-center gap-2 btn-icon-group pb-4 border-b border-[var(--border-glass)]">
        <button
          className="btn-primary w-32 text-sm py-2 px-4 shadow-sm flex items-center justify-center gap-2 focus:outline-none"
          onClick={extract}
          disabled={isExtracting}
        >
          <RotateCcw className={cn('w-4 h-4', isExtracting && 'animate-spin')} strokeWidth={2.5} />
          {isExtracting ? i18n.t('imageExtractor.view.extracting') : i18n.t('imageExtractor.view.extract')}
        </button>
        {/* 自动抓取 */}
        <button
          className={cn('btn-icon p-2 relative', autoExtractImagesEnabled && 'active', isExtracting && autoExtractImagesEnabled && 'auto-loading')}
          title={i18n.t('imageExtractor.view.autoTooltip')}
          onClick={toggleAutoExtractImages}
        >
          <Sparkles className="w-5 h-5" />
        </button>
        {/* 堆积模式 */}
        <button
          className={cn('btn-icon p-2', accumulateModeEnabled && 'active')}
          title={i18n.t('imageExtractor.view.accumulateTooltip')}
          onClick={toggleAccumulateMode}
        >
          <Layers className="w-5 h-5" />
        </button>
        {/* 分割线 + 筛选 / 排序，仅当已有图片时显示 */}
        {images.length > 0 && (
          <>
            <div className="w-px h-6 bg-white/30 dark:bg-white/10 mx-1" />
            {/* 筛选 */}
            <button className="btn-icon p-2" title={i18n.t('imageExtractor.view.filterTooltip')} onClick={() => setShowFilter(true)}>
              <Filter className="w-5 h-5" />
            </button>
            {/* 排序 */}
            <button className="btn-icon p-2" title={i18n.t('imageExtractor.view.sortTooltip')} onClick={toggleSort}>
              {ascOrder ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
            </button>
          </>
        )}
      </div>

      {/* 下载进度条 */}
      {isDownloading && downloadProgress.total > 0 && (
        <div className="mx-2 mb-2">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            {/* ... existing code ... */}
          </div>
        </div>
      )}

      {/* 错误提示（与 Markdown 编辑器一致） */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 flex-shrink-0"
          >
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content area */}
      {sortedFilteredImages.length === 0 && !isExtracting ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="placeholder-box w-full">
            {/* <ImageIcon className="w-20 h-20 mx-auto text-[var(--text-secondary)]" strokeWidth={1.5} /> */}
            <img src={CrawellMonoLogo} alt="placeholder" className="w-20 h-20 mx-auto dark:invert dark:opacity-60" />
            <p className="title">{i18n.t('imageExtractor.view.emptyTitle')}</p>
            <p className="subtitle">{i18n.t('imageExtractor.view.emptyHint')}</p>
          </div>
        </div>
      ) : (
        <GlassLegacyContent
          images={images}
          filteredImages={sortedFilteredImages}
          selected={selectedImages}
          isExtracting={isExtracting}
          isDownloading={isDownloading}
          downloadProgress={downloadProgress}
          error={error}
          extract={extract}
          download={download}
          toggleSelect={toggleSelect}
          selectAll={selectAll}
          unselectAll={unselectAll}
          invertSelect={invertSelect}
          autoExtractImagesEnabled={autoExtractImagesEnabled}
          toggleAutoExtractImages={toggleAutoExtractImages}
          filterOptions={filterOptions}
          updateFilters={updateFilters}
          formats={formats}
          formatCounts={formatCounts}
          sizeCounts={sizeCounts}
          fileSizeCounts={fileSizeCounts}
          accumulateModeEnabled={accumulateModeEnabled}
          toggleAccumulateMode={toggleAccumulateMode}
        />
      )}

      {/* Bottom toolbar */}
      {sortedFilteredImages.length > 0 && (
        <div className="bottom-toolbar mt-4 p-2 rounded-xl flex items-center justify-between text-xs">
          <div className="flex-shrink-0 space-y-1">
            <div className="font-medium">{i18n.t('imageExtractor.view.selectedPrefix')}{selectedCount}/{sortedFilteredImages.length} · {formatFileSize(selectedSize)}</div>
            <div className="flex gap-2">
              <button className="action-btn font-medium" onClick={selectAll}>{i18n.t('imageExtractor.view.selectAll')}</button>
              <button className="action-btn font-medium" onClick={invertSelect}>{i18n.t('imageExtractor.view.invertSelect')}</button>
              <button className="action-btn font-medium" onClick={unselectAll}>{i18n.t('imageExtractor.view.deselectAll')}</button>
            </div>
          </div>
          {/* 下载 & 设置组合按钮 */}
          <div className={cn("flex rounded-lg overflow-hidden", selectedCount===0||isDownloading?"opacity-60 cursor-not-allowed":"")} style={{height:'32px'}}>
            <button
              className="btn-download font-semibold text-[13px] px-3 flex items-center gap-1"
              onClick={async () => {
                if (selectedCount === 0 || isDownloading) return;
                let cfg = useExtractorStore.getState().downloadConfig as DownloadConfig | undefined;
                if(!cfg){
                  cfg = { ...DEFAULT_CONFIG };
                  if(cfg.package.enabled && !cfg.package.filename){
                    cfg.package = { ...cfg.package, filename: generateDefaultZipName() };
                  }
                  setDownloadConfig(cfg);
                  try{ await storage.setItem(STORAGE_KEY,cfg);}catch(e){console.error('save cfg',e);} 
                }
                download(cfg);
              }}
              disabled={selectedCount === 0 || isDownloading}
              style={{minWidth:'80px'}}
            >
              <DownloadIcon className="w-4 h-4" />
              {i18n.t('imageExtractor.view.downloadBtn',[selectedCount])}
            </button>
            <div className="w-px bg-white/40" />
            <button
              className="btn-download flex items-center justify-center px-2"
              onClick={() => setShowDownloadDialog(true)}
              style={{minWidth:'32px'}}
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filter Dialog */}
      <FilterDialog
        open={showFilter}
        onClose={() => setShowFilter(false)}
        filters={filterOptions as any}
        onFiltersChange={updateFilters as any}
        onReset={handleResetFilters}
        availableFormats={formats}
        formatCounts={formatCounts as any}
        sizeCounts={sizeCounts as any}
        fileSizeCounts={fileSizeCounts as any}
      />

      {/* Download Dialog */}
      {showDownloadDialog && (
        <DownloadDialog
          open={showDownloadDialog}
          onClose={() => setShowDownloadDialog(false)}
          selectedCount={selectedCount}
          onConfirm={(config: DownloadConfig) => {
            download(config);
          }}
        />
      )}
    </div>
  );
};

export default GlassImageExtractorView; 