/**
 * 書籍查詢管理系統 - 管理員頁面模塊
 * 負責處理管理員頁面的交互和功能
 */

document.addEventListener('DOMContentLoaded', function() {
    // 移動端下拉菜單控制
    const adminActionsToggle = document.getElementById('adminActionsToggle');
    const adminActionsMenu = document.querySelector('.admin-actions-menu');
    
    if (adminActionsToggle && adminActionsMenu) {
        adminActionsToggle.addEventListener('click', function() {
            adminActionsMenu.classList.toggle('show');
        });
        
        // 點擊菜單外部時關閉菜單
        document.addEventListener('click', function(event) {
            if (!event.target.closest('.admin-actions') && adminActionsMenu.classList.contains('show')) {
                adminActionsMenu.classList.remove('show');
            }
        });
    }
    // 檢查是否已登入
    if (!localStorage.getItem('isLoggedIn')) {
        // 未登入則跳轉到首頁
        window.location.href = 'index.html';
        return;
    }
    
    // 檢查當前用戶
    if (window.UserManager && !UserManager.getCurrentUser()) {
        // 如果沒有當前用戶信息，則初始化
        UserManager.init();
    }
    
    // 獲取DOM元素
    const bookTableBody = document.getElementById('bookTableBody');
    const addBookBtn = document.getElementById('addBookBtn');
    const removeDuplicatesBtn = document.getElementById('removeDuplicatesBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const importExcelBtn = document.getElementById('importExcelBtn');
    const githubSettingsBtn = document.getElementById('githubSettingsBtn');
    const trashBtn = document.getElementById('trashBtn'); // 垃圾桶按鈕
    const logoutBtn = document.getElementById('logoutBtn');
    const backToHomeBtn = document.getElementById('backToHomeBtn');
    const bookFormModal = document.getElementById('bookFormModal');
    const removeDuplicatesModal = document.getElementById('removeDuplicatesModal');
    const importExcelModal = document.getElementById('importExcelModal');
    const githubSettingsModal = document.getElementById('githubSettingsModal');
    const trashModal = document.getElementById('trashModal'); // 垃圾桶彈窗
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const bookForm = document.getElementById('bookForm');
    const removeDuplicatesForm = document.getElementById('removeDuplicatesForm');
    const importExcelForm = document.getElementById('importExcelForm');
    const githubSettingsForm = document.getElementById('githubSettingsForm');
    const formTitle = document.getElementById('formTitle');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const duplicateStatus = document.getElementById('duplicateStatus');
    const trashTableBody = document.getElementById('trashTableBody'); // 垃圾桶表格內容
    
    // 檢查DOM元素是否存在，如果不存在則輸出錯誤信息
    if (!importExcelModal || !importExcelForm) {
        console.error('匯入Excel相關DOM元素不存在，請檢查HTML結構');
    }
    
    // 初始化數據
    BookData.init();
    
    // 加載並顯示所有書籍
    loadBooks();
    
    // 為表格添加響應式支持
    addResponsiveTableSupport();
    
    // 初始化篩選選項
    initFilterOptions();
    
    // 初始化垃圾桶表格事件處理
    initTrashTableEvents();
    
    // 添加響應式表格支持函數
    function addResponsiveTableSupport() {
        // 為表格行添加data-label屬性的函數
        function addDataLabelsToTable(tableBody, headerLabels) {
            // 監聽DOM變化，當表格內容更新時添加data-label
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        mutation.addedNodes.forEach(function(node) {
                            if (node.nodeName === 'TR') {
                                const cells = node.querySelectorAll('td');
                                cells.forEach(function(cell, index) {
                                    if (index < headerLabels.length) {
                                        cell.setAttribute('data-label', headerLabels[index]);
                                    }
                                });
                            }
                        });
                    }
                });
            });
            
            // 開始觀察表格變化
            observer.observe(tableBody, { childList: true });
            
            // 處理已存在的行
            const existingRows = tableBody.querySelectorAll('tr');
            existingRows.forEach(function(row) {
                const cells = row.querySelectorAll('td');
                cells.forEach(function(cell, index) {
                    if (index < headerLabels.length) {
                        cell.setAttribute('data-label', headerLabels[index]);
                    }
                });
            });
        }
        
        // 為主表格添加data-label
        const bookTableBody = document.getElementById('bookTableBody');
        if (bookTableBody) {
            const headerLabels = ['書名', '作者', '集數', '出版社', '櫃號', '行號', '創建時間', '操作'];
            addDataLabelsToTable(bookTableBody, headerLabels);
        }
        
        // 為垃圾桶表格添加data-label
        const trashTableBody = document.getElementById('trashTableBody');
        if (trashTableBody) {
            const trashHeaderLabels = ['書名', '作者', '集數', '櫃號', '行號', '出版社', '刪除原因', '刪除時間', '操作'];
            addDataLabelsToTable(trashTableBody, trashHeaderLabels);
        }
    }
    
    // 綁定垃圾桶按鈕點擊事件
    if (trashBtn) {
        trashBtn.addEventListener('click', function() {
            // 顯示垃圾桶彈窗
            trashModal.style.display = 'block';
            // 加載垃圾桶中的書籍
            loadTrashBooks();
        });
        
        // 綁定清空垃圾桶按鈕
        const emptyTrashBtn = document.getElementById('emptyTrashBtn');
        if (emptyTrashBtn) {
            emptyTrashBtn.addEventListener('click', function() {
                // 檢查權限
                if (window.PermissionManager && !PermissionManager.isEnabled('emptyTrash')) {
                    alert('此功能已被管理員禁用');
                    return;
                }
                emptyTrash();
            });
        }
        
        // 綁定關閉垃圾桶彈窗
        const trashModalClose = trashModal.querySelector('.close');
        if (trashModalClose) {
            trashModalClose.addEventListener('click', function() {
                trashModal.style.display = 'none';
            });
        }
    } else {
        console.error('垃圾桶按鈕不存在，請檢查HTML結構');
    }
    
    // 設置自動清理垃圾桶的定時任務（每天檢查一次）
    setInterval(function() {
        const removedCount = BookData.cleanupTrash(30);
        if (removedCount > 0) {
            console.log(`自動清理：已從垃圾桶中刪除 ${removedCount} 本超過30天的書籍`);
        }
    }, 24 * 60 * 60 * 1000); // 24小時檢查一次
    
    // 綁定登出按鈕點擊事件
    logoutBtn.addEventListener('click', function() {
        // 使用UserManager進行登出
        if (window.UserManager) {
            UserManager.logout();
        } else {
            // 向下兼容：直接清除登入狀態
            localStorage.removeItem('isLoggedIn');
        }
        // 跳轉到首頁
        window.location.href = 'index.html';
    });
    
    // 綁定返回首頁按鈕點擊事件
    backToHomeBtn.addEventListener('click', function() {
        window.location.href = 'index.html';
    });
    
    // 綁定新增書籍按鈕點擊事件
    addBookBtn.addEventListener('click', function() {
        // 重置表單
        bookForm.reset();
        document.getElementById('bookId').value = '';
        formTitle.textContent = '新增書籍';
        // 顯示表單彈窗
        bookFormModal.style.display = 'block';
    });
    
    // 綁定去除重複按鈕點擊事件
    removeDuplicatesBtn.addEventListener('click', function() {
        // 顯示去重彈窗
        removeDuplicatesModal.style.display = 'block';
        // 清空之前的狀態信息
        duplicateStatus.textContent = '';
    });
    
    // 綁定匯出Excel按鈕點擊事件
    exportExcelBtn.addEventListener('click', function() {
        exportToExcel();
    });
    
    // 綁定匯出JSON按鈕點擊事件
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    exportJsonBtn.addEventListener('click', function() {
        exportToJSON();
    });
    
    // 綁定匯入Excel按鈕點擊事件
    importExcelBtn.addEventListener('click', function() {
        importExcelModal.style.display = 'block';
    });
    
    // 綁定GitHub設置按鈕點擊事件
    githubSettingsBtn.addEventListener('click', function() {
        // 顯示GitHub設置彈窗
        githubSettingsModal.style.display = 'block';
        
        // 填充已保存的設置
        document.getElementById('githubToken').value = localStorage.getItem('githubToken') || '';
        document.getElementById('githubRepo').value = localStorage.getItem('githubRepo') || '';
        document.getElementById('githubBranch').value = localStorage.getItem('githubBranch') || 'main';
    });
    
    // 綁定匯入Excel表單提交事件
    importExcelForm.addEventListener('submit', function(e) {
        e.preventDefault();
        importFromExcel();
    });
    
    // 綁定GitHub設置表單提交事件
    githubSettingsForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 獲取表單數據
        const token = document.getElementById('githubToken').value;
        const repo = document.getElementById('githubRepo').value;
        const branch = document.getElementById('githubBranch').value;
        
        // 保存到本地存儲
        localStorage.setItem('githubToken', token);
        localStorage.setItem('githubRepo', repo);
        localStorage.setItem('githubBranch', branch);
        
        // 關閉彈窗
        githubSettingsModal.style.display = 'none';
        
        // 顯示成功消息
        alert('GitHub設置已保存');
    });
    
    // 綁定表單提交事件
    bookForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 獲取表單數據
        const bookId = document.getElementById('bookId').value;
        const bookData = {
            title: document.getElementById('title').value,
            author: document.getElementById('author').value,
            series: document.getElementById('series').value,
            publisher: document.getElementById('publisher').value,
            description: document.getElementById('description').value,
            cabinet: document.getElementById('cabinet').value,
            row: document.getElementById('row').value,
            isbn: document.getElementById('isbn').value,
            notes: document.getElementById('notes').value
        };
        
        let savedBook;
        // 保存數據
        if (bookId) {
            // 確保bookId是字符串類型
            const stringBookId = String(bookId);
            console.log('保存書籍ID:', stringBookId, '(原始ID:', bookId, ')');
            // 更新現有書籍
            savedBook = BookData.updateBook(stringBookId, bookData);
        } else {
            // 添加新書籍
            savedBook = BookData.addBook(bookData);
        }
        
        // 重新加載書籍列表
        loadBooks();
        
        // 關閉彈窗
        bookFormModal.style.display = 'none';
    });
    
    // 綁定去重表單提交事件
    removeDuplicatesForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 獲取選中的判斷標準
        const criteria = [];
        if (document.getElementById('criteriaTitle').checked) criteria.push('title');
        if (document.getElementById('criteriaAuthor').checked) criteria.push('author');
        if (document.getElementById('criteriaISBN').checked) criteria.push('isbn');
        if (document.getElementById('criteriaPublisher').checked) criteria.push('publisher');
        if (document.getElementById('criteriaSeries').checked) criteria.push('series');
        
        // 確保至少選擇了一個標準
        if (criteria.length === 0) {
            duplicateStatus.textContent = '請至少選擇一個判斷標準';
            duplicateStatus.style.color = 'red';
            return;
        }
        
        // 執行去重操作
        const result = BookData.removeDuplicateBooks(criteria);
        
        // 顯示去重結果
        duplicateStatus.textContent = `去重完成！移除了 ${result.removed} 本重複書籍，剩餘 ${result.total} 本書籍。`;
        duplicateStatus.style.color = 'green';
        
        // 重新加載書籍列表
        loadBooks();
        
        // 自動上傳到GitHub（如果有設置）
        const books = BookData.getAllBooks();
        const jsonContent = JSON.stringify(books, null, 2);
        
        // 創建上傳狀態元素
        let statusElement = document.getElementById('uploadStatus');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'uploadStatus';
            statusElement.style.position = 'fixed';
            statusElement.style.bottom = '20px';
            statusElement.style.right = '20px';
            statusElement.style.padding = '10px 15px';
            statusElement.style.backgroundColor = '#f8f9fa';
            statusElement.style.border = '1px solid #ddd';
            statusElement.style.borderRadius = '4px';
            statusElement.style.zIndex = '1000';
            statusElement.style.fontWeight = 'bold';
            document.body.appendChild(statusElement);
        }
        
        // 上傳到GitHub
        uploadToGitHub(jsonContent)
            .then(() => {
                console.log('去重後的書籍數據上傳成功');
            })
            .catch(error => {
                console.error('去重後的書籍數據上傳失敗:', error);
                alert(`上傳失敗: ${error.message}`);
            });
        
        // 關閉彈窗
        removeDuplicatesModal.style.display = 'none';
    });
    
    
    // 綁定編輯按鈕點擊事件（使用事件委託）
    bookTableBody.addEventListener('click', function(e) {
        const row = e.target.closest('tr');
        if (!row) return;
        
        const bookId = row.getAttribute('data-id');
        if (!bookId) return;
        
        // 確保bookId是字符串類型
        const stringBookId = String(bookId);
        console.log('點擊書籍ID:', stringBookId, '(原始ID:', bookId, ')');
        
        if (e.target.classList.contains('edit-btn') || e.target.parentElement.classList.contains('edit-btn')) {
            editBook(stringBookId);
        } else if (e.target.classList.contains('delete-btn') || e.target.parentElement.classList.contains('delete-btn')) {
            showDeleteConfirm(bookId);
        }
    });
    
    // 綁定確認刪除按鈕點擊事件
    confirmDeleteBtn.addEventListener('click', function() {
        const bookId = confirmDeleteBtn.getAttribute('data-id');
        if (bookId) {
            BookData.deleteBook(bookId);
            loadBooks();
            deleteConfirmModal.style.display = 'none';
        }
    });
    
    // 綁定取消刪除按鈕點擊事件
    cancelDeleteBtn.addEventListener('click', function() {
        deleteConfirmModal.style.display = 'none';
    });
    
    // 綁定彈窗關閉按鈕點擊事件
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // 點擊彈窗外部關閉彈窗
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // 綁定搜索表單提交事件
    const searchFilterForm = document.getElementById('searchFilterForm');
    searchFilterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        loadBooks();
    });
    
    // 綁定搜索按鈕點擊事件
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function(e) {
            e.preventDefault();
            loadBooks();
        });
    } else {
        console.error('搜索按鈕元素不存在，請檢查HTML結構');
    }
    
    // 綁定重置按鈕點擊事件
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    resetFiltersBtn.addEventListener('click', function() {
        searchFilterForm.reset();
        loadBooks();
    });
    
    // 初始化篩選選項
    function initFilterOptions() {
        const books = BookData.getAllBooks();
        const publishers = new Set();
        const cabinets = new Set();
        
        // 收集所有出版社和櫃號
        books.forEach(book => {
            if (book.publisher) publishers.add(book.publisher);
            if (book.cabinet) cabinets.add(book.cabinet);
        });
        
        // 填充出版社選項
        const filterPublisher = document.getElementById('filterPublisher');
        publishers.forEach(publisher => {
            const option = document.createElement('option');
            option.value = publisher;
            option.textContent = publisher;
            filterPublisher.appendChild(option);
        });
        
        // 填充櫃號選項
        const filterCabinet = document.getElementById('filterCabinet');
        cabinets.forEach(cabinet => {
            const option = document.createElement('option');
            option.value = cabinet;
            option.textContent = cabinet;
            filterCabinet.appendChild(option);
        });
    }
    
    // 加載並顯示書籍（支持篩選和排序）
    function loadBooks() {
        // 獲取所有書籍
        let books = BookData.getAllBooks();
        
        // 獲取篩選條件
        const searchKeyword = document.getElementById('searchKeyword').value.trim().toLowerCase();
        const searchField = document.getElementById('searchField').value;
        const filterPublisher = document.getElementById('filterPublisher').value;
        const filterCabinet = document.getElementById('filterCabinet').value;
        const sortField = document.getElementById('sortField').value;
        const sortOrder = document.getElementById('sortOrder').value;
        
        // 安全地處理文本，防止XSS攻擊
        function escapeHtml(text) {
            if (text === undefined || text === null) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
        
        // 應用關鍵字搜索
        if (searchKeyword) {
            books = books.filter(book => {
                if (searchField === 'all') {
                    // 搜索所有欄位，使用安全的字符串處理和更寬鬆的比較方式
                    return (
                        (book.title && (String(book.title).toLowerCase().includes(searchKeyword) || searchKeyword.includes(String(book.title).toLowerCase()))) ||
                        (book.author && (String(book.author).toLowerCase().includes(searchKeyword) || searchKeyword.includes(String(book.author).toLowerCase()))) ||
                        (book.series && (String(book.series).toLowerCase().includes(searchKeyword) || searchKeyword.includes(String(book.series).toLowerCase()))) ||
                        (book.publisher && (String(book.publisher).toLowerCase().includes(searchKeyword) || searchKeyword.includes(String(book.publisher).toLowerCase()))) ||
                        (book.cabinet && (String(book.cabinet).toLowerCase().includes(searchKeyword) || searchKeyword.includes(String(book.cabinet).toLowerCase()))) ||
                        (book.row && (String(book.row).toLowerCase().includes(searchKeyword) || searchKeyword.includes(String(book.row).toLowerCase()))) ||
                        (book.isbn && (String(book.isbn).toLowerCase().includes(searchKeyword) || searchKeyword.includes(String(book.isbn).toLowerCase()))) ||
                        (book.description && (String(book.description).toLowerCase().includes(searchKeyword) || searchKeyword.includes(String(book.description).toLowerCase()))) ||
                        (book.notes && (String(book.notes).toLowerCase().includes(searchKeyword) || searchKeyword.includes(String(book.notes).toLowerCase())))
                    );
                } else if (searchField === 'cabinet') {
                    // 特別處理櫃號搜索，確保安全的字符串比較
                    return book.cabinet && String(book.cabinet).toLowerCase() === searchKeyword;
                } else {
                    // 搜索特定欄位，確保欄位存在且進行安全的字符串處理
                    // 使用更寬鬆的比較方式，允許部分匹配
                    if (book[searchField]) {
                        const fieldValue = String(book[searchField]).toLowerCase();
                        // 檢查是否包含查詢字符串，或查詢字符串包含欄位值
                        return fieldValue.includes(searchKeyword) || searchKeyword.includes(fieldValue);
                    }
                    return false;
                }
            });
        }
        
        // 應用出版社篩選
        if (filterPublisher) {
            books = books.filter(book => String(book.publisher).toLowerCase() === String(filterPublisher).toLowerCase());
        }
        
        // 應用櫃號篩選
        if (filterCabinet) {
            books = books.filter(book => String(book.cabinet).toLowerCase() === String(filterCabinet).toLowerCase());
        }
        
        // 應用排序
        books.sort((a, b) => {
            let valueA = a[sortField] || '';
            let valueB = b[sortField] || '';
            
            // 對於日期欄位，需要特殊處理
            if (sortField === 'createdAt' || sortField === 'updatedAt') {
                valueA = valueA ? new Date(valueA).getTime() : 0;
                valueB = valueB ? new Date(valueB).getTime() : 0;
            } else {
                // 對於字符串，轉為小寫進行比較
                valueA = typeof valueA === 'string' ? valueA.toLowerCase() : valueA;
                valueB = typeof valueB === 'string' ? valueB.toLowerCase() : valueB;
            }
            
            // 根據排序方向返回比較結果
            if (sortOrder === 'asc') {
                return valueA > valueB ? 1 : -1;
            } else {
                return valueA < valueB ? 1 : -1;
            }
        });
        
        // 更新表格
        let html = '';
        
        if (books.length === 0) {
            html = `<tr><td colspan="9" style="text-align: center;">沒有找到符合條件的書籍</td></tr>`;
        } else {
            books.forEach(book => {
                // 格式化日期（如果存在）
                let createdDate = book.createdAt ? new Date(book.createdAt).toLocaleString() : '-';
                let updatedDate = book.updatedAt ? new Date(book.updatedAt).toLocaleString() : '-';
                
                html += `
                    <tr data-id="${book.id}">
                        <td>${book.title}</td>
                        <td>${book.author}</td>
                        <td>${book.series || '-'}</td>
                        <td>${book.publisher || '-'}</td>
                        <td>${book.cabinet || '-'}</td>
                        <td>${book.row || '-'}</td>
                        <td>${createdDate}</td>
                        <td>
                            <button class="edit-btn" title="編輯"><i class="fas fa-edit"></i></button>
                            <button class="delete-btn" title="移至垃圾桶"><i class="fas fa-trash"></i></button>
                            <button class="info-btn" title="查看詳情（更新時間：${updatedDate}）"><i class="fas fa-info-circle"></i></button>
                        </td>
                    </tr>
                `;
            });
        }
        
        bookTableBody.innerHTML = html;
    }
    
    // 初始化垃圾桶表格事件處理
    function initTrashTableEvents() {
        // 使用事件委託綁定垃圾桶表格中的按鈕事件
        trashTableBody.addEventListener('click', function(e) {
            // 獲取被點擊的行和書籍ID
            const row = e.target.closest('tr');
            if (!row) return;
            
            const bookId = row.dataset.id;
            if (!bookId) return;
            
            // 處理恢復按鈕點擊
            if (e.target.classList.contains('restore-btn') || e.target.parentElement.classList.contains('restore-btn')) {
                if (confirm('確定要恢復這本書嗎？')) {
                    if (BookData.restoreFromTrash(bookId)) {
                        // 重新加載垃圾桶和書籍列表
                        loadTrashBooks();
                        loadBooks();
                        alert('書籍已恢復');
                    } else {
                        alert('恢復失敗，請重試');
                    }
                }
            }
            
            // 處理永久刪除按鈕點擊
            if (e.target.classList.contains('permanent-delete-btn') || e.target.parentElement.classList.contains('permanent-delete-btn')) {
                if (confirm('確定要永久刪除這本書嗎？此操作無法撤銷！')) {
                    if (BookData.deleteFromTrash(bookId)) {
                        // 重新加載垃圾桶
                        loadTrashBooks();
                        alert('書籍已永久刪除');
                    } else {
                        alert('刪除失敗，請重試');
                    }
                }
            }
        });
    }
    
    // 加載垃圾桶中的書籍
    function loadTrashBooks() {
        // 獲取垃圾桶中的所有書籍
        const trashBooks = BookData.getTrashBooks();
        
        // 更新表格
        let html = '';
        
        if (trashBooks.length === 0) {
            html = `<tr><td colspan="12" style="text-align: center;">垃圾桶中沒有書籍</td></tr>`;
        } else {
            trashBooks.forEach(book => {
                // 格式化日期
                let createdDate = book.createdAt ? new Date(book.createdAt).toLocaleString() : '-';
                let deletedDate = book.deletedAt ? new Date(book.deletedAt).toLocaleString() : '-';
                let deleteReason = book.deleteReason || '手動刪除';
                
                html += `
                    <tr data-id="${book.id}">
                        <td>${book.title}</td>
                        <td>${book.author}</td>
                        <td>${book.series || '-'}</td>
                        <td>${book.cabinet || '-'}</td>
                        <td>${book.row || '-'}</td>
                        <td>${book.publisher || '-'}</td>
                        <td>${deleteReason}</td>
                        <td>${deletedDate}</td>
                        <td>
                            <button class="restore-btn" title="恢復"><i class="fas fa-undo"></i></button>
                            <button class="permanent-delete-btn" title="永久刪除"><i class="fas fa-times-circle"></i></button>
                        </td>
                    </tr>
                `;
            });
        }
        
        trashTableBody.innerHTML = html;
    }
    
    // 清空垃圾桶
    function emptyTrash() {
        if (confirm('確定要清空垃圾桶嗎？此操作將永久刪除垃圾桶中的所有書籍，無法撤銷！')) {
            try {
                // 確保垃圾桶清空操作成功執行
                if (BookData.emptyTrash()) {
                    // 重新加載垃圾桶顯示
                    loadTrashBooks();
                    alert('垃圾桶已清空');
                } else {
                    alert('清空垃圾桶失敗，請重試');
                }
            } catch (error) {
                console.error('清空垃圾桶時發生錯誤:', error);
                alert('清空垃圾桶時發生錯誤: ' + error.message);
            }
        }
    }
    
    // 編輯書籍
    function editBook(bookId) {
        // 確保bookId是字符串類型
        const stringBookId = String(bookId);
        console.log('編輯書籍ID:', stringBookId);
        
        const book = BookData.getBookById(stringBookId);
        if (!book) {
            console.error('未找到ID為', stringBookId, '的書籍');
            return;
        }
        
        console.log('正在編輯書籍:', book.title, '(ID:', book.id, ')');
        
        // 填充表單
        document.getElementById('bookId').value = book.id;
        document.getElementById('title').value = book.title || '';
        document.getElementById('author').value = book.author || '';
        document.getElementById('series').value = book.series || '';
        document.getElementById('publisher').value = book.publisher || '';
        document.getElementById('description').value = book.description || '';
        document.getElementById('cabinet').value = book.cabinet || '';
        document.getElementById('row').value = book.row || '';
        document.getElementById('isbn').value = book.isbn || '';
        document.getElementById('notes').value = book.notes || '';
        
        // 更新表單標題
        formTitle.textContent = '編輯書籍';
        
        // 顯示表單彈窗
        bookFormModal.style.display = 'block';
    }
    
    // 顯示刪除確認彈窗
    function showDeleteConfirm(bookId) {
        // 確保bookId是字符串類型
        const stringBookId = String(bookId);
        console.log('確認刪除書籍ID:', stringBookId, '(原始ID:', bookId, ')');
        confirmDeleteBtn.setAttribute('data-id', stringBookId);
        deleteConfirmModal.style.display = 'block';
        
        // 綁定確認刪除按鈕點擊事件
        confirmDeleteBtn.onclick = function() {
            // 移至垃圾桶（現在deleteBook內部調用moveToTrash）
            if (BookData.deleteBook(bookId)) {
                // 重新加載書籍列表
                loadBooks();
                // 關閉彈窗
                deleteConfirmModal.style.display = 'none';
                // 顯示提示
                alert('書籍已移至垃圾桶');
            } else {
                alert('刪除失敗，請重試');
            }
        };
        
        // 綁定取消刪除按鈕點擊事件
        cancelDeleteBtn.onclick = function() {
            deleteConfirmModal.style.display = 'none';
        };
    }
    
    // 匯出Excel功能
    function exportToExcel() {
        // 獲取所有書籍數據
        const books = BookData.getAllBooks();
        
        // 創建工作表數據
        const worksheet = XLSX.utils.json_to_sheet(books.map(book => ({
            '書名': book.title,
            '作者': book.author,
            '集數': book.series || '',
            '出版社': book.publisher || '',
            '描述': book.description || '',
            '櫃號': book.cabinet || '',
            '行號': book.row || '',
            'ISBN號': book.isbn || '',
            '備註': book.notes || ''
        })));
        
        // 創建工作簿
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '書籍清單');
        
        // 生成Excel文件並下載
        XLSX.writeFile(workbook, '書籍清單.xlsx');
    }
    
    // 導出為JSON文件
    function exportToJSON() {
        // 獲取所有書籍數據
        const books = BookData.getAllBooks();
        
        // 創建Blob對象
        const blob = new Blob([JSON.stringify(books, null, 2)], { type: 'application/json' });
        
        // 創建下載鏈接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'books.json';
        
        // 觸發下載
        document.body.appendChild(a);
        a.click();
        
        // 清理
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }
    
    // GitHub API相關功能
    // 將函數設置為全局可訪問，以便其他模塊可以調用
    window.uploadToGitHub = async function(content, fileName = 'books.json') {
        try {
            const statusElement = document.getElementById('uploadStatus');
            if (statusElement) {
                statusElement.textContent = '正在上傳到GitHub...';
                statusElement.style.color = '#3498db';
            }
            
            // 獲取GitHub個人訪問令牌
            const token = localStorage.getItem('githubToken');
            if (!token) {
                throw new Error('未設置GitHub訪問令牌，請在設置中配置');
            }
            
            // 獲取GitHub倉庫信息
            const repo = localStorage.getItem('githubRepo') || '';
            const [owner, repoName] = repo.split('/');
            if (!owner || !repoName) {
                throw new Error('GitHub倉庫格式不正確，應為 "用戶名/倉庫名"');
            }
            
            // 獲取分支名稱
            const branch = localStorage.getItem('githubBranch') || 'main';
            
            // 檢查文件是否已存在，獲取SHA
            let fileSha = '';
            try {
                const checkResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/data/${fileName}?ref=${branch}`, {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (checkResponse.status === 200) {
                    const fileData = await checkResponse.json();
                    fileSha = fileData.sha;
                }
            } catch (error) {
                console.log('文件不存在，將創建新文件');
            }
            
            // 準備上傳數據
            const uploadData = {
                message: `更新書籍數據 - ${new Date().toLocaleString()}`,
                content: btoa(unescape(encodeURIComponent(content))),
                branch: branch
            };
            
            // 如果文件已存在，添加SHA
            if (fileSha) {
                uploadData.sha = fileSha;
            }
            
            // 上傳到GitHub
            const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/data/${fileName}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(uploadData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API錯誤: ${response.status} - ${errorData.message}`);
            }
            
            const result = await response.json();
            console.log('上傳成功:', result);
            
            if (statusElement) {
                statusElement.textContent = '上傳成功！';
                statusElement.style.color = '#2ecc71';
                setTimeout(() => {
                    statusElement.textContent = '';
                }, 5000);
            }
            
            return result;
        } catch (error) {
            console.error('上傳到GitHub時發生錯誤:', error);
            
            const statusElement = document.getElementById('uploadStatus');
            if (statusElement) {
                statusElement.textContent = `上傳失敗: ${error.message}`;
                statusElement.style.color = '#e74c3c';
            }
            
            throw error;
        }
    }
    
    // 匯入Excel功能
    function importFromExcel() {
        console.log('開始匯入Excel文件');
        const fileInput = document.getElementById('excelFile');
        const file = fileInput.files[0];
        const autoUpload = document.getElementById('autoUpload') ? document.getElementById('autoUpload').checked : false;
        
        if (!file) {
            alert('請選擇Excel文件');
            return;
        }
        
        console.log('選擇的文件:', file.name, '大小:', file.size, '類型:', file.type);
        
        const reader = new FileReader();
        
        // 添加錯誤處理
        reader.onerror = function(event) {
            console.error('FileReader錯誤:', event.target.error);
            alert('讀取文件時發生錯誤: ' + event.target.error);
        };
        
        // 添加進度監控
        reader.onprogress = function(event) {
            if (event.lengthComputable) {
                const percentLoaded = Math.round((event.loaded / event.total) * 100);
                console.log('文件讀取進度: ' + percentLoaded + '%');
            }
        };
        
        reader.onload = function(e) {
            console.log('文件讀取完成，開始處理數據');
            try {
                const data = new Uint8Array(e.target.result);
                console.log('文件數據大小:', data.length, '字節');
                
                const workbook = XLSX.read(data, { type: 'array' });
                console.log('工作簿讀取成功，工作表數量:', workbook.SheetNames.length);
                
                // 獲取第一個工作表
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                console.log('工作表名稱:', workbook.SheetNames[0]);
                
                // 將工作表轉換為JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                console.log('轉換為JSON成功，數據行數:', jsonData.length);
                
                if (jsonData.length === 0) {
                    alert('Excel文件中沒有數據或格式不正確');
                    return;
                }
                
                // 檢查數據格式
                const firstRow = jsonData[0];
                console.log('第一行數據:', JSON.stringify(firstRow));
                
                if (!firstRow['書名'] || !firstRow['作者']) {
                    alert('Excel文件格式不正確，請確保包含「書名」和「作者」欄位');
                    return;
                }
                
                // 處理匯入的數據
                let importCount = 0;
                const books = [];
                jsonData.forEach((row, index) => {
                    // 檢查必要欄位
                    if (row['書名'] && row['作者']) {
                        const bookData = {
                            id: Date.now().toString() + index, // 確保ID唯一
                            title: row['書名'],
                            author: row['作者'],
                            series: row['集數'] || '',
                            publisher: row['出版社'] || '',
                            description: row['描述'] || '',
                            cabinet: row['櫃號'] || '',
                            row: row['行號'] || '',
                            isbn: row['ISBN號'] || '',
                            notes: row['備註'] || ''
                        };
                        
                        // 添加書籍
                        BookData.addBook(bookData);
                        books.push(bookData);
                        importCount++;
                    } else {
                        console.warn(`第${index+1}行數據缺少必要欄位:`, JSON.stringify(row));
                    }
                });
                
                console.log(`成功匯入 ${importCount} 本書籍`);
                
                // 重新加載書籍列表
                loadBooks();
                
                // 如果啟用了自動上傳，則上傳到GitHub
                if (autoUpload) {
                    // 獲取所有書籍數據，確保上傳的是完整數據
                    const allBooks = BookData.getAllBooks();
                    const jsonContent = JSON.stringify(allBooks, null, 2);
                    uploadToGitHub(jsonContent)
                        .then(() => {
                            console.log('自動上傳成功');
                        })
                        .catch(error => {
                            console.error('自動上傳失敗:', error);
                            alert(`自動上傳失敗: ${error.message}`);
                        });
                }
                
                // 關閉彈窗
                importExcelModal.style.display = 'none';
                
                // 顯示匯入結果
                alert(`成功匯入 ${importCount} 本書籍${autoUpload ? '，並已開始上傳到GitHub' : ''}`);
                
                // 重置表單
                fileInput.value = '';
            } catch (error) {
                console.error('處理Excel數據時發生錯誤:', error);
                alert('匯入失敗：' + error.message);
            }
        };
        
        console.log('開始讀取文件...');
        reader.readAsArrayBuffer(file);
    }
});