import React, { useState, useEffect } from 'react';
import CrawellLogo from '../../../assets/crawell02.svg';
import { Button } from '@pagehelper/common/src/components/ui/button';
import { Download, Check, Filter, RefreshCcw, ChevronRight, GripVertical, Layers, Sparkles, Settings, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@pagehelper/common/src/hooks/use-toast';
import { cn } from '@pagehelper/common/src/lib/utils';
import { DownloadDialog, DownloadConfig, DEFAULT_CONFIG } from './DownloadDialog';
import { FilterDialog } from './FilterDialog';

import { ChevronDown } from 'lucide-react';
import { useExtractorStore } from '../../store/extractorStore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@pagehelper/common/src/components/ui/tooltip";

import { getImageCategory, calculateDisplaySize, formatFileSize } from '../utils/imageUtils';
import type { UseImageExtractorReturn, FilterOptions } from '../hooks/useImageExtractor';
import type { ImageInfo } from '../utils/imageUtils';
import { i18n } from '../../i18n';

/* global storage */

// 声明 storage 类型（WXT 注入）
declare const storage: {
  getItem<T = any>(key: string): Promise<T | null>;
  setItem(key: string, value: any): Promise<void>;
};

// 依赖 zustand persist + 自定义 wxtStorageAdapter 进行持久化，无需手动调用 storage API，但 downloadConfig 需要兼容异步存储

// ↓ 将刚才剪切的整个 JSX 粘贴到下面，包裹成组件
export default function ImageExtractorView(props: UseImageExtractorReturn) {
  /* 把原来组件体内的变量全部替换为 props.xxx
     例如:
     const { filteredImages, selectAll } = props; */
  // … <JSX HERE> …
  const {
    images,
    filteredImages,
    selected: selectedImages,
    isExtracting,
    isDownloading,
    downloadProgress,
    error,
    extract: handleExtract,
    download: handleDownload,
    toggleSelect: toggleImageSelection,
    selectAll: handleSelectAll,
    unselectAll: handleUnselectAll,
    invertSelect: handleInvertSelection,
    autoExtractImagesEnabled,
    toggleAutoExtractImages,
    filterOptions,
    updateFilters: setFilterOptions,
    formats: availableFormats,
    formatCounts,
    sizeCounts,
    fileSizeCounts,
    accumulateModeEnabled,
    toggleAccumulateMode,
  } = props;

  const [isFilterDialogOpen, setIsFilterDialogOpen] = React.useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = React.useState(false);

  // 默认折叠 Icon / Thumbnail 类别
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({ ICON: true, THUMBNAIL: true });
  const [ascOrder, setAscOrder] = React.useState(true);

  // 分类顺序持久化
  const categoryOrder = useExtractorStore((s:any)=>s.categoryOrder);
  const setCategoryOrder = useExtractorStore((s:any)=>s.setCategoryOrder);

  const [draggingCat,setDraggingCat]=React.useState<string|null>(null);
  const handleDragStartCat=(cat:string)=> setDraggingCat(cat);
  const handleDragOverCat=(cat:string)=>{
    if(!draggingCat||draggingCat===cat) return;
    const cur = [...categoryOrder];
    const from = cur.indexOf(draggingCat);
    const to = cur.indexOf(cat);
    if(from===-1||to===-1) return;
    cur.splice(from,1);
    cur.splice(to,0,draggingCat);
    setCategoryOrder(cur);
  };

  const toggleCategory = (cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  /* -------------------- 本地常量 / 工具函数 -------------------- */
  const IMAGE_CATEGORIES = {
    ICON: {
      description: i18n.t('imageExtractor.categoryDesc.icon'),
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-800',
    },
    THUMBNAIL: {
      description: i18n.t('imageExtractor.categoryDesc.thumbnail'),
      bgColor: 'bg-green-50',
      textColor: 'text-green-800',
    },
    CONTENT: {
      description: i18n.t('imageExtractor.categoryDesc.content'),
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-800',
    },
    LARGE: {
      description: i18n.t('imageExtractor.categoryDesc.large'),
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-800',
    },
  } as const;

  // 计算已选图片大小
  const calculateSelectedSize = (sel: Set<string>, list: ImageInfo[]) => {
    return list.filter((i) => sel.has(imageKey(i))).reduce((s, i) => s + i.size, 0);
  };

  const { toast } = useToast();

  const downloadSingleImage = async (src: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const img = images.find((i) => i.src === src);
    if (!img) return;
    try {
      const blob = await fetch(src).then((r) => r.blob());
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = src.split('/').pop() || 'image';
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: i18n.t('imageExtractor.view.success'), description: i18n.t('imageExtractor.view.toastSuccess') });
    } catch (err) {
      toast({ title: i18n.t('imageExtractor.view.error'), description: i18n.t('imageExtractor.view.toastError'), variant: 'destructive' });
    }
  };

  /* -------------------- 筛选对话框处理 -------------------- */
  const handleFilterDialogClose = () => setIsFilterDialogOpen(false);

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilterOptions(newFilters);
  };

  const handleResetFilters = () => {
    setFilterOptions({ ...filterOptions, selectedSizes: [], selectedFileSizes: [], formats: [] });
  };

  // 下载配置持久化到 store，并从 storage 同步
  const downloadConfig = useExtractorStore((s:any)=>s.downloadConfig);
  const setDownloadConfig = useExtractorStore((s:any)=>s.setDownloadConfig);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const DOWNLOAD_CONFIG_KEY = 'imageExtractor.downloadConfig';

  // helper to add area prefix required by WXT storage API
  const storageKey = `local:${DOWNLOAD_CONFIG_KEY}` as const;

  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.getItem<string>(storageKey);
        if (raw) {
          setDownloadConfig(raw as unknown as DownloadConfig);
        }
      } catch (err) {
        console.error('load download config failed', err);
      }
    })();
  }, []);

  // 与 hook 内保持一致的去重/选中键
  const imageKey = (img: ImageInfo) => {
    const name = img.src.split('/').pop()?.split('?')[0] || img.src;
    return `${name}-${img.size}`;
  };

  const generateDefaultZipName = (): string => {
    const now = new Date();
    return `images-${now.toISOString().replace(/[:.]/g, '-').slice(0,19)}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 text-sm text-slate-800 rounded-lg">
      {/* 工具栏 */}
      <TooltipProvider delayDuration={300}>
      <div className="flex items-center justify-between h-8 px-3 bg-white border-b shadow-sm select-none">
        {/* 主操作区 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="h-7 px-2 flex items-center gap-1.5"
                onClick={handleExtract}
                disabled={isDownloading}
              >
                <RefreshCcw className={cn("h-3 w-3", isExtracting && "animate-spin")}/>
                <span className="text-xs">{images.length>0? i18n.t('imageExtractor.view.reExtract'): i18n.t('imageExtractor.view.extract')}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">{isExtracting ? i18n.t('imageExtractor.view.extracting') : i18n.t('imageExtractor.view.extractTooltip')}</TooltipContent>
          </Tooltip>
        </div>

        {/* 功能开关组 */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* 自动开关 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  'h-7 w-7 rounded-md flex items-center justify-center transition-colors',
                  autoExtractImagesEnabled ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                )}
                onClick={toggleAutoExtractImages}
              >
                <Sparkles className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">{i18n.t('imageExtractor.view.autoTooltip')}</TooltipContent>
          </Tooltip>

          {/* 堆积开关 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  'h-7 w-7 rounded-md flex items-center justify-center transition-colors',
                  accumulateModeEnabled ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                )}
                onClick={toggleAccumulateMode}
              >
                <Layers className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">{i18n.t('imageExtractor.view.accumulateTooltip')}</TooltipContent>
          </Tooltip>
        </div>

        {/* 次要操作区 */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsFilterDialogOpen(true)}
                disabled={images.length === 0}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">{i18n.t('imageExtractor.view.filterTooltip')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAscOrder(!ascOrder)}
                className="h-7 w-7"
              >
                <ArrowUpDown className="h-4 w-4" style={{ transform: ascOrder ? 'rotate(0deg)' : 'rotate(180deg)' }} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">{i18n.t('imageExtractor.view.sortTooltip')}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      </TooltipProvider>

      {/* 下载进度条 */}
      {isDownloading && downloadProgress.total > 0 && (
        <div className="mx-2 mb-2">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-600">
                {`Processing images...`}
              </span>
              <span className="text-xs text-slate-500">
                {downloadProgress.current} / {downloadProgress.total}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ 
                  width: `${downloadProgress.total > 0 ? (downloadProgress.current / downloadProgress.total) * 100 : 0}%` 
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-2 mb-2"
          >
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {filteredImages.length > 0 ? (
          <div ref={containerRef} className="flex-1 overflow-y-auto p-2">
            {/* 分类显示图片 */}
            {(ascOrder ? categoryOrder : [...categoryOrder].reverse()).map((category:string) => {
              const categoryImages = filteredImages.filter((img: ImageInfo) => 
                getImageCategory(img.naturalWidth, img.naturalHeight) === category
              );
              
              if (categoryImages.length === 0) return null;
              
              const { description, bgColor, textColor } = IMAGE_CATEGORIES[category as keyof typeof IMAGE_CATEGORIES];
              
              return (
                <div key={category} className="mb-6" onDragOver={(e)=>{e.preventDefault();handleDragOverCat(category);}}>
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <button onClick={() => toggleCategory(category)} className="focus:outline-none flex items-center gap-1">
                        <span draggable onDragStart={()=>handleDragStartCat(category)} className="cursor-grab">
                          <GripVertical className="h-3 w-3 text-slate-400" />
                        </span>
                        {collapsed[category] ? <ChevronRight className="h-3 w-3 text-slate-500" /> : <ChevronDown className="h-3 w-3 text-slate-500" />}
                        <span className={cn("text-sm font-medium", textColor)}>{i18n.t(`imageExtractor.category.${category.toLowerCase()}`)} ({categoryImages.length})</span>
                      </button>

                      {/* 分类全选复选框 */}
                      <label className="flex items-center gap-1 text-[10px] select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={categoryImages.every((img) => selectedImages.has(imageKey(img))) && categoryImages.length > 0}
                          onChange={(e) => {
                            const checked = e.currentTarget.checked;
                            categoryImages.forEach((img) => {
                              const key=imageKey(img);
                              const isSel = selectedImages.has(key);
                              if (checked && !isSel) toggleImageSelection(key);
                              if (!checked && isSel) toggleImageSelection(key);
                            });
                          }}
                          className="h-3 w-3 border-gray-300 rounded focus:ring-blue-500"
                        />
                        {/* hide select all text */}
                      </label>
                      <div className="h-[1px] flex-1 bg-slate-100" />
                      <div className="text-[10px] text-slate-500 whitespace-nowrap">
                        {formatFileSize(calculateSelectedSize(selectedImages, categoryImages))}
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 px-1">
                      {description}
                    </div>
                  </div>

                  {!collapsed[category] && (
                  <div className={cn(
                    "grid gap-2",
                    category === 'ICON' && "grid-cols-[repeat(auto-fill,28px)]",
                    category === 'THUMBNAIL' && "grid-cols-[repeat(auto-fill,88px)]",
                    (category === 'CONTENT' || category === 'LARGE') && [
                      "columns-[repeat(auto-fill,minmax(180px,1fr))]",
                      "gap-y-3"
                    ]
                  )}>
                    {categoryImages.map((image: ImageInfo, index: number) => {
                      // 计算在所有图片中的序号
                      const globalIndex = filteredImages.findIndex((img: ImageInfo) => img.src === image.src) + 1;
                      
                      return (
                        <div
                          key={image.src}
                          className={cn(
                            "relative group cursor-pointer rounded overflow-hidden",
                            "hover:z-10",
                            "transition-transform duration-200 ease-out hover:scale-105",
                            selectedImages.has(imageKey(image)) && "ring-2 ring-blue-500/70"
                          )}
                          onClick={() => toggleImageSelection(imageKey(image))}
                          style={{
                            height: calculateDisplaySize(image.naturalWidth, image.naturalHeight).height,
                          }}
                        >
                          <img
                            src={image.src}
                            alt={image.alt}
                            className={cn(
                              "w-full h-full",
                              category === 'ICON' ? "object-contain" : "object-cover"
                            )}
                          />

                          {/* 选中状态指示器 */}
                          {selectedImages.has(imageKey(image)) && (
                            <div className="absolute top-1.5 right-1.5">
                              <Check className="h-3 w-3 text-blue-600" />
                            </div>
                          )}

                          {/* 下载按钮 */}
                          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <button
                              onClick={(e) => downloadSingleImage(image.src, e)}
                              className="bg-black/50 text-white p-1.5 rounded-full"
                              title={i18n.t('imageExtractor.view.downloadImageTitle')}
                            >
                              <Download className="h-3 w-3" />
                            </button>
                          </div>

                          {/* 简化的图片信息 */}
                          <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="bg-black/40 px-2 py-1 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out">
                              <div className="flex justify-between text-[10px] text-white">
                                <span>#{globalIndex} {image.naturalWidth}x{image.naturalHeight}</span>
                                <span>{formatFileSize(image.size).replace(' ', '').toLowerCase()} {image.format.toLowerCase()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm mb-2">
            {isExtracting ? (
              <div className="text-slate-500">{i18n.t('imageExtractor.view.extractingImages')}</div>
            ) : (
              <div className="flex flex-col items-center text-center text-slate-400 gap-6 py-8 w-full">
                <img src={CrawellLogo} className="h-24 w-24" />
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">{i18n.t('imageExtractor.view.emptyTitle')}</h3>
                  <p className="text-sm max-w-xs mx-auto text-slate-400">{i18n.t('imageExtractor.view.emptySubtitle')}</p>
                </div>
                <Button
                  className="mt-2 px-8 py-3 text-base font-medium rounded-md"
                  onClick={handleExtract}
                >
                  {i18n.t('imageExtractor.view.startExtract')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      {filteredImages.length > 0 && (
        <div className="p-2 border-t border-gray-100 space-y-2">
          {/* 第一行：选择信息和文件大小统计 */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">{i18n.t('imageExtractor.view.selectedPrefix')}</span>
                <span className="font-medium">
                  {selectedImages.size} / {filteredImages.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">{i18n.t('imageExtractor.view.totalSizePrefix')}</span>
                <span className="font-medium">
                  {formatFileSize(calculateSelectedSize(selectedImages, images))}
                </span>
                <span className="text-slate-300 mx-1">/</span>
                <span className="text-slate-400">
                  {formatFileSize(images.reduce((sum: number, img: ImageInfo) => sum + img.size, 0))}
                </span>
              </div>
            </div>
          </div>

          {/* 第二行：操作按钮 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={filteredImages.length === 0}
                className="h-6 px-2 text-xs hover:bg-slate-200 rounded-md"
              >
                {i18n.t('imageExtractor.view.selectAll')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUnselectAll}
                disabled={selectedImages.size === 0}
                className="h-6  px-2 text-xs hover:bg-slate-200 rounded-md"
              >
                {i18n.t('imageExtractor.view.deselectAll')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleInvertSelection}
                disabled={filteredImages.length === 0}
                className="h-6 px-2 text-xs hover:bg-slate-200 rounded-md"
              >
                {i18n.t('imageExtractor.view.invertSelect')}
              </Button>
            </div>

            {/* 下载 | 设置 组合按钮 */}
            <div className={cn(
              "flex h-7 rounded-md overflow-hidden border",
              selectedImages.size===0||isDownloading?"opacity-60 cursor-not-allowed":"bg-blue-600 text-white"
            )}>
              {/* 下载区域 */}
              <button
                title={i18n.t('imageExtractor.view.downloadTooltip')}
                className="flex items-center gap-1 px-3 text-xs"
                onClick={async ()=>{
                  if (selectedImages.size===0||isDownloading) return;
                  let cfg = downloadConfig;
                  if(!cfg){
                    cfg = {...DEFAULT_CONFIG};
                    if (cfg.package.enabled && !cfg.package.filename) {
                      cfg.package = {...cfg.package, filename: generateDefaultZipName()};
                    }
                    setDownloadConfig(cfg);
                    try {
                      await storage.setItem(storageKey, cfg);
                    } catch(e){console.error('save default cfg',e);}
                  }
                  handleDownload(cfg);
                }}
                disabled={selectedImages.size === 0 || isDownloading}
              >
                <Download className="h-3 w-3"/>
                <span>{i18n.t('imageExtractor.view.downloadBtn',[selectedImages.size])}</span>
              </button>
              {/* 分隔符 */}
              <div className="w-px bg-white/40 pointer-events-none" />
              {/* 设置区域 */}
              <button
                title={i18n.t('imageExtractor.view.settings')}
                className="flex items-center px-2"
                onClick={()=>setShowDownloadDialog(true)}
              >
                <Settings className="h-3 w-3"/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 筛选对话框 */}
      {isFilterDialogOpen && (
        <FilterDialog
          open={isFilterDialogOpen}
          onClose={handleFilterDialogClose}
          filters={filterOptions}
          onFiltersChange={handleFilterChange}
          onReset={handleResetFilters}
          availableFormats={availableFormats}
          formatCounts={formatCounts}
          sizeCounts={sizeCounts}
          fileSizeCounts={fileSizeCounts}
        />
      )}

      {/* 下载配置弹窗 */}
      <DownloadDialog
        open={showDownloadDialog}
        onClose={() => setShowDownloadDialog(false)}
        onConfirm={async (cfg) => {
          try {
            await storage.setItem(storageKey, cfg);
          } catch (err) {
            console.error('save download config failed', err);
          }
          setDownloadConfig(cfg);
          handleDownload(cfg);
        }}
        selectedCount={selectedImages.size}
      />
    </div>
  );
}