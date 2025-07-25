export interface DownloadConfig {
  package: {
    enabled: boolean;
    filename: string;
  };
  filenamePattern: string;
  rename: {
    enabled: boolean;
    pattern: string;
    startIndex: number;
  };
  format: {
    enabled: boolean;
    type: string;
  };
  compress: {
    enabled: boolean;
    quality: number;
  };
  resize: {
    enabled: boolean;
    width: number;
    height: number;
    keepRatio: boolean;
  };
} 