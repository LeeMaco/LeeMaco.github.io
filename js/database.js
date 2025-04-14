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
        if (!localStorage.getItem('books')) {
            // 初始化時添加示例數據
            try {
                // 觸發數據載入開始事件
                document.dispatchEvent(new CustomEvent('booksLoading', { detail: { message: '正在從GitHub獲取最新數據...' } }));
                
                // 嘗試從GitHub獲取books.json數據
                this.fetchBooksFromGitHub()
                    .then(data => {
                        try {
                            // 使用處理函數處理載入的數據
                            this.handleDataLoaded(data, 'GitHub');
                            
                            // 觸發初始化成功事件
                            document.dispatchEvent(new CustomEvent('databaseInitialized', { 
                                detail: { 
                                    source: 'GitHub',
                                    count: data.length,
                                    timestamp: new Date().toISOString() 
                                } 
                            }));
                        } catch (error) {
                            throw error;
                        }
                    })
                    .catch(error => {
                        console.error('從GitHub載入數據失敗:', error);
                        document.dispatchEvent(new CustomEvent('booksLoadingError', { 
                            detail: { 
                                message: '從GitHub獲取數據失敗，嘗試從本地載入', 
                                error: error.message 
                            } 
                        }));
                        
                        // 嘗試從本地載入
                        console.log('嘗試從本地載入數據...');
                        document.dispatchEvent(new CustomEvent('booksLoading', { detail: { message: '正在從本地獲取數據...' } }));
                        
                        fetch('./data/books.json')
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`HTTP錯誤! 狀態: ${response.status}`);
                                }
                                return response.json();
                            })
                            .then(data => {
                                try {
                                    // 使用處理函數處理載入的數據
                                    this.handleDataLoaded(data, '本地');
                                } catch (error) {
                                    throw error;
                                }
                            })
                            .catch(localError => {
                                console.error('載入本地數據失敗:', localError);
                                document.dispatchEvent(new CustomEvent('booksLoadingError', { 
                                    detail: { 
                                        message: '從本地獲取數據失敗，使用默認數據', 
                                        error: localError.message 
                                    } 
                                }));
                                
                                // 如果本地載入也失敗，設置默認示例數據
                                const defaultBooks = this.getDefaultBooks();
                                try {
                                    // 使用處理函數處理默認數據
                                    this.handleDataLoaded(defaultBooks, '默認');
                                } catch (error) {
                                    console.error('處理默認數據失敗:', error);
                                    document.dispatchEvent(new CustomEvent('booksLoadError', { 
                                        detail: { error: '無法載入任何數據，系統可能無法正常運行' } 
                                    }));
                                }
                            });
                    });
            } catch (error) {
                console.error('初始化數據庫時發生錯誤:', error);
                document.dispatchEvent(new CustomEvent('booksLoadError', { detail: { error: error.message } }));
                
                // 確保即使出錯也設置默認示例數據
                const defaultBooks = this.getDefaultBooks();
                try {
                    // 使用處理函數處理默認數據
                    this.handleDataLoaded(defaultBooks, '默認');
                } catch (error) {
                    console.error('處理默認數據失敗:', error);
                    document.dispatchEvent(new CustomEvent('booksLoadError', { 
                        detail: { error: '無法載入任何數據，系統可能無法正常運行' } 
                    }));
                }
            }
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
     * 從GitHub獲取books.json數據
     * @returns {Promise<Array>} 書籍數據的Promise
     */
    async fetchBooksFromGitHub() {
        // GitHub原始內容URL
        const rawUrl = 'https://raw.githubusercontent.com/leemaco/leemaco.github.io/main/data/books.json';
        
        try {
            // 顯示載入狀態
            document.dispatchEvent(new CustomEvent('booksLoading', { detail: { message: '正在從GitHub獲取最新數據...' } }));
            
            // 添加緩存破壞參數，確保獲取最新數據
            const cacheBuster = `?_=${Date.now()}`;
            const response = await fetch(`${rawUrl}${cacheBuster}`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            if (!response.ok) {
                throw new Error(`GitHub API錯誤! 狀態: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`成功從GitHub獲取 ${data.length} 筆最新書籍數據`);
            
            // 觸發數據載入成功事件
            document.dispatchEvent(new CustomEvent('booksLoadedFromGitHub', { 
                detail: { count: data.length, timestamp: new Date().toISOString() } 
            }));
            
            return data;
        } catch (error) {
            console.error('從GitHub獲取數據失敗:', error);
            // 觸發詳細的錯誤事件
            document.dispatchEvent(new CustomEvent('githubFetchError', { 
                detail: { 
                    message: '從GitHub獲取數據失敗', 
                    error: error.message,
                    timestamp: new Date().toISOString()
                } 
            }));
            throw error;
        }
    }
    
    /**
     * 獲取所有書籍
     * @returns {Promise<Array>} 書籍數組的Promise
     */
    async getAllBooks() {
        try {
            // 顯示載入狀態
            document.dispatchEvent(new CustomEvent('booksLoading', { detail: { message: '正在獲取書籍數據...' } }));
            
            try {
                // 首先嘗試從GitHub獲取最新數據
                document.dispatchEvent(new CustomEvent('booksLoading', { detail: { message: '正在從GitHub獲取最新數據...' } }));
                const data = await this.fetchBooksFromGitHub();
                
                // 更新本地存儲
                localStorage.setItem('books', JSON.stringify(data));
                console.log(`已從GitHub更新 ${data.length} 筆書籍數據`);
                
                // 觸發數據更新事件，包含更多詳細信息
                document.dispatchEvent(new CustomEvent('booksUpdated', { 
                    detail: { 
                        count: data.length,
                        source: 'GitHub',
                        timestamp: new Date().toISOString(),
                        message: '已成功從GitHub獲取最新數據'
                    } 
                }));
                
                return data;
            } catch (error) {
                console.warn('無法從GitHub獲取最新數據，使用本地緩存:', error);
                
                // 觸發詳細的錯誤事件
                document.dispatchEvent(new CustomEvent('booksLoadingError', { 
                    detail: { 
                        message: '無法從GitHub獲取最新數據，使用本地緩存', 
                        error: error.message,
                        timestamp: new Date().toISOString(),
                        fallbackSource: 'localStorage'
                    } 
                }));
                
                // 顯示使用本地緩存的載入狀態
                document.dispatchEvent(new CustomEvent('booksLoading', { detail: { message: '正在從本地緩存獲取數據...' } }));
            }
            
            // 嘗試從localStorage獲取數據
            const booksData = localStorage.getItem('books');
            
            // 檢查數據是否存在
            if (!booksData) {
                console.warn('localStorage中沒有找到書籍數據');
                document.dispatchEvent(new CustomEvent('booksLoadingError', { 
                    detail: { 
                        message: 'localStorage中沒有找到書籍數據，嘗試重新初始化', 
                        timestamp: new Date().toISOString() 
                    } 
                }));
                
                // 嘗試重新初始化數據庫
                this.initDatabase();
                return [];
            }
            
            // 嘗試解析JSON數據
            const books = JSON.parse(booksData);
            
            // 檢查解析後的數據是否為數組
            if (!Array.isArray(books)) {
                console.error('書籍數據格式無效，應為數組');
                document.dispatchEvent(new CustomEvent('booksLoadingError', { 
                    detail: { 
                        message: '書籍數據格式無效，應為數組', 
                        timestamp: new Date().toISOString() 
                    } 
                }));
                return [];
            }
            
            console.log(`成功從本地緩存載入 ${books.length} 筆書籍數據`);
            
            // 觸發從本地緩存載入成功事件
            document.dispatchEvent(new CustomEvent('booksLoaded', { 
                detail: { 
                    count: books.length, 
                    source: 'localStorage',
                    timestamp: new Date().toISOString(),
                    message: '已從本地緩存載入數據'
                } 
            }));
            
            return books;
        } catch (error) {
            console.error('獲取書籍數據時發生錯誤:', error);
            
            // 觸發嚴重錯誤事件
            document.dispatchEvent(new CustomEvent('booksLoadError', { 
                detail: { 
                    error: error.message,
                    timestamp: new Date().toISOString(),
                    message: '獲取書籍數據時發生嚴重錯誤'
                } 
            }));
            
            // 發生錯誤時返回空數組
            return [];
        }
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
     * 獲取默認書籍數據
     * @returns {Array} 默認書籍數組
     */
    getDefaultBooks() {
        return [
            {
                "id": "1",
                "title": "JavaScript高級程序設計",
                "author": "Nicholas C. Zakas",
                "volume": "1",
                "category": "science",
                "cabinet": "A",
                "row": "3",
                "publisher": "人民郵電出版社",
                "description": "全面介紹JavaScript語言核心的ECMAScript和DOM、BOM等API",
                "isbn": "9787115275790",
                "notes": "第四版",
                "series": "前端開發系列"
            },
            {
                "id": "2",
                "title": "三體",
                "author": "劉慈欣",
                "volume": "1",
                "category": "fiction",
                "cabinet": "B",
                "row": "2",
                "publisher": "重慶出版社",
                "description": "中國科幻小說的里程碑之作",
                "isbn": "9787536692930",
                "notes": "雨果獎獲獎作品",
                "series": "三體三部曲"
            },
            {
                "id": "3",
                "title": "人類簡史",
                "author": "尤瓦爾·赫拉利",
                "category": "history",
                "cabinet": "C",
                "row": "1",
                "publisher": "中信出版社",
                "description": "從動物到上帝的人類發展史",
                "isbn": "9787508647357",
                "series": "簡史系列"
            },
            {
                "id": "4",
                "title": "三體II：黑暗森林",
                "author": "劉慈欣",
                "volume": "2",
                "category": "fiction",
                "cabinet": "B",
                "row": "2",
                "publisher": "重慶出版社",
                "description": "宇宙社會學黑暗森林法則的精彩闡述",
                "isbn": "9787536693968",
                "notes": "三體三部曲第二部",
                "series": "三體三部曲"
            },
            {
                "id": "5",
                "title": "三體III：死神永生",
                "author": "劉慈欣",
                "volume": "3",
                "category": "fiction",
                "cabinet": "B",
                "row": "2",
                "publisher": "重慶出版社",
                "description": "宇宙盡頭與時間盡頭的終極思考",
                "isbn": "9787229030933",
                "notes": "三體三部曲第三部",
                "series": "三體三部曲"
            }
        ];
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
     */
    syncToGitHub() {
        // 檢查是否已登入
        const auth = new Auth();
        if (!auth.isLoggedIn()) {
            return;
        }
        
        // 檢查是否已設置GitHub
        const admin = new Admin();
        const settings = admin.githubSettings;
        
        if (!settings.token || !settings.repo) {
            console.warn('GitHub設置不完整，無法同步');
            return;
        }
        
        // 觸發同步事件
        document.dispatchEvent(new CustomEvent('syncToGitHub', { 
            detail: { 
                data: this.getAllBooks(),
                settings: settings
            } 
        }));
    }
    
    /**
     * 處理數據載入完成
     * @param {Array} data 載入的數據
     * @param {string} source 數據來源
     */
    handleDataLoaded(data, source) {
        if (!data || !Array.isArray(data)) {
            const errorMsg = '數據格式無效，應為數組';
            console.error(errorMsg);
            document.dispatchEvent(new CustomEvent('booksLoadingError', { 
                detail: { 
                    message: errorMsg, 
                    source: source,
                    timestamp: new Date().toISOString() 
                } 
            }));
            throw new Error(errorMsg);
        }
        
        // 確保數據有效後再保存
        if (data.length > 0) {
            // 保存到localStorage
            localStorage.setItem('books', JSON.stringify(data));
            console.log(`已從${source}載入 ${data.length} 筆書籍數據`);
            
            // 觸發數據載入完成事件，包含更多詳細信息
            document.dispatchEvent(new CustomEvent('booksLoaded', { 
                detail: { 
                    count: data.length, 
                    source: source,
                    timestamp: new Date().toISOString(),
                    message: `已從${source}成功載入 ${data.length} 筆書籍數據`
                } 
            }));
        } else {
            const errorMsg = `${source}數據文件為空`;
            console.error(errorMsg);
            document.dispatchEvent(new CustomEvent('booksLoadingError', { 
                detail: { 
                    message: errorMsg, 
                    source: source,
                    timestamp: new Date().toISOString() 
                } 
            }));
            throw new Error(errorMsg);
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