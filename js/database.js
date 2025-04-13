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
     * @param {boolean} skipSync 是否跳過同步到GitHub
     * @returns {Object} 添加後的書籍對象
     */
    addBook(book, skipSync = false) {
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
        
        // 同步到GitHub (如果已登入且未設置跳過同步)
        if (!skipSync) {
            this.syncToGitHub(true).catch(error => {
                console.error('添加書籍後同步到GitHub失敗:', error);
                // 顯示同步失敗通知
                this.showSyncNotification(`添加書籍後同步失敗: ${error.message}`, 'warning');
            });
        }
        
        return book;
    }
    
    /**
     * 更新書籍
     * @param {Object} updatedBook 更新後的書籍對象
     * @param {boolean} skipSync 是否跳過同步到GitHub
     * @returns {Object|null} 更新後的書籍對象或null
     */
    updateBook(updatedBook, skipSync = false) {
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
        
        // 同步到GitHub (如果已登入且未設置跳過同步)
        if (!skipSync) {
            this.syncToGitHub(true).catch(error => {
                console.error('更新書籍後同步到GitHub失敗:', error);
                // 顯示同步失敗通知
                this.showSyncNotification(`更新書籍後同步失敗: ${error.message}`, 'warning');
            });
        }
        
        return updatedBook;
    }
    
    /**
     * 刪除書籍
     * @param {string} id 書籍ID
     * @param {boolean} skipSync 是否跳過同步到GitHub
     * @returns {boolean} 是否成功刪除
     */
    deleteBook(id, skipSync = false) {
        const books = this.getAllBooks();
        const filteredBooks = books.filter(book => book.id !== id);
        
        if (filteredBooks.length === books.length) {
            return false;
        }
        
        // 保存到LocalStorage
        localStorage.setItem('books', JSON.stringify(filteredBooks));
        
        // 同步到GitHub (如果已登入且未設置跳過同步)
        if (!skipSync) {
            this.syncToGitHub(true).catch(error => {
                console.error('刪除書籍後同步到GitHub失敗:', error);
                // 顯示同步失敗通知
                this.showSyncNotification(`刪除書籍後同步失敗: ${error.message}`, 'warning');
            });
        }
        
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
                
                // 更新書籍 (跳過同步，稍後批量同步)
                this.updateBook(updatedBook, true);
                updatedCount++;
            } else {
                // 添加新書籍 (跳過同步，稍後批量同步)
                this.addBook(importBook, true);
                importedCount++;
            }
        });
        
        // 如果有新增或更新的書籍，進行一次GitHub同步
        if (importedCount > 0 || updatedCount > 0) {
            // 使用Promise處理同步，但不等待完成
            this.syncToGitHub(true).catch(error => {
                console.error('匯入書籍後同步到GitHub失敗:', error);
                // 顯示同步失敗通知
                this.showSyncNotification(`匯入書籍後同步失敗: ${error.message}`, 'warning');
            });
        }
        
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
     * @param {boolean} showNotification 是否顯示通知
     * @returns {Promise} 同步結果的Promise
     */
    syncToGitHub(showNotification = false) {
        return new Promise((resolve, reject) => {
            // 檢查是否已登入
            if (!auth || !auth.isLoggedIn()) {
                console.log('用戶未登入，跳過GitHub同步');
                return resolve({status: 'skipped', reason: 'not_logged_in'});
            }
            
            // 檢查GitHub設置是否完整
            if (typeof admin === 'undefined') {
                console.log('Admin模組未載入，跳過GitHub同步');
                return resolve({status: 'skipped', reason: 'admin_not_loaded'});
            }
            
            if (!admin.githubSettings || !admin.githubSettings.token || !admin.githubSettings.repo) {
                console.log('GitHub設置不完整，跳過同步');
                if (showNotification) {
                    this.showSyncNotification('GitHub設置不完整，請先配置GitHub設置', 'warning');
                }
                return resolve({status: 'skipped', reason: 'incomplete_settings'});
            }
            
            console.log('同步數據到GitHub...');
            if (showNotification) {
                this.showSyncNotification('正在同步數據到GitHub...', 'info');
            }
            
            // 獲取所有書籍數據
            const books = this.getAllBooks();
            
            // 創建要上傳的數據對象
            const syncData = {
                books: books,
                lastSync: new Date().toISOString(),
                version: '1.0'
            };
            
            // 檢查admin實例是否存在且uploadToGitHub方法可用
            if (admin.uploadToGitHub) {
                // 使用admin.js中的uploadToGitHub函數
                admin.uploadToGitHub(syncData)
                    .then(response => {
                        console.log('數據同步完成', response);
                        // 存儲最後同步時間
                        localStorage.setItem('lastGitHubSync', new Date().toISOString());
                        // 觸發同步成功事件
                        this.triggerSyncEvent('success');
                        if (showNotification) {
                            this.showSyncNotification('數據已成功同步到GitHub', 'success');
                        }
                        resolve({status: 'success', response});
                    })
                    .catch(error => {
                        console.error('數據同步失敗', error);
                        // 在控制台顯示詳細錯誤信息，幫助調試
                        console.error('同步錯誤詳情:', error.stack || error);
                        // 觸發同步失敗事件
                        this.triggerSyncEvent('error', error);
                        if (showNotification) {
                            this.showSyncNotification(`同步失敗: ${error.message}`, 'danger');
                        }
                        reject(error);
                    });
            } else {
                // 如果uploadToGitHub方法不可用，使用模擬API請求
                console.log('使用模擬API請求進行同步');
                this.simulateGitHubApiRequest(JSON.stringify(syncData, null, 2))
                    .then(response => {
                        console.log('數據同步完成（模擬）', response);
                        // 存儲最後同步時間
                        localStorage.setItem('lastGitHubSync', new Date().toISOString());
                        // 觸發同步成功事件
                        this.triggerSyncEvent('success');
                        if (showNotification) {
                            this.showSyncNotification('數據已成功同步到GitHub (模擬)', 'success');
                        }
                        resolve({status: 'success', response, simulated: true});
                    })
                    .catch(error => {
                        console.error('數據同步失敗', error);
                        // 在控制台顯示詳細錯誤信息，幫助調試
                        console.error('同步錯誤詳情:', error.stack || error);
                        // 觸發同步失敗事件
                        this.triggerSyncEvent('error', error);
                        if (showNotification) {
                            this.showSyncNotification(`同步失敗: ${error.message}`, 'danger');
                        }
                        reject(error);
                    });
            }
        });
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
    
    /**
     * 顯示同步通知
     * @param {string} message 通知訊息
     * @param {string} type 通知類型 (success, warning, danger, info)
     */
    showSyncNotification(message, type = 'info') {
        // 檢查是否有通知容器
        let notificationContainer = document.getElementById('syncNotificationContainer');
        
        // 如果沒有，創建一個
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'syncNotificationContainer';
            notificationContainer.style.position = 'fixed';
            notificationContainer.style.bottom = '20px';
            notificationContainer.style.right = '20px';
            notificationContainer.style.zIndex = '9999';
            document.body.appendChild(notificationContainer);
        }
        
        // 創建通知元素
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show`;
        notification.role = 'alert';
        
        // 添加圖標
        let icon = '';
        switch(type) {
            case 'success':
                icon = '<i class="fas fa-check-circle me-2"></i>';
                break;
            case 'danger':
                icon = '<i class="fas fa-exclamation-circle me-2"></i>';
                break;
            case 'warning':
                icon = '<i class="fas fa-exclamation-triangle me-2"></i>';
                break;
            case 'info':
            default:
                icon = '<i class="fas fa-info-circle me-2"></i>';
                break;
        }
        
        // 設置通知內容
        notification.innerHTML = `
            ${icon}
            <strong>GitHub同步:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="關閉"></button>
        `;
        
        // 添加到容器
        notificationContainer.appendChild(notification);
        
        // 設置自動消失
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }
}

// 初始化數據庫實例
const db = new Database();