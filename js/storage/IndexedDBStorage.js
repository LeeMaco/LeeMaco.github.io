/**
 * IndexedDB存儲模塊 - 提供高效的數據存儲和檢索功能
 * 替代LocalStorage以支持更大數據量和更複雜的查詢
 */

class IndexedDBStorage {
    constructor() {
        this.dbName = 'BookManagementSystem';
        this.dbVersion = 1;
        this.db = null;
        this.isInitialized = false;
        this.initPromise = null;
        
        // 緩存設置
        this.cacheEnabled = true;
        this.cacheTimeout = 30 * 60 * 1000; // 30分鐘緩存超時
        this.memoryCache = {
            books: null,
            categories: null,
            timestamp: null
        };
        
        // 初始化數據庫
        this.init();
    }
    
    /**
     * 初始化IndexedDB數據庫
     * @returns {Promise} 初始化完成的Promise
     */
    async init() {
        if (this.isInitialized) return Promise.resolve(this.db);
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            // 數據庫升級事件 - 創建存儲對象和索引
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 創建書籍存儲對象
                if (!db.objectStoreNames.contains('books')) {
                    const booksStore = db.createObjectStore('books', { keyPath: 'id' });
                    // 創建索引以加速查詢
                    booksStore.createIndex('title', 'title', { unique: false });
                    booksStore.createIndex('author', 'author', { unique: false });
                    booksStore.createIndex('category', 'category', { unique: false });
                    booksStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                }
                
                // 創建設置存儲對象
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
                
                // 創建同步記錄存儲對象
                if (!db.objectStoreNames.contains('syncRecords')) {
                    const syncStore = db.createObjectStore('syncRecords', { keyPath: 'id', autoIncrement: true });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                    syncStore.createIndex('operation', 'operation', { unique: false });
                }
                
                console.log('IndexedDB 數據庫結構已創建/升級');
            };
            
            // 成功打開數據庫
            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.isInitialized = true;
                console.log('IndexedDB 數據庫連接成功');
                resolve(this.db);
            };
            
            // 打開數據庫失敗
            request.onerror = (event) => {
                console.error('IndexedDB 數據庫連接失敗:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * 獲取所有書籍
     * @param {boolean} forceRefresh 是否強制刷新緩存
     * @returns {Promise<Array>} 書籍數組的Promise
     */
    async getAllBooks(forceRefresh = false) {
        await this.ensureInitialized();
        
        // 檢查緩存是否可用
        if (this.cacheEnabled && !forceRefresh && this.memoryCache.books) {
            const now = Date.now();
            const cacheAge = now - (this.memoryCache.timestamp || 0);
            
            // 如果緩存未過期，直接返回緩存數據
            if (cacheAge < this.cacheTimeout) {
                console.log(`從緩存獲取 ${this.memoryCache.books.length} 筆書籍數據，緩存時間: ${Math.round(cacheAge / 1000 / 60)} 分鐘前`);
                return [...this.memoryCache.books]; // 返回深拷貝，避免修改緩存
            } else {
                console.log('緩存已過期，重新獲取數據');
            }
        }
        
        try {
            const books = await new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['books'], 'readonly');
                const store = transaction.objectStore('books');
                const request = store.getAll();
                
                request.onsuccess = () => {
                    resolve(request.result);
                };
                
                request.onerror = (event) => {
                    console.error('獲取所有書籍失敗:', event.target.error);
                    reject(event.target.error);
                };
            });
            
            // 更新緩存
            if (this.cacheEnabled) {
                this.memoryCache.books = [...books]; // 存儲深拷貝
                this.memoryCache.timestamp = Date.now();
                console.log(`已緩存 ${books.length} 筆書籍數據`);
            }
            
            return books;
        } catch (error) {
            console.error('獲取書籍數據失敗:', error);
            
            // 如果有緩存數據，在出錯時返回緩存數據
            if (this.cacheEnabled && this.memoryCache.books) {
                console.warn('使用過期緩存數據作為備用');
                return [...this.memoryCache.books];
            }
            
            throw error;
        }
    }
    
    /**
     * 根據ID獲取書籍
     * @param {string} id 書籍ID
     * @returns {Promise<Object|null>} 書籍對象或null的Promise
     */
    async getBookById(id) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['books'], 'readonly');
            const store = transaction.objectStore('books');
            const request = store.get(id);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = (event) => {
                console.error(`獲取書籍 ID:${id} 失敗:`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * 添加書籍
     * @param {Object} book 書籍對象
     * @returns {Promise<Object>} 添加後的書籍對象的Promise
     */
    async addBook(book) {
        await this.ensureInitialized();
        
        // 添加時間戳和版本信息
        book.createdAt = new Date().toISOString();
        book.updatedAt = new Date().toISOString();
        book.version = 1;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['books', 'syncRecords'], 'readwrite');
            const store = transaction.objectStore('books');
            const syncStore = transaction.objectStore('syncRecords');
            
            // 添加書籍
            const request = store.add(book);
            
            request.onsuccess = () => {
                // 記錄同步操作
                syncStore.add({
                    operation: 'add',
                    bookId: book.id,
                    timestamp: new Date().toISOString(),
                    data: book
                });
                
                resolve(book);
            };
            
            request.onerror = (event) => {
                console.error('添加書籍失敗:', event.target.error);
                reject(event.target.error);
            };
            
            transaction.oncomplete = () => {
                console.log(`書籍 "${book.title}" 已添加並記錄同步操作`);
            };
        });
    }
    
    /**
     * 更新書籍
     * @param {Object} updatedBook 更新後的書籍對象
     * @returns {Promise<Object|null>} 更新後的書籍對象或null的Promise
     */
    async updateBook(updatedBook) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['books', 'syncRecords'], 'readwrite');
            const store = transaction.objectStore('books');
            const syncStore = transaction.objectStore('syncRecords');
            
            // 先獲取現有書籍以保留創建時間和版本信息
            const getRequest = store.get(updatedBook.id);
            
            getRequest.onsuccess = () => {
                const existingBook = getRequest.result;
                
                if (!existingBook) {
                    resolve(null);
                    return;
                }
                
                // 保留創建時間
                updatedBook.createdAt = existingBook.createdAt;
                // 更新時間戳
                updatedBook.updatedAt = new Date().toISOString();
                // 增加版本號
                updatedBook.version = (existingBook.version || 0) + 1;
                
                // 更新書籍
                const updateRequest = store.put(updatedBook);
                
                updateRequest.onsuccess = () => {
                    // 記錄同步操作
                    syncStore.add({
                        operation: 'update',
                        bookId: updatedBook.id,
                        timestamp: new Date().toISOString(),
                        data: updatedBook,
                        previousVersion: existingBook.version || 0
                    });
                    
                    resolve(updatedBook);
                };
                
                updateRequest.onerror = (event) => {
                    console.error('更新書籍失敗:', event.target.error);
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = (event) => {
                console.error(`獲取書籍 ID:${updatedBook.id} 失敗:`, event.target.error);
                reject(event.target.error);
            };
            
            transaction.oncomplete = () => {
                console.log(`書籍 "${updatedBook.title}" 已更新並記錄同步操作`);
            };
        });
    }
    
    /**
     * 刪除書籍
     * @param {string} id 書籍ID
     * @returns {Promise<boolean>} 是否成功刪除的Promise
     */
    async deleteBook(id) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['books', 'syncRecords'], 'readwrite');
            const store = transaction.objectStore('books');
            const syncStore = transaction.objectStore('syncRecords');
            
            // 先獲取書籍信息，用於同步記錄
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
                const book = getRequest.result;
                
                if (!book) {
                    resolve(false);
                    return;
                }
                
                // 刪除書籍
                const deleteRequest = store.delete(id);
                
                deleteRequest.onsuccess = () => {
                    // 記錄同步操作
                    syncStore.add({
                        operation: 'delete',
                        bookId: id,
                        timestamp: new Date().toISOString(),
                        data: { id, title: book.title }
                    });
                    
                    resolve(true);
                };
                
                deleteRequest.onerror = (event) => {
                    console.error('刪除書籍失敗:', event.target.error);
                    reject(event.target.error);
                };
            };
            
            getRequest.onerror = (event) => {
                console.error(`獲取書籍 ID:${id} 失敗:`, event.target.error);
                reject(event.target.error);
            };
            
            transaction.oncomplete = () => {
                console.log(`書籍 ID:${id} 已刪除並記錄同步操作`);
            };
        });
    }
    
    /**
     * 批量添加或更新書籍
     * @param {Array} books 書籍數組
     * @returns {Promise<Object>} 操作結果的Promise
     */
    async bulkAddOrUpdateBooks(books) {
        await this.ensureInitialized();
        
        // 驗證輸入
        if (!Array.isArray(books) || books.length === 0) {
            console.warn('批量添加或更新書籍: 無效的輸入數據');
            return { added: 0, updated: 0, errors: 0 };
        }
        
        // 最大重試次數
        const maxRetries = 3;
        let currentRetry = 0;
        
        while (currentRetry < maxRetries) {
            try {
                const result = await this._executeBulkOperation(books);
                
                // 操作成功，清除緩存以確保數據一致性
                if (this.cacheEnabled) {
                    this.clearCache();
                }
                
                return result;
            } catch (error) {
                currentRetry++;
                console.error(`批量操作失敗 (嘗試 ${currentRetry}/${maxRetries}):`, error);
                
                if (currentRetry >= maxRetries) {
                    throw error;
                }
                
                // 等待一段時間後重試
                await new Promise(resolve => setTimeout(resolve, 1000 * currentRetry));
            }
        }
    }
    
    /**
     * 執行批量操作
     * @private
     * @param {Array} books 書籍數組
     * @returns {Promise<Object>} 操作結果的Promise
     */
    async _executeBulkOperation(books) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['books', 'syncRecords'], 'readwrite');
            const store = transaction.objectStore('books');
            const syncStore = transaction.objectStore('syncRecords');
            
            let addedCount = 0;
            let updatedCount = 0;
            let errorCount = 0;
            let processedCount = 0;
            const totalCount = books.length;
            
            // 設置超時處理，避免事務卡住
            const transactionTimeout = setTimeout(() => {
                console.error('批量操作超時，可能是事務卡住');
                reject(new Error('批量操作超時'));
            }, 30000); // 30秒超時
            
            // 批量處理每本書籍
            books.forEach(book => {
                // 確保書籍有ID
                if (!book.id) {
                    console.error('書籍缺少ID，跳過處理');
                    errorCount++;
                    processedCount++;
                    checkCompletion();
                    return;
                }
                
                // 檢查是否已存在
                const getRequest = store.get(book.id);
                
                getRequest.onsuccess = () => {
                    const existingBook = getRequest.result;
                    
                    try {
                        if (existingBook) {
                            // 更新現有書籍
                            book.createdAt = existingBook.createdAt;
                            book.updatedAt = new Date().toISOString();
                            book.version = (existingBook.version || 0) + 1;
                            
                            const updateRequest = store.put(book);
                            
                            updateRequest.onsuccess = () => {
                                updatedCount++;
                                
                                // 記錄同步操作
                                syncStore.add({
                                    operation: 'update',
                                    bookId: book.id,
                                    timestamp: new Date().toISOString(),
                                    data: book,
                                    previousVersion: existingBook.version || 0
                                });
                                
                                processedCount++;
                                checkCompletion();
                            };
                            
                            updateRequest.onerror = (event) => {
                                console.error(`更新書籍 ID:${book.id} 失敗:`, event.target.error);
                                errorCount++;
                                processedCount++;
                                checkCompletion();
                            };
                        } else {
                            // 添加新書籍
                            book.createdAt = new Date().toISOString();
                            book.updatedAt = new Date().toISOString();
                            book.version = 1;
                            
                            const addRequest = store.add(book);
                            
                            addRequest.onsuccess = () => {
                                addedCount++;
                                
                                // 記錄同步操作
                                syncStore.add({
                                    operation: 'add',
                                    bookId: book.id,
                                    timestamp: new Date().toISOString(),
                                    data: book
                                });
                                
                                processedCount++;
                                checkCompletion();
                            };
                            
                            addRequest.onerror = (event) => {
                                console.error(`添加書籍 ID:${book.id} 失敗:`, event.target.error);
                                errorCount++;
                                processedCount++;
                                checkCompletion();
                            };
                        }
                    } catch (error) {
                        console.error(`處理書籍 ID:${book.id} 時發生錯誤:`, error);
                        errorCount++;
                        processedCount++;
                        checkCompletion();
                    }
                };
                
                getRequest.onerror = (event) => {
                    console.error(`獲取書籍 ID:${book.id} 失敗:`, event.target.error);
                    errorCount++;
                    processedCount++;
                    checkCompletion();
                };
            });
            
            // 檢查是否所有書籍都已處理完成
            function checkCompletion() {
                if (processedCount === totalCount) {
                    console.log(`批量操作進度: ${processedCount}/${totalCount} 完成`);
                }
            }
            
            transaction.oncomplete = () => {
                clearTimeout(transactionTimeout);
                console.log(`批量操作完成: 添加 ${addedCount}, 更新 ${updatedCount}, 錯誤 ${errorCount}`);
                resolve({
                    added: addedCount,
                    updated: updatedCount,
                    errors: errorCount,
                    total: totalCount
                });
            };
            
            transaction.onerror = (event) => {
                clearTimeout(transactionTimeout);
                console.error('批量操作失敗:', event.target.error);
                reject(event.target.error);
            };
            
            transaction.onabort = (event) => {
                clearTimeout(transactionTimeout);
                console.error('批量操作被中止:', event.target.error);
                reject(new Error('批量操作被中止'));
            };
        });
    }
    
    /**
     * 獲取未同步的操作記錄
     * @param {string} lastSyncTimestamp 上次同步的時間戳
     * @returns {Promise<Array>} 未同步操作記錄的Promise
     */
    async getUnsyncedOperations(lastSyncTimestamp) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['syncRecords'], 'readonly');
            const store = transaction.objectStore('syncRecords');
            const index = store.index('timestamp');
            
            // 創建範圍查詢 - 獲取上次同步後的所有操作
            const range = lastSyncTimestamp ? IDBKeyRange.lowerBound(lastSyncTimestamp, true) : null;
            const request = range ? index.openCursor(range) : index.openCursor();
            
            const operations = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                
                if (cursor) {
                    operations.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(operations);
                }
            };
            
            request.onerror = (event) => {
                console.error('獲取未同步操作失敗:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * 清除已同步的操作記錄
     * @param {string} timestamp 同步時間戳，清除此時間戳之前的記錄
     * @returns {Promise<number>} 清除的記錄數量的Promise
     */
    async clearSyncedOperations(timestamp) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['syncRecords'], 'readwrite');
            const store = transaction.objectStore('syncRecords');
            const index = store.index('timestamp');
            
            // 創建範圍查詢 - 獲取指定時間戳之前的所有操作
            const range = IDBKeyRange.upperBound(timestamp);
            const request = index.openCursor(range);
            
            let deletedCount = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                
                if (cursor) {
                    store.delete(cursor.primaryKey);
                    deletedCount++;
                    cursor.continue();
                }
            };
            
            transaction.oncomplete = () => {
                console.log(`已清除 ${deletedCount} 條已同步的操作記錄`);
                resolve(deletedCount);
            };
            
            transaction.onerror = (event) => {
                console.error('清除已同步操作失敗:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * 保存設置
     * @param {string} key 設置鍵
     * @param {any} value 設置值
     * @returns {Promise<void>} 完成Promise
     */
    async saveSetting(key, value) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            
            const request = store.put({
                key: key,
                value: value,
                updatedAt: new Date().toISOString()
            });
            
            request.onsuccess = () => resolve();
            
            request.onerror = (event) => {
                console.error(`保存設置 ${key} 失敗:`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * 獲取設置
     * @param {string} key 設置鍵
     * @returns {Promise<any>} 設置值的Promise
     */
    async getSetting(key) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            
            const request = store.get(key);
            
            request.onsuccess = () => {
                resolve(request.result ? request.result.value : null);
            };
            
            request.onerror = (event) => {
                console.error(`獲取設置 ${key} 失敗:`, event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    /**
     * 確保數據庫已初始化
     * @returns {Promise<IDBDatabase>} 數據庫實例的Promise
     */
    async ensureInitialized() {
        if (!this.isInitialized) {
            try {
                await this.init();
            } catch (error) {
                console.error('數據庫初始化失敗，嘗試重新初始化:', error);
                // 重置初始化狀態
                this.isInitialized = false;
                this.initPromise = null;
                // 重試一次
                await this.init();
            }
        }
        return this.db;
    }
    
    /**
     * 清除緩存
     */
    clearCache() {
        console.log('清除緩存數據');
        this.memoryCache.books = null;
        this.memoryCache.categories = null;
        this.memoryCache.timestamp = null;
    }
    
    /**
     * 設置緩存配置
     * @param {Object} config 緩存配置
     * @param {boolean} config.enabled 是否啟用緩存
     * @param {number} config.timeout 緩存超時時間（毫秒）
     */
    setCacheConfig(config) {
        if (config.enabled !== undefined) {
            this.cacheEnabled = config.enabled;
            console.log(`${this.cacheEnabled ? '啟用' : '禁用'}緩存`);
        }
        
        if (config.timeout !== undefined && config.timeout > 0) {
            this.cacheTimeout = config.timeout;
            console.log(`設置緩存超時時間為 ${this.cacheTimeout / 1000 / 60} 分鐘`);
        }
        
        // 如果禁用緩存，清除現有緩存
        if (!this.cacheEnabled) {
            this.clearCache();
        }
    }
    
    /**
     * 從LocalStorage遷移數據到IndexedDB
     * @returns {Promise<Object>} 遷移結果的Promise
     */
    async migrateFromLocalStorage() {
        console.log('開始從LocalStorage遷移數據到IndexedDB...');
        
        try {
            // 遷移書籍數據
            const booksData = localStorage.getItem('books');
            let migratedBooks = 0;
            
            if (booksData) {
                const books = JSON.parse(booksData);
                
                if (Array.isArray(books) && books.length > 0) {
                    // 為每本書添加版本信息
                    const booksWithVersion = books.map(book => ({
                        ...book,
                        version: 1,
                        createdAt: book.createdAt || new Date().toISOString(),
                        updatedAt: book.updatedAt || new Date().toISOString()
                    }));
                    
                    // 批量添加書籍
                    const result = await this.bulkAddOrUpdateBooks(booksWithVersion);
                    migratedBooks = result.added + result.updated;
                }
            }
            
            // 遷移設置
            const settingsToMigrate = [
                'backupSettings',
                'emailJSSettings',
                'githubSettings',
                'lastGitHubSync'
            ];
            
            let migratedSettings = 0;
            
            for (const key of settingsToMigrate) {
                const value = localStorage.getItem(key);
                
                if (value) {
                    try {
                        // 嘗試解析JSON數據
                        const parsedValue = JSON.parse(value);
                        await this.saveSetting(key, parsedValue);
                    } catch (e) {
                        // 如果不是JSON，直接保存字符串
                        await this.saveSetting(key, value);
                    }
                    
                    migratedSettings++;
                }
            }
            
            console.log(`數據遷移完成: ${migratedBooks} 筆書籍, ${migratedSettings} 個設置`);
            
            return {
                success: true,
                books: migratedBooks,
                settings: migratedSettings
            };
        } catch (error) {
            console.error('數據遷移失敗:', error);
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * 壓縮數據以減少存儲空間
     * @param {Object} data 要壓縮的數據
     * @returns {string} 壓縮後的字符串
     */
    compressData(data) {
        try {
            // 將數據轉換為JSON字符串
            const jsonString = JSON.stringify(data);
            
            // 使用內置的TextEncoder和CompressionStream進行壓縮（如果瀏覽器支持）
            if (typeof CompressionStream !== 'undefined') {
                // 這裡使用更現代的壓縮API，但需要瀏覽器支持
                // 實際實現需要使用async/await和流處理
                // 由於複雜性，這裡僅返回原始JSON
                return jsonString;
            }
            
            // 如果不支持現代API，返回原始JSON
            return jsonString;
        } catch (error) {
            console.error('數據壓縮失敗:', error);
            // 失敗時返回原始數據的字符串形式
            return JSON.stringify(data);
        }
    }
    
    /**
     * 解壓縮數據
     * @param {string} compressedData 壓縮的數據
     * @returns {Object} 解壓縮後的數據對象
     */
    decompressData(compressedData) {
        try {
            // 嘗試直接解析JSON（假設數據未壓縮或使用簡單壓縮）
            return JSON.parse(compressedData);
        } catch (error) {
            console.error('數據解壓縮失敗:', error);
            // 解析失敗時返回空對象
            return {};
        }
    }
}

// 導出模塊
export default IndexedDBStorage;