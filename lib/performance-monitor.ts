'use client';

/**
 * Performance Monitor - Untuk tracking menu dan component performance
 * Gunakan untuk debug dan measure waktu opening menu
 */

interface PerformanceMark {
  name: string;
  timestamp: number;
}

class PerformanceMonitor {
  private marks: Map<string, PerformanceMark> = new Map();

  /**
   * Catat starting point
   * Contoh: performanceMonitor.mark('menu-open-start');
   */
  mark(name: string): void {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return;
    }

    const timestamp = performance.now();
    this.marks.set(name, { name, timestamp });

    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ Mark: ${name} @ ${timestamp.toFixed(2)}ms`);
    }
  }

  /**
   * Hitung waktu antara 2 mark
   * Contoh: performanceMonitor.measure('menu-open', 'menu-open-start', 'menu-open-end');
   */
  measure(
    measureName: string,
    startMarkName: string,
    endMarkName: string
  ): number | null {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return null;
    }

    const startMark = this.marks.get(startMarkName);
    const endMark = this.marks.get(endMarkName);

    if (!startMark || !endMark) {
      console.warn(
        `⚠️ Missing marks for measurement: ${startMarkName} or ${endMarkName}`
      );
      return null;
    }

    const duration = endMark.timestamp - startMark.timestamp;

    // Log berdasarkan performa
    const logLevel = this.getLogLevel(duration);
    const emoji = this.getEmoji(logLevel);

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `${emoji} ${measureName}: ${duration.toFixed(2)}ms (${logLevel})`
      );
    }

    // Kirim ke analytics jika performa buruk
    if (logLevel === 'SLOW') {
      this.reportSlowMetric(measureName, duration);
    }

    return duration;
  }

  /**
   * Quick measure tanpa perlu mark manual
   */
  async measureAsync<T>(
    name: string,
    callback: () => Promise<T>
  ): Promise<T> {
    this.mark(`${name}-start`);
    const result = await callback();
    this.mark(`${name}-end`);
    this.measure(name, `${name}-start`, `${name}-end`);
    return result;
  }

  /**
   * Sync version
   */
  measureSync<T>(name: string, callback: () => T): T {
    this.mark(`${name}-start`);
    const result = callback();
    this.mark(`${name}-end`);
    this.measure(name, `${name}-start`, `${name}-end`);
    return result;
  }

  /**
   * Tentukan level performa
   */
  private getLogLevel(duration: number): 'FAST' | 'NORMAL' | 'SLOW' {
    if (duration < 100) return 'FAST';
    if (duration < 300) return 'NORMAL';
    return 'SLOW';
  }

  /**
   * Get emoji untuk log
   */
  private getEmoji(
    level: 'FAST' | 'NORMAL' | 'SLOW'
  ): string {
    const emojiMap = {
      FAST: '⚡',
      NORMAL: '✅',
      SLOW: '🐌',
    };
    return emojiMap[level];
  }

  /**
   * Report ke analytics/monitoring service
   */
  private reportSlowMetric(metricName: string, duration: number): void {
    // Implementasi actual reporting ke service
    // Contoh: Sentry, LogRocket, DataDog, dll
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'slow_metric', {
        metric_name: metricName,
        duration_ms: duration,
        page_path: window.location.pathname,
      });
    }
  }

  /**
   * Clear semua marks
   */
  clear(): void {
    this.marks.clear();
  }

  /**
   * Get semua marks
   */
  getMarks(): PerformanceMark[] {
    return Array.from(this.marks.values());
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * React Hook untuk measure component render time
 */
export function useMeasureRender(componentName: string) {
  React.useEffect(() => {
    performanceMonitor.mark(`${componentName}-render-start`);

    return () => {
      performanceMonitor.mark(`${componentName}-render-end`);
      performanceMonitor.measure(
        `${componentName}-render`,
        `${componentName}-render-start`,
        `${componentName}-render-end`
      );
    };
  }, [componentName]);
}

// USAGE EXAMPLES:
// ===============

// 1. Measure menu open time di dashboard-shell.tsx:
// import { performanceMonitor } from '@/lib/performance-monitor';
//
// const handleMenuClick = () => {
//   performanceMonitor.mark('menu-open-start');
//   setMobileOpen(true);
//   performanceMonitor.mark('menu-open-end');
//   performanceMonitor.measure('menu-open', 'menu-open-start', 'menu-open-end');
// }

// 2. Async measurement:
// const result = await performanceMonitor.measureAsync('api-call', async () => {
//   return await fetch('/api/data');
// });

// 3. React hook:
// import { useMeasureRender } from '@/lib/performance-monitor';
//
// export function MyComponent() {
//   useMeasureRender('MyComponent');
//   return <div>...</div>;
// }

import React from 'react';
