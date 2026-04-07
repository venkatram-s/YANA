/**
 * databaseBroker.js
 * 
 * Provides an asynchronous wrapper around IndexedDB to circumvent the bottleneck
 * of volatile synchronous storage (localStorage) for massive datasets.
 */
export class DatabaseBroker {
    constructor(databaseName = 'YanaCoreDB', storeName = 'ApplicationState') {
        this.databaseName = databaseName;
        this.storeName = storeName;
        this.db = null;
        this.isMemoryOnly = false;
        this.memoryStore = new Map();
    }

    async connect() {
        if (this.db) return this.db;
        if (this.isMemoryOnly) return null;

        return new Promise((resolve) => {
            try {
                const request = window.indexedDB.open(this.databaseName, 1);
                request.onerror = (e) => {
                    console.warn(`DatabaseBroker: IDB Access Denied (Incognito/Quota). Shifting to Volatile Memory.`, e);
                    this.isMemoryOnly = true;
                    resolve(null);
                };
                request.onsuccess = (e) => {
                    this.db = e.target.result;
                    resolve(this.db);
                };
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        db.createObjectStore(this.storeName);
                    }
                };
            } catch {
                this.isMemoryOnly = true;
                resolve(null);
            }
        });
    }

    async getItem(key) {
        if (this.isMemoryOnly) return this.memoryStore.get(key);
        
        try {
            const db = await this.connect();
            if (!db) return this.memoryStore.get(key);

            return new Promise((resolve) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(this.memoryStore.get(key));
            });
        } catch {
            return this.memoryStore.get(key);
        }
    }

    async setItem(key, payload) {
        if (this.isMemoryOnly) {
            this.memoryStore.set(key, payload);
            return true;
        }

        try {
            const db = await this.connect();
            if (!db) {
                this.memoryStore.set(key, payload);
                return true;
            }

            return new Promise((resolve) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.put(payload, key);
                request.onsuccess = () => resolve(true);
                request.onerror = () => {
                    this.memoryStore.set(key, payload);
                    resolve(true);
                };
            });
        } catch {
            this.memoryStore.set(key, payload);
            return true;
        }
    }

    async purgeDatabase() {
        this.memoryStore.clear();
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        return new Promise((resolve) => {
            const request = window.indexedDB.deleteDatabase(this.databaseName);
            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(true);
        });
    }
}
