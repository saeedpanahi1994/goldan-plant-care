/**
 * سرویس آفلاین باغچه - ذخیره‌سازی محلی با IndexedDB
 * این سرویس اطلاعات گیاهان، تصاویر و یادآوری‌های آبیاری را
 * به صورت محلی در گوشی ذخیره می‌کند تا در حالت آفلاین قابل دسترسی باشند.
 */

// ساختار گیاه سرور
export interface CachedPlant {
  id: number;
  plant_name_fa: string;
  plant_scientific_name: string;
  plant_image: string;
  nickname: string | null;
  next_watering_at: string;
  health_status: string;
  effective_watering_interval: number;
  default_watering_interval: number;
  default_fertilizer_interval: number;
  custom_watering_interval: number | null;
  custom_fertilizer_interval: number | null;
}

// ساختار تصویر کش شده
interface CachedImage {
  url: string; // آدرس اصلی تصویر
  blob: Blob;  // داده تصویر
  cachedAt: number; // زمان کش
}

// ساختار عملیات در صف (برای همگام‌سازی)
export interface PendingAction {
  id: string;
  type: 'water' | 'reminder' | 'delete';
  plantId: number;
  data?: any;
  createdAt: number;
}

// ساختار متادیتا
interface SyncMeta {
  key: string;
  value: string;
}

const DB_NAME = 'goldan_offline';
const DB_VERSION = 1;

// نام‌های store
const STORES = {
  PLANTS: 'plants',
  IMAGES: 'images',
  PENDING_ACTIONS: 'pending_actions',
  META: 'sync_meta',
};

class OfflineGardenService {
  private db: IDBDatabase | null = null;
  private dbReady: Promise<IDBDatabase>;

  constructor() {
    this.dbReady = this.initDB();
  }

  /**
   * راه‌اندازی دیتابیس IndexedDB
   */
  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // جدول گیاهان
        if (!db.objectStoreNames.contains(STORES.PLANTS)) {
          db.createObjectStore(STORES.PLANTS, { keyPath: 'id' });
        }

        // جدول تصاویر کش شده
        if (!db.objectStoreNames.contains(STORES.IMAGES)) {
          db.createObjectStore(STORES.IMAGES, { keyPath: 'url' });
        }

        // جدول عملیات در انتظار همگام‌سازی
        if (!db.objectStoreNames.contains(STORES.PENDING_ACTIONS)) {
          db.createObjectStore(STORES.PENDING_ACTIONS, { keyPath: 'id' });
        }

        // جدول متادیتا (زمان آخرین همگام‌سازی و غیره)
        if (!db.objectStoreNames.contains(STORES.META)) {
          db.createObjectStore(STORES.META, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log('✅ IndexedDB آفلاین آماده شد');
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('❌ خطا در راه‌اندازی IndexedDB:', event);
        reject(new Error('خطا در راه‌اندازی دیتابیس آفلاین'));
      };
    });
  }

  /**
   * دسترسی ایمن به دیتابیس
   */
  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return this.dbReady;
  }

  // ============================================
  // عملیات گیاهان
  // ============================================

  /**
   * ذخیره لیست گیاهان در حافظه محلی
   */
  async savePlants(plants: CachedPlant[]): Promise<void> {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PLANTS, 'readwrite');
      const store = tx.objectStore(STORES.PLANTS);

      // ابتدا همه را پاک کن و دوباره بنویس
      store.clear();
      
      for (const plant of plants) {
        store.put(plant);
      }

      tx.oncomplete = () => {
        console.log(`💾 ${plants.length} گیاه در حافظه محلی ذخیره شد`);
        // ذخیره زمان آخرین همگام‌سازی
        this.setMeta('lastSync', Date.now().toString());
        resolve();
      };

      tx.onerror = () => {
        console.error('❌ خطا در ذخیره گیاهان:', tx.error);
        reject(tx.error);
      };
    });
  }

  /**
   * دریافت لیست گیاهان از حافظه محلی
   */
  async getPlants(): Promise<CachedPlant[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PLANTS, 'readonly');
      const store = tx.objectStore(STORES.PLANTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const plants = request.result as CachedPlant[];
        console.log(`📱 ${plants.length} گیاه از حافظه محلی بارگذاری شد`);
        resolve(plants);
      };

      request.onerror = () => {
        console.error('❌ خطا در خواندن گیاهان:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * به‌روزرسانی یک گیاه خاص در حافظه محلی
   */
  async updatePlant(plant: CachedPlant): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PLANTS, 'readwrite');
      const store = tx.objectStore(STORES.PLANTS);
      store.put(plant);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * حذف گیاه از حافظه محلی
   */
  async deletePlant(plantId: number): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PLANTS, 'readwrite');
      const store = tx.objectStore(STORES.PLANTS);
      store.delete(plantId);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ============================================
  // کش تصاویر
  // ============================================

  /**
   * دانلود و ذخیره تصویر در حافظه محلی
   */
  async cacheImage(imageUrl: string): Promise<void> {
    if (!imageUrl || imageUrl.includes('placeholder')) return;

    try {
      // بررسی اینکه آیا قبلاً کش شده
      const existing = await this.getCachedImage(imageUrl);
      if (existing) return; // قبلاً کش شده

      const response = await fetch(imageUrl, { mode: 'cors' });
      if (!response.ok) return;

      const blob = await response.blob();
      
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.IMAGES, 'readwrite');
        const store = tx.objectStore(STORES.IMAGES);
        
        const cachedImage: CachedImage = {
          url: imageUrl,
          blob: blob,
          cachedAt: Date.now(),
        };
        
        store.put(cachedImage);

        tx.oncomplete = () => {
          console.log(`🖼️ تصویر کش شد: ${imageUrl.substring(0, 50)}...`);
          resolve();
        };

        tx.onerror = () => {
          console.error('❌ خطا در کش تصویر:', tx.error);
          reject(tx.error);
        };
      });
    } catch (error) {
      console.warn('⚠️ خطا در دانلود تصویر برای کش:', imageUrl, error);
    }
  }

  /**
   * دریافت تصویر کش شده
   */
  async getCachedImage(imageUrl: string): Promise<string | null> {
    const db = await this.getDB();

    return new Promise((resolve) => {
      const tx = db.transaction(STORES.IMAGES, 'readonly');
      const store = tx.objectStore(STORES.IMAGES);
      const request = store.get(imageUrl);

      request.onsuccess = () => {
        if (request.result) {
          const cached = request.result as CachedImage;
          // تبدیل Blob به Object URL برای نمایش
          const objectUrl = URL.createObjectURL(cached.blob);
          resolve(objectUrl);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  }

  /**
   * کش کردن تمام تصاویر گیاهان
   */
  async cacheAllImages(imageUrls: string[]): Promise<void> {
    const uniqueUrls = Array.from(new Set(imageUrls.filter(url => url && !url.includes('placeholder'))));
    
    // دانلود تصاویر به صورت موازی (حداکثر 3 همزمان)
    const batchSize = 3;
    for (let i = 0; i < uniqueUrls.length; i += batchSize) {
      const batch = uniqueUrls.slice(i, i + batchSize);
      await Promise.allSettled(batch.map(url => this.cacheImage(url)));
    }
    
    console.log(`🖼️ ${uniqueUrls.length} تصویر کش شد`);
  }

  /**
   * دریافت آدرس تصویر (اول کش، بعد آنلاین)
   */
  async getImageUrl(originalUrl: string): Promise<string> {
    if (!originalUrl || originalUrl.includes('placeholder')) return originalUrl;

    // اگر آنلاین هستیم، آدرس اصلی را برگردان
    if (navigator.onLine) return originalUrl;

    // اگر آفلاین هستیم، از کش بخوان
    const cached = await this.getCachedImage(originalUrl);
    return cached || originalUrl; // اگر کش نبود، آدرس اصلی (که کار نخواهد کرد)
  }

  // ============================================
  // عملیات در صف (Pending Actions)
  // ============================================

  /**
   * افزودن عملیات به صف همگام‌سازی
   */
  async addPendingAction(action: Omit<PendingAction, 'id' | 'createdAt'>): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PENDING_ACTIONS, 'readwrite');
      const store = tx.objectStore(STORES.PENDING_ACTIONS);
      
      const pendingAction: PendingAction = {
        ...action,
        id: `${action.type}_${action.plantId}_${Date.now()}`,
        createdAt: Date.now(),
      };
      
      store.put(pendingAction);

      tx.oncomplete = () => {
        console.log(`📋 عملیات به صف اضافه شد: ${action.type} برای گیاه ${action.plantId}`);
        resolve();
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * دریافت تمام عملیات در انتظار
   */
  async getPendingActions(): Promise<PendingAction[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PENDING_ACTIONS, 'readonly');
      const store = tx.objectStore(STORES.PENDING_ACTIONS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as PendingAction[]);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * حذف عملیات از صف بعد از همگام‌سازی موفق
   */
  async removePendingAction(actionId: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PENDING_ACTIONS, 'readwrite');
      const store = tx.objectStore(STORES.PENDING_ACTIONS);
      store.delete(actionId);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * پاک کردن تمام عملیات در انتظار
   */
  async clearPendingActions(): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PENDING_ACTIONS, 'readwrite');
      const store = tx.objectStore(STORES.PENDING_ACTIONS);
      store.clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ============================================
  // متادیتا و همگام‌سازی
  // ============================================

  /**
   * ذخیره متادیتا
   */
  async setMeta(key: string, value: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.META, 'readwrite');
      const store = tx.objectStore(STORES.META);
      store.put({ key, value } as SyncMeta);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * خواندن متادیتا
   */
  async getMeta(key: string): Promise<string | null> {
    const db = await this.getDB();

    return new Promise((resolve) => {
      const tx = db.transaction(STORES.META, 'readonly');
      const store = tx.objectStore(STORES.META);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result ? (request.result as SyncMeta).value : null);
      };

      request.onerror = () => resolve(null);
    });
  }

  /**
   * دریافت زمان آخرین همگام‌سازی
   */
  async getLastSyncTime(): Promise<Date | null> {
    const timestamp = await this.getMeta('lastSync');
    return timestamp ? new Date(parseInt(timestamp)) : null;
  }

  /**
   * بررسی وضعیت آنلاین/آفلاین
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * همگام‌سازی عملیات در انتظار با سرور
   */
  async syncPendingActions(apiUrl: string, token: string): Promise<{ synced: number; failed: number }> {
    const actions = await this.getPendingActions();
    let synced = 0;
    let failed = 0;

    for (const action of actions) {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        switch (action.type) {
          case 'water':
            await fetch(`${apiUrl}/plants/${action.plantId}/water`, {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            });
            break;

          case 'reminder':
            await fetch(`${apiUrl}/plants/${action.plantId}/reminder`, {
              method: 'PUT',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify(action.data),
            });
            break;

          case 'delete':
            await fetch(`${apiUrl}/plants/${action.plantId}`, {
              method: 'DELETE',
              headers,
            });
            break;
        }

        await this.removePendingAction(action.id);
        synced++;
      } catch (error) {
        console.error(`❌ خطا در همگام‌سازی عملیات ${action.id}:`, error);
        failed++;
      }
    }

    if (synced > 0) {
      console.log(`🔄 ${synced} عملیات با موفقیت همگام شد`);
    }
    if (failed > 0) {
      console.warn(`⚠️ ${failed} عملیات همگام نشد`);
    }

    return { synced, failed };
  }

  /**
   * پاک‌سازی کامل دیتابیس (مثلاً هنگام خروج کاربر)
   */
  async clearAll(): Promise<void> {
    const db = await this.getDB();

    const storeNames = [STORES.PLANTS, STORES.IMAGES, STORES.PENDING_ACTIONS, STORES.META];
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, 'readwrite');
      
      for (const storeName of storeNames) {
        tx.objectStore(storeName).clear();
      }

      tx.oncomplete = () => {
        console.log('🗑️ تمام داده‌های آفلاین پاک شد');
        resolve();
      };

      tx.onerror = () => reject(tx.error);
    });
  }
}

// یک نمونه واحد از سرویس (Singleton)
const offlineGardenService = new OfflineGardenService();
export default offlineGardenService;
