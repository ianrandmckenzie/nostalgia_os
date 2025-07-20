/* =====================
   IndexedDB Storage Wrapper

   Provides async storage using IndexedDB with sync methods backed by in-memory cache.

   - Async methods (setItem, getItem, removeItem, clear) use IndexedDB directly
   - Sync methods (setItemSync, getItemSync, etc.) use an in-memory cache for immediate access
   - Cache is populated on initialization and kept in sync with IndexedDB operations
   - No localStorage fallback - pure IndexedDB implementation for better performance and capacity
====================== */

class IndexedDBStorage {
  constructor(dbName = 'NostalgiaOS', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.cache = new Map(); // Cache for sync operations
    this.initPromise = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = async () => {
        this.db = request.result;
        // Populate cache with existing data for sync access
        await this.populateCache();
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store for key-value pairs
        if (!db.objectStoreNames.contains('storage')) {
          db.createObjectStore('storage', { keyPath: 'key' });
        }
      };
    });
  }

  async populateCache() {
    try {
      if (!this.db) return;

      const transaction = this.db.transaction(['storage'], 'readonly');
      const store = transaction.objectStore('storage');

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const results = request.result;
          results.forEach(item => {
            this.cache.set(item.key, item.value);
          });
          resolve();
        };
        request.onerror = () => {
          console.warn('Failed to populate cache:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.warn('Failed to populate cache:', error);
    }
  }

  async ensureDB() {
    if (!this.db) {
      await this.initPromise;
    }
    return this.db;
  }

  async setItem(key, value) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['storage'], 'readwrite');
    const store = transaction.objectStore('storage');

    const data = {
      key: key,
      value: value,
      timestamp: Date.now()
    };

    // Update cache
    this.cache.set(key, value);

    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getItem(key) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['storage'], 'readonly');
    const store = transaction.objectStore('storage');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        let value = result ? result.value : null;

        // Update cache
        this.cache.set(key, value);
        resolve(value);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async removeItem(key) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['storage'], 'readwrite');
    const store = transaction.objectStore('storage');

    // Remove from cache
    this.cache.delete(key);

    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear() {
    const db = await this.ensureDB();
    const transaction = db.transaction(['storage'], 'readwrite');
    const store = transaction.objectStore('storage');

    // Clear cache
    this.cache.clear();

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllKeys() {
    const db = await this.ensureDB();
    const transaction = db.transaction(['storage'], 'readonly');
    const store = transaction.objectStore('storage');

    return new Promise((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Synchronous methods using cache with async IndexedDB updates
  setItemSync(key, value) {
    // Update cache immediately for sync access
    this.cache.set(key, value);
    // Async update IndexedDB in background with retry logic
    this.setItemWithRetry(key, value, 3).catch(error => {
      console.warn('Failed to save to IndexedDB after retries:', error);
    });
  }

  // Helper method to retry setItem operations
  async setItemWithRetry(key, value, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.setItem(key, value);
        return; // Success
      } catch (error) {
        lastError = error;
        console.warn(`setItem retry ${i + 1}/${maxRetries} failed:`, error);
        if (i < maxRetries - 1) {
          // Wait before retry, with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 100));
        }
      }
    }
    throw lastError;
  }

  getItemSync(key) {
    // Try cache first for immediate response
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    // If not in cache, try to preload it asynchronously for next time
    this.getItem(key).catch(console.warn);
    // Return null for immediate sync response (can't wait for async operations)
    return null;
  }

  removeItemSync(key) {
    this.cache.delete(key);
    this.removeItem(key).catch(console.error);
  }

  clearSync() {
    this.cache.clear();
    this.clear().catch(console.error);
  }
}

// Create global instance
const idbStorage = new IndexedDBStorage();

// Enhanced storage interface that provides both sync and async methods
const storage = {
  // Ensure storage is ready
  async ensureReady() {
    await idbStorage.ensureDB();
    // Ensure cache is populated for sync operations
    if (idbStorage.cache.size === 0) {
      await idbStorage.populateCache();
    }
    return idbStorage.db;
  },

  // Async methods (preferred)
  async setItem(key, value) {
    return await idbStorage.setItem(key, value);
  },

  async getItem(key) {
    return await idbStorage.getItem(key);
  },

  async removeItem(key) {
    return await idbStorage.removeItem(key);
  },

  async clear() {
    return await idbStorage.clear();
  },

  async getAllKeys() {
    return await idbStorage.getAllKeys();
  },

  // Preload specific keys into cache for sync access
  async preloadKeys(keys) {
    for (const key of keys) {
      try {
        await this.getItem(key); // This will populate the cache
      } catch (error) {
        console.warn(`Failed to preload key ${key}:`, error);
      }
    }
  },

  // Sync methods for backward compatibility
  setItemSync(key, value) {
    return idbStorage.setItemSync(key, value);
  },

  getItemSync(key) {
    return idbStorage.getItemSync(key);
  },

  removeItemSync(key) {
    return idbStorage.removeItemSync(key);
  },

  clearSync() {
    return idbStorage.clearSync();
  }
};

// Make storage available globally for iframe access immediately
window.globalStorage = storage;

async function clearStorage() {
    // Clear sessionStorage (keeping this as it might still be used elsewhere)
    sessionStorage.clear();

    // Clear IndexedDB
    try {
        await storage.clear();

        // Also clear the NostalgiaOS database completely
        const deleteRequest = indexedDB.deleteDatabase('NostalgiaOS');
        deleteRequest.onsuccess = () => {
        };
        deleteRequest.onerror = (error) => {
            console.error('Error deleting IndexedDB database:', error);
        };

        document.getElementById('status').innerHTML = '<p style="color: green;">All storage cleared successfully!</p>';
    } catch (error) {
        console.error('Error clearing IndexedDB:', error);
        document.getElementById('status').innerHTML = '<p style="color: red;">Error clearing storage: ' + error.message + '</p>';
    }

    // Also clear any cached file system state
    if (window.fileSystemState) {
        delete window.fileSystemState;
    }
}

