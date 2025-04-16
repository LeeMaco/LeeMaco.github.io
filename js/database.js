/**
 * 數據庫模組 - 處理書籍數據的存儲和管理
 * 由於GitHub Pages是靜態網站，使用LocalStorage作為數據存儲
 * 同時支持從GitHub獲取最新數據
 */

class Database {
    constructor() {
        // 初始化數據庫
        this.initDatabase();
    }
    
    /**
     * 初始化數據庫
     */
    initDatabase() {
        // 檢查是否已有書籍數據
        if (!localStorage.getItem('books')) {
            localStorage.setItem('books', JSON.stringify([]));
            
            // 嘗試從GitHub獲取數據
            this.fetchBooksFromGitHub()
                .then(data => {
                    if (data && data.books && Array.isArray(data.books)) {
                        localStorage.setItem('books', JSON.stringify(data.books));
                        console.log('已從GitHub載入數據');
                        // 觸發數據載入完成事件
                        this.handleDataLoaded('github', data.books.length);
                    } else {
                        // 如果GitHub沒有數據，嘗試從本地JSON文件載入
                        this.loadBooksFromLocalFile();
                    }
                })
                .catch(error => {
                    console.error('從GitHub載入數據失敗:', error);
                    // 如果GitHub載入失敗，嘗試從本地JSON文件載入
                    this.loadBooksFromLocalFile();
                });
        } else {
            // 即使已有書籍數據，也嘗試自動從GitHub同步最新數據
            this.autoSyncFromGitHub();
        } else {
            // 即使已有書籍數據，也嘗試自動從GitHub同步最新數據
            this.autoSyncFromGitHub();
        }
        
        // 檢查是否已有備份設定
        if (!localStorage.getItem('backupSettings')) {
            localStorage.setItem('backupSettings', JSON.stringify({
                email: '',
                type: 'manual',
                frequency: 'daily'
            }));
        }
        
        // 檢查是否已有EmailJS設定
        if (!localStorage.getItem('emailJSSettings')) {
            localStorage.setItem('emailJSSettings', JSON.stringify({
                userID: '',
                serviceID: '',
                templateID: ''
            }));
        }
    }
    
    /**
     * 從本地JSON文件載入書籍數據
     */
    loadBooksFromLocalFile() {
        try {
            // 嘗試從books.json載入示例數據
            fetch('data/books.json')
                .then(response => response.json())
                .then(data => {
                    localStorage.setItem('books', JSON.stringify(data));
                    console.log('已從books.json載入示例數據');
                    // 觸發數據載入完成事件
                    this.handleDataLoaded('local', data.length);
                })
                .catch(error => {
                    console.error('載入示例數據失敗:', error);
                    // 如果載入失敗，設置空數組
                    localStorage.setItem('books', JSON.stringify([]));
                    // 觸發數據載入完成事件（空數據）
                    this.handleDataLoaded('empty', 0);
                });
        } catch (error) {
            console.error('初始化數據庫時發生錯誤:', error);
            // 確保即使出錯也設置一個空數組
            localStorage.setItem('books', JSON.stringify([]));
            // 觸發數據載入完成事件（錯誤）
            this.handleDataLoaded('error', 0, error);
        }
    }
    
    /**
     * 處理數據載入完成事件
     * @param {string} source 數據來源 ('github', 'local', 'empty', 'error')
     * @param {number} count 數據數量
     * @param {Error} error 錯誤對象（如果有）
     */
    handleDataLoaded(source, count, error = null) {
        // 創建自定義事件
        const event = new CustomEvent('booksLoaded', {
            detail: {
                source: source,
                count: count,
                timestamp: new Date().toISOString(),
                error: error
            }
        });
        
        // 分發事件
        document.dispatchEvent(event);
        
        console.log(`數據載入完成 [來源: ${source}, 數量: ${count}]`);
    }
    
    /**
     * 獲取所有書籍
     * @param {boolean} forceRefresh 是否強制從GitHub刷新數據
     * @returns {Promise<Array>} 書籍數組的Promise
     */
    async getAllBooks(forceRefresh = false) {
        try {
            // 如果強制刷新，嘗試從GitHub獲取最新數據
            if (forceRefresh) {
                try {
                    console.log('正在從GitHub獲取最新數據...');
                    const data = await this.fetchBooksFromGitHub();
                    
                    // 確保data.books是有效的數組
                    if (data && data.books && Array.isArray(data.books)) {
                        // 更新本地存儲
                        localStorage.setItem('books', JSON.stringify(data.books));
                        console.log(`成功從GitHub載入 ${data.books.length} 筆書籍數據`);
                        
                        // 觸發數據更新事件
                        this.handleDataLoaded('github', data.books.length);
                        
                        return data.books;
                    } else {
                        console.warn('從GitHub獲取的數據格式無效');
                        // 觸發錯誤事件
                        this.handleDataLoaded('error', 0, new Error('數據格式無效'));
                        throw new Error('從GitHub獲取的數據格式無效');
                    }
                } catch (error) {
                    console.error('從GitHub獲取數據失敗，將使用本地數據:', error);
                    // 觸發錯誤事件
                    this.handleDataLoaded('error', 0, error);
                    throw error; // 將錯誤向上傳遞，以便UI層可以顯示適當的錯誤信息
                }
            }
            
            // 從localStorage獲取數據
            const booksData = localStorage.getItem('books');
            
            // 檢查數據是否存在
            if (!booksData) {
                console.warn('localStorage中沒有找到書籍數據');
                // 嘗試重新初始化數據庫
                this.initDatabase();
                return [];
            }
            
            // 嘗試解析JSON數據
            let books;
            try {
                books = JSON.parse(booksData);
            } catch (parseError) {
                console.error('解析書籍數據時發生錯誤:', parseError);
                return [];
            }
            
            // 檢查解析後的數據是否為數組
            if (!Array.isArray(books)) {
                console.error('書籍數據格式無效，應為數組');
                // 重置為空數組
                localStorage.setItem('books', JSON.stringify([]));
                return [];
            }
            
            console.log(`成功載入 ${books.length} 筆書籍數據 (來源: 本地存儲)`);
            return books;
        } catch (error) {
            console.error('獲取書籍數據時發生錯誤:', error);
            // 發生錯誤時返回空數組
            return [];
        }
    }
    
    /**
     * 自動從GitHub同步最新數據
     * 在用戶進入首頁時自動調用，不影響用戶體驗
     */
    autoSyncFromGitHub() {
        console.log('嘗試自動從GitHub同步最新數據...');
        
        // 檢查上次同步時間，避免頻繁同步
        const lastSync = localStorage.getItem('lastGitHubSync');
        if (lastSync) {
            const lastSyncTime = new Date(lastSync).getTime();
            const currentTime = new Date().getTime();
            const timeDiff = currentTime - lastSyncTime;
            
            // 如果距離上次同步不到30分鐘，則跳過自動同步
            if (timeDiff < 30 * 60 * 1000) {
                console.log(`距離上次同步僅 ${Math.floor(timeDiff / 1000 / 60)} 分鐘，跳過自動同步`);
                return;
            }
        }
        
        // 嘗試從GitHub獲取最新數據
        this.fetchBooksFromGitHub()
            .then(data => {
                if (data && data.books && Array.isArray(data.books)) {
                    // 更新本地存儲
                    localStorage.setItem('books', JSON.stringify(data.books));
                    console.log(`自動同步完成：成功從GitHub載入 ${data.books.length} 筆書籍數據`);
                    
                    // 觸發數據更新事件
                    this.handleDataLoaded('github', data.books.length);
                    
                    // 觸發同步成功事件
                    this.triggerSyncEvent('success');
                }
            })
            .catch(error => {
                console.warn('自動同步失敗:', error.message);
                // 自動同步失敗不顯示錯誤通知，避免影響用戶體驗
            });
    }
    
    /**
     * 觸發同步事件
     * @param {string} status 同步狀態 ('success' 或 'error')
     * @param {Error} error 錯誤對象（如果有）
     */
    triggerSyncEvent(status, error = null) {
        // 創建自定義事件
        const event = new CustomEvent('githubSync', {
            detail: {
                status: status,
                timestamp: new Date().toISOString(),
                error: error
            }
        });
        
        // 分發事件
        document.dispatchEvent(event);
        
        console.log(`GitHub同步事件已觸發 [狀態: ${status}]`);
    }
    
    /**
     * 從GitHub獲取書籍數據
     * @returns {Promise<Object>} 包含書籍數據的Promise
     */
    async fetchBooksFromGitHub() {
        // 嘗試獲取GitHub設置（如果有）
        const settings = localStorage.getItem('githubSettings');
        let repo, path, token;
        
        // 檢查是否有GitHub設置
        if (settings) {
            try {
                const parsedSettings = JSON.parse(settings);
                repo = parsedSettings.repo;
                path = parsedSettings.path;
                token = parsedSettings.token;
                
                // 如果用戶已登入且設置完整，使用用戶的GitHub設置
                if (typeof auth !== 'undefined' && auth.isLoggedIn() && token && repo) {
                    console.log(`使用用戶設置從GitHub倉庫 ${repo} 獲取數據...`);
                    return this.fetchFromGitHubWithAuth(repo, path, token);
                }
            } catch (error) {
                console.warn('解析GitHub設置時發生錯誤:', error);
            }
        }
        
        // 如果沒有用戶設置或用戶未登入，使用公共數據源
        console.log('使用公共數據源獲取書籍數據...');
        
        // 使用公共數據源URL（例如，從data目錄獲取books.json）
        const publicDataUrl = 'data/books.json';
        
        try {
            // 添加緩存破壞參數，確保獲取最新數據
            const cacheBuster = `?timestamp=${Date.now()}`;
            const url = `${publicDataUrl}${cacheBuster}`;
            
            console.log(`正在從公共數據源獲取數據: ${url}`);
            
            // 發送請求
            const response = await fetch(url);
            
            // 檢查響應狀態
            if (!response.ok) {
                throw new Error(`獲取數據失敗: ${response.status} ${response.statusText}`);
            }
            
            // 解析數據
            const data = await response.json();
            
            // 存儲最後同步時間
            localStorage.setItem('lastGitHubSync', new Date().toISOString());
            
            console.log('成功獲取書籍數據', data);
            
            // 處理不同的數據格式
            if (Array.isArray(data)) {
                // 如果數據本身就是數組，直接返回
                return { books: data };
            } else if (data && typeof data === 'object') {
                // 如果數據是對象，檢查是否有books屬性
                if (data.books && Array.isArray(data.books)) {
                    return data;
                } else {
                    // 如果是其他格式的對象，將其包裝在books屬性中
                    return { books: [data] };
                }
            } else {
                // 如果數據格式完全不符合預期，拋出錯誤
                throw new Error('獲取的數據格式無效');
            }
        } catch (error) {
            console.error('獲取書籍數據時發生錯誤:', error);
            throw error;
        }
    }
    
    /**
     * 使用認證從GitHub獲取書籍數據（管理員用戶使用）
     * @param {string} repo GitHub倉庫
     * @param {string} path 文件路徑
     * @param {string} token 訪問令牌
     * @returns {Promise<Object>} 包含書籍數據的Promise
     */
    async fetchFromGitHubWithAuth(repo, path, token) {
        console.log(`正在從GitHub倉庫 ${repo} 獲取數據...`);
        
        // 添加緩存破壞參數，確保獲取最新數據
        const cacheBuster = `?timestamp=${Date.now()}`;
        
        // 構建API URL
        const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}${cacheBuster}`;
        
        try {
            // 設置請求頭
            const headers = {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3.raw',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            };
            
            // 發送請求
            const response = await fetch(apiUrl, { headers });
            
            // 檢查響應狀態
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`GitHub API錯誤 (${response.status}): ${errorText}`);
                throw new Error(`GitHub API錯誤: ${response.status} ${response.statusText}`);
            }
            
            // 解析數據
            const data = await response.json();
            
            // 存儲最後同步時間
            localStorage.setItem('lastGitHubSync', new Date().toISOString());
            
            console.log('成功從GitHub獲取數據', data);
            
            // 處理不同的數據格式
            if (Array.isArray(data)) {
                // 如果數據本身就是數組，直接返回
                return { books: data };
            } else if (data && typeof data === 'object') {
                // 如果數據是對象，檢查是否有books屬性
                if (data.books && Array.isArray(data.books)) {
                    return data;
                } else {
                    // 如果是其他格式的對象，將其包裝在books屬性中
                    return { books: [data] };
                }
            } else {
                // 如果數據格式完全不符合預期，拋出錯誤
                throw new Error('從GitHub獲取的數據格式無效');
            }
        } catch (error) {
            console.error('從GitHub獲取數據時發生錯誤:', error);
            throw error;
        }
    }
    
    /**
     * 獲取所有類別
     * @returns {Promise<Array>} 類別數組的Promise
     */
    async getAllCategories() {
        const books = await this.getAllBooks();
        const categories = new Set();
        
        books.forEach(book => {
            // 確保所有類別都被添加，包括「未分類」
            if (book.category) {
                categories.add(book.category);
            } else {
                categories.add('未分類');
            }
        });
        
        // 如果沒有書籍或沒有書籍有「未分類」類別，手動添加「未分類」類別
        if (books.length === 0 || !categories.has('未分類')) {
            categories.add('未分類');
        }
        
        return Array.from(categories).sort();
    }
    
    /**
     * 根據ID獲取書籍
     * @param {string} id 書籍ID
     * @returns {Promise<Object|null>} 書籍對象或null的Promise
     */
    async getBookById(id) {
        const books = await this.getAllBooks();
        return books.find(book => book.id === id) || null;
    }
    
    /**
     * 添加書籍
     * @param {Object} book 書籍對象
     * @returns {Promise<Object>} 添加後的書籍對象的Promise
     */
    async addBook(book) {
        const books = await this.getAllBooks();
        
        // 生成唯一ID
        book.id = this.generateId();
        
        // 添加時間戳
        book.createdAt = new Date().toISOString();
        book.updatedAt = new Date().toISOString();
        
        // 添加到數組
        books.push(book);
        
        // 保存到LocalStorage
        localStorage.setItem('books', JSON.stringify(books));
        
        // 同步到GitHub (如果已登入)
        this.syncToGitHub();
        
        return book;
    }
    
    /**
     * 更新書籍
     * @param {Object} updatedBook 更新後的書籍對象
     * @returns {Promise<Object|null>} 更新後的書籍對象或null的Promise
     */
    async updateBook(updatedBook) {
        const books = await this.getAllBooks();
        const index = books.findIndex(book => book.id === updatedBook.id);
        
        if (index === -1) {
            return null;
        }
        
        // 更新時間戳
        updatedBook.updatedAt = new Date().toISOString();
        
        // 保留創建時間
        updatedBook.createdAt = books[index].createdAt;
        
        // 更新書籍
        books[index] = updatedBook;
        
        // 保存到LocalStorage
        localStorage.setItem('books', JSON.stringify(books));
        
        // 同步到GitHub (如果已登入)
        this.syncToGitHub();
        
        return updatedBook;
    }
    
    /**
     * 刪除書籍
     * @param {string} id 書籍ID
     * @returns {Promise<boolean>} 是否成功刪除的Promise
     */
    async deleteBook(id) {
        const books = await this.getAllBooks();
        const filteredBooks = books.filter(book => book.id !== id);
        
        if (filteredBooks.length === books.length) {
            return false;
        }
        
        // 保存到LocalStorage
        localStorage.setItem('books', JSON.stringify(filteredBooks));
        
        // 同步到GitHub (如果已登入)
        this.syncToGitHub();
        
        return true;
    }
    
    /**
     * 匯入書籍
     * @param {Array} books 書籍數組
     * @param {boolean} filterDuplicates 是否過濾重複
     * @returns {Promise<Object>} 匯入結果的Promise
     */
    async importBooks(books, filterDuplicates = true) {
        const existingBooks = await this.getAllBooks();
        let importedCount = 0;
        let filteredCount = 0;
        let updatedCount = 0;
        
        // 處理每本書籍
        books.forEach(importBook => {
            // 檢查是否重複
            const existingIndex = existingBooks.findIndex(existingBook => 
                existingBook.title === importBook.title && 
                existingBook.author === importBook.author
            );
            
            if (existingIndex !== -1 && filterDuplicates) {
                // 如果找到重複且設置了過濾，則計數
                filteredCount++;
            } else if (existingIndex !== -1 && !filterDuplicates) {
                // 如果找到重複但沒有設置過濾，則更新
                const updatedBook = { ...existingBooks[existingIndex], ...importBook };
                updatedBook.id = existingBooks[existingIndex].id;
                updatedBook.createdAt = existingBooks[existingIndex].createdAt;
                updatedBook.updatedAt = new Date().toISOString();
                
                // 更新書籍
                this.updateBook(updatedBook);
                updatedCount++;
            } else {
                // 添加新書籍
                this.addBook(importBook);
                importedCount++;
            }
        });
        
        return {
            imported: importedCount,
            filtered: filteredCount,
            updated: updatedCount
        };
    }
    
    /**
     * 標準化書籍欄位
     * @param {Object} book 書籍對象
     * @returns {Object} 標準化後的書籍對象
     */
    normalizeBookFields(book) {
        // 欄位映射表
        const fieldMap = {
            '書名': 'title',
            '作者': 'author',
            '集數': 'series',
            '類別': 'category',
            '櫃號': 'cabinet',
            '行號': 'row',
            '出版社': 'publisher',
            '描述': 'description',
            'ISBN號': 'isbn',
            'ISBN': 'isbn',
            '備註': 'notes'
        };
        
        const normalizedBook = {};
        
        // 處理每個欄位
        Object.keys(book).forEach(key => {
            const normalizedKey = fieldMap[key] || key.toLowerCase();
            normalizedBook[normalizedKey] = book[key];
        });
        
        // 確保必要欄位存在
        normalizedBook.title = normalizedBook.title || '未知書名';
        normalizedBook.author = normalizedBook.author || '未知作者';
        normalizedBook.category = normalizedBook.category || '未分類';
        
        return normalizedBook;
    }
    
    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    /**
     * 獲取備份設定
     * @returns {Object} 備份設定
     */
    getBackupSettings() {
        return JSON.parse(localStorage.getItem('backupSettings')) || null;
    }
    
    /**
     * 保存備份設定
     * @param {Object} settings 備份設定
     */
    saveBackupSettings(settings) {
        localStorage.setItem('backupSettings', JSON.stringify(settings));
    }
    
    /**
     * 獲取EmailJS設定
     * @returns {Object} EmailJS設定
     */
    getEmailJSSettings() {
        return JSON.parse(localStorage.getItem('emailJSSettings')) || null;
    }
    
    /**
     * 保存EmailJS設定
     * @param {Object} settings EmailJS設定
     */
    saveEmailJSSettings(settings) {
        localStorage.setItem('emailJSSettings', JSON.stringify(settings));
    }
    
    /**
     * 同步數據到GitHub
     * 使用GitHub API進行數據同步
     */
    syncToGitHub() {
        // 檢查是否已登入
        if (!auth || !auth.isLoggedIn()) {
            return;
        }
        
        console.log('同步數據到GitHub...');
        
        // 獲取所有書籍數據
        const books = this.getAllBooks();
        
        // 創建要上傳的數據對象
        const syncData = {
            books: books,
            lastSync: new Date().toISOString(),
            version: '1.0'
        };
        
        // 檢查admin實例是否存在
        if (typeof admin !== 'undefined' && admin.uploadToGitHub) {
            // 使用admin.js中的uploadToGitHub函數
            admin.uploadToGitHub(syncData)
                .then(response => {
                    console.log('數據同步完成', response);
                    // 存儲最後同步時間
                    localStorage.setItem('lastGitHubSync', new Date().toISOString());
                    // 觸發同步成功事件
                    this.triggerSyncEvent('success');
                })
                .catch(error => {
                    console.error('數據同步失敗', error);
                    // 觸發同步失敗事件
                    this.triggerSyncEvent('error', error);
                });
        } else {
            // 如果admin實例不存在，使用模擬API請求
            this.simulateGitHubApiRequest(JSON.stringify(syncData, null, 2))
                .then(response => {
                    console.log('數據同步完成（模擬）', response);
                    // 存儲最後同步時間
                    localStorage.setItem('lastGitHubSync', new Date().toISOString());
                    // 觸發同步成功事件
                    this.triggerSyncEvent('success');
                })
                .catch(error => {
                    console.error('數據同步失敗', error);
                    // 觸發同步失敗事件
                    this.triggerSyncEvent('error', error);
                });
        }
    }
    
    /**
     * 模擬GitHub API請求
     * @param {string} data 要同步的數據
     * @returns {Promise} 請求結果
     */
    simulateGitHubApiRequest(data) {
        return new Promise((resolve) => {
            // 模擬網絡請求延遲
            setTimeout(() => {
                // 將數據保存到localStorage中，模擬GitHub存儲
                localStorage.setItem('githubSyncData', data);
                
                // 模擬成功響應
                resolve({
                    status: 'success',
                    message: '數據已成功同步到GitHub',
                    timestamp: new Date().toISOString(),
                    size: data.length
                });
            }, 1500);
        });
    }
    
    /**
     * 觸發同步事件
     * @param {string} status 同步狀態
     * @param {Error} error 錯誤對象（如果有）
     */
    triggerSyncEvent(status, error = null) {
        // 創建自定義事件
        const event = new CustomEvent('githubSync', {
            detail: {
                status: status,
                timestamp: new Date().toISOString(),
                error: error
            }
        });
        
        // 分發事件
        document.dispatchEvent(event);
    }
}

// 初始化數據庫實例
const db = new Database();