/**
 * 數據庫模組 - 處理書籍數據的存儲和管理
 * 優化版本：使用IndexedDB代替LocalStorage，實現增量同步和數據加密
 */

import DatabaseManager from './storage/DatabaseManager.js';
import SecurityManager from './storage/SecurityManager.js';

class DatabaseModule {
    constructor() {
        // 初始化數據庫管理器和安全管理器
        this.dbManager = new DatabaseManager();
        this.securityManager = new SecurityManager();
        
        // 初始化觀察者列表（實現觀察者模式）
        this.observers = new Map();
        
        // 註冊事件監聽器
        this.registerEventListeners();
    }
    
    /**
     * 註冊事件監聽器
     */
    registerEventListeners() {
        // 監聽數據載入完成事件
        document.addEventListener('booksLoaded', (event) => {
            this.notifyObservers('booksLoaded', event.detail);
        });
        
        // 監聽GitHub同步事件
        document.addEventListener('githubSync', (event) => {
            this.notifyObservers('githubSync', event.detail);
        });
    }
    
    /**
     * 獲取所有書籍
     * @param {boolean} forceRefresh 是否強制從GitHub刷新數據
     * @returns {Promise<Array>} 書籍數組的Promise
     */
    async getAllBooks(forceRefresh = false) {
        try {
            return await this.dbManager.getAllBooks(forceRefresh);
        } catch (error) {
            console.error('獲取所有書籍失敗:', error);
            this.notifyObservers('error', { type: 'getAllBooks', error });
            return [];
        }
    }
    
    /**
     * 根據ID獲取書籍
     * @param {string} id 書籍ID
     * @returns {Promise<Object|null>} 書籍對象或null的Promise
     */
    async getBookById(id) {
        try {
            return await this.dbManager.getBookById(id);
        } catch (error) {
            console.error(`獲取書籍 ID:${id} 失敗:`, error);
            this.notifyObservers('error', { type: 'getBookById', error, id });
            return null;
        }
    }
    
    /**
     * 添加書籍
     * @param {Object} book 書籍對象
     * @returns {Promise<Object>} 添加後的書籍對象的Promise
     */
    async addBook(book) {
        try {
            const result = await this.dbManager.addBook(book);
            this.notifyObservers('bookAdded', { book: result });
            return result;
        } catch (error) {
            console.error('添加書籍失敗:', error);
            this.notifyObservers('error', { type: 'addBook', error, book });
            throw error;
        }
    }
    
    /**
     * 更新書籍
     * @param {Object} updatedBook 更新後的書籍對象
     * @returns {Promise<Object|null>} 更新後的書籍對象或null的Promise
     */
    async updateBook(updatedBook) {
        try {
            const result = await this.dbManager.updateBook(updatedBook);
            if (result) {
                this.notifyObservers('bookUpdated', { book: result });
            }
            return result;
        } catch (error) {
            console.error('更新書籍失敗:', error);
            this.notifyObservers('error', { type: 'updateBook', error, book: updatedBook });
            throw error;
        }
    }
    
    /**
     * 刪除書籍
     * @param {string} id 書籍ID
     * @returns {Promise<boolean>} 是否成功刪除的Promise
     */
    async deleteBook(id) {
        try {
            const result = await this.dbManager.deleteBook(id);
            if (result) {
                this.notifyObservers('bookDeleted', { id });
            }
            return result;
        } catch (error) {
            console.error('刪除書籍失敗:', error);
            this.notifyObservers('error', { type: 'deleteBook', error, id });
            throw error;
        }
    }
    
    /**
     * 批量添加或更新書籍
     * @param {Array} books 書籍數組
     * @param {boolean} filterDuplicates 是否過濾重複
     * @returns {Promise<Object>} 匯入結果的Promise
     */
    async importBooks(books, filterDuplicates = true) {
        try {
            // 標準化書籍欄位
            const normalizedBooks = books.map(book => this.normalizeBookFields(book));
            
            // 如果設置了過濾重複，先獲取現有書籍進行比較
            let result;
            if (filterDuplicates) {
                const existingBooks = await this.getAllBooks();
                const existingTitles = new Set(existingBooks.map(book => `${book.title}|${book.author}`));
                
                // 過濾掉重複的書籍
                const uniqueBooks = normalizedBooks.filter(book => {
                    const key = `${book.title}|${book.author}`;
                    return !existingTitles.has(key);
                });
                
                // 批量添加不重複的書籍
                result = await this.dbManager.bulkAddOrUpdateBooks(uniqueBooks);
                result.filtered = normalizedBooks.length - uniqueBooks.length;
            } else {
                // 不過濾重複，直接批量添加或更新
                result = await this.dbManager.bulkAddOrUpdateBooks(normalizedBooks);
                result.filtered = 0;
            }
            
            this.notifyObservers('booksImported', { 
                added: result.added, 
                updated: result.updated, 
                filtered: result.filtered,
                total: books.length
            });
            
            return {
                imported: result.added,
                updated: result.updated,
                filtered: result.filtered
            };
        } catch (error) {
            console.error('匯入書籍失敗:', error);
            this.notifyObservers('error', { type: 'importBooks', error });
            throw error;
        }
    }
    
    /**
     * 獲取所有類別
     * @returns {Promise<Array>} 類別數組的Promise
     */
    async getAllCategories() {
        try {
            return await this.dbManager.getAllCategories();
        } catch (error) {
            console.error('獲取所有類別失敗:', error);
            this.notifyObservers('error', { type: 'getAllCategories', error });
            return ['未分類'];
        }
    }
    
    /**
     * 同步數據到GitHub
     * @returns {Promise<Object>} 同步結果的Promise
     */
    async syncToGitHub() {
        try {
            const result = await this.dbManager.syncToGitHub();
            return result;
        } catch (error) {
            console.error('同步到GitHub失敗:', error);
            this.notifyObservers('error', { type: 'syncToGitHub', error });
            throw error;
        }
    }
    
    /**
     * 從GitHub同步數據
     * @param {boolean} forceRefresh 是否強制刷新
     * @returns {Promise<Object>} 同步結果的Promise
     */
    async syncFromGitHub(forceRefresh = false) {
        try {
            return await this.dbManager.syncFromGitHub(forceRefresh);
        } catch (error) {
            console.error('從GitHub同步失敗:', error);
            this.notifyObservers('error', { type: 'syncFromGitHub', error });
            throw error;
        }
    }
    
    /**
     * 檢查數據一致性
     * @returns {Promise<Object>} 一致性檢查結果的Promise
     */
    async checkDataConsistency() {
        try {
            return await this.dbManager.checkDataConsistency();
        } catch (error) {
            console.error('檢查數據一致性失敗:', error);
            this.notifyObservers('error', { type: 'checkDataConsistency', error });
            throw error;
        }
    }
    
    /**
     * 獲取備份設定
     * @returns {Promise<Object>} 備份設定的Promise
     */
    async getBackupSettings() {
        try {
            const settings = await this.dbManager.getBackupSettings();
            return settings;
        } catch (error) {
            console.error('獲取備份設定失敗:', error);
            this.notifyObservers('error', { type: 'getBackupSettings', error });
            return {
                email: '',
                type: 'manual',
                frequency: 'daily'
            };
        }
    }
    
    /**
     * 保存備份設定
     * @param {Object} settings 備份設定
     * @returns {Promise<void>}
     */
    async saveBackupSettings(settings) {
        try {
            await this.dbManager.saveBackupSettings(settings);
            this.notifyObservers('settingsUpdated', { type: 'backup', settings });
        } catch (error) {
            console.error('保存備份設定失敗:', error);
            this.notifyObservers('error', { type: 'saveBackupSettings', error });
            throw error;
        }
    }
    
    /**
     * 獲取EmailJS設定
     * @returns {Promise<Object>} EmailJS設定的Promise
     */
    async getEmailJSSettings() {
        try {
            const settings = await this.dbManager.getEmailJSSettings();
            return settings;
        } catch (error) {
            console.error('獲取EmailJS設定失敗:', error);
            this.notifyObservers('error', { type: 'getEmailJSSettings', error });
            return {
                userID: '',
                serviceID: '',
                templateID: ''
            };
        }
    }
    
    /**
     * 保存EmailJS設定
     * @param {Object} settings EmailJS設定
     * @returns {Promise<void>}
     */
    async saveEmailJSSettings(settings) {
        try {
            // 加密敏感數據
            const encryptedSettings = this.securityManager.encryptSettings(settings);
            await this.dbManager.saveEmailJSSettings(encryptedSettings);
            this.notifyObservers('settingsUpdated', { type: 'emailjs', settings });
        } catch (error) {
            console.error('保存EmailJS設定失敗:', error);
            this.notifyObservers('error', { type: 'saveEmailJSSettings', error });
            throw error;
        }
    }
    
    /**
     * 獲取GitHub設置
     * @returns {Promise<Object>} GitHub設置的Promise
     */
    async getGitHubSettings() {
        try {
            const settings = await this.dbManager.getGitHubSettings();
            // 解密敏感數據
            return this.securityManager.decryptSettings(settings);
        } catch (error) {
            console.error('獲取GitHub設置失敗:', error);
            this.notifyObservers('error', { type: 'getGitHubSettings', error });
            return {
                repo: '',
                path: '',
                token: ''
            };
        }
    }
    
    /**
     * 保存GitHub設置
     * @param {Object} settings GitHub設置
     * @returns {Promise<void>}
     */
    async saveGitHubSettings(settings) {
        try {
            // 加密敏感數據
            const encryptedSettings = this.securityManager.encryptSettings(settings);
            await this.dbManager.saveGitHubSettings(encryptedSettings);
            this.notifyObservers('settingsUpdated', { type: 'github', settings: { ...settings, token: '******' } });
        } catch (error) {
            console.error('保存GitHub設置失敗:', error);
            this.notifyObservers('error', { type: 'saveGitHubSettings', error });
            throw error;
        }
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
     * 註冊觀察者（實現觀察者模式）
     * @param {string} event 事件名稱
     * @param {Function} callback 回調函數
     * @returns {string} 觀察者ID
     */
    registerObserver(event, callback) {
        if (!this.observers.has(event)) {
            this.observers.set(event, new Map());
        }
        
        const observerId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        this.observers.get(event).set(observerId, callback);
        
        return observerId;
    }
    
    /**
     * 移除觀察者
     * @param {string} event 事件名稱
     * @param {string} observerId 觀察者ID
     * @returns {boolean} 是否成功移除
     */
    removeObserver(event, observerId) {
        if (!this.observers.has(event)) {
            return false;
        }
        
        return this.observers.get(event).delete(observerId);
    }
    
    /**
     * 通知觀察者
     * @param {string} event 事件名稱
     * @param {any} data 事件數據
     */
    notifyObservers(event, data) {
        if (!this.observers.has(event)) {
            return;
        }
        
        this.observers.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`執行觀察者回調時發生錯誤 (${event}):`, error);
            }
        });
    }
}

// 初始化數據庫模塊實例
const db = new DatabaseModule();

// 導出模塊
export default db;