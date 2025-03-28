/**
 * 書籍查詢管理系統 - 前端應用模塊
 * 負責處理用戶界面交互和數據展示
 */

document.addEventListener('DOMContentLoaded', function() {
    // 獲取DOM元素
    const searchInput = document.getElementById('searchInput');
    const searchType = document.getElementById('searchType');
    const searchBtn = document.getElementById('searchBtn');
    const searchResults = document.getElementById('searchResults');
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const adminLoginModal = document.getElementById('adminLoginModal');
    const loginForm = document.getElementById('loginForm');
    const bookDetailModal = document.getElementById('bookDetailModal');
    const bookDetailContent = document.getElementById('bookDetailContent');
    
    // 綁定搜索按鈕點擊事件
    searchBtn.addEventListener('click', function() {
        performSearch();
    });
    
    // 綁定搜索輸入框回車事件
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // 執行搜索
    function performSearch() {
        const query = searchInput.value.trim();
        const type = searchType.value;
        
        if (query === '') {
            searchResults.innerHTML = '<p class="no-results">請輸入關鍵字進行查詢</p>';
            return;
        }
        
        const results = BookData.searchBooks(query, type);
        displaySearchResults(results);
    }
    
    // 顯示搜索結果
    function displaySearchResults(books) {
        if (books.length === 0) {
            searchResults.innerHTML = '<p class="no-results">沒有找到符合條件的書籍</p>';
            return;
        }
        
        let html = '';
        books.forEach(book => {
            html += `
                <div class="book-card" data-id="${book.id}">
                    <h3>${book.title}</h3>
                    <p><strong>作者：</strong>${book.author}</p>
                    ${book.series ? `<p><strong>集數：</strong>${book.series}</p>` : ''}
                    <p><strong>出版社：</strong>${book.publisher || '未知'}</p>
                </div>
            `;
        });
        
        searchResults.innerHTML = html;
        
        // 綁定書籍卡片點擊事件
        document.querySelectorAll('.book-card').forEach(card => {
            card.addEventListener('click', function() {
                const bookId = this.getAttribute('data-id');
                showBookDetail(bookId);
            });
        });
    }
    
    // 顯示書籍詳情
    function showBookDetail(bookId) {
        const book = BookData.getBookById(bookId);
        if (!book) return;
        
        let html = `
            <h2>${book.title}</h2>
            <div class="book-detail-content">
                <p><strong>作者：</strong>${book.author}</p>
                ${book.series ? `<p><strong>集數：</strong>${book.series}</p>` : ''}
                <p><strong>出版社：</strong>${book.publisher || '未知'}</p>
                <p><strong>ISBN號：</strong>${book.isbn || '未知'}</p>
                <p><strong>位置：</strong>櫃號 ${book.cabinet || '未知'}, 行號 ${book.row || '未知'}</p>
                ${book.description ? `<p><strong>描述：</strong>${book.description}</p>` : ''}
                ${book.notes ? `<p><strong>備註：</strong>${book.notes}</p>` : ''}
            </div>
        `;
        
        bookDetailContent.innerHTML = html;
        bookDetailModal.style.display = 'block';
    }
    
    // 管理員登入按鈕點擊事件
    adminLoginBtn.addEventListener('click', function() {
        adminLoginModal.style.display = 'block';
    });
    
    // 登入表單提交事件
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (BookData.validateAdmin(username, password)) {
            // 登入成功，設置登入狀態並跳轉到管理頁面
            localStorage.setItem('isLoggedIn', 'true');
            window.location.href = 'admin.html';
        } else {
            alert('帳號或密碼錯誤！');
        }
    });
    
    // 關閉按鈕事件
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            adminLoginModal.style.display = 'none';
            bookDetailModal.style.display = 'none';
        });
    });
    
    // 點擊模態框外部關閉
    window.addEventListener('click', function(e) {
        if (e.target === adminLoginModal) {
            adminLoginModal.style.display = 'none';
        }
        if (e.target === bookDetailModal) {
            bookDetailModal.style.display = 'none';
        }
    });
});