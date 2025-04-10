/**
 * 書籍查詢管理系統 - 管理員界面邏輯
 */

// 等待DOM加載完成
document.addEventListener('DOMContentLoaded', async () => {
    // 初始化數據庫
    await db.init();
    
    // 檢查登入狀態
    if (!auth.isAuthenticated()) {
        document.getElementById('adminContent').classList.add('d-none');
        document.getElementById('loginRequired').classList.remove('d-none');
    } else {
        document.getElementById('adminContent').classList.remove('d-none');
        document.getElementById('loginRequired').classList.add('d-none');
        document.getElementById('adminName').textContent = auth.getCurrentUser().username;
        document.getElementById('welcomeMessage').classList.remove('d-none');
        
        // 加載書籍數據
        loadBooks();
    }
    
    // 初始化事件監聽器
    initEventListeners();
    
    /**
     * 初始化事件監聽器
     */
    function initEventListeners() {
        // 登入表單提交事件
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
        
        // 登出按鈕點擊事件
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                auth.logout();
                window.location.reload();
            });
        }
        
        // 添加書籍按鈕點擊事件
        const addBookBtn = document.getElementById('addBookBtn');
        if (addBookBtn) {
            addBookBtn.addEventListener('click', () => {
                // 重置表單
                document.getElementById('bookForm').reset();
                document.getElementById('bookFormTitle').textContent = '添加書籍';
                document.getElementById('bookId').value = '';
                
                // 顯示模態框
                const modal = new bootstrap.Modal(document.getElementById('bookModal'));
                modal.show();
            });
        }
        
        // 書籍表單提交事件
        const bookForm = document.getElementById('bookForm');
        if (bookForm) {
            bookForm.addEventListener('submit', handleBookFormSubmit);
        }
        
        // 導入數據按鈕點擊事件
        const importBtn = document.getElementById('importBtn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                document.getElementById('importFile').click();
            });
        }
        
        // 導入文件變更事件
        const importFile = document.getElementById('importFile');
        if (importFile) {
            importFile.addEventListener('change', handleImportFile);
        }
        
        // 導出數據按鈕點擊事件
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', handleExportData);
        }
        
        // 創建備份按鈕點擊事件
        const backupBtn = document.getElementById('backupBtn');
        if (backupBtn) {
            backupBtn.addEventListener('click', handleCreateBackup);
        }
        
        // 查看備份按鈕點擊事件
        const viewBackupsBtn = document.getElementById('viewBackupsBtn');
        if (viewBackupsBtn) {
            viewBackupsBtn.addEventListener('click', loadBackups);
        }
    }
    
    /**
     * 處理登入
     * @param {Event} event - 表單提交事件
     */
    function handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const loginError = document.getElementById('loginError');
        
        if (!username || !password) {
            loginError.textContent = '請輸入帳號和密碼';
            loginError.classList.remove('d-none');
            return;
        }
        
        // 嘗試登入
        if (auth.login(username, password)) {
            // 登入成功，刷新頁面
            window.location.reload();
        } else {
            // 登入失敗
            loginError.textContent = '帳號或密碼錯誤';
            loginError.classList.remove('d-none');
        }
    }
    
    /**
     * 加載書籍數據
     * @param {number} page - 頁碼
     */
    async function loadBooks(page = 1) {
        try {
            const books = await db.getAllBooks();
            const pageSize = 10; // 每頁顯示的數量
            const totalPages = Math.ceil(books.length / pageSize);
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const currentPageBooks = books.slice(startIndex, endIndex);
            
            // 渲染書籍表格
            renderBookTable(currentPageBooks);
            
            // 渲染分頁控制
            renderPagination(page, totalPages);
            
            // 更新書籍數量統計
            document.getElementById('totalBooks').textContent = books.length;
        } catch (error) {
            console.error('加載書籍數據失敗:', error);
            showAlert('danger', '加載書籍數據失敗，請稍後再試');
        }
    }
    
    /**
     * 渲染書籍表格
     * @param {Array} books - 書籍數據
     */
    function renderBookTable(books) {
        const tableBody = document.getElementById('bookTableBody');
        
        if (books.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">暫無書籍數據</td>
                </tr>
            `;
            return;
        }
        
        let html = '';
        books.forEach(book => {
            html += `
                <tr>
                    <td>${book.title}</td>
                    <td>${book.author || '-'}</td>
                    <td>${book.category || '-'}</td>
                    <td>${book.shelf || '-'}</td>
                    <td>${book.row || '-'}</td>
                    <td>${book.publisher || '-'}</td>
                    <td>${book.isbn || '-'}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary edit-book" data-id="${book.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger delete-book" data-id="${book.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
        
        // 添加編輯按鈕事件
        document.querySelectorAll('.edit-book').forEach(button => {
            button.addEventListener('click', () => editBook(button.getAttribute('data-id')));
        });
        
        // 添加刪除按鈕事件
        document.querySelectorAll('.delete-book').forEach(button => {
            button.addEventListener('click', () => deleteBook(button.getAttribute('data-id')));
        });
    }
    
    /**
     * 渲染分頁控制
     * @param {number} currentPage - 當前頁碼
     * @param {number} totalPages - 總頁數
     */
    function renderPagination(currentPage, totalPages) {
        const pagination = document.getElementById('booksPagination');
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let html = `
            <nav aria-label="書籍分頁">
                <ul class="pagination">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="上一頁">
                            <span aria-hidden="true">&laquo;</span>
                        </a>
                    </li>
        `;
        
        // 生成頁碼
        for (let i = 1; i <= totalPages; i++) {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        html += `
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="下一頁">
                            <span aria-hidden="true">&raquo;</span>
                        </a>
                    </li>
                </ul>
            </nav>
        `;
        
        pagination.innerHTML = html;
        
        // 添加分頁點擊事件
        document.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(link.getAttribute('data-page'));
                if (page && page !== currentPage) {
                    loadBooks(page);
                }
            });
        });
    }
    
    /**
     * 編輯書籍
     * @param {string} id - 書籍ID
     */
    async function editBook(id) {
        try {
            const book = await db.getBookById(id);
            if (!book) return;
            
            // 填充表單
            document.getElementById('bookId').value = book.id;
            document.getElementById('bookTitle').value = book.title || '';
            document.getElementById('bookAuthor').value = book.author || '';
            document.getElementById('bookCategory').value = book.category || '';
            document.getElementById('bookShelf').value = book.shelf || '';
            document.getElementById('bookRow').value = book.row || '';
            document.getElementById('bookPublisher').value = book.publisher || '';
            document.getElementById('bookIsbn').value = book.isbn || '';
            document.getElementById('bookDescription').value = book.description || '';
            
            // 更新表單標題
            document.getElementById('bookFormTitle').textContent = '編輯書籍';
            
            // 顯示模態框
            const modal = new bootstrap.Modal(document.getElementById('bookModal'));
            modal.show();
        } catch (error) {
            console.error('獲取書籍數據失敗:', error);
            showAlert('danger', '獲取書籍數據失敗，請稍後再試');
        }
    }
    
    /**
     * 處理書籍表單提交
     * @param {Event} event - 表單提交事件
     */
    async function handleBookFormSubmit(event) {
        event.preventDefault();
        
        // 獲取表單數據
        const bookId = document.getElementById('bookId').value.trim();
        const book = {
            title: document.getElementById('bookTitle').value.trim(),
            author: document.getElementById('bookAuthor').value.trim(),
            category: document.getElementById('bookCategory').value.trim(),
            shelf: document.getElementById('bookShelf').value.trim(),
            row: document.getElementById('bookRow').value.trim(),
            publisher: document.getElementById('bookPublisher').value.trim(),
            isbn: document.getElementById('bookIsbn').value.trim(),
            description: document.getElementById('bookDescription').value.trim()
        };
        
        // 驗證必填字段
        if (!book.title) {
            showAlert('danger', '書名不能為空', 'bookFormAlert');
            return;
        }
        
        try {
            if (bookId) {
                // 更新書籍
                book.id = bookId;
                await db.updateBook(book);
                showAlert('success', '書籍更新成功');
            } else {
                // 添加書籍
                await db.addBook(book);
                showAlert('success', '書籍添加成功');
            }
            
            // 關閉模態框
            const modal = bootstrap.Modal.getInstance(document.getElementById('bookModal'));
            modal.hide();
            
            // 重新加載書籍列表
            loadBooks();
        } catch (error) {
            console.error('保存書籍失敗:', error);
            showAlert('danger', '保存書籍失敗，請稍後再試', 'bookFormAlert');
        }
    }
    
    /**
     * 刪除書籍
     * @param {string} id - 書籍ID
     */
    async function deleteBook(id) {
        if (!confirm('確定要刪除這本書嗎？此操作不可恢復。')) {
            return;
        }
        
        try {
            await db.deleteBook(id);
            showAlert('success', '書籍刪除成功');
            loadBooks();
        } catch (error) {
            console.error('刪除書籍失敗:', error);
            showAlert('danger', '刪除書籍失敗，請稍後再試');
        }
    }
    
    /**
     * 處理導入文件
     * @param {Event} event - 文件變更事件
     */
    function handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target.result;
                const books = JSON.parse(content);
                
                if (!Array.isArray(books)) {
                    throw new Error('導入的數據格式不正確');
                }
                
                // 導入書籍
                const count = await db.importBooks(books);
                showAlert('success', `成功導入 ${count} 本書籍`);
                
                // 重新加載書籍列表
                loadBooks();
            } catch (error) {
                console.error('導入數據失敗:', error);
                showAlert('danger', '導入數據失敗，請確保文件格式正確');
            }
            
            // 重置文件輸入
            event.target.value = '';
        };
        
        reader.readAsText(file);
    }
    
    /**
     * 處理導出數據
     */
    async function handleExportData() {
        try {
            const books = await db.exportBooks();
            const dataStr = JSON.stringify(books, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            // 創建下載鏈接
            const exportLink = document.createElement('a');
            exportLink.setAttribute('href', dataUri);
            exportLink.setAttribute('download', `books_export_${new Date().toISOString().slice(0, 10)}.json`);
            document.body.appendChild(exportLink);
            
            // 觸發下載
            exportLink.click();
            document.body.removeChild(exportLink);
            
            showAlert('success', `成功導出 ${books.length} 本書籍數據`);
        } catch (error) {
            console.error('導出數據失敗:', error);
            showAlert('danger', '導出數據失敗，請稍後再試');
        }
    }
    
    /**
     * 處理創建備份
     */
    async function handleCreateBackup() {
        try {
            await db.createBackup();
            showAlert('success', '數據備份創建成功');
        } catch (error) {
            console.error('創建備份失敗:', error);
            showAlert('danger', '創建備份失敗，請稍後再試');
        }
    }
    
    /**
     * 加載備份列表
     */
    async function loadBackups() {
        try {
            const backups = await db.getAllBackups();
            
            // 創建模態框（如果不存在）
            let modal = document.getElementById('backupsModal');
            if (!modal) {
                const modalHTML = `
                    <div class="modal fade" id="backupsModal" tabindex="-1" aria-hidden="true">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header bg-primary text-white">
                                    <h5 class="modal-title">數據備份列表</h5>
                                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body">
                                    <div id="backupsAlert"></div>
                                    <div class="table-responsive">
                                        <table class="table table-striped">
                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>創建時間</th>
                                                    <th>書籍數量</th>
                                                    <th>操作</th>
                                                </tr>
                                            </thead>
                                            <tbody id="backupsTableBody"></tbody>
                                        </table>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">關閉</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                const div = document.createElement('div');
                div.innerHTML = modalHTML;
                document.body.appendChild(div.firstElementChild);
                modal = document.getElementById('backupsModal');
            }
            
            // 渲染備份列表
            const tableBody = document.getElementById('backupsTableBody');
            
            if (backups.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center">暫無備份數據</td>
                    </tr>
                `;
            } else {
                let html = '';
                backups.forEach(backup => {
                    const date = new Date(backup.timestamp);
                    const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                    
                    html += `
                        <tr>
                            <td>${backup.id}</td>
                            <td>${formattedDate}</td>
                            <td>${backup.count}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary restore-backup" data-id="${backup.id}">
                                    恢復
                                </button>
                            </td>
                        </tr>
                    `;
                });
                
                tableBody.innerHTML = html;
                
                // 添加恢復按鈕事件
                document.querySelectorAll('.restore-backup').forEach(button => {
                    button.addEventListener('click', () => restoreBackup(button.getAttribute('data-id')));
                });
            }
            
            // 顯示模態框
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        } catch (error) {
            console.error('加載備份列表失敗:', error);
            showAlert('danger', '加載備份列表失敗，請稍後再試');
        }
    }
    
    /**
     * 恢復備份
     * @param {number} backupId - 備份ID
     */
    async function restoreBackup(backupId) {
        if (!confirm('確定要恢復此備份嗎？當前的所有數據將被替換。')) {
            return;
        }
        
        try {
            const success = await db.restoreFromBackup(backupId);
            
            if (success) {
                showAlert('success', '備份恢復成功', 'backupsAlert');
                
                // 重新加載書籍列表
                loadBooks();
            } else {
                showAlert('danger', '備份恢復失敗', 'backupsAlert');
            }
        } catch (error) {
            console.error('恢復備份失敗:', error);
            showAlert('danger', '恢復備份失敗，請稍後再試', 'backupsAlert');
        }
    }
    
    /**
     * 顯示提示信息
     * @param {string} type - 提示類型 (success/danger/warning/info)
     * @param {string} message - 提示信息
     * @param {string} containerId - 容器ID
     */
    function showAlert(type, message, containerId = 'alertContainer') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const alertId = `alert_${Date.now()}`;
        const alertHTML = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        container.innerHTML = alertHTML;
        
        // 5秒後自動關閉
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                const bsAlert = new bootstrap.Alert(alertElement);
                bsAlert.close();
            }
        }, 5000);
    }