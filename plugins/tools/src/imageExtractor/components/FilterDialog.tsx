import React from 'react';
import { Button } from '@pagehelper/common/src/components/ui/button';
import { Input } from '@pagehelper/common/src/components/ui/input';
import { Label } from '@pagehelper/common/src/components/ui/label';
import { Switch } from '@pagehelper/common/src/components/ui/switch';
import { X } from 'lucide-react';
import { cn } from '@pagehelper/common/src/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@pagehelper/common/src/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@pagehelper/common/src/components/ui/select";
import { i18n } from '../../i18n';

interface FilterOptions {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  minSize: number;
  maxSize: number;
  formats: string[];
  selectedSizes: string[];
  selectedFileSizes: string[];
}

interface FilterDialogProps {
  open: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onReset: () => void;
  availableFormats: string[];
  formatCounts: Record<string, number>;
  sizeCounts: { size: string; count: number }[];
  fileSizeCounts: { range: string; count: number }[];
}

// 预设尺寸选项
const SIZE_CATEGORIES = [
  { 
    label: '图标',
    sizes: [
      { label: '16x16', width: 16, height: 16 },
      { label: '32x32', width: 32, height: 32 },
      { label: '64x64', width: 64, height: 64 },
    ]
  },
  {
    label: '缩略图',
    sizes: [
      { label: '150x150', width: 150, height: 150 },
      { label: '300x300', width: 300, height: 300 },
      { label: '500x500', width: 500, height: 500 },
    ]
  },
  {
    label: '分辨率',
    sizes: [
      { label: '720p', width: 1280, height: 720, description: '720p' },
      { label: '1080p', width: 1920, height: 1080, description: '1K' },
      { label: '4K', width: 3840, height: 2160, description: '4K' },
    ]
  },
];

// 预设文件大小选项
const PRESET_FILE_SIZES = [
  { label: '小于 100KB', size: { min: 0, max: 100 * 1024 } },
  { label: '100KB - 500KB', size: { min: 100 * 1024, max: 500 * 1024 } },
  { label: '500KB - 1MB', size: { min: 500 * 1024, max: 1024 * 1024 } },
  { label: '大于 1MB', size: { min: 1024 * 1024, max: Infinity } },
];

export const FilterDialog: React.FC<FilterDialogProps> = ({
  open,
  onClose,
  filters,
  onFiltersChange,
  onReset,
  availableFormats,
  formatCounts,
  sizeCounts,
  fileSizeCounts,
}) => {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const themeCls = isDark ? 'theme-glassmorphism-dark' : 'theme-glassmorphism-light';

  // 从已有的筛选条件中解析出自定义值
  const parseExistingCustomValues = () => {
    // 解析尺寸区间
    const sizeInterval = filters.selectedSizes.find(size => 
      size.match(/^(\d+|\*)x(\d+|\*)-(\d+|\*)x(\d+|\*)$/i)
    );
    
    if (sizeInterval) {
      const [_, minW, maxW, minH, maxH] = sizeInterval.match(/^(\d+|\*)x(\d+|\*)-(\d+|\*)x(\d+|\*)$/i) || [];
      return {
        minWidth: minW === '*' ? '' : minW,
        maxWidth: maxW === '*' ? '' : maxW,
        minHeight: minH === '*' ? '' : minH,
        maxHeight: maxH === '*' ? '' : maxH,
      };
    }
    
    return {
      minWidth: '',
      maxWidth: '',
      minHeight: '',
      maxHeight: '',
    };
  };
  
  // 解析文件大小区间
  const parseExistingFileSizeValues = () => {
    const sizeInterval = filters.selectedFileSizes.find(size => 
      size.match(/^(≤|≥)?\d+(\.\d+)?(KB|MB)(-\d+(\.\d+)?(KB|MB))?$/)
    );
    
    if (sizeInterval) {
      if (sizeInterval.startsWith('≤')) {
        return {
          min: '',
          max: sizeInterval.slice(1).match(/(\d+(\.\d+)?)/)?.[1] || '',
          unit: sizeInterval.includes('MB') ? 'MB' : 'KB'
        };
      } else if (sizeInterval.startsWith('≥')) {
        return {
          min: sizeInterval.slice(1).match(/(\d+(\.\d+)?)/)?.[1] || '',
          max: '',
          unit: sizeInterval.includes('MB') ? 'MB' : 'KB'
        };
      } else {
        const [min, max] = sizeInterval.split('-');
        return {
          min: min.match(/(\d+(\.\d+)?)/)?.[1] || '',
          max: max?.match(/(\d+(\.\d+)?)/)?.[1] || '',
          unit: sizeInterval.includes('MB') ? 'MB' : 'KB'
        };
      }
    }
    
    return {
      min: '',
      max: '',
      unit: 'KB'
    };
  };

  const [showCustomSize, setShowCustomSize] = React.useState(false);
  const [showCustomFileSize, setShowCustomFileSize] = React.useState(false);
  
  // 初始化自定义值
  const existingCustomValues = parseExistingCustomValues();
  const existingFileSizeValues = parseExistingFileSizeValues();
  
  const [minWidth, setMinWidth] = React.useState(existingCustomValues.minWidth);
  const [maxWidth, setMaxWidth] = React.useState(existingCustomValues.maxWidth);
  const [minHeight, setMinHeight] = React.useState(existingCustomValues.minHeight);
  const [maxHeight, setMaxHeight] = React.useState(existingCustomValues.maxHeight);
  
  const [customMin, setCustomMin] = React.useState(existingFileSizeValues.min);
  const [customMax, setCustomMax] = React.useState(existingFileSizeValues.max);
  const [customUnit, setCustomUnit] = React.useState<'KB' | 'MB'>(existingFileSizeValues.unit as 'KB' | 'MB');

  // 如果有自定义值，自动展开相应的输入区域
  React.useEffect(() => {
    if (existingCustomValues.minWidth || existingCustomValues.maxWidth || 
        existingCustomValues.minHeight || existingCustomValues.maxHeight) {
      setShowCustomSize(true);
    }
    
    if (existingFileSizeValues.min || existingFileSizeValues.max) {
      setShowCustomFileSize(true);
    }
  }, []);

  // 处理自定义尺寸提交
  const handleCustomSizeSubmit = () => {
    if (!minWidth && !maxWidth && !minHeight && !maxHeight) return;
    
    // 移除之前的自定义区间（如果存在）
    const filteredSizes = filters.selectedSizes.filter(size => 
      !size.match(/^(\d+|\*)x(\d+|\*)-(\d+|\*)x(\d+|\*)$/i)
    );
    
    // 构建新的区间表达式
    const sizeKey = `${minWidth || '*'}x${maxWidth || '*'}-${minHeight || '*'}x${maxHeight || '*'}`;
    
    onFiltersChange({
      ...filters,
      selectedSizes: [...filteredSizes, sizeKey]
    });
  };

  // 处理自定义文件大小区间提交
  const handleCustomRangeSubmit = () => {
    if (!customMin && !customMax) return;
    
    // 移除之前的自定义区间（如果存在）
    const filteredSizes = filters.selectedFileSizes.filter(size => 
      !size.match(/^(≤|≥)?\d+(\.\d+)?(KB|MB)(-\d+(\.\d+)?(KB|MB))?$/)
    );
    
    // 构建新的区间表达式
    let label = '';
    if (customMin && !customMax) {
      label = `≥${customMin}${customUnit}`;
    } else if (!customMin && customMax) {
      label = `≤${customMax}${customUnit}`;
    } else {
      label = `${customMin}-${customMax}${customUnit}`;
    }
    
    onFiltersChange({
      ...filters,
      selectedFileSizes: [...filteredSizes, label]
    });
  };

  /* ------------------------------------------------------------------ */
  // 将选中的自定义尺寸 / 文件大小区间追加到显示列表，方便再次打开时可见
  const mergedSizeCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    sizeCounts.forEach(({ size, count }) => map.set(size, count));
    filters.selectedSizes.forEach((s) => {
      if (!map.has(s)) map.set(s, 0);
    });
    return Array.from(map.entries()).map(([size, count]) => ({ size, count }));
  }, [sizeCounts, filters.selectedSizes]);

  const mergedFileSizeCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    fileSizeCounts.forEach(({ range, count }) => map.set(range, count));
    filters.selectedFileSizes.forEach((r) => {
      if (!map.has(r)) map.set(r, 0);
    });
    return Array.from(map.entries()).map(([range, count]) => ({ range, count }));
  }, [fileSizeCounts, filters.selectedFileSizes]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`glass-dialog ${themeCls} max-w-[90vw] w-[calc(100%-16px)] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 sm:max-w-[425px] max-h-[85vh] flex flex-col p-0`}>
        <DialogHeader className="px-4 pt-4 pb-3 border-b sticky top-0 z-10 flex flex-row items-center justify-between text-left" style={{background:'transparent'}}>
          <DialogTitle className="text-sm font-semibold">{i18n.t('imageExtractor.filterDialog.title')}</DialogTitle>
          <div className="flex gap-1.5 items-center">
            <Button variant="ghost" size="sm" onClick={onReset} className="h-6 px-2 text-[11px] opacity-70 hover:opacity-100">
              {i18n.t('imageExtractor.filterDialog.reset')}
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="h-6 w-6 p-0">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="space-y-4">
            {/* 格式筛选 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium sticky top-0">{i18n.t('imageExtractor.filterDialog.formatLabel')}</Label>
              <div className="flex flex-wrap gap-1">
                {availableFormats.map((format) => (
                  <button
                    key={format}
                    onClick={() => {
                      const newFormats = filters.formats.includes(format)
                        ? filters.formats.filter(f => f !== format)
                        : [...filters.formats, format];
                      onFiltersChange({ ...filters, formats: newFormats });
                    }}
                    className={cn(
                      "chip",
                      filters.formats.includes(format) && "chip-active"
                    )}
                  >
                    {format.toUpperCase()}
                    <span className="ml-1 opacity-60">({formatCounts[format] || 0})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 尺寸筛选 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium sticky top-0">{i18n.t('imageExtractor.filterDialog.sizeLabel')}</Label>
              <div className="flex flex-wrap gap-1">
                {mergedSizeCounts.map(({ size, count }) => (
                  <button
                    key={size}
                    onClick={() => {
                      const newSizes = filters.selectedSizes.includes(size)
                        ? filters.selectedSizes.filter(s => s !== size)
                        : [...filters.selectedSizes, size];
                      onFiltersChange({ ...filters, selectedSizes: newSizes });
                    }}
                    className={cn("chip", filters.selectedSizes.includes(size) && "chip-active")}
                  >
                    {size}
                    <span className="ml-1 opacity-60">({count})</span>
                  </button>
                ))}
              </div>
              
              {/* 自定义尺寸输入 */}
              <button
                className={cn("chip w-full text-left", showCustomSize && "chip-active")}
                onClick={() => setShowCustomSize(!showCustomSize)}
              >
                {i18n.t('imageExtractor.filterDialog.addCustomSize')}
              </button>
              
              {showCustomSize && (
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <div className="space-y-1">
                    <Label className="text-[10px]">{i18n.t('imageExtractor.filterDialog.widthRangeLabel')}</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={minWidth}
                        onChange={(e) => setMinWidth(e.target.value)}
                        placeholder={i18n.t('imageExtractor.filterDialog.minPlaceholder')}
                        className="h-6 text-xs"
                      />
                      <span className="text-xs">~</span>
                      <Input
                        type="number"
                        value={maxWidth}
                        onChange={(e) => setMaxWidth(e.target.value)}
                        placeholder={i18n.t('imageExtractor.filterDialog.maxPlaceholder')}
                        className="h-6 text-xs"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-[10px]">{i18n.t('imageExtractor.filterDialog.heightRangeLabel')}</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={minHeight}
                        onChange={(e) => setMinHeight(e.target.value)}
                        placeholder={i18n.t('imageExtractor.filterDialog.minPlaceholder')}
                        className="h-6 text-xs"
                      />
                      <span className="text-xs">~</span>
                      <Input
                        type="number"
                        value={maxHeight}
                        onChange={(e) => setMaxHeight(e.target.value)}
                        placeholder={i18n.t('imageExtractor.filterDialog.maxPlaceholder')}
                        className="h-6 text-xs"
                      />
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs col-span-2"
                    onClick={() => {
                      handleCustomSizeSubmit();
                    }}
                  >
                    {i18n.t('imageExtractor.filterDialog.applyRange')}
                  </Button>
                </div>
              )}
            </div>

            {/* 文件大小筛选 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium sticky top-0">{i18n.t('imageExtractor.filterDialog.fileSizeLabel')}</Label>
              <div className="flex flex-wrap gap-1">
                {mergedFileSizeCounts.map(({ range, count }) => (
                  <button
                    key={range}
                    onClick={() => {
                      const newSizes = filters.selectedFileSizes.includes(range)
                        ? filters.selectedFileSizes.filter(s => s !== range)
                        : [...filters.selectedFileSizes, range];
                      onFiltersChange({ ...filters, selectedFileSizes: newSizes });
                    }}
                    className={cn("chip", filters.selectedFileSizes.includes(range) && "chip-active")}
                  >
                    {range}
                    <span className="ml-1 opacity-60">({count})</span>
                  </button>
                ))}
              </div>

              {/* 自定义文件大小区间 */}
              <button
                className={cn("chip w-full text-left", showCustomFileSize && "chip-active")}
                onClick={() => setShowCustomFileSize(!showCustomFileSize)}
              >
                {i18n.t('imageExtractor.filterDialog.addCustomFileSize')}
              </button>
              
              {showCustomFileSize && (
                <div className="space-y-2 mt-1.5">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={customMin}
                      onChange={(e) => setCustomMin(e.target.value)}
                      placeholder={i18n.t('imageExtractor.filterDialog.minPlaceholder')}
                      className="h-6 text-xs"
                    />
                    <span className="text-xs">~</span>
                    <Input
                      type="number"
                      value={customMax}
                      onChange={(e) => setCustomMax(e.target.value)}
                      placeholder={i18n.t('imageExtractor.filterDialog.maxPlaceholder')}
                      className="h-6 text-xs"
                    />
                    <Select
                      value={customUnit}
                      onValueChange={(value: 'KB' | 'MB') => setCustomUnit(value)}
                    >
                      <SelectTrigger className="h-6 w-[60px] text-xs">
                        <SelectValue placeholder="单位" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KB" className="text-xs">KB</SelectItem>
                        <SelectItem value="MB" className="text-xs">MB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs w-full"
                    onClick={() => {
                      handleCustomRangeSubmit();
                    }}
                  >
                    {i18n.t('imageExtractor.filterDialog.applyRange')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 