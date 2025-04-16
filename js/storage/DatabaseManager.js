/**
 * 數據庫管理模塊 - 整合IndexedDB存儲和GitHub同步功能
 * 實現模塊化設計，提供統一的數據訪問接口
 */

import IndexedDBStorage from './IndexedDBStorage.js';
import GitHubSync from './GitHubSync.js';

class DatabaseManager {
    constructor() {
        // 初始化存儲和同步模塊
        this.storage = new IndexedDBStorage();
        this.githubSync = new GitHubSync(this.storage);
        
        // 錯誤處理策略
        this.errorHandlers = new Map();
        
        // 初始化數據庫
        this.initDatabase();
        
        // 註冊默認錯誤處理器
        this.registerDefaultErrorHandlers();
    }
    
    /**
     * 初始化數據庫
     */
    async initDatabase() {
        try {
            console.log('初始化數據庫管理器...');
            
            // 檢查是否需要從LocalStorage遷移數據
            const migrated = await this.storage.getSetting('migratedFromLocalStorage');
            
            if (!migrated && localStorage.getItem('books')) {
                console.log('檢測到LocalStorage數據，開始遷移...');
                const result = await this.storage.migrateFromLocalStorage();
                
                if (result.success) {
                    // 標記已完成遷移
                    await this.storage.saveSetting('migratedFromLocalStorage', true);
                    console.log(`數據遷移完成: ${result.books} 筆書籍, ${result.settings} 個設置`);
                    
                    // 觸發數據載入完成事件
                    this.triggerDataLoadedEvent('migration', result.books);
                } else {
                    console.error('數據遷移失敗:', result.error);
                }
            }
            
            // 檢查是否有書籍數據
            const books = await this.storage.getAllBooks();
            
            if (books.length === 0) {
                console.log('未找到書籍數據，嘗試從GitHub同步...');
                
                try {
                    // 嘗試從GitHub獲取數據
                    await this.githubSync.syncFromGitHub(true);
                } catch (error) {
                    console.error('從GitHub同步失敗，嘗試從本地JSON文件載入:', error);
                    // 如果GitHub同步失敗，嘗試從本地JSON文件載入
                    await this.loadBooksFromLocalFile();
                }
            } else {
                // 即使已有書籍數據，也嘗試自動從GitHub同步最新數據
                this.autoSyncFromGitHub();
            }
            
            console.log('數據庫管理器初始化完成');
        } catch (error) {
            console.error('初始化數據庫管理器時發生錯誤:', error);
            this.handleError('init', error);
        }
    }
    
    /**
     * 從本地JSON文件載入書籍數據
     */
    async loadBooksFromLocalFile() {
        try {
            console.log('嘗試從本地JSON文件載入數據...');
            
            // 嘗試從books.json載入示例數據
            const response = await fetch('data/books.json');
            
            if (!response.ok) {
                throw new Error(`載入失敗: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // 處理不同的數據格式
            let books;
            if (Array.isArray(data)) {
                books = data;
            } else if (data && typeof data === 'object') {
                books = data.books && Array.isArray(data.books) ? data.books : [data];
            } else {
                throw new Error('數據格式無效');
            }
            
            // 批量添加書籍
            const result = await this.storage.bulkAddOrUpdateBooks(books);
            
            console.log(`已從books.json載入數據，共 ${books.length} 筆`);
            
            // 觸發數據載入完成事件
            this.triggerDataLoadedEvent('local', books.length);
            
            return result;
        } catch (error) {
            console.error('載入本地JSON文件失敗:', error);
            this.handleError('loadLocal', error);
            
            // 觸發數據載入完成事件（空數據）
            this.triggerDataLoadedEvent('empty', 0, error);
            
            return { added: 0, updated: 0, errors: 0 };
        }
    }
    
    /**
     * 自動從GitHub同步最新數據
     */
    async autoSyncFromGitHub() {
        try {
            console.log('嘗試自動從GitHub同步最新數據...');
            
            // 使用GitHubSync模塊進行同步
            const result = await this.githubSync.syncFromGitHub(false);
            
            if (result.status === 'success') {
                console.log(`自動同步完成: 添加 ${result.added}, 更新 ${result.updated}, 共 ${result.total} 筆數據`);
            } else if (result.status === 'skipped') {
                console.log(`自動同步已跳過: ${result.message}`);
            } else {
                console.warn(`自動同步失敗: ${result.message}`);
            }
            
            return result;
        } catch (error) {
            console.warn('自動同步過程中發生錯誤:', error);
            // 自動同步失敗不顯示錯誤通知，避免影響用戶體驗
            return { status: 'error', message: error.message };
        }
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
                console.log('正在從GitHub獲取最新數據...');
                
                const result = await this.githubSync.syncFromGitHub(true);
                
                if (result.status === 'success') {
                    console.log(`成功從GitHub刷新數據，共 ${result.total} 筆`);
                } else {
                    console.warn(`從GitHub刷新數據失敗: ${result.message}`);
                }
            }
            
            // 從IndexedDB獲取所有書籍
            const books = await this.storage.getAllBooks();
            console.log(`成功載入 ${books.length} 筆書籍數據`);
            
            return books;
        } catch (error) {
            console.error('獲取書籍數據時發生錯誤:', error);
            this.handleError('getAllBooks', error);
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
            return await this.storage.getBookById(id);
        } catch (error) {
            console.error(`獲取書籍 ID:${id} 失敗:`, error);
            this.handleError('getBookById', error);
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
            // 生成唯一ID
            if (!book.id) {
                book.id = this.generateId();
            }
            
            // 添加書籍到IndexedDB
            const result = await this.storage.addBook(book);
            
            // 嘗試同步到GitHub
            this.syncToGitHub();
            
            return result;
        } catch (error) {
            console.error('添加書籍失敗:', error);
            this.handleError('addBook', error);
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
            // 更新書籍
            const result = await this.storage.updateBook(updatedBook);
            
            // 嘗試同步到GitHub
            this.syncToGitHub();
            
            return result;
        } catch (error) {
            console.error('更新書籍失敗:', error);
            this.handleError('updateBook', error);
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
            // 刪除書籍
            const result = await this.storage.deleteBook(id);
            
            // 嘗試同步到GitHub
            this.syncToGitHub();
            
            return result;
        } catch (error) {
            console.error('刪除書籍失敗:', error);
            this.handleError('deleteBook', error);
            throw error;
        }
    }
    
    /**
     * 批量添加或更新書籍
     * @param {Array} books 書籍數組
     * @returns {Promise<Object>} 操作結果的Promise
     */
    async bulkAddOrUpdateBooks(books) {
        try {
            // 確保每本書都有ID
            books.forEach(book => {
                if (!book.id) {
                    book.id = this.generateId();
                }
            });
            
            // 批量添加或更新書籍
            const result = await this.storage.bulkAddOrUpdateBooks(books);
            
            // 嘗試同步到GitHub
            this.syncToGitHub();
            
            return result;
        } catch (error) {
            console.error('批量操作書籍失敗:', error);
            this.handleError('bulkOperation', error);
            throw error;
        }
    }
    
    /**
     * 獲取所有類別
     * @returns {Promise<Array>} 類別數組的Promise
     */
    async getAllCategories() {
        try {
            const books = await this.storage.getAllBooks();
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
        } catch (error) {
            console.error('獲取類別失敗:', error);
            this.handleError('getAllCategories', error);
            return ['未分類'];
        }
    }
    
    /**
     * 同步數據到GitHub
     * @returns {Promise<Object>} 同步結果
     */
    async syncToGitHub() {
        try {
            // 檢查是否已登入
            if (typeof auth === 'undefined' || !auth.isLoggedIn()) {
                return { status: 'skipped', message: '用戶未登入，跳過同步' };
            }
            
            // 使用GitHubSync模塊進行同步
            return await this.githubSync.syncToGitHub();
        } catch (error) {
            console.error('同步到GitHub失敗:', error);
            this.handleError('syncToGitHub', error);
            
            return {
                status: 'error',
                message: `同步失敗: ${error.message}`,
                error: error.message
            };
        }
    }
    
    /**
     * 從GitHub同步數據
     * @param {boolean} forceRefresh 是否強制刷新
     * @returns {Promise<Object>} 同步結果
     */
    async syncFromGitHub(forceRefresh = false) {
        try {
            return await this.githubSync.syncFromGitHub(forceRefresh);
        } catch (error) {
            console.error('從GitHub同步失敗:', error);
            this.handleError('syncFromGitHub', error);
            
            return {
                status: 'error',
                message: `同步失敗: ${error.message}`,
                error: error.message
            };
        }
    }
    
    /**
     * 檢查數據一致性
     * @returns {Promise<Object>} 一致性檢查結果
     */
    async checkDataConsistency() {
        try {
            return await this.githubSync.checkDataConsistency();
        } catch (error) {
            console.error('檢查數據一致性失敗:', error);
            this.handleError('checkConsistency', error);
            
            return {
                status: 'error',
                message: `檢查失敗: ${error.message}`,
                consistent: false,
                error: error.message
            };
        }
    }
    
    /**
     * 獲取備份設定
     * @returns {Promise<Object>} 備份設定
     */
    async getBackupSettings() {
        try {
            return await this.storage.getSetting('backupSettings') || {
                email: '',
                type: 'manual',
                frequency: 'daily'
            };
        } catch (error) {
            console.error('獲取備份設定失敗:', error);
            this.handleError('getBackupSettings', error);
            
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
            await this.storage.saveSetting('backupSettings', settings);
        } catch (error) {
            console.error('保存備份設定失敗:', error);
            this.handleError('saveBackupSettings', error);
            throw error;
        }
    }
    
    /**
     * 獲取EmailJS設定
     * @returns {Promise<Object>} EmailJS設定
     */
    async getEmailJSSettings() {
        try {
            return await this.storage.getSetting('emailJSSettings') || {
                userID: '',
                serviceID: '',
                templateID: ''
            };
        } catch (error) {
            console.error('獲取EmailJS設定失敗:', error);
            this.handleError('getEmailJSSettings', error);
            
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
            await this.storage.saveSetting('emailJSSettings', settings);
        } catch (error) {
            console.error('保存EmailJS設定失敗:', error);
            this.handleError('saveEmailJSSettings', error);
            throw error;
        }
    }
    
    /**
     * 獲取GitHub設置
     * @returns {Promise<Object>} GitHub設置
     */
    async getGitHubSettings() {
        try {
            return await this.githubSync.getGitHubSettings();
        } catch (error) {
            console.error('獲取GitHub設置失敗:', error);
            this.handleError('getGitHubSettings', error);
            
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
            await this.githubSync.saveGitHubSettings(settings);
        } catch (error) {
            console.error('保存GitHub設置失敗:', error);
            this.handleError('saveGitHubSettings', error);
            throw error;
        }
    }
    
    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    /**
     * 觸發數據載入完成事件
     * @param {string} source 數據來源
     * @param {number} count 數據數量
     * @param {Error} error 錯誤對象（如果有）
     */
    triggerDataLoadedEvent(source, count, error = null) {
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
     * 註冊錯誤處理器
     * @param {string} errorType 錯誤類型
     * @param {Function} handler 處理函數
     */
    registerErrorHandler(errorType, handler) {
        this.errorHandlers.set(errorType, handler);
    }
    
    /**
     * 處理錯誤
     * @param {string} errorType 錯誤類型
     * @param {Error} error 錯誤對象
     */
    handleError(errorType, error) {
        // 檢查是否有註冊的錯誤處理器
        if (this.errorHandlers.has(errorType)) {
            this.errorHandlers.get(errorType)(error);
        } else if (this.errorHandlers.has('default')) {
            // 使用默認錯誤處理器
            this.errorHandlers.get('default')(error);
        } else {
            // 如果沒有處理器，記錄到控制台
            console.error(`未處理的錯誤 [${errorType}]:`, error);
        }
    }
    
    /**
     * 註冊默認錯誤處理器
     */
    registerDefaultErrorHandlers() {
        // 默認錯誤處理器
        this.registerErrorHandler('default', (error) => {
            console.error('數據庫操作錯誤:', error);
        });
        
        // 初始化錯誤處理器
        this.registerErrorHandler('init', (error) => {
            console.error('數據庫初始化錯誤:', error);
            // 觸發初始化錯誤事件
            this.triggerDataLoadedEvent('error', 0, error);
        });
        
        // 同步錯誤處理器
        this.registerErrorHandler('syncToGitHub', (error) => {
            console.error('同步到GitHub錯誤:', error);
            // 觸發同步錯誤事件
            const event = new CustomEvent('githubSync', {
                detail: {
                    status: 'error',
                    timestamp: new Date().toISOString(),
                    error: error
                }
            });
            document.dispatchEvent(event);
        });
    }
}

// 導出模塊
export default DatabaseManager;