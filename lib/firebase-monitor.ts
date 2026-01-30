/**
 * Firebase Usage Monitor
 * Tracks reads/writes to help stay within free tier limits
 */

interface UsageStats {
  reads: number;
  writes: number;
  deletes: number;
  timestamp: number;
}

interface DailyStats {
  date: string;
  reads: number;
  writes: number;
  deletes: number;
  collections: Record<string, { reads: number; writes: number }>;
}

export class FirebaseMonitor {
  private static readonly STORAGE_KEY = 'firebase_usage_stats';
  private static readonly FREE_TIER_LIMITS = {
    READS_PER_DAY: 50000,
    WRITES_PER_DAY: 20000,
    DELETES_PER_DAY: 20000
  };
  
  private static stats: DailyStats | null = null;
  
  /**
   * Initialize monitor and load existing stats
   */
  static init(): void {
    if (typeof window === 'undefined') return;
    
    const today = this.getDateKey();
    const stored = localStorage.getItem(this.STORAGE_KEY);
    
    if (stored) {
      try {
        const parsed: DailyStats = JSON.parse(stored);
        
        // Reset if it's a new day
        if (parsed.date !== today) {
          this.stats = this.createNewStats(today);
        } else {
          this.stats = parsed;
        }
      } catch {
        this.stats = this.createNewStats(today);
      }
    } else {
      this.stats = this.createNewStats(today);
    }
    
    this.save();
  }
  
  /**
   * Track a read operation
   */
  static trackRead(collection: string, count: number = 1): void {
    if (!this.stats) this.init();
    if (!this.stats) return;
    
    this.stats.reads += count;
    
    if (!this.stats.collections[collection]) {
      this.stats.collections[collection] = { reads: 0, writes: 0 };
    }
    this.stats.collections[collection].reads += count;
    
    this.save();
    this.checkLimits();
    
    // Log to analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'firebase_read', {
        collection,
        count,
        daily_total: this.stats.reads
      });
    }
  }
  
  /**
   * Track a write operation
   */
  static trackWrite(collection: string, count: number = 1): void {
    if (!this.stats) this.init();
    if (!this.stats) return;
    
    this.stats.writes += count;
    
    if (!this.stats.collections[collection]) {
      this.stats.collections[collection] = { reads: 0, writes: 0 };
    }
    this.stats.collections[collection].writes += count;
    
    this.save();
    this.checkLimits();
    
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'firebase_write', {
        collection,
        count,
        daily_total: this.stats.writes
      });
    }
  }
  
  /**
   * Track a delete operation
   */
  static trackDelete(collection: string, count: number = 1): void {
    if (!this.stats) this.init();
    if (!this.stats) return;
    
    this.stats.deletes += count;
    
    this.save();
    this.checkLimits();
  }
  
  /**
   * Get current usage statistics
   */
  static getStats(): {
    reads: number;
    writes: number;
    deletes: number;
    readLimit: number;
    writeLimit: number;
    deleteLimit: number;
    readPercentage: number;
    writePercentage: number;
    deletePercentage: number;
    collections: Record<string, { reads: number; writes: number }>;
    warnings: string[];
  } {
    if (!this.stats) this.init();
    if (!this.stats) {
      return {
        reads: 0,
        writes: 0,
        deletes: 0,
        readLimit: this.FREE_TIER_LIMITS.READS_PER_DAY,
        writeLimit: this.FREE_TIER_LIMITS.WRITES_PER_DAY,
        deleteLimit: this.FREE_TIER_LIMITS.DELETES_PER_DAY,
        readPercentage: 0,
        writePercentage: 0,
        deletePercentage: 0,
        collections: {},
        warnings: []
      };
    }
    
    const warnings: string[] = [];
    const readPct = (this.stats.reads / this.FREE_TIER_LIMITS.READS_PER_DAY) * 100;
    const writePct = (this.stats.writes / this.FREE_TIER_LIMITS.WRITES_PER_DAY) * 100;
    const deletePct = (this.stats.deletes / this.FREE_TIER_LIMITS.DELETES_PER_DAY) * 100;
    
    if (readPct > 80) warnings.push(`Reads at ${readPct.toFixed(1)}% of daily limit`);
    if (writePct > 80) warnings.push(`Writes at ${writePct.toFixed(1)}% of daily limit`);
    if (deletePct > 80) warnings.push(`Deletes at ${deletePct.toFixed(1)}% of daily limit`);
    
    return {
      reads: this.stats.reads,
      writes: this.stats.writes,
      deletes: this.stats.deletes,
      readLimit: this.FREE_TIER_LIMITS.READS_PER_DAY,
      writeLimit: this.FREE_TIER_LIMITS.WRITES_PER_DAY,
      deleteLimit: this.FREE_TIER_LIMITS.DELETES_PER_DAY,
      readPercentage: readPct,
      writePercentage: writePct,
      deletePercentage: deletePct,
      collections: this.stats.collections,
      warnings
    };
  }
  
  /**
   * Reset daily statistics
   */
  static reset(): void {
    const today = this.getDateKey();
    this.stats = this.createNewStats(today);
    this.save();
  }
  
  /**
   * Check if approaching limits and warn
   */
  private static checkLimits(): void {
    if (!this.stats) return;
    
    const readPct = (this.stats.reads / this.FREE_TIER_LIMITS.READS_PER_DAY) * 100;
    const writePct = (this.stats.writes / this.FREE_TIER_LIMITS.WRITES_PER_DAY) * 100;
    
    // Warn at 80%, 90%, 95%, 100%
    const thresholds = [80, 90, 95, 100];
    
    thresholds.forEach(threshold => {
      if (readPct >= threshold && readPct < threshold + 1) {
        console.warn(
          `⚠️ Firebase Reads: ${readPct.toFixed(1)}% of daily limit ` +
          `(${this.stats!.reads.toLocaleString()}/${this.FREE_TIER_LIMITS.READS_PER_DAY.toLocaleString()})`
        );
      }
      
      if (writePct >= threshold && writePct < threshold + 1) {
        console.warn(
          `⚠️ Firebase Writes: ${writePct.toFixed(1)}% of daily limit ` +
          `(${this.stats!.writes.toLocaleString()}/${this.FREE_TIER_LIMITS.WRITES_PER_DAY.toLocaleString()})`
        );
      }
    });
  }
  
  /**
   * Save stats to localStorage
   */
  private static save(): void {
    if (typeof window === 'undefined' || !this.stats) return;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.stats));
    } catch (error) {
      console.error('Failed to save Firebase usage stats:', error);
    }
  }
  
  /**
   * Get date key for today (YYYY-MM-DD)
   */
  private static getDateKey(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }
  
  /**
   * Create new stats object
   */
  private static createNewStats(date: string): DailyStats {
    return {
      date,
      reads: 0,
      writes: 0,
      deletes: 0,
      collections: {}
    };
  }
}

// Initialize on import
if (typeof window !== 'undefined') {
  FirebaseMonitor.init();
}
