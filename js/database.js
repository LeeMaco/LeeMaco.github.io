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
            localStorage.setItem('books', JSON.stringify([]));
        }
        
        // 檢查是否已有備份設定
        if (!localStorage.getItem('backupSettings')) {
            localStorage.setItem('backupSettings', JSON.stringify({
                email: '',
                type: 'manual',
                frequency: 'daily'
            }));
        }
    }
    
    /**
     * 獲取所有書籍
     * @returns {Array} 書籍數組
     */
    getAllBooks() {
        return JSON.parse(localStorage.getItem('books')) || [];
    }
    
    /**
     * 獲取所有類別
     * @returns {Array} 類別數組
     */
    getAllCategories() {
        const books = this.getAllBooks();
        const categories = new Set();
        
        books.forEach(book => {
            if (book.category) {
                categories.add(book.category);
            }
        });
        
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
     * 同步數據到GitHub
     * 注意：由於GitHub Pages的限制，這裡只是模擬功能
     */
    syncToGitHub() {
        // 檢查是否已登入
        if (!auth || !auth.isLoggedIn()) {
            return;
        }
        
        // 在實際應用中，這裡會使用GitHub API進行數據同步
        console.log('同步數據到GitHub...');
        
        // 模擬同步過程
        setTimeout(() => {
            console.log('數據同步完成');
        }, 1000);
    }
}

// 初始化數據庫實例
const db = new Database();