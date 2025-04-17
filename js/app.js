import DatabaseManager from './storage/DatabaseManager.js';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver'; // 假設已通過 npm 安裝或全局引入

// 移除舊的全局變量依賴
// const db = new Database();
// const dataProcessor = new DataProcessor();
// const emailService = new EmailService();
// const auth = new Auth();
// const admin = new Admin(db, auth);

/**
 * 主應用模組 - 整合所有功能並處理用戶界面交互
 * 使用 DatabaseManager 進行數據管理，並通過 Vite 構建
 */
class App {
    constructor() {
        // 初始化 DatabaseManager
        this.db = new DatabaseManager();

        // 初始化元素引用
        this.initElements();

        // 初始化事件監聽器
        this.initEventListeners();

        // 使用 DatabaseManager 載入書籍數據 (異步)
        this.loadBooks();

        // 載入類別選項 (異步)
        this.loadCategories();

        // 監聽 DatabaseManager 的事件 (如果需要)
        this.listenForDbEvents();

        // 初始化設置相關功能 (異步)
        this.initSettings();
    }
    
    /**
     * 初始化元素引用
     */
    initElements() {
        // 搜尋元素
        this.searchInput = document.getElementById('searchInput');
        this.searchCategory = document.getElementById('searchCategory');
        this.searchBtn = document.getElementById('searchBtn');
        this.resetBtn = document.getElementById('resetBtn');
        
        // 表格元素
        this.booksTable = document.getElementById('booksTable');
        this.booksTableBody = document.getElementById('booksTableBody');
        this.resultCount = document.getElementById('resultCount');
        this.noResults = document.getElementById('noResults');
        
        // 書籍表單元素
        this.bookForm = document.getElementById('bookForm');
        this.bookId = document.getElementById('bookId');
        this.bookTitle = document.getElementById('bookTitle');
        this.bookAuthor = document.getElementById('bookAuthor');
        this.bookSeries = document.getElementById('bookSeries');
        this.bookCategory = document.getElementById('bookCategory');
        this.bookCabinet = document.getElementById('bookCabinet');
        this.bookRow = document.getElementById('bookRow');
        this.bookPublisher = document.getElementById('bookPublisher');
        this.bookDescription = document.getElementById('bookDescription');
        this.bookISBN = document.getElementById('bookISBN');
        this.bookNotes = document.getElementById('bookNotes');
        this.saveBookBtn = document.getElementById('saveBookBtn');
        
        // 匯入/匯出元素
        this.importFile = document.getElementById('importFile');
        this.filterDuplicates = document.getElementById('filterDuplicates');
        this.confirmImportBtn = document.getElementById('confirmImportBtn');
        this.importStatus = document.getElementById('importStatus');
        this.exportBtn = document.getElementById('exportBtn');
        
        // 備份元素
        this.backupEmail = document.getElementById('backupEmail');
        this.manualBackup = document.getElementById('manualBackup');
        this.autoBackup = document.getElementById('autoBackup');
        this.backupFrequency = document.getElementById('backupFrequency');
        this.autoBackupOptions = document.getElementById('autoBackupOptions');
        this.manualBackupBtn = document.getElementById('manualBackupBtn');
        this.saveBackupSettingsBtn = document.getElementById('saveBackupSettingsBtn');
        this.backupStatus = document.getElementById('backupStatus');
        
        // 書籍詳情元素
        this.bookDetailsTitle = document.getElementById('bookDetailsTitle');
        this.detailAuthor = document.getElementById('detailAuthor');
        this.detailSeries = document.getElementById('detailSeries');
        this.detailCategory = document.getElementById('detailCategory');
        this.detailCabinet = document.getElementById('detailCabinet');
        this.detailRow = document.getElementById('detailRow');
        this.detailPublisher = document.getElementById('detailPublisher');
        this.detailDescription = document.getElementById('detailDescription');
        this.detailISBN = document.getElementById('detailISBN');
        this.detailNotes = document.getElementById('detailNotes');
        
        // 刪除確認元素
        this.deleteBookTitle = document.getElementById('deleteBookTitle');
        this.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        
        // 同步狀態元素 (如果不存在，則創建一個通知區域)
        this.syncStatus = document.getElementById('syncStatus') || this.createSyncStatusElement();
    }
    
    /**
     * 創建同步狀態元素
     * @returns {HTMLElement} 同步狀態元素
     */
    createSyncStatusElement() {
        // 創建一個通知元素，用於顯示同步狀態
        const statusElement = document.createElement('div');
        statusElement.id = 'syncStatus';
        statusElement.className = 'position-fixed bottom-0 end-0 p-3';
        statusElement.style.zIndex = '5';
        document.body.appendChild(statusElement);
        return statusElement;
    }
    
    /**
     * 初始化事件監聽器
     */
    initEventListeners() {
        // 搜尋事件
        if (this.searchBtn) {
            this.searchBtn.addEventListener('click', () => this.searchBooks());
        }
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => this.resetSearch());
        }
        if (this.searchInput) {
            this.searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') this.searchBooks();
            });
            // 添加輸入延遲搜尋功能
            let searchTimeout;
            this.searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (this.searchInput.value.trim().length >= 2) {
                        this.searchBooks();
                    }
                }, 500); // 500毫秒延遲，避免頻繁搜尋
            });
        }
        
        // GitHub同步按鈕事件 (使用 DatabaseManager 的方法)
        const syncGitHubBtn = document.getElementById('syncGitHubBtn');
        if (syncGitHubBtn) {
            syncGitHubBtn.addEventListener('click', async () => {
                this.showMessage('正在從GitHub同步數據...', 'info');
                try {
                    // 使用 DatabaseManager 的強制同步方法
                    const result = await this.db.syncWithGitHub(true); // true for force sync
                    if (result.status === 'success') {
                        this.showMessage(`成功從GitHub同步 ${result.total || 0} 筆書籍數據`, 'success');
                        await this.loadBooks(); // Reload books after sync
                    } else {
                        this.showMessage(`從GitHub同步數據失敗: ${result.message}`, 'warning');
                    }
                } catch (error) {
                    console.error('從GitHub同步數據時發生錯誤:', error);
                    this.showMessage(`從GitHub同步數據時發生錯誤: ${error.message}`, 'danger');
                }
            });
        }
        
        // 書籍表單事件
        if (this.bookForm) {
            this.bookForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveBook(); // saveBook is now async
            });
        }
        if (this.saveBookBtn) {
            this.saveBookBtn.addEventListener('click', () => this.saveBook()); // saveBook is now async
        }
        
        // 匯入/匯出事件
        if (this.confirmImportBtn) {
            this.confirmImportBtn.addEventListener('click', () => this.importBooks()); // importBooks is now async
        }
        if (this.exportBtn) {
            this.exportBtn.addEventListener('click', () => this.exportBooks()); // exportBooks is now async
        }
        
        // 備份事件 (更新為使用 DatabaseManager 的設置)
        if (this.autoBackup) {
            this.autoBackup.addEventListener('change', () => this.toggleBackupOptions());
        }
        if (this.manualBackup) {
            this.manualBackup.addEventListener('change', () => this.toggleBackupOptions());
        }
        if (this.saveBackupSettingsBtn) {
            this.saveBackupSettingsBtn.addEventListener('click', () => this.saveBackupSettings()); // Now async
        }
        if (this.manualBackupBtn) {
            this.manualBackupBtn.addEventListener('click', () => this.performBackup()); // Now async
        }
        
        // EmailJS設定事件
        this.saveEmailJSSettingsBtn = document.getElementById('saveEmailJSSettingsBtn');
        if (this.saveEmailJSSettingsBtn) {
            this.saveEmailJSSettingsBtn.addEventListener('click', () => this.saveEmailJSSettings()); // Now async
        }
        this.testEmailJSBtn = document.getElementById('testEmailJSBtn');
        if (this.testEmailJSBtn) {
            this.testEmailJSBtn.addEventListener('click', () => this.testEmailJSConnection()); // Now async
        }

        // GitHub 設定事件
        this.saveGitHubSettingsBtn = document.getElementById('saveGitHubSettingsBtn');
        if (this.saveGitHubSettingsBtn) {
            this.saveGitHubSettingsBtn.addEventListener('click', () => this.saveGitHubSettings()); // Now async
        }
        this.testGitHubConnectionBtn = document.getElementById('testGitHubConnectionBtn');
        if (this.testGitHubConnectionBtn) {
            this.testGitHubConnectionBtn.addEventListener('click', () => this.testGitHubConnection()); // Now async
        }

        // 自動同步設定事件
        this.saveAutoSyncSettingsBtn = document.getElementById('saveAutoSyncSettingsBtn');
        if (this.saveAutoSyncSettingsBtn) {
            this.saveAutoSyncSettingsBtn.addEventListener('click', () => this.saveAutoSyncSettings()); // Now async
        }
        this.enableAutoSyncCheckbox = document.getElementById('enableAutoSync');
        if (this.enableAutoSyncCheckbox) {
            this.enableAutoSyncCheckbox.addEventListener('change', (e) => {
                const intervalGroup = this.autoSyncIntervalInput?.closest('.mb-3');
                if (intervalGroup) {
                    intervalGroup.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }
        
        // 監聽模態框事件
        const bookModal = document.getElementById('bookModal');
        if (bookModal) {
            bookModal.addEventListener('show.bs.modal', (e) => {
                const button = e.relatedTarget;
                if (button && button.getAttribute('data-book-id')) {
                    this.loadBookForEdit(button.getAttribute('data-book-id')); // Now async
                } else {
                    this.resetBookForm();
                }
            });
        }

        const bookDetailsModal = document.getElementById('bookDetailsModal');
        if (bookDetailsModal) {
            bookDetailsModal.addEventListener('show.bs.modal', (e) => {
                const button = e.relatedTarget;
                const bookId = button?.getAttribute('data-book-id');
                if (bookId) {
                    this.loadBookDetails(bookId); // Now async
                }
            });
        }

        const deleteModal = document.getElementById('deleteModal');
        if (deleteModal) {
            deleteModal.addEventListener('show.bs.modal', (e) => {
                const button = e.relatedTarget;
                const bookId = button?.getAttribute('data-book-id');
                const bookTitle = button?.getAttribute('data-book-title');
                if (bookId && bookTitle && this.deleteBookTitle && this.confirmDeleteBtn) {
                    this.deleteBookTitle.textContent = bookTitle;
                    this.confirmDeleteBtn.setAttribute('data-book-id', bookId);
                    this.confirmDeleteBtn.disabled = false;
                } else {
                    // 如果沒有 bookId 或 bookTitle，禁用刪除按鈕並顯示錯誤
                    if(this.deleteBookTitle) this.deleteBookTitle.textContent = '錯誤：無法獲取書籍信息';
                    if(this.confirmDeleteBtn) this.confirmDeleteBtn.disabled = true;
                }
            });
            // 清理模態框關閉時的狀態
            deleteModal.addEventListener('hidden.bs.modal', () => {
                if(this.deleteBookTitle) this.deleteBookTitle.textContent = '';
                if(this.confirmDeleteBtn) {
                    this.confirmDeleteBtn.removeAttribute('data-book-id');
                    this.confirmDeleteBtn.disabled = false;
                }
            });
        }
        
        // 監聽備份模態框事件
        document.getElementById('backupModal').addEventListener('show.bs.modal', () => {
            this.loadBackupSettings();
        });
        
        // 監聽GitHub設置模態框事件
        document.getElementById('githubSettingsModal').addEventListener('show.bs.modal', () => {
            this.loadGitHubSettings();
        });
        
        // 監聽EmailJS設置模態框事件
        const emailJSSettingsModal = document.getElementById('emailJSSettingsModal');
        if (emailJSSettingsModal) {
            emailJSSettingsModal.addEventListener('show.bs.modal', () => {
                this.loadEmailJSSettings();
            });
        }
        
        // 監聽刪除確認事件 (已移至 deleteModal 的 show.bs.modal 監聽器內部，此處移除重複的監聽器)
        // if (this.confirmDeleteBtn) {
        //     this.confirmDeleteBtn.addEventListener('click', () => {
        //         const bookId = this.confirmDeleteBtn.getAttribute('data-book-id');
        //         if (bookId) {
        //             this.deleteBook(bookId); // Now async
        //         }
        //     });
        // }

        // 監聽數據庫事件 (如果 DatabaseManager 提供了事件機制)
        // document.addEventListener('databasemanager-event', (e) => this.handleDbEvent(e));
    }

    /**
     * 監聽 DatabaseManager 的事件 (示例)
     */
    listenForDbEvents() {
        // 假設 DatabaseManager 觸發 'syncStatusUpdate' 事件
        document.addEventListener('syncStatusUpdate', (e) => {
            const { status, message, type, source } = e.detail;
            console.log(`Sync Status Update (${source}): ${status} - ${message}`);

            // 根據 source 和 status 更新 UI 或顯示通知
            if (source === 'autoSync' && status === 'success' && type === 'info') {
                // 對於成功的靜默自動同步，可能只在控制台記錄
                console.log('Auto-sync successful (silent).');
            } else if (status === 'syncing') {
                this.showMessage(`正在同步 (${source})...`, 'info', 10000); // 顯示較長時間
            } else {
                this.showMessage(message, type || 'info');
            }

            // 如果同步成功，重新加載數據
            if (status === 'success') {
                this.loadBooks();
            }
        });

        // 監聽數據加載完成事件
        document.addEventListener('booksLoaded', (e) => {
            const { source, count, error } = e.detail;
            console.log(`Books loaded event: source=${source}, count=${count}, error=${error}`);
            if (error) {
                this.showMessage(`載入書籍數據時出錯 (${source}): ${error.message}`, 'danger');
            } else {
                // this.showMessage(`成功載入 ${count} 筆書籍數據 (來源: ${source})`, 'success', 3000); // 避免重複提示
            }
            // 數據加載後更新 UI
            this.loadCategories(); // 更新分類下拉列表
        });
    }

    /**
     * 初始化設置相關功能
     */
    initSettings() {
        this.loadBackupSettings(); // Now async
        this.loadEmailJSSettings(); // Now async
        this.loadGitHubSettings(); // Now async
        this.initAutoSyncSettings(); // Now async
    }
    }
    
    /**
     * 載入書籍數據
     * @param {boolean} checkForUpdates 是否檢查更新
     */
    loadBooks(checkForUpdates = true) {
        // 顯示載入中的狀態提示
        this.showMessage('正在載入書籍數據...', 'info');
        
        // 使用Promise方式獲取書籍數據
        this.db.getAllBooks()
            .then(books => {
                // 確保books是數組
                if (!Array.isArray(books)) {
                    console.error('載入書籍數據時收到無效數據:', books);
                    this.showMessage('載入書籍數據時收到無效數據格式', 'danger');
                    this.displayBooks([]);
                    return;
                }
                this.displayBooks(books);
                // REMOVED: this.showMessage(`成功載入 ${books.length} 筆書籍數據`, 'success');
                
                // 檢查更新
                if (checkForUpdates) {
                    this.checkForUpdates(true);
                }
            })
            .catch(error => {
                console.error('載入書籍數據時發生錯誤:', error);
                this.showMessage(`載入書籍數據時發生錯誤: ${error.message}`, 'danger');
                this.displayBooks([]);
            });}
    }
    
    /**
     * 檢查GitHub更新
     * @param {boolean} silent 是否靜默同步 (此參數不再影響成功訊息的顯示)
     */
    checkForUpdates(silent = false) { // Note: silent parameter description updated
        try {
            // 使用getAllBooks方法進行同步，而不是直接調用syncFromGitHub
            // 因為在新的模塊化結構中，syncFromGitHub已移至DatabaseManager.js
            this.db.getAllBooks(true) // 傳入true表示強制刷新
                .then(books => {
                    // 始終更新顯示，確保首次登入時能看到數據
                    this.displayBooks(books);
                    
                    // 總是顯示成功消息
                    // REMOVED: if (!silent) { 
                    this.showMessage(`成功從GitHub同步 ${books.length} 筆書籍數據`, 'success');
                    // REMOVED: }
                })
                .catch(error => {
                    // 只在非靜默模式下顯示錯誤消息，避免初始載入時的潛在錯誤干擾用戶
                    if (!silent) {
                        console.error('檢查更新時發生錯誤:', error);
                        this.showMessage(`檢查更新時發生錯誤: ${error.message}`, 'danger');
                    }
                });
        } catch (error) {
             // 只在非靜默模式下顯示錯誤消息
            if (!silent) {
                console.error('檢查更新時發生錯誤:', error);
                this.showMessage(`檢查更新時發生錯誤: ${error.message}`, 'danger');
            }
        }
    }
    
    /**
     * 優化數據緩存策略
     * 確保在網絡不穩定情況下也能提供良好的查詢體驗
     */
    setupCacheStrategy() {
        // 實現本地緩存策略
        const cacheBooks = async (books) => {
            if (!books || !Array.isArray(books) || books.length === 0) return;
            
            try {
                // 緩存書籍數據到sessionStorage
                // 使用sessionStorage而非localStorage，避免長期占用存儲空間
                sessionStorage.setItem('cachedBooks', JSON.stringify({
                    timestamp: new Date().getTime(),
                    data: books
                }));
                console.log(`已緩存 ${books.length} 筆書籍數據到sessionStorage`);
            } catch (error) {
                console.warn('緩存書籍數據失敗:', error);
            }
        };
        
        // 從緩存獲取書籍數據
        const getCachedBooks = () => {
            try {
                const cachedData = sessionStorage.getItem('cachedBooks');
                if (!cachedData) return null;
                
                const parsed = JSON.parse(cachedData);
                const now = new Date().getTime();
                const cacheAge = now - parsed.timestamp;
                
                // 緩存有效期為30分鐘
                if (cacheAge > 30 * 60 * 1000) {
                    console.log('緩存數據已過期');
                    return null;
                }
                
                console.log(`從緩存獲取 ${parsed.data.length} 筆書籍數據，緩存時間: ${Math.round(cacheAge / 1000 / 60)} 分鐘前`);
                return parsed.data;
            } catch (error) {
                console.warn('獲取緩存數據失敗:', error);
                return null;
            }
        };
        
        // 覆蓋原有的書籍顯示方法，添加緩存功能
        const originalDisplayBooks = this.displayBooks;
        this.displayBooks = (books) => {
            // 顯示書籍
            originalDisplayBooks.call(this, books);
            
            // 緩存書籍數據
            cacheBooks(books);
        };
        
        // 覆蓋原有的載入書籍方法，添加緩存功能
        const originalLoadBooks = this.loadBooks;
        this.loadBooks = (checkForUpdates = true) => {
            // 嘗試從緩存獲取數據
            const cachedBooks = getCachedBooks();
            
            if (cachedBooks) {
                // 如果有緩存數據，先顯示緩存數據
                this.displayBooks(cachedBooks);
                this.showMessage(`已從緩存載入 ${cachedBooks.length} 筆書籍數據`, 'info');
                
                // 然後在背景檢查更新
                if (checkForUpdates) {
                    setTimeout(() => this.checkForUpdates(true), 1000);
                }
            } else {
                // 如果沒有緩存數據，使用原方法載入
                originalLoadBooks.call(this, checkForUpdates);
            }
        };
    }
    
    /**
     * 載入類別選項
     * 注意：類別篩選功能已移除，此函數保留用於其他可能的用途
     */
    loadCategories() {
        // 使用Promise方式獲取所有類別
        this.db.getAllCategories()
            .then(categories => {
                console.log('成功載入類別:', categories);
                // 類別篩選下拉框已移除，不再需要填充選項
            })
            .catch(error => {
                console.error('載入類別時發生錯誤:', error);
            });
    }
    
    /**
     * 顯示書籍列表
     * @param {Array} books 書籍數組
     */
    displayBooks(books) {
        // 清空表格
        this.booksTableBody.innerHTML = '';
        
        // 確保books是數組
        if (!books || !Array.isArray(books)) {
            console.error('顯示書籍時收到無效數據:', books);
            // 顯示錯誤提示
            this.resultCount.textContent = '0 筆資料';
            this.resultCount.className = 'badge bg-danger';
            
            if (this.noResults) {
                this.noResults.classList.remove('d-none');
                this.noResults.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>搜尋時發生錯誤：數據庫返回無效數據</div>';
            }
            this.booksTable.classList.add('d-none');
            return;
        }
        
        // 更新結果計數
        this.resultCount.textContent = `${books.length} 筆資料`;
        this.resultCount.className = books.length > 0 ? 'badge bg-primary' : 'badge bg-warning';
        
        // 檢查是否有結果
        if (books.length === 0) {
            // 顯示無結果提示
            if (this.noResults) {
                this.noResults.classList.remove('d-none');
                this.noResults.innerHTML = '<div class="alert alert-warning"><i class="fas fa-exclamation-triangle me-2"></i>沒有符合條件的書籍資料</div>';
            }
            this.booksTable.classList.add('d-none');
            return;
        }
        
        // 顯示表格，隱藏無結果提示
        this.booksTable.classList.remove('d-none');
        if (this.noResults) {
            this.noResults.classList.add('d-none');
        }
        
        // 檢查是否為管理員
        const isAdmin = auth.isLoggedIn();
        
        // 添加每本書籍到表格
        books.forEach(book => {
            const row = document.createElement('tr');
            
            // 書籍標題（可點擊查看詳情）
            const titleCell = document.createElement('td');
            const titleLink = document.createElement('a');
            titleLink.href = '#';
            titleLink.className = 'book-title';
            titleLink.textContent = book.title;
            titleLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showBookDetails(book);
            });
            titleCell.appendChild(titleLink);
            row.appendChild(titleCell);
            
            // 其他基本信息
            row.appendChild(this.createCell(book.author));
            row.appendChild(this.createCell(book.series || '-'));
            row.appendChild(this.createCell(book.category));
            row.appendChild(this.createCell(book.cabinet || '-'));
            row.appendChild(this.createCell(book.row || '-'));
            row.appendChild(this.createCell(book.publisher || '-'));
            row.appendChild(this.createCell(book.isbn || '-'));
            
            // 管理員操作按鈕
            if (isAdmin) {
                const actionCell = document.createElement('td');
                
                // 編輯按鈕
                const editBtn = document.createElement('button');
                editBtn.className = 'btn btn-sm btn-outline-primary me-1 action-btn';
                editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                editBtn.title = '編輯';
                editBtn.addEventListener('click', () => this.editBook(book));
                actionCell.appendChild(editBtn);
                
                // 刪除按鈕
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-sm btn-outline-danger action-btn';
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.title = '刪除';
                deleteBtn.addEventListener('click', () => this.confirmDelete(book));
                actionCell.appendChild(deleteBtn);
                
                row.appendChild(actionCell);
            }
            
            this.booksTableBody.appendChild(row);
        });
        
        // 顯示/隱藏操作列
        const actionHeader = document.getElementById('actionHeader');
        if (isAdmin) {
            actionHeader.classList.remove('d-none');
        } else {
            actionHeader.classList.add('d-none');
        }
    }
    
    /**
     * 創建表格單元格
     * @param {string} text 單元格文本
     * @returns {HTMLElement} 單元格元素
     */
    createCell(text) {
        const cell = document.createElement('td');
        cell.textContent = text;
        return cell;
    }
    
    /**
     * 搜尋書籍
     */
    searchBooks() {
        try {
            const query = this.searchInput.value.trim().toLowerCase();
            
            // 顯示搜尋中的狀態提示
            this.showMessage('正在搜尋...', 'info');
            
            // 檢查搜尋輸入是否為空
            if (query === '') {
                this.showMessage('請輸入搜尋關鍵字', 'info');
                this.loadBooks(); // 顯示所有書籍
                return;
            }
            
            // 使用Promise方式獲取書籍數據
            this.db.getAllBooks()
                .then(results => {
                    // 檢查數據庫是否返回有效數據
                    if (!Array.isArray(results)) {
                        throw new Error('數據庫返回無效數據');
                    }
                    
                    // 檢查數據庫是否為空
                    if (results.length === 0) {
                        this.showMessage('數據庫中沒有書籍資料', 'warning');
                        this.displayBooks([]);
                        return;
                    }
                    
                    // 按關鍵字搜尋（書名、作者、描述、備註等多個欄位）
                    const filteredResults = results.filter(book => {
                        // 安全地檢查每個屬性是否存在且為字符串類型
                        const titleMatch = typeof book.title === 'string' && book.title.toLowerCase().includes(query);
                        const authorMatch = typeof book.author === 'string' && book.author.toLowerCase().includes(query);
                        const descriptionMatch = typeof book.description === 'string' && book.description.toLowerCase().includes(query);
                        const notesMatch = typeof book.notes === 'string' && book.notes.toLowerCase().includes(query);
                        const publisherMatch = typeof book.publisher === 'string' && book.publisher.toLowerCase().includes(query);
                        const isbnMatch = typeof book.isbn === 'string' && book.isbn.toLowerCase().includes(query);
                        const seriesMatch = typeof book.series === 'string' && book.series.toLowerCase().includes(query);
                        const categoryMatch = typeof book.category === 'string' && book.category.toLowerCase().includes(query);
                        const cabinetMatch = typeof book.cabinet === 'string' && book.cabinet.toLowerCase().includes(query);
                        const rowMatch = typeof book.row === 'string' && book.row.toLowerCase().includes(query);
                        
                        // 返回任一屬性匹配的結果
                        return titleMatch || authorMatch || descriptionMatch || notesMatch || 
                               publisherMatch || isbnMatch || seriesMatch || categoryMatch || 
                               cabinetMatch || rowMatch;
                    });
                    
                    // 顯示搜尋結果和狀態提示
                    this.displayBooks(filteredResults);
                    
                    // 顯示搜尋條件的狀態提示
                    const resultMessage = `搜尋關鍵字「${query}」，找到 ${filteredResults.length} 筆資料`;
                    this.showMessage(resultMessage, filteredResults.length > 0 ? 'info' : 'warning');
                    
                    // 如果沒有結果，在noResults區域顯示更友好的提示
                    if (filteredResults.length === 0 && this.noResults) {
                        this.noResults.classList.remove('d-none');
                        this.noResults.innerHTML = `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle me-2"></i>沒有符合「${query}」的書籍資料，請嘗試其他關鍵字</div>`;
                    }
                })
                .catch(error => {
                    console.error('搜尋錯誤:', error);
                    this.showMessage(`搜尋時發生錯誤: ${error.message}`, 'danger');
                    
                    // 顯示錯誤提示在noResults區域
                    if (this.noResults) {
                        this.noResults.classList.remove('d-none');
                        this.noResults.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-circle me-2"></i>搜尋時發生錯誤: ${error.message}</div>`;
                    }
                    
                    // 隱藏表格
                    if (this.booksTable) {
                        this.booksTable.classList.add('d-none');
                    }
                    
                    // 更新結果計數
                    this.resultCount.textContent = '0 筆資料';
                    this.resultCount.className = 'badge bg-danger';
                });
                
            return; // 提前返回，因為後續處理在Promise中進行
            
            
            // 檢查數據庫是否為空
            if (results.length === 0) {
                this.showMessage('數據庫中沒有書籍資料', 'warning');
                this.displayBooks([]);
                return;
            }
            
            // 按關鍵字搜尋（書名、作者、描述、備註等多個欄位）
            results = results.filter(book => {
                // 安全地檢查每個屬性是否存在且為字符串類型
                const titleMatch = typeof book.title === 'string' && book.title.toLowerCase().includes(query);
                const authorMatch = typeof book.author === 'string' && book.author.toLowerCase().includes(query);
                const descriptionMatch = typeof book.description === 'string' && book.description.toLowerCase().includes(query);
                const notesMatch = typeof book.notes === 'string' && book.notes.toLowerCase().includes(query);
                const publisherMatch = typeof book.publisher === 'string' && book.publisher.toLowerCase().includes(query);
                const isbnMatch = typeof book.isbn === 'string' && book.isbn.toLowerCase().includes(query);
                const seriesMatch = typeof book.series === 'string' && book.series.toLowerCase().includes(query);
                const categoryMatch = typeof book.category === 'string' && book.category.toLowerCase().includes(query);
                const cabinetMatch = typeof book.cabinet === 'string' && book.cabinet.toLowerCase().includes(query);
                const rowMatch = typeof book.row === 'string' && book.row.toLowerCase().includes(query);
                
                // 返回任一屬性匹配的結果
                return titleMatch || authorMatch || descriptionMatch || notesMatch || 
                       publisherMatch || isbnMatch || seriesMatch || categoryMatch || 
                       cabinetMatch || rowMatch;
            });
            
            // 顯示搜尋結果和狀態提示
            this.displayBooks(results);
            
            // 顯示搜尋條件的狀態提示
            const resultMessage = `搜尋關鍵字「${query}」，找到 ${results.length} 筆資料`;
            this.showMessage(resultMessage, results.length > 0 ? 'info' : 'warning');
            
            // 如果沒有結果，在noResults區域顯示更友好的提示
            if (results.length === 0 && this.noResults) {
                this.noResults.classList.remove('d-none');
                this.noResults.innerHTML = `<div class="alert alert-warning"><i class="fas fa-exclamation-triangle me-2"></i>沒有符合「${query}」的書籍資料，請嘗試其他關鍵字</div>`;
            }
        } catch (error) {
            console.error('搜尋錯誤:', error);
            this.showMessage(`搜尋時發生錯誤: ${error.message}`, 'danger');
            
            // 顯示錯誤提示在noResults區域
            if (this.noResults) {
                this.noResults.classList.remove('d-none');
                this.noResults.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-circle me-2"></i>搜尋時發生錯誤: ${error.message}</div>`;
            }
            
            // 隱藏表格
            if (this.booksTable) {
                this.booksTable.classList.add('d-none');
            }
        }
    }
    
    /**
     * 從GitHub同步數據
     */
    syncFromGitHub() {
        // 顯示同步中的狀態提示
        this.showMessage('正在從GitHub同步數據...', 'info');
        
        // 強制從GitHub刷新數據
        this.db.getAllBooks(true)
            .then(books => {
                this.displayBooks(books);
                this.showMessage(`成功從GitHub同步 ${books.length} 筆書籍數據`, 'success');
            })
            .catch(error => {
                console.error('從GitHub同步數據時發生錯誤:', error);
                this.showMessage(`從GitHub同步數據失敗: ${error.message}`, 'danger');
            });
    }
    
    /**
     * 重置搜尋
     */
    resetSearch() {
        this.searchInput.value = '';
        this.loadBooks();
    }
    
    /**
     * 顯示書籍詳情
     * @param {Object} book 書籍對象
     */
    async loadBookDetails(id) {
        try {
            const book = await this.db.getBookById(id);
            if (book) {
                this.bookDetailsTitle.textContent = book.title || '未知書籍';
                this.detailAuthor.textContent = book.author || 'N/A';
                this.detailSeries.textContent = book.series || 'N/A';
                this.detailCategory.textContent = book.category || 'N/A';
                this.detailCabinet.textContent = book.cabinet || 'N/A';
                this.detailRow.textContent = book.row || 'N/A';
                this.detailPublisher.textContent = book.publisher || 'N/A';
                this.detailDescription.textContent = book.description || '無描述';
                this.detailISBN.textContent = book.isbn || 'N/A';
                this.detailNotes.textContent = book.notes || '無備註';
            } else {
                this.showMessage('找不到該書籍的詳細資料', 'warning');
                // 關閉模態框
                const detailsModal = bootstrap.Modal.getInstance(document.getElementById('bookDetailsModal'));
                if (detailsModal) {
                    detailsModal.hide();
                }
            }
        } catch (error) {
            console.error(`載入書籍詳情 ${id} 失敗:`, error);
            this.showMessage(`載入書籍詳情失敗: ${error.message}`, 'danger');
            const detailsModal = bootstrap.Modal.getInstance(document.getElementById('bookDetailsModal'));
            if (detailsModal) {
                detailsModal.hide();
            }
         }
     }
 
     /**
     * 編輯書籍
     * @param {Object} book 書籍對象
     */
    editBook(book) {
        // 設置表單標題
        document.getElementById('bookModalTitle').textContent = '編輯書籍';
        
        // 填充表單數據
        this.bookId.value = book.id;
        this.bookTitle.value = book.title;
        this.bookAuthor.value = book.author;
        this.bookSeries.value = book.series || '';
        this.bookCategory.value = book.category;
        this.bookCabinet.value = book.cabinet || '';
        this.bookRow.value = book.row || '';
        this.bookPublisher.value = book.publisher || '';
        this.bookDescription.value = book.description || '';
        this.bookISBN.value = book.isbn || '';
        this.bookNotes.value = book.notes || '';
        
        // 顯示表單彈窗
        const modal = new bootstrap.Modal(document.getElementById('bookModal'));
        modal.show();
    }
    
    /**
     * 新增書籍
     */
    addBook() {
        // 設置表單標題
        document.getElementById('bookModalTitle').textContent = '新增書籍';
        
        // 清空表單
        this.bookForm.reset();
        this.bookId.value = '';
        
        // 顯示表單彈窗
        const modal = new bootstrap.Modal(document.getElementById('bookModal'));
        modal.show();
    }
    
    /**
     * 儲存書籍
     */
    async saveBook() {
        // 檢查必填欄位
        if (!this.bookTitle.value.trim() || !this.bookAuthor.value.trim() || !this.bookCategory.value.trim()) {
            alert('請填寫必填欄位：書名、作者和類別');
            return;
        }
        
        // 構建書籍對象
        const book = {
            title: this.bookTitle.value.trim(),
            author: this.bookAuthor.value.trim(),
            series: this.bookSeries.value.trim(),
            category: this.bookCategory.value.trim(),
            cabinet: this.bookCabinet.value.trim(),
            row: this.bookRow.value.trim(),
            publisher: this.bookPublisher.value.trim(),
            description: this.bookDescription.value.trim(),
            isbn: this.bookISBN.value.trim(),
            notes: this.bookNotes.value.trim()
        };
        
        try {
            // 新增或更新書籍
            if (this.bookId.value) {
                // 更新現有書籍
                book.id = this.bookId.value;
                await this.db.updateBook(book);
                this.showMessage('書籍已更新', 'success');
            } else {
                // 新增書籍
                await this.db.addBook(book);
                this.showMessage('書籍已新增', 'success');
            }
        } catch (error) {
            console.error('保存書籍失敗:', error);
            this.showMessage(`保存書籍失敗: ${error.message}`, 'danger');
            return;
        }
        
        // 關閉彈窗
        const modal = bootstrap.Modal.getInstance(document.getElementById('bookModal'));
        modal.hide();
        
        // 重新載入書籍和類別
        this.loadBooks();
        this.loadCategories();
    }
    
    /**
     * 確認刪除書籍
     * @param {Object} book 書籍對象
     */
    confirmDelete(book) {
        this.deleteBookTitle.textContent = book.title;
        this.confirmDeleteBtn.onclick = () => {
            this.deleteBook(book.id);
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
            modal.hide();
        };
        
        // 顯示確認彈窗
        const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
        modal.show();
    }
    
    /**
     * 刪除書籍
     * @param {string} id 書籍ID
     */
    async deleteBook(id) {
        try {
            await this.db.deleteBook(id);
            this.showMessage('書籍已刪除', 'success');
            this.loadBooks();
        } catch (error) {
            console.error('刪除書籍失敗:', error);
            this.showMessage(`刪除書籍失敗: ${error.message}`, 'danger');
        }
    }
    
    /**
     * 匯入書籍數據
     */
    async importBooks() {
        const file = this.importFile.files[0];
        const filterDuplicates = this.filterDuplicates.checked;

        if (!file) {
            this.showMessage('請選擇要匯入的文件', 'warning');
            return;
        }

        this.importStatus.textContent = '正在匯入...';
        this.confirmImportBtn.disabled = true;

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const booksToImport = XLSX.utils.sheet_to_json(worksheet);

                    if (!Array.isArray(booksToImport)) {
                        throw new Error('無法解析文件中的書籍數據');
                    }

                    // 使用 DatabaseManager 的批量導入方法
                    const result = await this.db.bulkImportBooks(booksToImport, filterDuplicates);

                    this.importStatus.textContent = `匯入完成：新增 ${result.added} 筆，更新 ${result.updated} 筆，跳過 ${result.skipped} 筆，錯誤 ${result.errors} 筆。`;
                    this.showMessage(`匯入完成：新增 ${result.added}，更新 ${result.updated}，跳過 ${result.skipped}`, 'success');
                    await this.loadBooks(); // 重新載入數據
                } catch (parseError) {
                    console.error('解析或匯入文件失敗:', parseError);
                    this.importStatus.textContent = `匯入失敗: ${parseError.message}`;
                    this.showMessage(`匯入失敗: ${parseError.message}`, 'danger');
                } finally {
                    this.confirmImportBtn.disabled = false;
                    this.importFile.value = ''; // 清空文件選擇
                    // 關閉模態框
                    const importModal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
                    if (importModal) {
                        importModal.hide();
                    }
                }
            };
            reader.onerror = (error) => {
                console.error('讀取文件失敗:', error);
                this.importStatus.textContent = '讀取文件失敗';
                this.showMessage('讀取文件失敗', 'danger');
                this.confirmImportBtn.disabled = false;
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error('匯入操作失敗:', error);
            this.importStatus.textContent = `匯入操作失敗: ${error.message}`;
            this.showMessage(`匯入操作失敗: ${error.message}`, 'danger');
            this.confirmImportBtn.disabled = false;
        }
    }

    /**
     * 匯出書籍數據為 Excel 文件
     */
    async exportBooks() {
        try {
            const books = await this.db.getAllBooks();
            if (books.length === 0) {
                this.showMessage('沒有書籍數據可供匯出', 'warning');
                return;
            }

            // 準備工作表數據
            const worksheetData = books.map(book => ({
                '書名': book.title,
                '作者': book.author,
                '系列': book.series,
                '分類': book.category,
                '書櫃': book.cabinet,
                '層號': book.row,
                '出版社': book.publisher,
                '描述': book.description,
                'ISBN': book.isbn,
                '備註': book.notes,
                // 可以選擇性地添加 ID
                // 'ID': book.id
            }));

            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, '書籍列表');

            // 生成 Excel 文件並觸發下載
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
            saveAs(dataBlob, '書籍列表.xlsx'); // 需要引入 FileSaver.js

            this.showMessage('書籍數據匯出成功', 'success');
        } catch (error) {
            console.error('匯出書籍數據失敗:', error);
            this.showMessage(`匯出書籍數據失敗: ${error.message}`, 'danger');
        }
    }
    
    /**
     * 切換備份選項
     */
    toggleBackupOptions() {
        if (this.autoBackup.checked) {
            this.autoBackupOptions.classList.remove('d-none');
        } else {
            this.autoBackupOptions.classList.add('d-none');
        }
    }
    
    /**
     * 載入備份設定
     */
    async loadBackupSettings() {
        try {
            const settings = await this.db.getBackupSettings();
            
            if (settings) {
                this.backupEmail.value = settings.email || '';
                
                if (settings.type === 'auto') {
                    this.autoBackup.checked = true;
                    this.backupFrequency.value = settings.frequency || 'daily';
                    this.autoBackupOptions.classList.remove('d-none');
                } else {
                    this.manualBackup.checked = true;
                    this.autoBackupOptions.classList.add('d-none');
                }
            }
        } catch (error) {
            console.error('載入備份設定失敗:', error);
            this.showMessage('載入備份設定失敗', 'danger');
        }
    }
    
    /**
     * 初始化自動同步設置
     */
    async initAutoSyncSettings() {
        try {
            // 載入自動同步設置
            const settings = await this.db.getAutoSyncSettings();
            console.log('已載入自動同步設置:', settings);
            
            // 設置自動同步管理器
            if (typeof this.db.autoSyncManager === 'undefined') {
                console.log('初始化自動同步管理器...');
                // 檢查是否有GitHubSync實例
                if (typeof this.db.githubSync !== 'undefined') {
                    // 創建AutoSyncManager實例
                    this.db.autoSyncManager = new AutoSyncManager(this.db.githubSync, this.db.storage);
                    console.log('自動同步管理器已初始化');
                } else {
                    console.warn('GitHubSync實例不存在，無法初始化自動同步管理器');
                }
            }
            
            // 初始化自動同步設置界面
            const autoSyncSettingsModal = document.getElementById('autoSyncSettingsModal');
            if (autoSyncSettingsModal) {
                this.initAutoSyncSettingsUI(settings);
            }
            
            // 檢查是否為首次登入，如果是則立即執行數據同步
            const isFirstLogin = !sessionStorage.getItem('hasLoggedIn');
            if (isFirstLogin) {
                console.log('檢測到首次登入，立即執行數據同步');
                sessionStorage.setItem('hasLoggedIn', 'true');
                // 立即執行數據同步，但使用靜默模式避免過多提示
                this.checkForUpdates(true);
            }
        } catch (error) {
            console.error('初始化自動同步設置失敗:', error);
        }
    }
    
    /**
     * 初始化自動同步設置界面
     * @param {Object} settings 自動同步設置
     */
    initAutoSyncSettingsUI(settings) {
        // 獲取設置元素
        const enableAutoSync = document.getElementById('enableAutoSync');
        const syncInterval = document.getElementById('syncInterval');
        const syncOnNetworkReconnect = document.getElementById('syncOnNetworkReconnect');
        const syncOnStartup = document.getElementById('syncOnStartup');
        const silentSync = document.getElementById('silentSync');
        const saveAutoSyncSettingsBtn = document.getElementById('saveAutoSyncSettingsBtn');
        
        if (enableAutoSync && syncInterval) {
            // 設置初始值
            enableAutoSync.checked = settings.enabled !== false;
            syncInterval.value = settings.intervalMinutes || 30;
            
            if (syncOnNetworkReconnect) {
                syncOnNetworkReconnect.checked = settings.syncOnNetworkReconnect !== false;
            }
            
            if (syncOnStartup) {
                syncOnStartup.checked = settings.syncOnStartup !== false;
            }
            
            if (silentSync) {
                silentSync.checked = settings.silentSync !== false;
            }
            
            // 添加保存按鈕事件
            if (saveAutoSyncSettingsBtn) {
                saveAutoSyncSettingsBtn.addEventListener('click', () => this.saveAutoSyncSettings());
            }
        }
    }
    
    /**
     * 保存自動同步設置
     */
    async saveAutoSyncSettings() {
        try {
            // 獲取設置元素
            const enableAutoSync = document.getElementById('enableAutoSync');
            const syncInterval = document.getElementById('syncInterval');
            const syncOnNetworkReconnect = document.getElementById('syncOnNetworkReconnect');
            const syncOnStartup = document.getElementById('syncOnStartup');
            const silentSync = document.getElementById('silentSync');
            
            // 構建設置對象
            const settings = {
                enabled: enableAutoSync.checked,
                intervalMinutes: parseInt(syncInterval.value) || 30,
                syncOnNetworkReconnect: syncOnNetworkReconnect ? syncOnNetworkReconnect.checked : true,
                syncOnStartup: syncOnStartup ? syncOnStartup.checked : true,
                silentSync: silentSync ? silentSync.checked : true
            };
            
            // 保存設置
            await this.db.saveAutoSyncSettings(settings);
            
            // 顯示成功消息
            this.showMessage('自動同步設置已保存', 'success');
            
            // 關閉模態框
            const modal = bootstrap.Modal.getInstance(document.getElementById('autoSyncSettingsModal'));
            if (modal) {
                modal.hide();
            }
        } catch (error) {
            console.error('保存自動同步設置失敗:', error);
            this.showMessage(`保存設置失敗: ${error.message}`, 'danger');
        }
    }
    
    /**
     * 監聽GitHub同步事件
     */
    listenForGitHubSyncEvents() {
-        // 監聽來自 database.js 的事件
-        document.addEventListener('githubSyncStatus', (e) => {
-            const { status, message, type } = e.detail;
-            this.showMessage(message, type);
-        });
+        // 現在通過 DatabaseManager 的事件監聽器處理
+        // document.addEventListener('syncStatusUpdate', ...);
+        // 保留此方法以備將來擴展，或移除
+        console.log('GitHub 同步事件監聽器設置（通過 DatabaseManager）');
     }
 
     /**
      * 初始化自動同步設置
      */
-    initAutoSyncSettings() {
-        const settings = db.getGitHubSettings();
-        const autoSyncEnabled = settings.autoSync || false;
-        const autoSyncInterval = settings.autoSyncInterval || 300; // 默認5分鐘
-        
-        const enableAutoSyncCheckbox = document.getElementById('enableAutoSync');
-        const autoSyncIntervalInput = document.getElementById('autoSyncInterval');
-        
-        if (enableAutoSyncCheckbox) {
-            enableAutoSyncCheckbox.checked = autoSyncEnabled;
-        }
-        if (autoSyncIntervalInput) {
-            autoSyncIntervalInput.value = autoSyncInterval;
-            // 根據是否啟用來顯示/隱藏間隔設置
-            const intervalGroup = autoSyncIntervalInput.closest('.mb-3');
-            if (intervalGroup) {
-                intervalGroup.style.display = autoSyncEnabled ? 'block' : 'none';
-            }
-        }
-        
-        // 添加事件監聽器以切換間隔設置的顯示
-        if (enableAutoSyncCheckbox) {
-            enableAutoSyncCheckbox.addEventListener('change', (e) => {
-                const intervalGroup = autoSyncIntervalInput.closest('.mb-3');
-                if (intervalGroup) {
-                    intervalGroup.style.display = e.target.checked ? 'block' : 'none';
-                }
-            });
+    async initAutoSyncSettings() {
+        try {
+            const autoSyncEnabled = await this.db.getSetting('autoSyncEnabled', false);
+            const autoSyncInterval = await this.db.getSetting('autoSyncInterval', 300); // 默認5分鐘 (300秒)
+
+            const enableAutoSyncCheckbox = document.getElementById('enableAutoSync');
+            const autoSyncIntervalInput = document.getElementById('autoSyncInterval');
+
+            if (enableAutoSyncCheckbox) {
+                enableAutoSyncCheckbox.checked = autoSyncEnabled;
+            }
+            if (autoSyncIntervalInput) {
+                autoSyncIntervalInput.value = autoSyncInterval;
+                const intervalGroup = autoSyncIntervalInput.closest('.mb-3');
+                if (intervalGroup) {
+                    intervalGroup.style.display = autoSyncEnabled ? 'block' : 'none';
+                }
+            }
+
+            // 添加事件監聽器以切換間隔設置的顯示
+            if (enableAutoSyncCheckbox) {
+                enableAutoSyncCheckbox.addEventListener('change', (e) => {
+                    const intervalGroup = autoSyncIntervalInput.closest('.mb-3');
+                    if (intervalGroup) {
+                        intervalGroup.style.display = e.target.checked ? 'block' : 'none';
+                    }
+                });
+            }
+        } catch (error) {
+            console.error('初始化自動同步設置失敗:', error);
+            this.showMessage('無法載入自動同步設置', 'warning');
         }
     }
 
     /**
      * 保存GitHub設置
      */
-    saveGitHubSettings() {
+    async saveGitHubSettings() {
         const token = document.getElementById('githubToken').value.trim();
         const repo = document.getElementById('githubRepo').value.trim();
         const filePath = document.getElementById('githubFilePath').value.trim();
         const enableAutoSync = document.getElementById('enableAutoSync').checked;
         const autoSyncInterval
         this.showMessage('書籍已刪除', 'success');
         this.loadBooks();
    }
    
    /**
     * 匯入書籍數據
     */
    async importBooks() {
        const file = this.importFile.files[0];
        const filterDuplicates = this.filterDuplicates.checked;

        if (!file) {
            this.showMessage('請選擇要匯入的文件', 'warning');
            return;
        }

        this.importStatus.textContent = '正在匯入...';
        this.confirmImportBtn.disabled = true;

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const booksToImport = XLSX.utils.sheet_to_json(worksheet);

                    if (!Array.isArray(booksToImport)) {
                        throw new Error('無法解析文件中的書籍數據');
                    }

                    // 使用 DatabaseManager 的批量導入方法
                    const result = await this.db.bulkImportBooks(booksToImport, filterDuplicates);

                    this.importStatus.textContent = `匯入完成：新增 ${result.added} 筆，更新 ${result.updated} 筆，跳過 ${result.skipped} 筆，錯誤 ${result.errors} 筆。`;
                    this.showMessage(`匯入完成：新增 ${result.added}，更新 ${result.updated}，跳過 ${result.skipped}`, 'success');
                    await this.loadBooks(); // 重新載入數據
                } catch (parseError) {
                    console.error('解析或匯入文件失敗:', parseError);
                    this.importStatus.textContent = `匯入失敗: ${parseError.message}`;
                    this.showMessage(`匯入失敗: ${parseError.message}`, 'danger');
                } finally {
                    this.confirmImportBtn.disabled = false;
                    this.importFile.value = ''; // 清空文件選擇
                    // 關閉模態框
                    const importModal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
                    if (importModal) {
                        importModal.hide();
                    }
                }
            };
            reader.onerror = (error) => {
                console.error('讀取文件失敗:', error);
                this.importStatus.textContent = '讀取文件失敗';
                this.showMessage('讀取文件失敗', 'danger');
                this.confirmImportBtn.disabled = false;
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error('匯入操作失敗:', error);
            this.importStatus.textContent = `匯入操作失敗: ${error.message}`;
            this.showMessage(`匯入操作失敗: ${error.message}`, 'danger');
            this.confirmImportBtn.disabled = false;
        }
    }

    /**
     * 匯出書籍數據為 Excel 文件
     */
    async exportBooks() {
        try {
            const books = await this.db.getAllBooks();
            if (books.length === 0) {
                this.showMessage('沒有書籍數據可供匯出', 'warning');
                return;
            }

            // 準備工作表數據
            const worksheetData = books.map(book => ({
                '書名': book.title,
                '作者': book.author,
                '系列': book.series,
                '分類': book.category,
                '書櫃': book.cabinet,
                '層號': book.row,
                '出版社': book.publisher,
                '描述': book.description,
                'ISBN': book.isbn,
                '備註': book.notes,
                // 可以選擇性地添加 ID
                // 'ID': book.id
            }));

            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, '書籍列表');

            // 生成 Excel 文件並觸發下載
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
            saveAs(dataBlob, '書籍列表.xlsx'); // 需要引入 FileSaver.js

            this.showMessage('書籍數據匯出成功', 'success');
        } catch (error) {
            console.error('匯出書籍數據失敗:', error);
            this.showMessage(`匯出書籍數據失敗: ${error.message}`, 'danger');
        }
    }
    
    /**
     * 切換備份選項
     */
    toggleBackupOptions() {
        if (this.autoBackup.checked) {
            this.autoBackupOptions.classList.remove('d-none');
        } else {
            this.autoBackupOptions.classList.add('d-none');
        }
    }
    
    /**
     * 載入備份設定
     */
    async loadBackupSettings() {
        try {
            const settings = await this.db.getBackupSettings();
            
            if (settings) {
                this.backupEmail.value = settings.email || '';
                
                if (settings.type === 'auto') {
                    this.autoBackup.checked = true;
                    this.backupFrequency.value = settings.frequency || 'daily';
                    this.autoBackupOptions.classList.remove('d-none');
                } else {
                    this.manualBackup.checked = true;
                    this.autoBackupOptions.classList.add('d-none');
                }
            }
        } catch (error) {
            console.error('載入備份設定失敗:', error);
            this.showMessage('載入備份設定失敗', 'danger');
        }
    }
    
    /**
     * 初始化自動同步設置
     */
    async initAutoSyncSettings() {
        try {
            // 載入自動同步設置
            const settings = await this.db.getAutoSyncSettings();
            console.log('已載入自動同步設置:', settings);
            
            // 設置自動同步管理器
            if (typeof this.db.autoSyncManager === 'undefined') {
                console.log('初始化自動同步管理器...');
                // 檢查是否有GitHubSync實例
                if (typeof this.db.githubSync !== 'undefined') {
                    // 創建AutoSyncManager實例
                    this.db.autoSyncManager = new AutoSyncManager(this.db.githubSync, this.db.storage);
                    console.log('自動同步管理器已初始化');
                } else {
                    console.warn('GitHubSync實例不存在，無法初始化自動同步管理器');
                }
            }
            
            // 初始化自動同步設置界面
            const autoSyncSettingsModal = document.getElementById('autoSyncSettingsModal');
            if (autoSyncSettingsModal) {
                this.initAutoSyncSettingsUI(settings);
            }
            
            // 檢查是否為首次登入，如果是則立即執行數據同步
            const isFirstLogin = !sessionStorage.getItem('hasLoggedIn');
            if (isFirstLogin) {
                console.log('檢測到首次登入，立即執行數據同步');
                sessionStorage.setItem('hasLoggedIn', 'true');
                // 立即執行數據同步，但使用靜默模式避免過多提示
                this.checkForUpdates(true);
            }
        } catch (error) {
            console.error('初始化自動同步設置失敗:', error);
        }
    }
    
    /**
     * 初始化自動同步設置界面
     * @param {Object} settings 自動同步設置
     */
    initAutoSyncSettingsUI(settings) {
        // 獲取設置元素
        const enableAutoSync = document.getElementById('enableAutoSync');
        const syncInterval = document.getElementById('syncInterval');
        const syncOnNetworkReconnect = document.getElementById('syncOnNetworkReconnect');
        const syncOnStartup = document.getElementById('syncOnStartup');
        const silentSync = document.getElementById('silentSync');
        const saveAutoSyncSettingsBtn = document.getElementById('saveAutoSyncSettingsBtn');
        
        if (enableAutoSync && syncInterval) {
            // 設置初始值
            enableAutoSync.checked = settings.enabled !== false;
            syncInterval.value = settings.intervalMinutes || 30;
            
            if (syncOnNetworkReconnect) {
                syncOnNetworkReconnect.checked = settings.syncOnNetworkReconnect !== false;
            }
            
            if (syncOnStartup) {
                syncOnStartup.checked = settings.syncOnStartup !== false;
            }
            
            if (silentSync) {
                silentSync.checked = settings.silentSync !== false;
            }
            
            // 添加保存按鈕事件
            if (saveAutoSyncSettingsBtn) {
                saveAutoSyncSettingsBtn.addEventListener('click', () => this.saveAutoSyncSettings());
            }
        }
    }
    
    /**
     * 保存自動同步設置
     */
    async saveAutoSyncSettings() {
        try {
            // 獲取設置元素
            const enableAutoSync = document.getElementById('enableAutoSync');
            const syncInterval = document.getElementById('syncInterval');
            const syncOnNetworkReconnect = document.getElementById('syncOnNetworkReconnect');
            const syncOnStartup = document.getElementById('syncOnStartup');
            const silentSync = document.getElementById('silentSync');
            
            // 構建設置對象
            const settings = {
                enabled: enableAutoSync.checked,
                intervalMinutes: parseInt(syncInterval.value) || 30,
                syncOnNetworkReconnect: syncOnNetworkReconnect ? syncOnNetworkReconnect.checked : true,
                syncOnStartup: syncOnStartup ? syncOnStartup.checked : true,
                silentSync: silentSync ? silentSync.checked : true
            };
            
            // 保存設置
            await this.db.saveAutoSyncSettings(settings);
            
            // 顯示成功消息
            this.showMessage('自動同步設置已保存', 'success');
            
            // 關閉模態框
            const modal = bootstrap.Modal.getInstance(document.getElementById('autoSyncSettingsModal'));
            if (modal) {
                modal.hide();
            }
        } catch (error) {
            console.error('保存自動同步設置失敗:', error);
            this.showMessage(`保存設置失敗: ${error.message}`, 'danger');
        }
    }
    
    /**
     * 監聽GitHub同步事件
     */
    listenForGitHubSyncEvents() {
-        // 監聽來自 database.js 的事件
-        document.addEventListener('githubSyncStatus', (e) => {
-            const { status, message, type } = e.detail;
-            this.showMessage(message, type);
-        });
+        // 現在通過 DatabaseManager 的事件監聽器處理
+        // document.addEventListener('syncStatusUpdate', ...);
+        // 保留此方法以備將來擴展，或移除
+        console.log('GitHub 同步事件監聽器設置（通過 DatabaseManager）');
     }
 
     /**
      * 初始化自動同步設置
      */
-    initAutoSyncSettings() {
-        const settings = db.getGitHubSettings();
-        const autoSyncEnabled = settings.autoSync || false;
-        const autoSyncInterval = settings.autoSyncInterval || 300; // 默認5分鐘
-        
-        const enableAutoSyncCheckbox = document.getElementById('enableAutoSync');
-        const autoSyncIntervalInput = document.getElementById('autoSyncInterval');
-        
-        if (enableAutoSyncCheckbox) {
-            enableAutoSyncCheckbox.checked = autoSyncEnabled;
-        }
-        if (autoSyncIntervalInput) {
-            autoSyncIntervalInput.value = autoSyncInterval;
-            // 根據是否啟用來顯示/隱藏間隔設置
-            const intervalGroup = autoSyncIntervalInput.closest('.mb-3');
-            if (intervalGroup) {
-                intervalGroup.style.display = autoSyncEnabled ? 'block' : 'none';
-            }
-        }
-        
-        // 添加事件監聽器以切換間隔設置的顯示
-        if (enableAutoSyncCheckbox) {
-            enableAutoSyncCheckbox.addEventListener('change', (e) => {
-                const intervalGroup = autoSyncIntervalInput.closest('.mb-3');
-                if (intervalGroup) {
-                    intervalGroup.style.display = e.target.checked ? 'block' : 'none';
-                }
-            });
+    async initAutoSyncSettings() {
+        try {
+            const autoSyncEnabled = await this.db.getSetting('autoSyncEnabled', false);
+            const autoSyncInterval = await this.db.getSetting('autoSyncInterval', 300); // 默認5分鐘 (300秒)
+
+            const enableAutoSyncCheckbox = document.getElementById('enableAutoSync');
+            const autoSyncIntervalInput = document.getElementById('autoSyncInterval');
+
+            if (enableAutoSyncCheckbox) {
+                enableAutoSyncCheckbox.checked = autoSyncEnabled;
+            }
+            if (autoSyncIntervalInput) {
+                autoSyncIntervalInput.value = autoSyncInterval;
+                const intervalGroup = autoSyncIntervalInput.closest('.mb-3');
+                if (intervalGroup) {
+                    intervalGroup.style.display = autoSyncEnabled ? 'block' : 'none';
+                }
+            }
+
+            // 添加事件監聽器以切換間隔設置的顯示
+            if (enableAutoSyncCheckbox) {
+                enableAutoSyncCheckbox.addEventListener('change', (e) => {
+                    const intervalGroup = autoSyncIntervalInput.closest('.mb-3');
+                    if (intervalGroup) {
+                        intervalGroup.style.display = e.target.checked ? 'block' : 'none';
+                    }
+                });
+            }
+        } catch (error) {
+            console.error('初始化自動同步設置失敗:', error);
+            this.showMessage('無法載入自動同步設置', 'warning');
         }
     }
 
     /**
      * 保存GitHub設置
      */
-    saveGitHubSettings() {
+    async saveGitHubSettings() {
         const token = document.getElementById('githubToken').value.trim();
         const repo = document.getElementById('githubRepo').value.trim();
         const filePath = document.getElementById('githubFilePath').value.trim();
         const enableAutoSync = document.getElementById('enableAutoSync').checked;
         const autoSyncInterval
         this.showMessage('書籍已刪除', 'success');
         this.loadBooks();
    }
    
    /**
     * 匯入書籍數據
     */
    async importBooks() {
        const file = this.importFile.files[0];
        const filterDuplicates = this.filterDuplicates.checked;

        if (!file) {
            this.showMessage('請選擇要匯入的文件', 'warning');
            return;
        }

        this.importStatus.textContent = '正在匯入...';
        this.confirmImportBtn.disabled = true;

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const booksToImport = XLSX.utils.sheet_to_json(worksheet);

                    if (!Array.isArray(booksToImport)) {
                        throw new Error('無法解析文件中的書籍數據');
                    }

                    // 使用 DatabaseManager 的批量導入方法
                    const result = await this.db.bulkImportBooks(booksToImport, filterDuplicates);

                    this.importStatus.textContent = `匯入完成：新增 ${result.added} 筆，更新 ${result.updated} 筆，跳過 ${result.skipped} 筆，錯誤 ${result.errors} 筆。`;
                    this.showMessage(`匯入完成：新增 ${result.added}，更新 ${result.updated}，跳過 ${result.skipped}`, 'success');
                    await this.loadBooks(); // 重新載入數據
                } catch (parseError) {
                    console.error('解析或匯入文件失敗:', parseError);
                    this.importStatus.textContent = `匯入失敗: ${parseError.message}`;
                    this.showMessage(`匯入失敗: ${parseError.message}`, 'danger');
                } finally {
                    this.confirmImportBtn.disabled = false;
                    this.importFile.value = ''; // 清空文件選擇
                    // 關閉模態框
                    const importModal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
                    if (importModal) {
                        importModal.hide();
                    }
                }
            };
            reader.onerror = (error) => {
                console.error('讀取文件失敗:', error);
                this.importStatus.textContent = '讀取文件失敗';
                this.showMessage('讀取文件失敗', 'danger');
                this.confirmImportBtn.disabled = false;
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error('匯入操作失敗:', error);
            this.importStatus.textContent = `匯入操作失敗: ${error.message}`;
            this.showMessage(`匯入操作失敗: ${error.message}`, 'danger');
            this.confirmImportBtn.disabled = false;
        }
    }

    /**
     * 匯出書籍數據為 Excel 文件
     */
    async exportBooks() {
        try {
            const books = await this.db.getAllBooks();
            if (books.length === 0) {
                this.showMessage('沒有書籍數據可供匯出', 'warning');
                return;
            }

            // 準備工作表數據
            const worksheetData = books.map(book => ({
                '書名': book.title,
                '作者': book.author,
                '系列': book.series,
                '分類': book.category,
                '書櫃': book.cabinet,
                '層號': book.row,
                '出版社': book.publisher,
                '描述': book.description,
                'ISBN': book.isbn,
                '備註': book.notes,
                // 可以選擇性地添加 ID
                // 'ID': book.id
            }));

            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, '書籍列表');

            // 生成 Excel 文件並觸發下載
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
            saveAs(dataBlob, '書籍列表.xlsx'); // 需要引入 FileSaver.js

            this.showMessage('書籍數據匯出成功', 'success');
        } catch (error) {
            console.error('匯出書籍數據失敗:', error);
            this.showMessage(`匯出書籍數據失敗: ${error.message}`, 'danger');
        }
    }
    
    /**
     * 切換備份選項
     */
    toggleBackupOptions() {
        if (this.autoBackup.checked) {
            this.autoBackupOptions.classList.remove('d-none');
        } else {
            this.autoBackupOptions.classList.add('d-none');
        }
    }
    
    /**
     * 載入備份設定
     */
    async loadBackupSettings() {
        try {
            const settings = await this.db.getBackupSettings();
            
            if (settings) {
                this.backupEmail.value = settings.email || '';
                
                if (settings.type === 'auto') {
                    this.autoBackup.checked = true;
                    this.backupFrequency.value = settings.frequency || 'daily';
                    this.autoBackupOptions.classList.remove('d-none');
                } else {
                    this.manualBackup.checked = true;
                    this.autoBackupOptions.classList.add('d-none');
                }
            }
        } catch (error) {
            console.error('載入備份設定失敗:', error);
            this.showMessage('載入備份設定失敗', 'danger');
        }
    }
    
    /**
     * 初始化自動同步設置
     */
    async initAutoSyncSettings() {
        try {
            // 載入自動同步設置
            const settings = await this.db.getAutoSyncSettings();
            console.log('已載入自動同步設置:', settings);
            
            // 設置自動同步管理器
            if (typeof this.db.autoSyncManager === 'undefined') {
                console.log('初始化自動同步管理器...');
                // 檢查是否有GitHubSync實例
                if (typeof this.db.githubSync !== 'undefined') {
                    // 創建AutoSyncManager實例
                    this.db.autoSyncManager = new AutoSyncManager(this.db.githubSync, this.db.storage);
                    console.log('自動同步管理器已初始化');
                } else {
                    console.warn('GitHubSync實例不存在，無法初始化自動同步管理器');
                }
            }
            
            // 初始化自動同步設置界面
            const autoSyncSettingsModal = document.getElementById('autoSyncSettingsModal');
            if (autoSyncSettingsModal) {
                this.initAutoSyncSettingsUI(settings);
            }
            
            // 檢查是否為首次登入，如果是則立即執行數據同步
            const isFirstLogin = !sessionStorage.getItem('hasLoggedIn');
            if (isFirstLogin) {
                console.log('檢測到首次登入，立即執行數據同步');
                sessionStorage.setItem('hasLoggedIn', 'true');
                // 立即執行數據同步，但使用靜默模式避免過多提示
                this.checkForUpdates(true);
            }
        } catch (error) {
            console.error('初始化自動同步設置失敗:', error);
        }
    }
    
    /**
     * 初始化自動同步設置界面
     * @param {Object} settings 自動同步設置
     */
    initAutoSyncSettingsUI(settings) {
        // 獲取設置元素
        const enableAutoSync = document.getElementById('enableAutoSync');
        const syncInterval = document.getElementById('syncInterval');
        const syncOnNetworkReconnect = document.getElementById('syncOnNetworkReconnect');
        const syncOnStartup = document.getElementById('syncOnStartup');
        const silentSync = document.getElementById('silentSync');
        const saveAutoSyncSettingsBtn = document.getElementById('saveAutoSyncSettingsBtn');
        
        if (enableAutoSync && syncInterval) {
            // 設置初始值
            enableAutoSync.checked = settings.enabled !== false;
            syncInterval.value = settings.intervalMinutes || 30;
            
            if (syncOnNetworkReconnect) {
                syncOnNetworkReconnect.checked = settings.syncOnNetworkReconnect !== false;
            }
            
            if (syncOnStartup) {
                syncOnStartup.checked = settings.syncOnStartup !== false;
            }
            
            if (silentSync) {
                silentSync.checked = settings.silentSync !== false;
            }
            
            // 添加保存按鈕事件
            if (saveAutoSyncSettingsBtn) {
                saveAutoSyncSettingsBtn.addEventListener('click', () => this.saveAutoSyncSettings());
            }
        }
    }
    
    /**
     * 保存自動同步設置
     */
    async saveAutoSyncSettings() {
        try {
            // 獲取設置元素
            const enableAutoSync = document.getElementById('enableAutoSync');
            const syncInterval = document.getElementById('syncInterval');
            const syncOnNetworkReconnect = document.getElementById('syncOnNetworkReconnect');
            const syncOnStartup = document.getElementById('syncOnStartup');
            const silentSync = document.getElementById('silentSync');
            
            // 構建設置對象
            const settings = {
                enabled: enableAutoSync.checked,
                intervalMinutes: parseInt(syncInterval.value) || 30,
                syncOnNetworkReconnect: syncOnNetworkReconnect ? syncOnNetworkReconnect.checked : true,
                syncOnStartup: syncOnStartup ? syncOnStartup.checked : true,
                silentSync: silentSync ? silentSync.checked : true
            };
            
            // 保存設置
            await this.db.saveAutoSyncSettings(settings);
            
            // 顯示成功消息
            this.showMessage('自動同步設置已保存', 'success');
            
            // 關閉模態框
            const modal = bootstrap.Modal.getInstance(document.getElementById('autoSyncSettingsModal'));
            if (modal) {
                modal.hide();
            }
        } catch (error) {
            console.error('保存自動同步設置失敗:', error);
            this.showMessage(`保存設置失敗: ${error.message}`, 'danger');
        }
    }
    
    /**
     * 監聽GitHub同步事件
     */
    listenForGitHubSyncEvents() {
-        // 監聽來自 database.js 的事件
-        document.addEventListener('githubSyncStatus', (e) => {
-            const { status, message, type } = e.detail;
-            this.showMessage(message, type);
-        });
+        // 現在通過 DatabaseManager 的事件監聽器處理
+        // document.addEventListener('syncStatusUpdate', ...);
+        // 保留此方法以備將來擴展，或移除
+        console.log('GitHub 同步事件監聽器設置（通過 DatabaseManager）');
     }
 
     /**
      * 初始化自動同步設置
      */
-    initAutoSyncSettings() {
-        const settings = db.getGitHubSettings();
-        const autoSyncEnabled = settings.autoSync || false;
-        const autoSyncInterval = settings.autoSyncInterval || 300; // 默認5分鐘
-        
-        const enableAutoSyncCheckbox = document.getElementById('enableAutoSync');
-        const autoSyncIntervalInput = document.getElementById('autoSyncInterval');
-        
-        if (enableAutoSyncCheckbox) {
-            enableAutoSyncCheckbox.checked = autoSyncEnabled;
-        }
-        if (autoSyncIntervalInput) {
-            autoSyncIntervalInput.value = autoSyncInterval;
-            // 根據是否啟用來顯示/隱藏間隔設置
-            const intervalGroup = autoSyncIntervalInput.closest('.mb-3');
-            if (intervalGroup) {
-                intervalGroup.style.display = autoSyncEnabled ? 'block' : 'none';
-            }
-        }
-        
-        // 添加事件監聽器以切換間隔設置的顯示
-        if (enableAutoSync