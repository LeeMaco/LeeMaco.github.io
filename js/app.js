/**
 * 主應用模組 - 整合所有功能並處理用戶界面交互
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
        this.searchBtn.addEventListener('click', this.searchBooks.bind(this));
        this.resetBtn.addEventListener('click', this.resetSearch.bind(this));
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchBooks();
        });
        
        // 書籍表單事件
        this.saveBookBtn.addEventListener('click', () => this.saveBook());
        
        // 匯入/匯出事件
        this.confirmImportBtn.addEventListener('click', () => this.importBooks());
        
        // GitHub同步事件
        document.addEventListener('githubSync', (event) => this.handleGitHubSyncEvent(event));
        this.exportBtn.addEventListener('click', () => this.exportBooks());
        
        // 備份設定事件
        this.manualBackup.addEventListener('change', () => this.toggleBackupOptions());
        this.autoBackup.addEventListener('change', () => this.toggleBackupOptions());
        this.manualBackupBtn.addEventListener('click', () => this.performBackup());
        this.saveBackupSettingsBtn.addEventListener('click', () => this.saveBackupSettings());
        
        // 載入備份設定
        this.loadBackupSettings();
    }
    
    /**
     * 載入書籍數據
     */
    loadBooks() {
        const books = db.getAllBooks();
        this.displayBooks(books);
    }
    
    /**
     * 載入類別選項
     * 注意：類別篩選功能已移除，此函數保留用於其他可能的用途
     */
    loadCategories() {
        // 獲取所有類別（可能用於其他功能）
        const categories = db.getAllCategories();
        // 類別篩選下拉框已移除，不再需要填充選項
    }
    
    /**
     * 顯示書籍列表
     * @param {Array} books 書籍數組
     */
    displayBooks(books) {
        // 清空表格
        this.booksTableBody.innerHTML = '';
        
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
            
            let results = db.getAllBooks();
            
            // 檢查數據庫是否返回有效數據
            if (!Array.isArray(results)) {
                throw new Error('數據庫返回無效數據');
            }
            
            // 按關鍵字搜尋（書名、作者、描述、備註等多個欄位）
            if (query) {
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
            }
            
            // 顯示搜尋結果和狀態提示
            this.displayBooks(results);
            
            // 顯示搜尋條件的狀態提示
            if (query) {
                this.showMessage(`搜尋關鍵字「${query}」，找到 ${results.length} 筆資料`, results.length > 0 ? 'info' : 'warning');
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
        const { status, timestamp, error } = event.detail;
        
        // 創建通知元素
        const toast = document.createElement('div');
        toast.className = `toast align-items-center ${status === 'success' ? 'text-bg-success' : 'text-bg-danger'}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        // 設置通知內容
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${status === 'success' 
                        ? '數據已成功同步到GitHub' 
                        : `同步失敗: ${error ? error.message : '未知錯誤'}`}
                </div>
                <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        // 添加到通知區域
        this.syncStatus.appendChild(toast);
        
        // 顯示通知
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // 自動移除通知
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
        
        // 如果同步成功，重新載入書籍列表
        if (status === 'success') {
            this.loadBooks();
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
        
        if (!settings || !settings.email) {
            this.showBackupStatus('請先設定備份Email', 'danger');
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
        
        // 使用數據處理器創建工作表
        const workbook = dataProcessor.createExcelWorkbook(books);
        
        // 生成檔案名稱
        const fileName = dataProcessor.generateTimestampFileName('書籍資料_備份');
        
        // 匯出Excel檔案
        XLSX.writeFile(workbook, fileName);
        
        // 使用郵件服務發送備份
        emailService.sendBackupEmail(settings.email, books, fileName)
            .then(() => {
                this.showBackupStatus(`備份已完成，檔案已下載 (${fileName})。在實際環境中，備份將發送至 ${settings.email}`, 'success');
            })
            .catch(error => {
                console.error('備份錯誤:', error);
                this.showBackupStatus('備份過程中發生錯誤，請稍後再試', 'danger');
            });
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