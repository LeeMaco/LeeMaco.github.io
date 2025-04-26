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
    closeModal.addEventListener('click', closeModalWindow);
    window.addEventListener('click', function(e) {
        if (e.target === modal) closeModalWindow();
    });
    
    /**
     * 初始化應用程序
     */
    function init() {
        // 顯示所有書籍
        displayBooks(BookData.getBooks());
        // 檢查是否已登入
        checkLoginStatus();
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
        const query = searchInput.value.trim();
        const category = categoryFilter.value;
        const results = BookData.searchBooks(query, category);
        displayBooks(results);
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
            
            const statusClass = `status-${book.status}`;
            const statusText = getStatusText(book.status);
            
            bookCard.innerHTML = `
                <h3>${book.title}</h3>
                <p><strong>作者:</strong> ${book.author}</p>
                <p><strong>位置:</strong> ${book.location}</p>
                <p><span class="status ${statusClass}">${statusText}</span></p>
            `;
            
            bookCard.addEventListener('click', function() {
                showBookDetails(book);
            });
            
            bookResults.appendChild(bookCard);
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
                <div>位置</div>
                <div>操作</div>
            </div>
        `;
        
        books.forEach(book => {
            const listItem = document.createElement('div');
            listItem.className = 'book-list-item';
            listItem.dataset.id = book.id;
            
            listItem.innerHTML = `
                <div>${book.title}</div>
                <div>${book.author}</div>
                <div>${book.location}</div>
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
        template.querySelector('.book-isbn').textContent = book.isbn;
        template.querySelector('.book-category').textContent = getCategoryText(book.category);
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
                isbn: document.getElementById('isbn').value,
                category: document.getElementById('category').value,
                year: parseInt(document.getElementById('year').value),
                location: document.getElementById('location').value,
                status: document.getElementById('status').value
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
        const isbnInput = template.querySelector('#isbn');
        const categoryInput = template.querySelector('#category');
        const yearInput = template.querySelector('#year');
        const locationInput = template.querySelector('#location');
        const statusInput = template.querySelector('#status');
        const cancelBtn = template.querySelector('.btn-cancel');
        
        formTitle.textContent = '編輯書籍';
        bookIdInput.value = book.id;
        titleInput.value = book.title;
        authorInput.value = book.author;
        isbnInput.value = book.isbn;
        categoryInput.value = book.category;
        yearInput.value = book.year;
        locationInput.value = book.location;
        statusInput.value = book.status;
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const updatedBook = {
                id: bookIdInput.value,
                title: titleInput.value,
                author: authorInput.value,
                isbn: isbnInput.value,
                category: categoryInput.value,
                year: parseInt(yearInput.value),
                location: locationInput.value,
                status: statusInput.value
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
        BookData.exportData();
        showNotification('數據已導出', 'success');
    }
    
    /**
     * 顯示導入表單
     */
    function showImportForm() {
        const importForm = document.createElement('div');
        importForm.className = 'import-form';
        importForm.innerHTML = `
            <h2>導入數據</h2>
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
                const result = BookData.importData(e.target.result);
                if (result) {
                    displayAdminBookList();
                    displayBooks(BookData.getBooks());
                    closeModalWindow();
                    showNotification('數據已導入', 'success');
                } else {
                    showNotification('導入失敗，請確保文件格式正確', 'error');
                }
            };
            reader.readAsText(file);
        });
        
        importCancelBtn.addEventListener('click', closeModalWindow);
        
        modalContent.innerHTML = '';
        modalContent.appendChild(importForm);
        openModal();
    }
    
    /**
     * 處理備份數據
     */
    function handleBackup() {
        const result = BookData.backupToGitHub();
        if (result) {
            showNotification('數據已備份到GitHub', 'success');
        } else {
            showNotification('備份失敗', 'error');
        }
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