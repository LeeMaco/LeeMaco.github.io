/**
 * 主應用模組 - 整合所有功能並處理用戶界面交互
 * 優化首頁查詢書籍功能，實現自動檢查GitHub更新
 */

class App {
    constructor() {
        // 初始化元素引用
        this.initElements();
        
        // 初始化事件監聽器
        this.initEventListeners();
        
        // 載入書籍數據
        this.loadBooks();
        
        // 載入類別選項
        this.loadCategories();
        
        // 監聽GitHub同步事件
        this.listenForGitHubSyncEvents();
        
        // 初始化自動同步設置
        this.initAutoSyncSettings();
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
        
        // GitHub同步按鈕事件
        const syncGitHubBtn = document.getElementById('syncGitHubBtn');
        if (syncGitHubBtn) {
            syncGitHubBtn.addEventListener('click', () => {
                // 顯示同步中的狀態提示
                this.showMessage('正在從GitHub同步數據...', 'info');
                
                // 嘗試從GitHub獲取最新數據
                db.getAllBooks(true) // 傳入true表示強制刷新
                    .then(books => {
                        // 確保books是數組
                        if (!Array.isArray(books)) {
                            console.error('從GitHub同步數據時收到無效數據:', books);
                            this.showMessage('從GitHub同步數據時收到無效數據格式', 'danger');
                            return;
                        }
                        
                        // 顯示同步成功的狀態提示
                        this.showMessage(`成功從GitHub同步 ${books.length} 筆書籍數據`, 'success');
                        
                        // 更新顯示
                        this.displayBooks(books);
                    })
                    .catch(error => {
                        console.error('從GitHub同步數據時發生錯誤:', error);
                        
                        // 顯示同步失敗的狀態提示
                        this.showMessage(`從GitHub同步數據時發生錯誤: ${error.message}`, 'danger');
                    });
            });
        }
        
        // 書籍表單事件
        this.bookForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveBook();
        });
        this.saveBookBtn.addEventListener('click', () => this.saveBook());
        
        // 匯入/匯出事件
        this.confirmImportBtn.addEventListener('click', () => this.importBooks());
        this.exportBtn.addEventListener('click', () => this.exportBooks());
        
        // 備份事件
        this.autoBackup.addEventListener('change', () => this.toggleAutoBackupOptions());
        this.manualBackup.addEventListener('change', () => this.toggleAutoBackupOptions());
        this.saveBackupSettingsBtn.addEventListener('click', () => this.saveBackupSettings());
        this.manualBackupBtn.addEventListener('click', () => this.performBackup());
        
        // EmailJS設定事件
        const saveEmailJSSettingsBtn = document.getElementById('saveEmailJSSettingsBtn');
        if (saveEmailJSSettingsBtn) {
            saveEmailJSSettingsBtn.addEventListener('click', () => this.saveEmailJSSettings());
        }
        
        const testEmailJSBtn = document.getElementById('testEmailJSBtn');
        if (testEmailJSBtn) {
            testEmailJSBtn.addEventListener('click', () => this.testEmailJSConnection());
        }
        
        // 監聽模態框事件
        document.getElementById('bookModal').addEventListener('show.bs.modal', (e) => {
            const button = e.relatedTarget;
            if (button && button.getAttribute('data-book-id')) {
                this.loadBookForEdit(button.getAttribute('data-book-id'));
            } else {
                this.resetBookForm();
            }
        });
        
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
        
        // 監聽刪除確認事件
        this.confirmDeleteBtn.addEventListener('click', () => {
            const bookId = this.confirmDeleteBtn.getAttribute('data-book-id');
            if (bookId) this.deleteBook(bookId);
        });
    }
    
    /**
     * 載入書籍數據
     * @param {boolean} checkForUpdates 是否檢查更新
     */
    loadBooks(checkForUpdates = true) {
        // 顯示載入中的狀態提示
        this.showMessage('正在載入書籍數據...', 'info');
        
        // 使用Promise方式獲取書籍數據
        db.getAllBooks()
            .then(books => {
                // 確保books是數組
                if (!Array.isArray(books)) {
                    console.error('載入書籍數據時收到無效數據:', books);
                    this.showMessage('載入書籍數據時收到無效數據格式', 'danger');
                    this.displayBooks([]);
                    return;
                }
                this.displayBooks(books);
                this.showMessage(`成功載入 ${books.length} 筆書籍數據`, 'success');
                
                // 檢查更新
                if (checkForUpdates) {
                    this.checkForUpdates(true);
                }
            })
            .catch(error => {
                console.error('載入書籍數據時發生錯誤:', error);
                this.showMessage(`載入書籍數據時發生錯誤: ${error.message}`, 'danger');
                this.displayBooks([]);
            });
    }
    
    /**
     * 檢查GitHub更新
     * @param {boolean} silent 是否靜默同步
     */
    checkForUpdates(silent = false) {
        // 使用靜默模式檢查更新
        db.syncFromGitHub(false, silent)
            .then(result => {
                if (result.status === 'success' && !silent) {
                    // 如果同步成功且非靜默模式，顯示成功消息
                    this.showMessage(`成功從GitHub同步 ${result.total} 筆書籍數據`, 'success');
                    
                    // 重新載入書籍數據（不再檢查更新，避免循環）
                    this.loadBooks(false);
                } else if (result.status === 'error' && !silent) {
                    // 如果同步失敗且非靜默模式，顯示錯誤消息
                    this.showMessage(`從GitHub同步數據時發生錯誤: ${result.message}`, 'danger');
                }
            })
            .catch(error => {
                if (!silent) {
                    console.error('檢查更新時發生錯誤:', error);
                    this.showMessage(`檢查更新時發生錯誤: ${error.message}`, 'danger');
                }
            });
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
        db.getAllCategories()
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
            db.getAllBooks()
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
        db.getAllBooks(true)
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
    showBookDetails(book) {
        this.bookDetailsTitle.textContent = book.title;
        this.detailAuthor.textContent = book.author || '-';
        this.detailSeries.textContent = book.series || '-';
        this.detailCategory.textContent = book.category || '-';
        this.detailCabinet.textContent = book.cabinet || '-';
        this.detailRow.textContent = book.row || '-';
        this.detailPublisher.textContent = book.publisher || '-';
        this.detailDescription.textContent = book.description || '-';
        this.detailISBN.textContent = book.isbn || '-';
        this.detailNotes.textContent = book.notes || '-';
        
        // 顯示詳情彈窗
        const modal = new bootstrap.Modal(document.getElementById('bookDetailsModal'));
        modal.show();
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
    saveBook() {
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
        
        // 新增或更新書籍
        if (this.bookId.value) {
            // 更新現有書籍
            book.id = this.bookId.value;
            db.updateBook(book);
            this.showMessage('書籍已更新', 'success');
        } else {
            // 新增書籍
            db.addBook(book);
            this.showMessage('書籍已新增', 'success');
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
    deleteBook(id) {
        db.deleteBook(id);
        this.showMessage('書籍已刪除', 'success');
        this.loadBooks();
    }
    
    /**
     * 匯入書籍
     */
    importBooks() {
        const file = this.importFile.files[0];
        if (!file) {
            this.showImportStatus('請選擇Excel檔案', 'danger');
            return;
        }
        
        const filterDuplicates = this.filterDuplicates.checked;
        const autoUploadGitHub = document.getElementById('autoUploadGitHub') && document.getElementById('autoUploadGitHub').checked;
        
        // 顯示處理中狀態
        this.showImportStatus('正在處理檔案...', 'info');
        
        // 使用數據處理器解析Excel
        dataProcessor.parseExcelFile(file)
            .then(books => {
                if (books.length === 0) {
                    this.showImportStatus('Excel檔案中沒有資料', 'warning');
                    return;
                }
                
                this.showImportStatus(`已從Excel讀取 ${books.length} 筆資料，正在匯入...`, 'info');
                
                // 檢查是否使用admin.js中的importFromExcel函數
                if (typeof admin !== 'undefined' && admin.importFromExcel && autoUploadGitHub) {
                    // 使用admin.js中的importFromExcel函數（包含GitHub上傳）
                    this.showImportStatus(`正在匯入資料並上傳到GitHub...`, 'info');
                    
                    return admin.importFromExcel(books, true)
                        .then(result => {
                            // 顯示匯入結果
                            let statusMsg = `成功匯入 ${result.imported} 筆資料`;
                            if (result.updated > 0) {
                                statusMsg += `，更新 ${result.updated} 筆資料`;
                            }
                            if (filterDuplicates && result.filtered > 0) {
                                statusMsg += `，過濾 ${result.filtered} 筆重複資料`;
                            }
                            if (autoUploadGitHub) {
                                statusMsg += '，並已上傳到GitHub';
                            }
                            
                            this.showImportStatus(statusMsg, 'success');
                            this.showMessage(statusMsg, 'success');
                            
                            // 重新載入書籍和類別
                            this.loadBooks();
                            this.loadCategories();
                        })
                        .catch(error => {
                            // 處理上傳錯誤，但仍然顯示本地匯入成功
                            const errorMsg = `資料已匯入本地，但上傳到GitHub失敗: ${error.message}`;
                            this.showImportStatus(errorMsg, 'warning');
                            this.showMessage(errorMsg, 'warning');
                            
                            // 重新載入書籍和類別
                            this.loadBooks();
                            this.loadCategories();
                        });
                } else {
                    // 使用原有的db.importBooks函數
                    const result = db.importBooks(books, filterDuplicates);
                    
                    // 顯示匯入結果
                    let statusMsg = `成功匯入 ${result.imported} 筆資料`;
                    if (result.updated > 0) {
                        statusMsg += `，更新 ${result.updated} 筆資料`;
                    }
                    if (filterDuplicates && result.filtered > 0) {
                        statusMsg += `，過濾 ${result.filtered} 筆重複資料`;
                    }
                    
                    this.showImportStatus(statusMsg, 'success');
                    this.showMessage(statusMsg, 'success');
                    
                    // 重新載入書籍和類別
                    this.loadBooks();
                    this.loadCategories();
                }
            })
            .catch(error => {
                console.error('匯入錯誤:', error);
                const errorMsg = `匯入失敗: ${error.message || '請檢查檔案格式'}`;
                this.showImportStatus(errorMsg, 'danger');
                this.showMessage(errorMsg, 'danger');
            });
    }
    
    /**
     * 顯示匯入狀態
     * @param {string} message 訊息
     * @param {string} type 類型 (success, danger, warning, info)
     */
    showImportStatus(message, type) {
        if (!this.importStatus) return;
        
        // 根據類型選擇圖標
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
        
        this.importStatus.innerHTML = icon + message;
        this.importStatus.className = `alert alert-${type}`;
        this.importStatus.classList.remove('d-none');
        
        // 如果是錯誤或警告，滾動到狀態消息位置
        if (type === 'danger' || type === 'warning') {
            this.importStatus.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    /**
     * 匯出書籍
     */
    exportBooks() {
        const books = db.getAllBooks();
        
        if (books.length === 0) {
            this.showMessage('沒有資料可匯出', 'warning');
            return;
        }
        
        // 使用數據處理器創建工作表
        const workbook = dataProcessor.createExcelWorkbook(books);
        
        // 生成檔案名稱
        const fileName = dataProcessor.generateTimestampFileName('書籍資料');
        
        // 匯出Excel檔案
        XLSX.writeFile(workbook, fileName);
        this.showMessage('資料已匯出', 'success');
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
    loadBackupSettings() {
        const settings = db.getBackupSettings();
        
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
    }
    
    /**
     * 初始化自動同步設置
     */
    async initAutoSyncSettings() {
        try {
            // 載入自動同步設置
            const settings = await db.getAutoSyncSettings();
            console.log('已載入自動同步設置:', settings);
            
            // 設置自動同步管理器
            if (typeof db.autoSyncManager === 'undefined') {
                console.log('初始化自動同步管理器...');
                // 檢查是否有GitHubSync實例
                if (typeof db.githubSync !== 'undefined') {
                    // 創建AutoSyncManager實例
                    db.autoSyncManager = new AutoSyncManager(db.githubSync, db.storage);
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
            await db.saveAutoSyncSettings(settings);
            
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
        document.addEventListener('githubSync', (event) => this.handleGitHubSyncEvent(event));
    }
    
    /**
     * 處理GitHub同步事件
     * @param {CustomEvent} event 同步事件
     */
    handleGitHubSyncEvent(event) {
        const { status, timestamp, error, source } = event.detail;
        
        // 如果是靜默同步且成功，不顯示通知
        if (source === 'autoSync' && status === 'success') {
            const autoSyncSettings = db.getAutoSyncSettings();
            if (autoSyncSettings && autoSyncSettings.silentSync) {
                console.log('靜默同步成功，不顯示通知');
                return;
            }
        }
        
        // 選擇通知類型和圖標
        let toastClass = '';
        let icon = '';
        let message = '';
        let detailMessage = '';
        
        if (status === 'success') {
            toastClass = 'text-bg-success';
            icon = '<i class="fas fa-check-circle me-2"></i>';
            message = '數據已成功同步到GitHub';
            detailMessage = `同步時間: ${new Date(timestamp).toLocaleString()}`;
        } else {
            toastClass = 'text-bg-danger';
            icon = '<i class="fas fa-exclamation-circle me-2"></i>';
            message = '同步失敗';
            
            // 提供更詳細的錯誤信息
            if (error) {
                if (error.message.includes('網絡連接失敗')) {
                    detailMessage = '無法連接到GitHub服務器，請檢查您的網絡連接';
                } else if (error.message.includes('授權失敗')) {
                    detailMessage = '請檢查您的GitHub訪問令牌是否有效';
                } else if (error.message.includes('權限不足')) {
                    detailMessage = '請確保您的令牌有足夠的權限操作此倉庫';
                } else if (error.message.includes('請求超時')) {
                    detailMessage = '連接GitHub服務器超時，請稍後再試';
                } else {
                    detailMessage = error.message || '未知錯誤';
                }
            } else {
                detailMessage = '發生未知錯誤，請稍後再試';
            }
        }
        
        // 創建通知元素
        const toast = document.createElement('div');
        toast.className = `toast align-items-center ${toastClass} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        // 設置通知內容
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${icon}${message}
                    ${detailMessage ? `<div class="small mt-1">${detailMessage}</div>` : ''}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        // 添加到通知區域
        this.syncStatus.appendChild(toast);
        
        // 顯示通知
        const bsToast = new bootstrap.Toast(toast, { delay: 6000 }); // 延長顯示時間
        bsToast.show();
        
        // 自動移除通知
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
        
        // 如果同步成功，重新載入書籍列表
        if (status === 'success') {
            this.loadBooks();
        }
        
        // 如果同步失敗，顯示重試按鈕
        if (status === 'error' && error) {
            const retryBtn = document.createElement('button');
            retryBtn.className = 'btn btn-sm btn-warning mt-2 d-block mx-auto';
            retryBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i>重試同步';
            retryBtn.onclick = () => {
                // 移除當前通知
                bsToast.hide();
                // 顯示新的進度通知
                this.showMessage('正在重新嘗試同步...', 'info');
                // 觸發重新同步
                setTimeout(() => {
                    const books = db.getAllBooks();
                    admin.uploadToGitHub({ books: books })
                        .catch(err => console.error('重試同步失敗:', err));
                }, 1000);
            };
            
            // 將重試按鈕添加到通知中
            const toastBody = toast.querySelector('.toast-body');
            if (toastBody && !toastBody.querySelector('.btn-warning')) {
                toastBody.appendChild(retryBtn);
            }
        }
    }
    
    /**
     * 儲存備份設定
     */
    saveBackupSettings() {
        const email = this.backupEmail.value.trim();
        
        if (!email) {
            this.showBackupStatus('請輸入Email地址', 'danger');
            return;
        }
        
        // 使用郵件服務驗證Email格式
        if (!emailService.validateEmail(email)) {
            this.showBackupStatus('請輸入有效的Email地址', 'danger');
            return;
        }
        
        // 構建設定對象
        const settings = {
            email: email,
            type: this.autoBackup.checked ? 'auto' : 'manual'
        };
        
        // 如果是自動備份，添加頻率
        if (settings.type === 'auto') {
            settings.frequency = this.backupFrequency.value;
        }
        
        // 儲存設定
        db.saveBackupSettings(settings);
        this.showBackupStatus('備份設定已儲存', 'success');
        
        // 如果是自動備份，設置定時任務
        if (settings.type === 'auto') {
            const scheduleInfo = emailService.setupBackupSchedule(settings);
            this.showBackupStatus(`自動備份已設定，下次備份時間：${scheduleInfo.nextBackupTime}`, 'success');
        }
    }
    
    /**
     * 設置自動備份
     * @param {Object} settings 備份設定
     */
    setupAutoBackup(settings) {
        // 使用郵件服務設置自動備份排程
        return emailService.setupBackupSchedule(settings);
    }
    
    /**
     * 執行備份
     */
    performBackup() {
        const settings = db.getBackupSettings();
        const emailjsSettings = db.getEmailJSSettings();
        
        if (!settings || !settings.email) {
            this.showBackupStatus('請先設定備份Email', 'danger');
            return;
        }
        
        if (!emailjsSettings || !emailjsSettings.userID || !emailjsSettings.serviceID || !emailjsSettings.templateID) {
            this.showBackupStatus('請先完成EmailJS設定 <button class="btn btn-sm btn-primary ms-2" id="openEmailJSSettingsBtn">設定EmailJS</button>', 'danger');
            
            // 添加按鈕點擊事件
            document.getElementById('openEmailJSSettingsBtn').addEventListener('click', () => {
                // 關閉備份模態框
                const backupModal = bootstrap.Modal.getInstance(document.getElementById('backupModal'));
                backupModal.hide();
                
                // 打開EmailJS設定模態框
                setTimeout(() => {
                    const emailJSModal = new bootstrap.Modal(document.getElementById('emailJSSettingsModal'));
                    emailJSModal.show();
                }, 500);
            });
            
            return;
        }
        
        // 匯出資料
        const books = db.getAllBooks();
        
        if (books.length === 0) {
            this.showBackupStatus('沒有資料可備份', 'warning');
            return;
        }
        
        // 顯示處理中狀態
        this.showBackupStatus('正在處理備份...', 'info');
        
        try {
            // 使用數據處理器創建工作表
            const workbook = dataProcessor.createExcelWorkbook(books);
            
            // 生成檔案名稱
            const fileName = dataProcessor.generateTimestampFileName('書籍資料_備份');
            
            // 匯出Excel檔案
            try {
                XLSX.writeFile(workbook, fileName);
                this.showBackupStatus(`檔案已生成 (${fileName})，正在發送郵件...`, 'info');
            } catch (fileError) {
                console.error('檔案生成錯誤:', fileError);
                this.showBackupStatus(`Excel檔案生成失敗：${fileError.message}，嘗試繼續發送郵件備份...`, 'warning');
            }
            
            // 顯示備份進度
            const progressStatus = document.createElement('div');
            progressStatus.className = 'progress mt-2';
            progressStatus.innerHTML = `
                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                     role="progressbar" style="width: 25%" 
                     aria-valuenow="25" aria-valuemin="0" aria-valuemax="100">
                    準備發送中...
                </div>
            `;
            this.backupStatus.appendChild(progressStatus);
            
            // 更新進度條
            const progressBar = progressStatus.querySelector('.progress-bar');
            progressBar.style.width = '50%';
            progressBar.textContent = '正在發送郵件...';
            
            // 使用郵件服務發送備份
            emailService.sendBackupEmail(settings.email, books, fileName, emailjsSettings)
                .then((result) => {
                    // 更新進度條
                    progressBar.style.width = '100%';
                    progressBar.classList.remove('progress-bar-animated');
                    progressBar.classList.add('bg-success');
                    progressBar.textContent = '備份完成！';
                    
                    // 顯示詳細信息
                    const details = result.details || {};
                    const recordCount = details.recordCount || books.length;
                    const sizeKB = details.sizeKB || '未知';
                    
                    // 顯示成功信息
                    this.showBackupStatus(`
                        <div class="d-flex align-items-center">
                            <i class="fas fa-check-circle text-success me-2 fs-4"></i>
                            <div>
                                <strong>備份成功！</strong><br>
                                檔案已下載 (${fileName})<br>
                                備份已發送至 ${settings.email}<br>
                                共 ${recordCount} 筆記錄，大小約 ${sizeKB}KB
                                <div class="text-muted small">備份時間: ${new Date().toLocaleString()}</div>
                            </div>
                        </div>
                    `, 'success');
                    
                    // 顯示全局通知
                    this.showMessage('備份已成功完成並發送至您的郵箱', 'success');
                })
                .catch(error => {
                    console.error('備份錯誤:', error);
                    
                    // 更新進度條
                    progressBar.style.width = '100%';
                    progressBar.classList.remove('progress-bar-animated');
                    progressBar.classList.add('bg-danger');
                    progressBar.textContent = '發送失敗';
                    
                    // 顯示錯誤信息
                    this.showBackupStatus(`
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <strong>部分備份成功</strong><br>
                            Excel檔案已生成 (${fileName})，但郵件發送失敗：<br>
                            ${error.message}<br>
                            <div class="mt-2">
                                <button class="btn btn-sm btn-outline-primary retry-backup-btn">
                                    <i class="fas fa-redo me-1"></i> 重試發送
                                </button>
                            </div>
                        </div>
                    `, 'warning');
                    
                    // 添加重試按鈕事件
                    const retryBtn = this.backupStatus.querySelector('.retry-backup-btn');
                    if (retryBtn) {
                        retryBtn.addEventListener('click', () => this.performBackup());
                    }
                });
        } catch (error) {
            console.error('備份生成錯誤:', error);
            this.showBackupStatus(`
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    <strong>備份失敗</strong><br>
                    備份過程中發生錯誤：${error.message}<br>
                    <div class="text-muted small mt-1">錯誤類型: ${error.name || '未知'}</div>
                </div>
            `, 'danger');
        }
    }
    
    /**
     * 顯示備份狀態
     * @param {string} message 訊息
     * @param {string} type 類型 (success, danger, warning, info)
     */
    showBackupStatus(message, type) {
        if (!this.backupStatus) return;
        
        // 根據類型選擇圖標
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
        
        this.backupStatus.innerHTML = icon + message;
        this.backupStatus.className = `alert alert-${type}`;
        this.backupStatus.classList.remove('d-none');
        
        // 如果是錯誤或警告，滾動到狀態消息位置
        if (type === 'danger' || type === 'warning') {
            this.backupStatus.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    /**
     * 顯示EmailJS設定狀態
     * @param {string} message 訊息
     * @param {string} type 類型 (success, danger, warning, info)
     */
    showEmailJSStatus(message, type) {
        const emailjsStatus = document.getElementById('emailjsStatus');
        if (!emailjsStatus) return;
        
        // 根據類型選擇圖標
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
        
        emailjsStatus.innerHTML = icon + message;
        emailjsStatus.className = `alert alert-${type}`;
        emailjsStatus.classList.remove('d-none');
    }
    
    /**
     * 加載EmailJS設定
     */
    loadEmailJSSettings() {
        const settings = db.getEmailJSSettings();
        if (!settings) return;
        
        // 填充表單
        document.getElementById('emailjsUserID').value = settings.userID || '';
        document.getElementById('emailjsServiceID').value = settings.serviceID || '';
        document.getElementById('emailjsTemplateID').value = settings.templateID || '';
    }
    
    /**
     * 保存EmailJS設定
     */
    saveEmailJSSettings() {
        const userID = document.getElementById('emailjsUserID').value.trim();
        const serviceID = document.getElementById('emailjsServiceID').value.trim();
        const templateID = document.getElementById('emailjsTemplateID').value.trim();
        
        if (!userID || !serviceID || !templateID) {
            this.showEmailJSStatus('請填寫所有必要欄位', 'danger');
            return;
        }
        
        // 構建設定對象
        const settings = {
            userID: userID,
            serviceID: serviceID,
            templateID: templateID
        };
        
        // 儲存設定
        db.saveEmailJSSettings(settings);
        this.showEmailJSStatus('EmailJS設定已儲存', 'success');
    }
    
    /**
     * 測試EmailJS連接
     */
    testEmailJSConnection() {
        const settings = db.getEmailJSSettings();
        
        if (!settings || !settings.userID || !settings.serviceID || !settings.templateID) {
            this.showEmailJSStatus('請先保存完整的EmailJS設定', 'danger');
            return;
        }
        
        this.showEmailJSStatus('正在測試連接...', 'info');
        
        try {
            // 初始化EmailJS
            emailjs.init(settings.userID);
            
            // 準備測試參數
            const templateParams = {
                to_email: 'test@example.com',
                from_name: '書籍查詢管理系統',
                message: '這是一個測試訊息，請忽略',
                file_name: '測試檔案.xlsx',
                data_json: JSON.stringify({test: 'data'})
            };
            
            // 使用EmailJS發送測試郵件
            emailjs.send(settings.serviceID, settings.templateID, templateParams)
                .then(() => {
                    this.showEmailJSStatus('連接測試成功！EmailJS設定正確', 'success');
                })
                .catch((error) => {
                    console.error('EmailJS測試失敗:', error);
                    this.showEmailJSStatus(`連接測試失敗：${error.text || error.message}`, 'danger');
                });
        } catch (error) {
            console.error('EmailJS初始化失敗:', error);
            this.showEmailJSStatus(`連接測試失敗：${error.message}`, 'danger');
        }
    }
    
    /**
     * 顯示訊息
     * @param {string} message 訊息
     * @param {string} type 類型 (success, danger, warning, info)
     * @param {number} delay 顯示時間（毫秒）
     */
    showMessage(message, type, delay = 5000) {
        // 創建Toast元素
        const toastContainer = document.getElementById('toastContainer') || this.createToastContainer();
        const toastId = 'toast-' + Date.now();
        
        // 根據類型選擇圖標
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
        
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.id = toastId;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        const toastContent = document.createElement('div');
        toastContent.className = 'd-flex';
        
        const toastBody = document.createElement('div');
        toastBody.className = 'toast-body d-flex align-items-center';
        toastBody.innerHTML = icon + message;
        
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close btn-close-white me-2 m-auto';
        closeButton.setAttribute('data-bs-dismiss', 'toast');
        closeButton.setAttribute('aria-label', '關閉');
        
        toastContent.appendChild(toastBody);
        toastContent.appendChild(closeButton);
        toast.appendChild(toastContent);
        toastContainer.appendChild(toast);
        
        // 初始化並顯示Toast
        const bsToast = new bootstrap.Toast(toast, { delay: delay });
        bsToast.show();
        
        // 自動移除
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
        
        return toast;
    }
    
    /**
     * 創建Toast容器
     * @returns {HTMLElement} Toast容器
     */
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1060';
        document.body.appendChild(container);
        return container;
    }
}

// 初始化應用
document.addEventListener('DOMContentLoaded', () => {
    // 檢查是否已登入
    auth.checkLoginStatus();
    
    // 初始化應用
    window.app = new App();
    
    // 設置新增書籍按鈕事件
    document.getElementById('addBookBtn').addEventListener('click', () => {
        window.app.addBook();
    });
});