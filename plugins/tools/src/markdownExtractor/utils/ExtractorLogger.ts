export class ExtractorLogger {
  private static enabled = true;
  private static debugMode = false;

  static enable() {
    this.enabled = true;
  }

  static disable() {
    this.enabled = false;
  }

  static enableDebug() {
    this.debugMode = true;
  }

  static info(extractor: string, message: string, data?: any) {
    if (!this.enabled) return;
    console.log(
      `%c[${extractor}] %c${message}`,
      'color: #4CAF50; font-weight: bold',
      'color: #333',
      data || ''
    );
  }

  static debug(extractor: string, message: string, data?: any) {
    if (!this.enabled || !this.debugMode) return;
    console.log(
      `%c[${extractor}] %c${message}`,
      'color: #2196F3; font-weight: bold',
      'color: #666',
      data || ''
    );
  }

  static error(extractor: string, message: string, error?: any) {
    if (!this.enabled) return;
    console.error(
      `%c[${extractor}] %c${message}`,
      'color: #f44336; font-weight: bold',
      'color: #333',
      error || ''
    );
  }

  static warn(extractor: string, message: string, data?: any) {
    if (!this.enabled) return;
    console.warn(
      `%c[${extractor}] %c${message}`,
      'color: #FFC107; font-weight: bold',
      'color: #333',
      data || ''
    );
  }
} 