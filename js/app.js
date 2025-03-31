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
        
        // 顯示搜尋中的提示
        searchResults.innerHTML = '<p class="searching">正在搜尋中，請稍候...</p>';
        
        try {
            console.log('執行搜索，關鍵字:', query, '類型:', type);
            // 確保數據已完全加載
            if (BookData.jsonBooks.length === 0) {
                console.log('JSON數據尚未加載完成，嘗試重新加載');
                // 顯示加載中的提示
                searchResults.innerHTML = '<p class="searching">正在加載數據，請稍候...</p>';
                
                // 重新加載數據並在完成後執行搜尋
                BookData.loadBooksFromJSON().then(() => {
                    console.log('數據重新加載完成，執行搜尋');
                    const results = BookData.searchBooks(query, type);
                    console.log('搜索結果數量:', results.length);
                    displaySearchResults(results);
                }).catch(error => {
                    console.error('加載數據時發生錯誤:', error);
                    searchResults.innerHTML = '<p class="no-results">加載數據時發生錯誤，請稍後再試</p>';
                });
            } else {
                // 數據已加載，直接執行搜尋
                const results = BookData.searchBooks(query, type);
                console.log('搜索結果數量:', results.length);
                displaySearchResults(results);
            }
        } catch (error) {
            console.error('搜索過程中發生錯誤:', error);
            searchResults.innerHTML = '<p class="no-results">搜索過程中發生錯誤，請稍後再試</p>';
        }
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