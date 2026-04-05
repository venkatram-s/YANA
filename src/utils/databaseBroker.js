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
    }

    async connect() {
        if (this.db) return this.db;
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open(this.databaseName, 1);
            request.onerror = (e) => reject(`DatabaseBroker connection failed: ${e.target.error}`);
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };
            request.onupgradeneeded = (e) => {
                const upgradingDb = e.target.result;
                if (!upgradingDb.objectStoreNames.contains(this.storeName)) {
                    upgradingDb.createObjectStore(this.storeName);
                }
            };
        });
    }

    async getItem(key) {
        try {
            const db = await this.connect();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result);
                request.onerror = (e) => reject(`DatabaseBroker read failure on key [${key}]: ${e.target.error}`);
            });
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    async setItem(key, payload) {
        try {
            const db = await this.connect();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.put(payload, key);
                request.onsuccess = () => resolve(true);
                request.onerror = (e) => reject(`DatabaseBroker write failure on key [${key}]: ${e.target.error}`);
            });
        } catch (err) {
            console.error(err);
            return false;
        }
    }

    async purgeDatabase() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.deleteDatabase(this.databaseName);
            request.onsuccess = () => resolve(true);
            request.onerror = (e) => reject(`DatabaseBroker purge failure: ${e.target.error}`);
        });
    }
}
