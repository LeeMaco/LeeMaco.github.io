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
    const refreshDataBtn = document.getElementById('refreshDataBtn');
    
    // 書籍統計元素
    const totalBooksElement = document.getElementById('totalBooks');
    const lastUpdateElement = document.getElementById('lastUpdate');
    const recentChangesElement = document.getElementById('recentChanges');
    
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
    refreshDataBtn.addEventListener('click', function() {
        fetchLatestBooksData(true); // 傳入true表示手動觸發
    });
    document.getElementById('trashBinBtn').addEventListener('click', showTrashBin);
    closeModal.addEventListener('click', closeModalWindow);
    window.addEventListener('click', function(e) {
        if (e.target === modal) closeModalWindow();
    });
    
    /**
     * 初始化應用程序
     */
    function init() {
        // 初始顯示提示信息，而不是所有書籍
        bookResults.innerHTML = '<p class="no-results">請輸入關鍵字搜索書籍</p>';
        // 檢查是否已登入
        checkLoginStatus();
        // 更新類別過濾器
        updateCategoryFilter();
        // 更新書籍統計數據
        updateBookStats();
        // 自動獲取最新的books_data.json文件
        fetchLatestBooksData(false); // 傳入false表示自動觸發
    }
    
    /**
     * 獲取最新的books_data.json文件
     * @param {boolean} isManual - 是否為手動觸發更新
     */
    function fetchLatestBooksData(isManual = false) {
        // 如果是手動觸發，顯示加載中通知
        if (isManual) {
            showNotification('正在獲取最新書籍資料...', 'info');
            // 禁用更新按鈕，防止重複點擊
            refreshDataBtn.disabled = true;
            refreshDataBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 更新中...';
        }
        
        fetch('books_data.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('無法獲取books_data.json文件');
                }
                return response.json();
            })
            .then(data => {
                // 檢查數據是否為有效的書籍數組
                if (Array.isArray(data) && data.length > 0) {
                    // 獲取本地數據
                    const localBooks = BookData.getBooks();
                    
                    // 檢查是否需要更新（比較數量或最後更新時間）
                    let needUpdate = false;
                    
                    if (localBooks.length !== data.length) {
                        needUpdate = true;
                    } else {
                        // 檢查最新更新時間
                        const latestLocalUpdate = Math.max(...localBooks.map(book => new Date(book.updatedAt).getTime()));
                        const latestRemoteUpdate = Math.max(...data.map(book => new Date(book.updatedAt).getTime()));
                        
                        if (latestRemoteUpdate > latestLocalUpdate) {
                            needUpdate = true;
                        }
                    }
                    
                    if (needUpdate) {
                        // 更新本地數據
                        BookData.saveBooks(data);
                        console.log(isManual ? '已手動更新書籍數據' : '已自動更新書籍數據');
                        
                        // 顯示通知
                        showNotification(isManual ? '書籍資料已成功更新！' : '書籍數據已自動更新', 'success');
                        
                        // 更新書籍統計數據
                        updateBookStats();
                        
                        // 如果用戶已經搜索過，重新顯示結果
                        if (searchInput.value.trim() || categoryFilter.value) {
                            handleSearch();
                        } else {
                            // 顯示所有書籍
                            displayBooks(data);
                        }
                    } else if (isManual) {
                        // 如果是手動觸發但沒有需要更新的內容
                        showNotification('書籍資料已是最新狀態', 'info');
                    }
                } else if (isManual) {
                    // 如果是手動觸發但數據無效
                    showNotification('獲取的書籍資料無效', 'error');
                }
            })
            .catch(error => {
                console.error('獲取books_data.json文件時發生錯誤:', error);
                // 錯誤處理：使用本地數據繼續
                if (isManual) {
                    showNotification('更新書籍資料失敗: ' + error.message, 'error');
                }
            })
            .finally(() => {
                // 如果是手動觸發，恢復更新按鈕狀態
                if (isManual) {
                    refreshDataBtn.disabled = false;
                    refreshDataBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 更新資料';
                }
            });
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
        // 更新書籍統計數據
        updateBookStats();
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
                // 保留用户之前的排序选择
                displayBooks(results);
                showNotification(`找到 ${results.length} 本符合條件的書籍`, 'success');
                
                // 如果用户之前已经选择了排序方式，显示排序状态提示
                if (userSortField) {
                    const sortFieldText = {
                        'title': '書名',
                        'author': '作者',
                        'volume': '集數',
                        'cabinet': '櫃號',
                        'row': '行號'
                    }[userSortField];
                    
                    const sortDirectionText = userSortDirection === 'asc' ? '升序' : '降序';
                    showNotification(`結果已按 ${sortFieldText} ${sortDirectionText} 排序`, 'info');
                }
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
    // 用户界面排序状态变量
let userSortField = '';
let userSortDirection = 'asc';

function displayBooks(books) {
        // 保存原始书籍列表的副本
        let displayedBooks = [...books];
        
        // 添加排序控制区域
        const sortControlsHTML = `
            <div class="sort-controls">
                <span>排序方式: </span>
                <button class="sort-btn" data-sort="title">書名 <i class="fas fa-sort"></i></button>
                <button class="sort-btn" data-sort="author">作者 <i class="fas fa-sort"></i></button>
                <button class="sort-btn" data-sort="volume">集數 <i class="fas fa-sort"></i></button>
                <button class="sort-btn" data-sort="cabinet">櫃號 <i class="fas fa-sort"></i></button>
                <button class="sort-btn" data-sort="row">行號 <i class="fas fa-sort"></i></button>
            </div>
        `;
        
        // 清空结果区域并添加排序控制
        bookResults.innerHTML = '';
        const sortControlsContainer = document.createElement('div');
        sortControlsContainer.className = 'sort-controls-container';
        sortControlsContainer.innerHTML = sortControlsHTML;
        bookResults.appendChild(sortControlsContainer);
        
        // 应用排序
        if (userSortField) {
            displayedBooks.sort((a, b) => {
                let valueA = (a[userSortField] || '').toString().toLowerCase();
                let valueB = (b[userSortField] || '').toString().toLowerCase();
                
                if (valueA < valueB) return userSortDirection === 'asc' ? -1 : 1;
                if (valueA > valueB) return userSortDirection === 'asc' ? 1 : -1;
                return 0;
            });
            
            // 更新排序按钮图标
            const sortBtn = sortControlsContainer.querySelector(`[data-sort="${userSortField}"]`);
            if (sortBtn) {
                const icon = sortBtn.querySelector('i');
                icon.className = userSortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
            }
        }
        
        // 添加排序按钮事件监听器
        const sortBtns = sortControlsContainer.querySelectorAll('.sort-btn');
        sortBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const field = this.dataset.sort;
                if (userSortField === field) {
                    // 如果已经按这个字段排序，则切换排序方向
                    userSortDirection = userSortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    // 如果是新的排序字段，设置为升序
                    userSortField = field;
                    userSortDirection = 'asc';
                }
                displayBooks(books); // 重新显示列表
            });
        });
        
        // 创建书籍结果容器
        const booksContainer = document.createElement('div');
        booksContainer.className = 'books-container';
        bookResults.appendChild(booksContainer);
        
        if (displayedBooks.length === 0) {
            booksContainer.innerHTML = '<p class="no-results">沒有找到符合條件的書籍</p>';
            return;
        }
        
        displayedBooks.forEach(book => {
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
            
            booksContainer.appendChild(bookCard);
        });
    }
    
    /**
     * 格式化日期
     * @param {Date} date - 日期對象
     * @returns {string} - 格式化後的日期字符串
     */
    function formatDate(dateString) {
        if (!dateString) return '無';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '無';
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
    // 全局变量，用于跟踪排序状态
let currentSortField = '';
let currentSortDirection = 'asc';
let filteredBooks = [];

function displayAdminBookList() {
        // 获取所有书籍并应用筛选
        let books = BookData.getBooks();
        filteredBooks = [...books]; // 保存一份完整的书籍列表副本
        
        // 应用筛选条件
        const filterTitle = document.getElementById('filterTitle')?.value || '';
        const filterAuthor = document.getElementById('filterAuthor')?.value || '';
        const filterVolume = document.getElementById('filterVolume')?.value || '';
        const filterCabinet = document.getElementById('filterCabinet')?.value || '';
        const filterRow = document.getElementById('filterRow')?.value || '';
        
        if (filterTitle || filterAuthor || filterVolume || filterCabinet || filterRow) {
            filteredBooks = filteredBooks.filter(book => {
                return (!filterTitle || book.title.toLowerCase().includes(filterTitle.toLowerCase())) &&
                       (!filterAuthor || book.author.toLowerCase().includes(filterAuthor.toLowerCase())) &&
                       (!filterVolume || (book.volume && book.volume.toString().toLowerCase().includes(filterVolume.toLowerCase()))) &&
                       (!filterCabinet || (book.cabinet && book.cabinet.toString().toLowerCase().includes(filterCabinet.toLowerCase()))) &&
                       (!filterRow || (book.row && book.row.toString().toLowerCase().includes(filterRow.toLowerCase())));
            });
        }
        
        // 应用排序
        if (currentSortField) {
            filteredBooks.sort((a, b) => {
                let valueA = (a[currentSortField] || '').toString().toLowerCase();
                let valueB = (b[currentSortField] || '').toString().toLowerCase();
                
                if (valueA < valueB) return currentSortDirection === 'asc' ? -1 : 1;
                if (valueA > valueB) return currentSortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        // 添加筛选输入框
        const filterHTML = `
            <div class="filter-container admin-filter">
                <div class="filter-item">
                    <input type="text" id="filterTitle" placeholder="書名" value="${filterTitle}">
                </div>
                <div class="filter-item">
                    <input type="text" id="filterAuthor" placeholder="作者" value="${filterAuthor}">
                </div>
                <div class="filter-item">
                    <input type="text" id="filterVolume" placeholder="集數" value="${filterVolume}">
                </div>
                <div class="filter-item">
                    <input type="text" id="filterCabinet" placeholder="櫃號" value="${filterCabinet}">
                </div>
                <div class="filter-item">
                    <input type="text" id="filterRow" placeholder="行號" value="${filterRow}">
                </div>
                <button id="applyFilterBtn" class="btn"><i class="fas fa-filter"></i> 篩選</button>
                <button id="resetFilterBtn" class="btn"><i class="fas fa-undo"></i> 重置</button>
            </div>
        `;
        
        // 添加表头和排序按钮
        adminBookList.innerHTML = filterHTML + `
            <div class="book-list-item book-list-header">
                <div class="sortable" data-sort="title">書名 <i class="fas fa-sort"></i></div>
                <div class="sortable" data-sort="author">作者 <i class="fas fa-sort"></i></div>
                <div class="sortable" data-sort="volume">集數 <i class="fas fa-sort"></i></div>
                <div class="sortable" data-sort="cabinet">櫃號 <i class="fas fa-sort"></i></div>
                <div class="sortable" data-sort="row">行號 <i class="fas fa-sort"></i></div>
                <div>操作</div>
            </div>
        `;
        
        // 添加排序图标
        if (currentSortField) {
            const sortHeader = adminBookList.querySelector(`[data-sort="${currentSortField}"]`);
            if (sortHeader) {
                const icon = sortHeader.querySelector('i');
                icon.className = currentSortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
            }
        }
        
        // 添加排序事件监听器
        const sortableHeaders = adminBookList.querySelectorAll('.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const field = this.dataset.sort;
                if (currentSortField === field) {
                    // 如果已经按这个字段排序，则切换排序方向
                    currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    // 如果是新的排序字段，设置为升序
                    currentSortField = field;
                    currentSortDirection = 'asc';
                }
                displayAdminBookList(); // 重新显示列表
            });
        });
        
        // 添加筛选按钮事件监听器
        document.getElementById('applyFilterBtn').addEventListener('click', function() {
            displayAdminBookList();
        });
        
        document.getElementById('resetFilterBtn').addEventListener('click', function() {
            // 清空所有筛选输入框
            document.getElementById('filterTitle').value = '';
            document.getElementById('filterAuthor').value = '';
            document.getElementById('filterVolume').value = '';
            document.getElementById('filterCabinet').value = '';
            document.getElementById('filterRow').value = '';
            displayAdminBookList();
        });
        
        // 显示筛选后的书籍列表
        filteredBooks.forEach(book => {
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
        template.querySelector('.book-created-at').textContent = formatDate(book.createdAt) || '無';
        template.querySelector('.book-updated-at').textContent = formatDate(book.updatedAt) || '無';
        
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
     * 更新書籍統計數據
     */
    function updateBookStats() {
        const books = BookData.getBooks();
        
        // 更新總書籍數量
        if (totalBooksElement) {
            totalBooksElement.textContent = books.length;
        }
        
        // 更新最後更新時間
        if (lastUpdateElement && books.length > 0) {
            // 找出最新的更新時間
            const latestUpdate = new Date(Math.max(...books.map(book => new Date(book.updatedAt).getTime())));
            lastUpdateElement.textContent = formatDate(latestUpdate);
        } else if (lastUpdateElement) {
            lastUpdateElement.textContent = '-';
        }
        
        // 更新最近異動資料
        if (recentChangesElement && books.length > 0) {
            // 按更新時間排序，取最近3本更新的書籍
            const recentBooks = [...books]
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                .slice(0, 3);
                
            if (recentBooks.length > 0) {
                const recentChangesHTML = recentBooks.map(book => 
                    `<div class="recent-change">${book.title} (${formatDate(new Date(book.updatedAt))})</div>`
                ).join('');
                
                recentChangesElement.innerHTML = recentChangesHTML;
            } else {
                recentChangesElement.textContent = '-';
            }
        } else if (recentChangesElement) {
            recentChangesElement.textContent = '-';
        }
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
                notes: document.getElementById('notes').value
                // 創建和更新時間由BookData.addBook處理
            };
            
            BookData.addBook(newBook);
            // 更新類別過濾器以包含可能的新類別
            updateCategoryFilter();
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
                notes: notesInput.value
                // 創建和更新時間由BookData.updateBook處理
            };
            
            BookData.updateBook(updatedBook);
            // 更新類別過濾器以包含可能的新類別
            updateCategoryFilter();
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
     */
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(function() {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(function() {
            notification.classList.remove('show');
            setTimeout(function() {
                notification.remove();
            }, 300);
        }, 3000);
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
    
    /**
     * 更新類別過濾器
     */
    function updateCategoryFilter() {
        // 獲取所有書籍的類別
        const books = BookData.getBooks();
        const categories = new Set();
        
        // 添加默認類別
        categories.add('fiction');
        categories.add('science');
        categories.add('history');
        categories.add('biography');
        categories.add('technology');
        
        // 添加書籍中的自定義類別
        books.forEach(book => {
            if (book.category) {
                categories.add(book.category);
            }
        });
        
        // 清空並重建類別過濾器
        categoryFilter.innerHTML = '<option value="">所有類別</option>';
        
        // 按字母順序排序類別
        const sortedCategories = Array.from(categories).sort();
        
        // 添加類別選項
        sortedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = getCategoryText(category);
            categoryFilter.appendChild(option);
        });
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