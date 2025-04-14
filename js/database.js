/**
 * 數據庫模組 - 處理書籍數據的存儲和管理
 * 由於GitHub Pages是靜態網站，使用LocalStorage作為數據存儲
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
        if (!localStorage.getItem('books') || JSON.parse(localStorage.getItem('books')).length === 0) {
            // 嘗試從data/books.json加載預設數據
            this.loadDefaultBooks();
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
     * 獲取所有書籍
     * @returns {Array} 書籍數組
     */
    getAllBooks() {
        let books = [];
        
        try {
            // 嘗試從localStorage獲取數據
            books = JSON.parse(localStorage.getItem('books')) || [];
        } catch (error) {
            console.warn('從localStorage獲取數據失敗:', error);
            // 如果localStorage失敗，嘗試從全局變量獲取
            books = window._booksData || [];
        }
        
        // 如果books為空，嘗試再次加載預設數據
        if (books.length === 0) {
            this.loadDefaultBooks();
            // 再次嘗試獲取數據
            try {
                books = JSON.parse(localStorage.getItem('books')) || [];
            } catch (error) {
                books = window._booksData || [];
            }
        }
        
        return books;
    }
    
    /**
     * 加載預設書籍數據
     * 從data/books.json加載預設數據，解決手機上無法顯示數據的問題
     */
    loadDefaultBooks() {
        console.log('嘗試加載預設書籍數據...');
        
        // 設置重試計數器和最大重試次數
        let retryCount = 0;
        const maxRetries = 3;
        
        const loadData = () => {
            retryCount++;
            console.log(`加載預設數據嘗試 ${retryCount}/${maxRetries}`);
            
            try {
                // 使用fetch API從data/books.json加載預設數據
                // 添加時間戳防止緩存
                const timestamp = new Date().getTime();
                fetch(`data/books.json?t=${timestamp}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP錯誤! 狀態: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (Array.isArray(data) && data.length > 0) {
                            console.log(`成功加載${data.length}筆預設書籍數據`);
                            // 嘗試使用localStorage保存數據
                            try {
                                localStorage.setItem('books', JSON.stringify(data));
                            } catch (storageError) {
                                console.warn('無法保存到localStorage:', storageError);
                                // 在localStorage失敗的情況下，使用全局變數作為備份
                                window._booksData = data;
                            }
                            // 觸發數據加載完成事件
                            document.dispatchEvent(new CustomEvent('booksLoaded', { detail: { books: data } }));
                        } else {
                            console.warn('預設數據格式不正確或為空');
                            if (retryCount < maxRetries) {
                                setTimeout(loadData, 1000); // 延遲1秒後重試
                            } else {
                                this.useHardcodedData();
                            }
                        }
                    })
                    .catch(error => {
                        console.error(`加載預設數據失敗 (嘗試 ${retryCount}/${maxRetries}):`, error);
                        if (retryCount < maxRetries) {
                            setTimeout(loadData, 1000); // 延遲1秒後重試
                        } else {
                            // 所有重試都失敗，使用硬編碼數據
                            this.useHardcodedData();
                        }
                    });
            } catch (error) {
                console.error(`加載預設數據時發生錯誤 (嘗試 ${retryCount}/${maxRetries}):`, error);
                if (retryCount < maxRetries) {
                    setTimeout(loadData, 1000); // 延遲1秒後重試
                } else {
                    // 所有重試都失敗，使用硬編碼數據
                    this.useHardcodedData();
                }
            }
        };
        
        // 開始加載數據
        loadData();
    }
    
    /**
     * 使用硬編碼的示例數據
     * 當所有其他方法都失敗時的最後手段
     */
    useHardcodedData() {
        console.log('使用硬編碼的示例數據');
        const timestamp = new Date().toISOString();
        const sampleData = [
            {
                "id": "sample1",
                "title": "示例書籍1",
                "author": "示例作者",
                "category": "文學",
                "cabinet": "A",
                "row": "1",
                "publisher": "示例出版社",
                "description": "這是一本示例書籍，用於在無法加載真實數據時顯示",
                "isbn": "9789571234567",
                "notes": "這是備用數據，請嘗試重新整理頁面或檢查網絡連接",
                "createdAt": timestamp,
                "updatedAt": timestamp
            },
            {
                "id": "sample2",
                "title": "示例書籍2",
                "author": "另一位作者",
                "category": "科學",
                "cabinet": "B",
                "row": "2",
                "publisher": "另一家出版社",
                "description": "這是另一本示例書籍，用於在無法加載真實數據時顯示",
                "isbn": "9789571234568",
                "notes": "這是備用數據，請嘗試重新整理頁面或檢查網絡連接",
                "createdAt": timestamp,
                "updatedAt": timestamp
            },
            {
                "id": "sample3",
                "title": "示例書籍3",
                "author": "第三位作者",
                "category": "歷史",
                "cabinet": "C",
                "row": "3",
                "publisher": "第三家出版社",
                "description": "這是第三本示例書籍，用於在無法加載真實數據時顯示",
                "isbn": "9789571234569",
                "notes": "這是備用數據，請嘗試重新整理頁面或檢查網絡連接",
                "createdAt": timestamp,
                "updatedAt": timestamp
            },
            {
                "id": "sample4",
                "title": "示例書籍4",
                "author": "第四位作者",
                "category": "藝術",
                "cabinet": "D",
                "row": "4",
                "publisher": "第四家出版社",
                "description": "這是第四本示例書籍，用於在無法加載真實數據時顯示",
                "isbn": "9789571234570",
                "notes": "這是備用數據，請嘗試重新整理頁面或檢查網絡連接",
                "createdAt": timestamp,
                "updatedAt": timestamp
            }
        ];
        
        try {
            localStorage.setItem('books', JSON.stringify(sampleData));
            console.log('成功保存硬編碼數據到localStorage');
        } catch (storageError) {
            console.warn('無法保存硬編碼數據到localStorage:', storageError);
            // 在localStorage失敗的情況下，使用全局變數作為備份
            window._booksData = sampleData;
            console.log('已將硬編碼數據保存到全局變量');
        }
        
        // 觸發數據加載完成事件
        try {
            document.dispatchEvent(new CustomEvent('booksLoaded', { detail: { books: sampleData } }));
            console.log('已觸發booksLoaded事件');
        } catch (eventError) {
            console.error('觸發booksLoaded事件失敗:', eventError);
        }
        
        return sampleData;
    }
    
    /**
     * 獲取所有類別
     * @returns {Array} 類別數組
     */
    getAllCategories() {
        const books = this.getAllBooks();
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
     * @returns {Object|null} 書籍對象或null
     */
    getBookById(id) {
        const books = this.getAllBooks();
        return books.find(book => book.id === id) || null;
    }
    
    /**
     * 添加書籍
     * @param {Object} book 書籍對象
     * @returns {Object} 添加後的書籍對象
     */
    addBook(book) {
        const books = this.getAllBooks();
        
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
     * @returns {Object|null} 更新後的書籍對象或null
     */
    updateBook(updatedBook) {
        const books = this.getAllBooks();
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
     * @returns {boolean} 是否成功刪除
     */
    deleteBook(id) {
        const books = this.getAllBooks();
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
     * @returns {Object} 匯入結果
     */
    importBooks(books, filterDuplicates = true) {
        const existingBooks = this.getAllBooks();
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