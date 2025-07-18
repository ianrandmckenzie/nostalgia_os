/* =====================
   IndexedDB Storage Wrapper
   Provides a localStorage-like interface but uses IndexedDB for better performance
   and larger storage capacity
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

      request.onsuccess = () => {
        this.db = request.result;
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

  // Synchronous methods with async fallback for compatibility
  setItemSync(key, value) {
    // Set in localStorage immediately for sync access
    localStorage.setItem(key, value);
    // Also update cache for consistency
    this.cache.set(key, value);
    // Async update IndexedDB in background
    this.setItem(key, value).catch(error => {
      console.warn('Failed to save to IndexedDB, using localStorage fallback:', error);
    });
  }

  getItemSync(key) {
    // Try localStorage first for immediate response
    return localStorage.getItem(key);
  }

  removeItemSync(key) {
    localStorage.removeItem(key);
    this.removeItem(key).catch(console.error);
  }

  clearSync() {
    localStorage.clear();
    this.clear().catch(console.error);
  }
}

// Create global instance
const idbStorage = new IndexedDBStorage();

// Enhanced storage interface that provides both sync and async methods
const storage = {
  // Ensure storage is ready
  async ensureReady() {
    return await idbStorage.ensureDB();
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
  },

  // Migration helper
  async migrateFromLocalStorage() {
    console.log('Migrating data from localStorage to IndexedDB...');
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        await this.setItem(key, value);
      }
    }

    console.log(`Migrated ${keys.length} items from localStorage to IndexedDB`);
  }
};

// Initialize and migrate data
storage.migrateFromLocalStorage().catch(console.error);

// Make storage available globally for iframe access immediately
window.globalStorage = storage;
console.log('Global storage made available for iframes');

async function clearStorage() {
    // Clear localStorage
    localStorage.clear();
    sessionStorage.clear();

    // Clear IndexedDB
    try {
        await storage.clear();

        // Also clear the NostalgiaOS database completely
        const deleteRequest = indexedDB.deleteDatabase('NostalgiaOS');
        deleteRequest.onsuccess = () => {
            console.log('IndexedDB database deleted successfully');
        };
        deleteRequest.onerror = (error) => {
            console.error('Error deleting IndexedDB database:', error);
        };

        document.getElementById('status').innerHTML = '<p style="color: green;">All storage cleared successfully!</p>';
    } catch (error) {
        console.error('Error clearing IndexedDB:', error);
        document.getElementById('status').innerHTML = '<p style="color: orange;">LocalStorage cleared, but there was an issue with IndexedDB: ' + error.message + '</p>';
    }

    // Also clear any cached file system state
    if (window.fileSystemState) {
        delete window.fileSystemState;
    }

    console.log('All storage cleared');
}

// Show current storage contents
console.log('Current localStorage keys:', Object.keys(localStorage));
console.log('Current sessionStorage keys:', Object.keys(sessionStorage));
