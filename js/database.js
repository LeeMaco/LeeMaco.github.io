/**
 * 書籍查詢管理系統 - 數據庫模塊
 * 使用IndexedDB實現本地數據存儲
 */

// 數據庫模塊
const db = {
    // 數據庫名稱和版本
    DB_NAME: 'BookManagementSystem',
    DB_VERSION: 1,
    DB_STORE_NAME: 'books',
    DB_BACKUP_STORE_NAME: 'backups',
    
    // 數據庫實例
    dbInstance: null,
    
    /**
     * 初始化數據庫
     * @returns {Promise<void>}
     */
    init: async function() {
        if (this.dbInstance) {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            // 數據庫升級事件（首次創建或版本更新時觸發）
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 創建書籍存儲對象
                if (!db.objectStoreNames.contains(this.DB_STORE_NAME)) {
                    const bookStore = db.createObjectStore(this.DB_STORE_NAME, { keyPath: 'id' });
                    
                    // 創建索引
                    bookStore.createIndex('title', 'title', { unique: false });
                    bookStore.createIndex('author', 'author', { unique: false });
                    bookStore.createIndex('isbn', 'isbn', { unique: true });
                    bookStore.createIndex('category', 'category', { unique: false });
                }
                
                // 創建備份存儲對象
                if (!db.objectStoreNames.contains(this.DB_BACKUP_STORE_NAME)) {
                    const backupStore = db.createObjectStore(this.DB_BACKUP_STORE_NAME, { keyPath: 'id', autoIncrement: true });
                    backupStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
            
            request.onsuccess = (event) => {
                this.dbInstance = event.target.result;
                console.log('數據庫連接成功');
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('數據庫連接失敗:', event.target.error);
                reject(event.target.error);
            };
        });
    },
    
    /**
     * 獲取書籍存儲對象
     * @param {string} mode - 事務模式 (readonly/readwrite)
     * @returns {IDBObjectStore}
     */
    getBookStore: function(mode = 'readonly') {
        const transaction = this.dbInstance.transaction([this.DB_STORE_NAME], mode);
        return transaction.objectStore(this.DB_STORE_NAME);
    },
    
    /**
     * 獲取備份存儲對象
     * @param {string} mode - 事務模式 (readonly/readwrite)
     * @returns {IDBObjectStore}
     */
    getBackupStore: function(mode = 'readonly') {
        const transaction = this.dbInstance.transaction([this.DB_BACKUP_STORE_NAME], mode);
        return transaction.objectStore(this.DB_BACKUP_STORE_NAME);
    },
    
    /**
     * 添加書籍
     * @param {Object} book - 書籍對象
     * @returns {Promise<string>} - 返回書籍ID
     */
    addBook: function(book) {
        return new Promise((resolve, reject) => {
            // 生成唯一ID
            if (!book.id) {
                book.id = 'book_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            }
            
            // 添加創建時間
            if (!book.createdAt) {
                book.createdAt = new Date().toISOString();
            }
            book.updatedAt = new Date().toISOString();
            
            const store = this.getBookStore('readwrite');
            const request = store.add(book);
            
            request.onsuccess = () => resolve(book.id);
            request.onerror = (event) => reject(event.target.error);
        });
    },
    
    /**
     * 更新書籍
     * @param {Object} book - 書籍對象
     * @returns {Promise<boolean>} - 是否更新成功
     */
    updateBook: function(book) {
        return new Promise((resolve, reject) => {
            // 更新時間
            book.updatedAt = new Date().toISOString();
            
            const store = this.getBookStore('readwrite');
            const request = store.put(book);
            
            request.onsuccess = () => resolve(true);
            request.onerror = (event) => reject(event.target.error);
        });
    },
    
    /**
     * 刪除書籍
     * @param {string} id - 書籍ID
     * @returns {Promise<boolean>} - 是否刪除成功
     */
    deleteBook: function(id) {
        return new Promise((resolve, reject) => {
            const store = this.getBookStore('readwrite');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve(true);
            request.onerror = (event) => reject(event.target.error);
        });
    },
    
    /**
     * 根據ID獲取書籍
     * @param {string} id - 書籍ID
     * @returns {Promise<Object|null>} - 書籍對象
     */
    getBookById: function(id) {
        return new Promise((resolve, reject) => {
            const store = this.getBookStore();
            const request = store.get(id);
            
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = (event) => reject(event.target.error);
        });
    },
    
    /**
     * 獲取所有書籍
     * @returns {Promise<Array>} - 書籍數組
     */
    getAllBooks: function() {
        return new Promise((resolve, reject) => {
            const store = this.getBookStore();
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (event) => reject(event.target.error);
        });
    },
    
    /**
     * 根據書名搜索書籍
     * @param {string} title - 書名關鍵字
     * @returns {Promise<Array>} - 書籍數組
     */
    searchBooksByTitle: function(title) {
        return new Promise((resolve, reject) => {
            this.getAllBooks().then(books => {
                const keyword = title.toLowerCase();
                const results = books.filter(book => 
                    book.title && book.title.toLowerCase().includes(keyword)
                );
                resolve(results);
            }).catch(reject);
        });
    },
    
    /**
     * 根據作者搜索書籍
     * @param {string} author - 作者關鍵字
     * @returns {Promise<Array>} - 書籍數組
     */
    searchBooksByAuthor: function(author) {
        return new Promise((resolve, reject) => {
            this.getAllBooks().then(books => {
                const keyword = author.toLowerCase();
                const results = books.filter(book => 
                    book.author && book.author.toLowerCase().includes(keyword)
                );
                resolve(results);
            }).catch(reject);
        });
    },
    
    /**
     * 導入書籍數據
     * @param {Array} books - 書籍數據數組
     * @returns {Promise<number>} - 導入成功的數量
     */
    importBooks: async function(books) {
        let successCount = 0;
        
        for (const book of books) {
            try {
                await this.addBook(book);
                successCount++;
            } catch (error) {
                console.error('導入書籍失敗:', error);
            }
        }
        
        return successCount;
    },
    
    /**
     * 導出書籍數據
     * @returns {Promise<Array>} - 書籍數據數組
     */
    exportBooks: async function() {
        return this.getAllBooks();
    },
    
    /**
     * 創建數據備份
     * @returns {Promise<number>} - 備份ID
     */
    createBackup: async function() {
        const books = await this.getAllBooks();
        const backup = {
            timestamp: new Date().toISOString(),
            data: books,
            count: books.length
        };
        
        return new Promise((resolve, reject) => {
            const store = this.getBackupStore('readwrite');
            const request = store.add(backup);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    },
    
    /**
     * 獲取所有備份
     * @returns {Promise<Array>} - 備份數組
     */
    getAllBackups: function() {
        return new Promise((resolve, reject) => {
            const store = this.getBackupStore();
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (event) => reject(event.target.error);
        });
    },
    
    /**
     * 從備份恢復數據
     * @param {number} backupId - 備份ID
     * @returns {Promise<boolean>} - 是否恢復成功
     */
    restoreFromBackup: async function(backupId) {
        try {
            // 獲取備份數據
            const backup = await new Promise((resolve, reject) => {
                const store = this.getBackupStore();
                const request = store.get(backupId);
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            });
            
            if (!backup || !backup.data) {
                throw new Error('備份數據無效');
            }
            
            // 清空當前數據
            await this.clearAllBooks();
            
            // 導入備份數據
            await this.importBooks(backup.data);
            
            return true;
        } catch (error) {
            console.error('從備份恢復失敗:', error);
            return false;
        }
    },
    
    /**
     * 清空所有書籍數據
     * @returns {Promise<boolean>} - 是否清空成功
     */
    clearAllBooks: function() {
        return new Promise((resolve, reject) => {
            const store = this.getBookStore('readwrite');
            const request = store.clear();
            
            request.onsuccess = () => resolve(true);
            request.onerror = (event) => reject(event.target.error);
        });
    },
    
    /**
     * 初始化示例數據（僅在數據庫為空時）
     * @returns {Promise<void>}
     */
    initSampleData: async function() {
        const books = await this.getAllBooks();
        
        // 如果已有數據，則不初始化
        if (books.length > 0) {
            return;
        }
        
        // 示例書籍數據
        const sampleBooks = [
            {
                title: '資料結構與演算法',
                author: '張三',
                category: '計算機科學',
                publisher: '台灣科技出版社',
                isbn: '9789574553717',
                shelf: 'A',
                row: '1',
                description: '本書詳細介紹了常見的資料結構與演算法，適合計算機科學專業的學生閱讀。'
            },
            {
                title: '人工智能導論',
                author: '李四',
                category: '計算機科學',
                publisher: '未來科技出版社',
                isbn: '9789574553724',
                shelf: 'A',
                row: '2',
                description: '本書介紹了人工智能的基本概念和應用，包括機器學習、深度學習等內容。'
            },
            {
                title: '台灣文學史',
                author: '王五',
                category: '文學',
                publisher: '文化出版社',
                isbn: '9789574553731',
                shelf: 'B',
                row: '1',
                description: '本書系統地介紹了台灣文學的發展歷程，從早期到現代的重要作家和作品。'
            },
            {
                title: '經濟學原理',
                author: '趙六',
                category: '經濟',
                publisher: '商業出版社',
                isbn: '9789574553748',
                shelf: 'C',
                row: '1',
                description: '本書介紹了經濟學的基本原理和應用，包括微觀經濟學和宏觀經濟學的內容。'
            },
            {
                title: '現代物理學',
                author: '孫七',
                category: '物理',
                publisher: '科學出版社',
                isbn: '9789574553755',
                shelf: 'D',
                row: '1',
                description: '本書介紹了現代物理學的基本理論，包括量子力學、相對論等內容。'
            }
        ];
        
        // 導入示例數據
        await this.importBooks(sampleBooks);
        console.log('示例數據初始化完成');
    }
};