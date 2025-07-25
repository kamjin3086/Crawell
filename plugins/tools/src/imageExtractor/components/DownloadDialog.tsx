import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@pagehelper/common/src/components/ui/dialog';
import { Button } from '@pagehelper/common/src/components/ui/button';
import { Input } from '@pagehelper/common/src/components/ui/input';
import { Label } from '@pagehelper/common/src/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pagehelper/common/src/components/ui/select';
import { Slider } from '@pagehelper/common/src/components/ui/slider';
import { Switch } from '@pagehelper/common/src/components/ui/switch';

import { HelpCircle, X } from 'lucide-react';
import { cn } from '@pagehelper/common/src/lib/utils';
import { i18n } from '../../i18n';

interface DownloadDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (config: DownloadConfig) => void;
  selectedCount: number;
}

export interface DownloadConfig {
  downloadType: 'zip' | 'individual';
  resize: {
    enabled: boolean;
    width: number;
    height: number;
    keepRatio: boolean;
  };
  rename: {
    enabled: boolean;
    pattern: string; // {index}, {date}, {original}
    startIndex: number;
  };
  compress: {
    enabled: boolean;
    quality: number;
  };
  format: {
    enabled: boolean;
    type: string;
  };
  package: {
    enabled: boolean;
    filename: string;
  };
  filenamePattern: string;
}

export const DEFAULT_CONFIG: DownloadConfig = {
  downloadType: 'zip',
  resize: {
    enabled: false,
    width: 1920,
    height: 1080,
    keepRatio: true,
  },
  rename: {
    enabled: false,
    pattern: 'image-{index}',
    startIndex: 1,
  },
  compress: {
    enabled: false,
    quality: 80,
  },
  format: {
    enabled: false,
    type: 'jpeg',
  },
  package: {
    enabled: true,
    filename: '',
  },
  filenamePattern: 'image-{index}',
};

// 帮助提示组件 - 使用简单的悬浮实现避免溢出问题
const HelpTooltip: React.FC<{ content: string }> = ({ content }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative inline-block">
      <HelpCircle 
        className="h-3 w-3 text-slate-400 hover:text-slate-600 cursor-help" 
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      />
      {isVisible && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-slate-900 text-white text-xs p-2 rounded shadow-lg z-50 border border-gray-700">
          <div className="whitespace-pre-line leading-relaxed">
            {content}
          </div>
          {/* 小箭头 */}
          <div className="absolute bottom-full right-2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900"></div>
        </div>
      )}
    </div>
  );
};

export const DownloadDialog: React.FC<DownloadDialogProps> = ({
  open,
  onClose,
  onConfirm,
  selectedCount,
}) => {
  const [config, setConfig] = useState<DownloadConfig>(DEFAULT_CONFIG);

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const themeCls = isDark ? 'theme-glassmorphism-dark' : 'theme-glassmorphism-light';

  // 生成默认的压缩包文件名
  React.useEffect(() => {
    if (config.package.enabled && !config.package.filename) {
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      setConfig(prev => ({
        ...prev,
        package: {
          ...prev.package,
          filename: `images-${timestamp}`
        }
      }));
    }
  }, [config.package.enabled]);

  const handleConfirm = () => {
    onConfirm(config);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`glass-dialog ${themeCls} max-w-[90vw] w-[calc(100%-16px)] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 sm:max-w-[425px] max-h-[85vh] flex flex-col p-0`}>
        <DialogHeader className="px-4 pt-3 pb-2 border-b sticky top-0 z-10 flex flex-row items-center justify-between space-y-0 text-left" style={{background:'transparent', borderColor:'var(--border-glass)'}}>
          <DialogTitle className="text-xs font-medium">
            {i18n.t('imageExtractor.downloadDialog.title', [selectedCount])}
          </DialogTitle>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-6 w-6 p-0">
            <X className="h-3 w-3" />
          </Button>
        </DialogHeader>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* 下载方式 */}
          <div className="space-y-2">
            <Label className="font-medium">{i18n.t('imageExtractor.downloadDialog.methodLabel')}</Label>
            <div className="flex gap-2 flex-wrap">
              <button
                className={cn(
                  "chip", 
                  config.downloadType === 'zip' && 'chip-active'
                )}
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    downloadType: 'zip',
                    package: { ...prev.package, enabled: true }
                  }))
                }
              >
                {i18n.t('imageExtractor.downloadDialog.zipOption')}
              </button>
              <button
                className={cn(
                  "chip", 
                  config.downloadType === 'individual' && 'chip-active'
                )}
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    downloadType: 'individual',
                    package: { ...prev.package, enabled: false }
                  }))
                }
              >
                {i18n.t('imageExtractor.downloadDialog.singleOption')}
              </button>
            </div>
          </div>

          {/* 打包下载 */}
          {config.downloadType === 'zip' && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-slate-500">{i18n.t('imageExtractor.downloadDialog.packageNameLabel')}</Label>
                <Input
                  value={config.package.filename}
                  className="h-8"
                  placeholder={i18n.t('imageExtractor.downloadDialog.packageNameLabel')}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      package: { ...prev.package, filename: e.target.value },
                    }))
                  }
                />
                <div className="mt-1 text-xs text-slate-500">
                  {i18n.t('imageExtractor.downloadDialog.packageHint')}
                </div>
              </div>
            </div>
          )}

          {/* 设置组 */}
          <div className="setting-group space-y-4">
          {/* 格式转换 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="font-medium">{i18n.t('imageExtractor.downloadDialog.formatLabel')}</Label>
                <HelpTooltip content={i18n.t('imageExtractor.downloadDialog.formatHelp')} />
              </div>
              <Switch
                variant="sm"
                className="bg-white/40 peer-checked:bg-blue-500/90"
                checked={config.format.enabled}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    format: { ...prev.format, enabled: e.target.checked },
                  }))
                }
              />
            </div>
            {config.format.enabled && (
              <div className="flex gap-2 flex-wrap">
                {['jpeg', 'png', 'webp'].map((format) => (
                  <button
                    key={format}
                    className={cn(
                      "chip", 
                      config.format.type === format && 'chip-active'
                    )}
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        format: { ...prev.format, type: format },
                      }))
                    }
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 压缩质量 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="font-medium">{i18n.t('imageExtractor.downloadDialog.compressLabel')}</Label>
                <HelpTooltip content={i18n.t('imageExtractor.downloadDialog.compressHelp')} />
              </div>
              <Switch
                variant="sm"
                className="bg-white/40 peer-checked:bg-blue-500/90"
                checked={config.compress.enabled}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    compress: { ...prev.compress, enabled: e.target.checked },
                  }))
                }
              />
            </div>
            {config.compress.enabled && (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={config.compress.quality}
                  className="flex-1"
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      compress: {
                        ...prev.compress,
                        quality: parseInt(e.target.value),
                      },
                    }))
                  }
                />
                <span className="text-sm text-slate-500 w-12">
                  {config.compress.quality}%
                </span>
              </div>
            )}
          </div>

          {/* 调整尺寸 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="font-medium">{i18n.t('imageExtractor.downloadDialog.resizeLabel')}</Label>
                <HelpTooltip content={i18n.t('imageExtractor.downloadDialog.resizeHelp')} />
              </div>
              <Switch
                variant="sm"
                className="bg-white/40 peer-checked:bg-blue-500/90"
                checked={config.resize.enabled}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    resize: { ...prev.resize, enabled: e.target.checked },
                  }))
                }
              />
            </div>
            {config.resize.enabled && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-slate-500">{i18n.t('imageExtractor.downloadDialog.widthLabel')}</Label>
                    <Input
                      type="number"
                      value={config.resize.width}
                      className="h-8"
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          resize: {
                            ...prev.resize,
                            width: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-slate-500">{i18n.t('imageExtractor.downloadDialog.heightLabel')}</Label>
                    <Input
                      type="number"
                      value={config.resize.height}
                      className="h-8"
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          resize: {
                            ...prev.resize,
                            height: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    variant="sm"
                    className="bg-white/40 peer-checked:bg-blue-500/90"
                    checked={config.resize.keepRatio}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        resize: { ...prev.resize, keepRatio: e.target.checked },
                      }))
                    }
                  />
                  <Label className="text-sm">{i18n.t('imageExtractor.downloadDialog.keepRatioLabel')}</Label>
                </div>
              </div>
            )}
          </div>

          {/* 重命名 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium">{i18n.t('imageExtractor.downloadDialog.renameLabel')}</Label>
              <Switch
                variant="sm"
                className="bg-white/40 peer-checked:bg-blue-500/90"
                checked={config.rename.enabled}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    rename: { ...prev.rename, enabled: e.target.checked },
                  }))
                }
              />
            </div>
            {config.rename.enabled && (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-slate-500">{i18n.t('imageExtractor.downloadDialog.patternLabel')}</Label>
                  <Input
                    value={config.rename.pattern}
                    className="h-8"
                    placeholder={i18n.t('imageExtractor.downloadDialog.patternPlaceholder')}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        rename: { ...prev.rename, pattern: e.target.value },
                      }))
                    }
                  />
                  <div className="mt-1 text-xs text-slate-500">
                    {i18n.t('imageExtractor.downloadDialog.patternHint')}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">{i18n.t('imageExtractor.downloadDialog.startNumberLabel')}</Label>
                  <Input
                    type="number"
                    value={config.rename.startIndex}
                    className="h-8"
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        rename: {
                          ...prev.rename,
                          startIndex: parseInt(e.target.value) || 1,
                        },
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </div>
          </div> {/* end setting-group */}
        </div>

        <DialogFooter className="px-4 pt-2 pb-3 border-t sticky bottom-0 z-10 flex justify-end gap-2" style={{background:'transparent', borderColor:'var(--border-glass)'}}>
          <Button variant="outline" size="sm" className="h-8 text-sm px-4" onClick={onClose}>
            {i18n.t('imageExtractor.downloadDialog.cancelButton')}
          </Button>
          <Button size="sm" className="h-8 text-sm px-6 btn-primary" onClick={handleConfirm}>
            {i18n.t('imageExtractor.downloadDialog.confirmButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 