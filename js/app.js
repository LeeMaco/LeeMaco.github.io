/**
 * 書籍管理系統 - 應用程序模塊
 * 負責用戶界面交互和功能邏輯
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM元素
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const categoryFilter = document.getElementById('categoryFilter');
    const bookResults = document.getElementById('bookResults');
    const adminPanel = document.getElementById('adminPanel');
    const loginBtn = document.getElementById('loginBtn');
    const addBookBtn = document.getElementById('addBookBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const backupBtn = document.getElementById('backupBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminBookList = document.getElementById('adminBookList');
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modalContent');
    const closeModal = document.querySelector('.close');
    
    // 模板
    const bookDetailTemplate = document.getElementById('bookDetailTemplate');
    const bookFormTemplate = document.getElementById('bookFormTemplate');
    const loginFormTemplate = document.getElementById('loginFormTemplate');
    
    // 應用程序狀態
    let isAdminLoggedIn = false;
    
    // 初始化應用程序
    init();
    
    // 事件監聽器
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleSearch();
    });
    categoryFilter.addEventListener('change', handleSearch);
    loginBtn.addEventListener('click', showLoginForm);
    logoutBtn.addEventListener('click', handleLogout);
    addBookBtn.addEventListener('click', showAddBookForm);
    exportBtn.addEventListener('click', handleExport);
    importBtn.addEventListener('click', showImportForm);
    backupBtn.addEventListener('click', handleBackup);
    document.getElementById('trashBinBtn').addEventListener('click', showTrashBin);
    closeModal.addEventListener('click', closeModalWindow);
    window.addEventListener('click', function(e) {
        if (e.target === modal) closeModalWindow();
    });
    
    /**
     * 初始化應用程序
     */
    async function init() {
        // 初始顯示提示信息，而不是所有書籍
        bookResults.innerHTML = '<p class="no-results">請輸入關鍵字搜索書籍</p>';
        
        // 檢查是否已登入
        checkLoginStatus();
        
        // 自動從GitHub獲取最新數據（所有用戶，包括非管理員）
        try {
            // 顯示加載提示
            const loadingNotification = showNotification('正在從GitHub獲取最新數據...', 'info', 0);
            
            // 獲取GitHub數據
            const githubData = await AdminModule.fetchLatestDataFromGitHub(showNotification);
            
            // 如果成功獲取數據
            if (githubData && Array.isArray(githubData)) {
                // 獲取本地數據
                const localData = BookData.getBooks();
                
                // 檢查數據是否有變化
                const localDataStr = JSON.stringify(localData);
                const githubDataStr = JSON.stringify(githubData);
                
                if (localDataStr !== githubDataStr) {
                    // 更新本地數據
                    BookData.saveBooks(githubData);
                    showNotification('已更新至最新書籍數據', 'success');
                } else {
                    console.log('本地數據已是最新');
                }
            } else {
                // 如果無法獲取GitHub數據，使用本地數據
                console.log('無法獲取GitHub數據，使用本地數據');
                // 不顯示錯誤通知，靜默降級到本地數據
            }
            
            // 移除加載提示
            if (loadingNotification) {
                loadingNotification.remove();
            }
        } catch (error) {
            console.error('自動更新數據時出錯:', error);
            // 優雅降級：使用本地數據，但不顯示錯誤通知給普通用戶
            if (isAdminLoggedIn) {
                showNotification('自動更新數據時出錯，使用本地數據', 'warning');
            }
        }
        }
    }
    
    /**
     * 檢查登入狀態
     */
    function checkLoginStatus() {
        isAdminLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';
        updateUIForLoginStatus();
    }
    
    /**
     * 根據登入狀態更新UI
     */
    function updateUIForLoginStatus() {
        if (isAdminLoggedIn) {
            loginBtn.classList.add('hidden');
            adminPanel.classList.remove('hidden');
            displayAdminBookList();
        } else {
            loginBtn.classList.remove('hidden');
            adminPanel.classList.add('hidden');
        }
    }
    
    /**
     * 處理搜索
     */
    function handleSearch() {
        try {
            const query = searchInput.value.trim();
            const category = categoryFilter.value;
            
            // 添加錯誤處理
            if (query === '' && category === '') {
                showNotification('請輸入搜索關鍵字或選擇分類', 'warning');
                bookResults.innerHTML = '<p class="no-results">請輸入關鍵字或選擇分類搜索書籍</p>';
                return;
            }
            
            const results = BookData.searchBooks(query, category);
            
            if (results.length === 0) {
                bookResults.innerHTML = '<p class="no-results">未找到符合條件的書籍</p>';
                showNotification('未找到符合條件的書籍', 'info');
            } else {
                displayBooks(results);
                showNotification(`找到 ${results.length} 本符合條件的書籍`, 'success');
            }
        } catch (error) {
            console.error('搜索時發生錯誤:', error);
            bookResults.innerHTML = '<p class="no-results">搜索時發生錯誤，請稍後再試</p>';
            showNotification('搜索時發生錯誤: ' + error.message, 'error');
        }
    }
    
    /**
     * 顯示書籍列表
     */
    function displayBooks(books) {
        bookResults.innerHTML = '';
        
        if (books.length === 0) {
            bookResults.innerHTML = '<p class="no-results">沒有找到符合條件的書籍</p>';
            return;
        }
        
        books.forEach(book => {
            const bookCard = document.createElement('div');
            bookCard.className = 'book-card';
            bookCard.dataset.id = book.id;
            
            bookCard.innerHTML = `
                <h3>${book.title}</h3>
                <p><strong>作者:</strong> ${book.author}</p>
                <p><strong>集數:</strong> ${book.volume || '無'}</p>
                <p><strong>櫃號:</strong> ${book.cabinet || '無'}</p>
                <p><strong>行號:</strong> ${book.row || '無'}</p>
            `;
            
            bookCard.addEventListener('click', function() {
                showBookDetails(book);
            });
            
            bookResults.appendChild(bookCard);
        });
    }
    
    /**
     * 格式化日期
     */
    function formatDate(dateString) {
        if (!dateString) return '無';
        const date = new Date(dateString);
        return date.toLocaleString('zh-TW', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    /**
     * 顯示管理員書籍列表
     */
    function displayAdminBookList() {
        const books = BookData.getBooks();
        adminBookList.innerHTML = `
            <div class="book-list-item book-list-header">
                <div>書名</div>
                <div>作者</div>
                <div>集數</div>
                <div>櫃號</div>
                <div>行號</div>
                <div>操作</div>
            </div>
        `;
        
        books.forEach(book => {
            const listItem = document.createElement('div');
            listItem.className = 'book-list-item';
            listItem.dataset.id = book.id;
            
            listItem.innerHTML = `
                <div data-label="書名">${book.title}</div>
                <div data-label="作者">${book.author}</div>
                <div data-label="集數">${book.volume || '無'}</div>
                <div data-label="櫃號">${book.cabinet || '無'}</div>
                <div data-label="行號">${book.row || '無'}</div>
                <div class="book-list-actions">
                    <button class="btn edit-btn"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-danger delete-btn"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            const editBtn = listItem.querySelector('.edit-btn');
            const deleteBtn = listItem.querySelector('.delete-btn');
            
            editBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                showEditBookForm(book);
            });
            
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                confirmDeleteBook(book);
            });
            
            adminBookList.appendChild(listItem);
        });
    }
    
    /**
     * 顯示書籍詳情
     */
    function showBookDetails(book) {
        const template = bookDetailTemplate.content.cloneNode(true);
        
        template.querySelector('.book-title').textContent = book.title;
        template.querySelector('.book-author').textContent = book.author;
        template.querySelector('.book-volume').textContent = book.volume || '無';
        template.querySelector('.book-cabinet').textContent = book.cabinet || '無';
        template.querySelector('.book-row').textContent = book.row || '無';
        template.querySelector('.book-category').textContent = getCategoryText(book.category);
        template.querySelector('.book-publisher').textContent = book.publisher || '無';
        template.querySelector('.book-description').textContent = book.description || '無';
        template.querySelector('.book-notes').textContent = book.notes || '無';
        template.querySelector('.book-isbn').textContent = book.isbn;
        template.querySelector('.book-year').textContent = book.year;
        template.querySelector('.book-location').textContent = book.location;
        template.querySelector('.book-status').textContent = getStatusText(book.status);
        
        modalContent.innerHTML = '';
        modalContent.appendChild(template);
        openModal();
    }
    
    /**
     * 顯示登入表單
     */
    function showLoginForm() {
        const template = loginFormTemplate.content.cloneNode(true);
        const form = template.querySelector('#loginForm');
        const cancelBtn = template.querySelector('.btn-cancel');
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (BookData.validateAdmin(username, password)) {
                isAdminLoggedIn = true;
                sessionStorage.setItem('adminLoggedIn', 'true');
                updateUIForLoginStatus();
                closeModalWindow();
                showNotification('登入成功', 'success');
            } else {
                showNotification('用戶名或密碼錯誤', 'error');
            }
        });
        
        cancelBtn.addEventListener('click', closeModalWindow);
        
        modalContent.innerHTML = '';
        modalContent.appendChild(template);
        openModal();
    }
    
    /**
     * 處理登出
     */
    function handleLogout() {
        isAdminLoggedIn = false;
        sessionStorage.removeItem('adminLoggedIn');
        updateUIForLoginStatus();
        showNotification('已登出', 'info');
    }
    
    /**
     * 顯示添加書籍表單
     */
    function showAddBookForm() {
        const template = bookFormTemplate.content.cloneNode(true);
        const form = template.querySelector('#bookForm');
        const cancelBtn = template.querySelector('.btn-cancel');
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const newBook = {
                title: document.getElementById('title').value,
                author: document.getElementById('author').value,
                volume: document.getElementById('volume').value,
                cabinet: document.getElementById('cabinet').value,
                row: document.getElementById('row').value,
                category: document.getElementById('category').value,
                publisher: document.getElementById('publisher').value,
                description: document.getElementById('description').value,
                notes: document.getElementById('notes').value,
                isbn: document.getElementById('isbn').value,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            BookData.addBook(newBook);
            displayAdminBookList();
            displayBooks(BookData.getBooks());
            closeModalWindow();
            showNotification('書籍已添加', 'success');
        });
        
        cancelBtn.addEventListener('click', closeModalWindow);
        
        modalContent.innerHTML = '';
        modalContent.appendChild(template);
        openModal();
    }
    
    /**
     * 顯示編輯書籍表單
     */
    function showEditBookForm(book) {
        const template = bookFormTemplate.content.cloneNode(true);
        const form = template.querySelector('#bookForm');
        const formTitle = template.querySelector('#formTitle');
        const bookIdInput = template.querySelector('#bookId');
        const titleInput = template.querySelector('#title');
        const authorInput = template.querySelector('#author');
        const volumeInput = template.querySelector('#volume');
        const isbnInput = template.querySelector('#isbn');
        const categoryInput = template.querySelector('#category');
        const publisherInput = template.querySelector('#publisher');
        const cabinetInput = template.querySelector('#cabinet');
        const rowInput = template.querySelector('#row');
        const descriptionInput = template.querySelector('#description');
        const notesInput = template.querySelector('#notes');
        const cancelBtn = template.querySelector('.btn-cancel');
        
        formTitle.textContent = '編輯書籍';
        bookIdInput.value = book.id;
        titleInput.value = book.title;
        authorInput.value = book.author;
        volumeInput.value = book.volume || '';
        isbnInput.value = book.isbn;
        categoryInput.value = book.category;
        publisherInput.value = book.publisher || '';
        cabinetInput.value = book.cabinet || '';
        rowInput.value = book.row || '';
        descriptionInput.value = book.description || '';
        notesInput.value = book.notes || '';
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const updatedBook = {
                id: bookIdInput.value,
                title: titleInput.value,
                author: authorInput.value,
                volume: volumeInput.value,
                cabinet: cabinetInput.value,
                row: rowInput.value,
                category: categoryInput.value,
                publisher: publisherInput.value,
                description: descriptionInput.value,
                notes: notesInput.value,
                isbn: isbnInput.value,
                createdAt: book.createdAt, // 保留原創建時間
                updatedAt: new Date().toISOString() // 更新時間為當前時間
            };
            
            BookData.updateBook(updatedBook);
            displayAdminBookList();
            displayBooks(BookData.getBooks());
            closeModalWindow();
            showNotification('書籍已更新', 'success');
        });
        
        cancelBtn.addEventListener('click', closeModalWindow);
        
        modalContent.innerHTML = '';
        modalContent.appendChild(template);
        openModal();
    }
    
    /**
     * 確認刪除書籍
     */
    function confirmDeleteBook(book) {
        if (confirm(`確定要刪除「${book.title}」嗎？`)) {
            BookData.deleteBook(book.id);
            displayAdminBookList();
            displayBooks(BookData.getBooks());
            showNotification('書籍已刪除', 'info');
        }
    }
    
    /**
     * 處理導出數據
     */
    function handleExport() {
        // 顯示導出選項
        const exportOptions = document.createElement('div');
        exportOptions.className = 'export-options';
        exportOptions.innerHTML = `
            <h2>導出數據</h2>
            <div class="export-buttons">
                <button id="exportJsonBtn" class="btn"><i class="fas fa-file-code"></i> 導出為JSON</button>
                <button id="exportExcelBtn" class="btn"><i class="fas fa-file-excel"></i> 導出為Excel</button>
            </div>
        `;
        
        const exportJsonBtn = exportOptions.querySelector('#exportJsonBtn');
        const exportExcelBtn = exportOptions.querySelector('#exportExcelBtn');
        
        exportJsonBtn.addEventListener('click', function() {
            BookData.exportData();
            closeModalWindow();
            showNotification('數據已導出為JSON', 'success');
        });
        
        exportExcelBtn.addEventListener('click', function() {
            AdminModule.exportToExcel();
            closeModalWindow();
            showNotification('數據已導出為Excel', 'success');
        });
        
        modalContent.innerHTML = '';
        modalContent.appendChild(exportOptions);
        openModal();
    }
    
    /**
     * 顯示導入表單
     */
    function showImportForm() {
        // 顯示導入選項
        const importOptions = document.createElement('div');
        importOptions.className = 'import-options';
        importOptions.innerHTML = `
            <h2>導入數據</h2>
            <div class="import-buttons">
                <button id="importJsonBtn" class="btn"><i class="fas fa-file-code"></i> 導入JSON</button>
                <button id="importExcelBtn" class="btn"><i class="fas fa-file-excel"></i> 導入Excel</button>
            </div>
        `;
        
        const importJsonBtn = importOptions.querySelector('#importJsonBtn');
        const importExcelBtn = importOptions.querySelector('#importExcelBtn');
        
        importJsonBtn.addEventListener('click', function() {
            showJsonImportForm();
        });
        
        importExcelBtn.addEventListener('click', function() {
            showExcelImportForm();
        });
        
        modalContent.innerHTML = '';
        modalContent.appendChild(importOptions);
        openModal();
    }
    
    /**
     * 顯示JSON導入表單
     */
    function showJsonImportForm() {
        const importForm = document.createElement('div');
        importForm.className = 'import-form';
        importForm.innerHTML = `
            <h2>導入JSON數據</h2>
            <p>請選擇JSON格式的書籍數據文件：</p>
            <input type="file" id="importFile" accept=".json">
            <div class="form-actions">
                <button id="importSubmitBtn" class="btn">導入</button>
                <button id="importCancelBtn" class="btn btn-cancel">取消</button>
            </div>
        `;
        
        const importSubmitBtn = importForm.querySelector('#importSubmitBtn');
        const importCancelBtn = importForm.querySelector('#importCancelBtn');
        const importFile = importForm.querySelector('#importFile');
        
        importSubmitBtn.addEventListener('click', function() {
            const file = importFile.files[0];
            if (!file) {
                showNotification('請選擇文件', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const result = BookData.importData(e.target.result);
                    
                    if (result.success) {
                        displayAdminBookList();
                        // 重新加載書籍列表
                        const books = BookData.getBooks();
                        if (books && books.length > 0) {
                            displayBooks(books);
                        }
                        closeModalWindow();
                        showNotification(result.message || `成功導入 ${result.count} 本書籍`, 'success');
                    } else {
                        showNotification(result.error || '導入失敗，請確保文件格式正確', 'error');
                    }
                } catch (error) {
                    console.error('JSON導入過程中發生錯誤:', error);
                    showNotification(`導入過程中發生錯誤: ${error.message}`, 'error');
                }
            };
            reader.readAsText(file);
        });
        
        importCancelBtn.addEventListener('click', closeModalWindow);
        
        modalContent.innerHTML = '';
        modalContent.appendChild(importForm);
    }
    
    /**
     * 顯示Excel導入表單
     */
    function showExcelImportForm() {
        const template = document.getElementById('excelImportTemplate').content.cloneNode(true);
        const importExcelBtn = template.querySelector('#importExcelBtn');
        const cancelExcelImportBtn = template.querySelector('#cancelExcelImportBtn');
        const excelFile = template.querySelector('#excelFile');
        const autoUploadCheckbox = template.querySelector('#autoUploadToGithub');
        
        importExcelBtn.addEventListener('click', async function() {
            const file = excelFile.files[0];
            if (!file) {
                showNotification('請選擇Excel文件', 'error');
                return;
            }
            
            try {
                const autoUpload = autoUploadCheckbox.checked;
                const result = await AdminModule.importFromExcel(file, autoUpload, showNotification);
                
                if (result && result.success) {
                    // 更新管理員書籍列表
                    displayAdminBookList();
                    
                    // 獲取並顯示最新的書籍數據
                    const books = BookData.getBooks();
                    if (books && Array.isArray(books) && books.length > 0) {
                        // 只有在有書籍數據時才顯示
                        displayBooks(books);
                        showNotification(`成功導入 ${result.newBooks || books.length} 本書籍`, 'success');
                    } else {
                        bookResults.innerHTML = '<p class="no-results">請輸入關鍵字搜索書籍</p>';
                        showNotification('數據已導入，但沒有可顯示的書籍', 'warning');
                    }
                    
                    // 關閉模態窗口
                    closeModalWindow();
                } else if (result && !result.success) {
                    // 顯示具體的錯誤信息
                    showNotification(result.error || '導入Excel失敗', 'error');
                } else {
                    showNotification('導入過程中發生未知錯誤', 'error');
                }
            } catch (error) {
                console.error('Excel導入錯誤:', error);
                showNotification(`Excel導入錯誤: ${error.message || '未知錯誤'}`, 'error');
            }
        });
        
        cancelExcelImportBtn.addEventListener('click', closeModalWindow);
        
        modalContent.innerHTML = '';
        modalContent.appendChild(template);
    }
    
    /**
     * 處理備份數據
     */
    function handleBackup() {
        // 檢查GitHub設置
        const settings = AdminModule.loadGithubSettings();
        
        if (!settings.token || !settings.repo) {
            // 如果沒有設置，顯示設置表單
            showGithubSettingsForm();
            return;
        }
        
        // 確認備份
        const confirmBackup = document.createElement('div');
        confirmBackup.className = 'confirm-backup';
        confirmBackup.innerHTML = `
            <h2>備份到GitHub</h2>
            <p>確定要將當前數據備份到GitHub嗎？</p>
            <p><strong>倉庫:</strong> ${settings.repo}</p>
            <p><strong>分支:</strong> ${settings.branch}</p>
            <div class="form-actions">
                <button id="confirmBackupBtn" class="btn">確認備份</button>
                <button id="editSettingsBtn" class="btn">編輯設置</button>
                <button id="cancelBackupBtn" class="btn btn-cancel">取消</button>
            </div>
        `;
        
        const confirmBackupBtn = confirmBackup.querySelector('#confirmBackupBtn');
        const editSettingsBtn = confirmBackup.querySelector('#editSettingsBtn');
        const cancelBackupBtn = confirmBackup.querySelector('#cancelBackupBtn');
        
        confirmBackupBtn.addEventListener('click', async function() {
            const books = BookData.getBooks();
            const result = await AdminModule.uploadToGitHub(books, showNotification);
            if (result) {
                closeModalWindow();
            }
        });
        
        editSettingsBtn.addEventListener('click', function() {
            showGithubSettingsForm();
        });
        
        cancelBackupBtn.addEventListener('click', closeModalWindow);
        
        modalContent.innerHTML = '';
        modalContent.appendChild(confirmBackup);
        openModal();
    }
    
    /**
     * 顯示垃圾桶
     */
    function showTrashBin() {
        // 獲取垃圾桶中的書籍
        const trashBooks = AdminModule.getTrashBinBooks();
        
        // 創建垃圾桶內容
        const template = document.getElementById('trashBinTemplate');
        const content = template.content.cloneNode(true);
        
        // 獲取垃圾桶列表容器
        const trashBinList = content.querySelector('#trashBinList');
        const noTrashItems = content.querySelector('#noTrashItems');
        
        // 如果垃圾桶為空，顯示提示信息
        if (trashBooks.length === 0) {
            noTrashItems.classList.remove('hidden');
        } else {
            // 添加表頭
            const headerItem = document.createElement('div');
            headerItem.className = 'trash-bin-item book-list-header';
            headerItem.innerHTML = `
                <div>書名</div>
                <div>作者</div>
                <div>ISBN</div>
                <div>操作</div>
            `;
            trashBinList.appendChild(headerItem);
            
            // 為每本書創建一個列表項
            trashBooks.forEach(book => {
                const item = document.createElement('div');
                item.className = 'trash-bin-item';
                item.innerHTML = `
                    <div>
                        ${book.title}
                        <div class="deleted-time">刪除時間: ${new Date(book.deletedAt).toLocaleString()}</div>
                    </div>
                    <div>${book.author}</div>
                    <div>${book.isbn}</div>
                    <div class="book-list-actions">
                        <button class="btn restore-book" data-id="${book.id}"><i class="fas fa-undo"></i> 恢復</button>
                    </div>
                `;
                trashBinList.appendChild(item);
            });
            
            // 綁定恢復按鈕事件
            trashBinList.querySelectorAll('.restore-book').forEach(button => {
                button.addEventListener('click', function() {
                    const bookId = this.getAttribute('data-id');
                    if (AdminModule.restoreFromTrashBin(bookId, showNotification)) {
                        // 重新加載管理員面板
                        displayAdminBookList();
                        // 關閉模態框並重新顯示垃圾桶
                        closeModalWindow();
                        showTrashBin();
                    }
                });
            });
        }
        
        // 綁定清空垃圾桶按鈕事件
        content.querySelector('#emptyTrashBtn').addEventListener('click', function() {
            if (confirm('確定要清空垃圾桶嗎？此操作不可恢復！')) {
                AdminModule.emptyTrashBin(showNotification);
                closeModalWindow();
                showTrashBin();
            }
        });
        
        // 顯示模態框
        modalContent.innerHTML = '';
        modalContent.appendChild(content);
        openModal();
    }
    
    /**
     * 顯示GitHub設置表單
     */
    function showGithubSettingsForm() {
        const template = document.getElementById('githubSettingsTemplate').content.cloneNode(true);
        const saveBtn = template.querySelector('#saveGithubSettingsBtn');
        const cancelBtn = template.querySelector('#cancelGithubSettingsBtn');
        const tokenInput = template.querySelector('#githubToken');
        const repoInput = template.querySelector('#githubRepo');
        const branchInput = template.querySelector('#githubBranch');
        
        // 載入現有設置
        const settings = AdminModule.loadGithubSettings();
        tokenInput.value = settings.token || '';
        repoInput.value = settings.repo || '';
        branchInput.value = settings.branch || 'main';
        
        saveBtn.addEventListener('click', function() {
            const newSettings = {
                token: tokenInput.value.trim(),
                repo: repoInput.value.trim(),
                branch: branchInput.value.trim() || 'main',
                path: 'books_data.json'
            };
            
            if (!newSettings.token) {
                showNotification('請輸入GitHub個人訪問令牌', 'error');
                return;
            }
            
            if (!newSettings.repo) {
                showNotification('請輸入倉庫名稱', 'error');
                return;
            }
            
            AdminModule.saveGithubSettings(newSettings);
            closeModalWindow();
            showNotification('GitHub設置已保存', 'success');
        });
        
        cancelBtn.addEventListener('click', closeModalWindow);
        
        modalContent.innerHTML = '';
        modalContent.appendChild(template);
        openModal();
    }
    
    /**
     * 打開模態框
     */
    function openModal() {
        modal.style.display = 'block';
    }
    
    /**
     * 關閉模態框
     */
    function closeModalWindow() {
        modal.style.display = 'none';
    }
    
    /**
     * 顯示通知
     * @param {string} message - 通知消息
     * @param {string} type - 通知類型 (info, success, warning, error)
     * @param {number} duration - 通知顯示時間 (毫秒)，設為0則不自動消失
     * @returns {HTMLElement|null} - 如果duration為0，返回通知元素以便手動移除
     */
    function showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(function() {
            notification.classList.add('show');
        }, 10);
        
        // 如果duration為0，則不自動移除通知，而是返回通知元素以便手動移除
        if (duration === 0) {
            return notification;
        }
        
        setTimeout(function() {
            notification.classList.remove('show');
            setTimeout(function() {
                notification.remove();
            }, 300);
        }, duration);
        
        return null;
    }
    
    /**
     * 獲取狀態文本
     */
    function getStatusText(status) {
        const statusMap = {
            'available': '可借閱',
            'borrowed': '已借出',
            'reserved': '已預約'
        };
        return statusMap[status] || status;
    }
    
    /**
     * 獲取類別文本
     */
    function getCategoryText(category) {
        const categoryMap = {
            'fiction': '小說',
            'science': '科學',
            'history': '歷史',
            'biography': '傳記',
            'technology': '科技'
        };
        return categoryMap[category] || category;
    }
});

// 添加通知樣式
const style = document.createElement('style');
style.textContent = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 20px;
    border-radius: 4px;
    color: white;
    opacity: 0;
    transform: translateY(-20px);
    transition: opacity 0.3s, transform 0.3s;
    z-index: 2000;
}

.notification.show {
    opacity: 1;
    transform: translateY(0);
}

.notification.success {
    background-color: #2ecc71;
}

.notification.error {
    background-color: #e74c3c;
}

.notification.info {
    background-color: #3498db;
}
`;
document.head.appendChild(style);