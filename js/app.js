/**
 * 書籍查詢管理系統 - 主應用邏輯
 */

// 等待DOM加載完成
document.addEventListener('DOMContentLoaded', async () => {
    // 初始化數據庫
    await db.init();
    
    // 初始化事件監聽器
    initEventListeners();
    
    /**
     * 初始化事件監聽器
     */
    function initEventListeners() {
        // 搜索按鈕點擊事件
        document.getElementById('searchBtn').addEventListener('click', handleSearch);
        
        // 搜索輸入框回車事件
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
        
        // 登入表單提交事件
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
        
        // 如果已登入，更新登入按鈕
        if (auth.isAuthenticated()) {
            updateLoginButton();
        }
    }
    
    /**
     * 處理搜索
     */
    async function handleSearch() {
        const searchInput = document.getElementById('searchInput').value.trim();
        const searchType = document.querySelector('input[name="searchType"]:checked').value;
        const searchResults = document.getElementById('searchResults');
        
        if (!searchInput) {
            searchResults.innerHTML = `
                <div class="alert alert-info">
                    請輸入關鍵字進行搜尋
                </div>
            `;
            return;
        }
        
        // 顯示加載中
        searchResults.innerHTML = `
            <div class="d-flex justify-content-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">加載中...</span>
                </div>
            </div>
        `;
        
        try {
            // 根據搜索類型獲取書籍
            let books;
            if (searchType === 'title') {
                books = await db.searchBooksByTitle(searchInput);
            } else {
                books = await db.searchBooksByAuthor(searchInput);
            }
            
            // 渲染搜索結果
            renderSearchResults(books, searchInput, searchType);
        } catch (error) {
            console.error('搜索錯誤:', error);
            searchResults.innerHTML = `
                <div class="alert alert-danger">
                    搜索過程中發生錯誤，請稍後再試
                </div>
            `;
        }
    }
    
    /**
     * 渲染搜索結果
     * @param {Array} books - 書籍數據
     * @param {string} keyword - 搜索關鍵字
     * @param {string} searchType - 搜索類型
     */
    function renderSearchResults(books, keyword, searchType) {
        const searchResults = document.getElementById('searchResults');
        
        if (books.length === 0) {
            searchResults.innerHTML = `
                <div class="alert alert-warning">
                    未找到與「${keyword}」相關的${searchType === 'title' ? '書名' : '作者'}記錄
                </div>
            `;
            return;
        }
        
        let resultsHTML = `
            <div class="alert alert-success">
                找到 ${books.length} 條與「${keyword}」相關的${searchType === 'title' ? '書名' : '作者'}記錄
            </div>
            <div class="book-list">
        `;
        
        books.forEach(book => {
            resultsHTML += `
                <div class="book-item fade-in">
                    <div class="book-title">${book.title}</div>
                    <div class="book-author">作者: ${book.author}</div>
                    <div class="book-details">
                        ${book.category ? `<span class="book-detail-item">類別: ${book.category}</span>` : ''}
                        ${book.publisher ? `<span class="book-detail-item">出版社: ${book.publisher}</span>` : ''}
                        ${book.isbn ? `<span class="book-detail-item">ISBN: ${book.isbn}</span>` : ''}
                    </div>
                    <div class="mt-2">
                        <button class="btn btn-sm btn-outline-primary view-book-details" data-id="${book.id}" data-bs-toggle="modal" data-bs-target="#bookDetailsModal">
                            查看詳情
                        </button>
                    </div>
                </div>
            `;
        });
        
        resultsHTML += `</div>`;
        searchResults.innerHTML = resultsHTML;
        
        // 添加查看詳情按鈕的事件監聽器
        document.querySelectorAll('.view-book-details').forEach(button => {
            button.addEventListener('click', () => showBookDetails(button.getAttribute('data-id')));
        });
    }
    
    /**
     * 顯示書籍詳情
     * @param {string} id - 書籍ID
     */
    async function showBookDetails(id) {
        try {
            const book = await db.getBookById(id);
            if (!book) return;
            
            // 創建模態框（如果不存在）
            let modal = document.getElementById('bookDetailsModal');
            if (!modal) {
                const modalHTML = `
                    <div class="modal fade" id="bookDetailsModal" tabindex="-1" aria-hidden="true">
                        <div class="modal-dialog">
                            <div class="modal-content">
                                <div class="modal-header bg-primary text-white">
                                    <h5 class="modal-title">書籍詳情</h5>
                                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body book-modal-details">
                                    <dl id="bookDetailsContent"></dl>
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
                modal = document.getElementById('bookDetailsModal');
            }
            
            // 填充書籍詳情
            const detailsContent = document.getElementById('bookDetailsContent');
            detailsContent.innerHTML = `
                <dt>書名</dt>
                <dd>${book.title}</dd>
                
                <dt>作者</dt>
                <dd>${book.author || '未知'}</dd>
                
                ${book.category ? `
                    <dt>類別</dt>
                    <dd>${book.category}</dd>
                ` : ''}
                
                ${book.publisher ? `
                    <dt>出版社</dt>
                    <dd>${book.publisher}</dd>
                ` : ''}
                
                ${book.isbn ? `
                    <dt>ISBN</dt>
                    <dd>${book.isbn}</dd>
                ` : ''}
                
                ${book.shelf && book.row ? `
                    <dt>位置</dt>
                    <dd>櫃號 ${book.shelf}，行號 ${book.row}</dd>
                ` : ''}
                
                ${book.description ? `
                    <dt>簡介</dt>
                    <dd>${book.description}</dd>
                ` : ''}
            `;
            
            // 顯示模態框
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        } catch (error) {
            console.error('獲取書籍詳情失敗:', error);
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
            // 登入成功
            const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            modal.hide();
            
            // 更新登入按鈕
            updateLoginButton();
            
            // 如果在管理頁面，刷新頁面
            if (window.location.pathname.includes('admin.html')) {
                window.location.reload();
            }
        } else {
            // 登入失敗
            loginError.textContent = '帳號或密碼錯誤';
            loginError.classList.remove('d-none');
        }
    }
    
    /**
     * 更新登入按鈕
     */
    function updateLoginButton() {
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (auth.isAuthenticated()) {
            // 已登入狀態
            loginBtn.classList.add('d-none');
            logoutBtn.classList.remove('d-none');
            
            // 添加登出事件
            logoutBtn.addEventListener('click', () => {
                auth.logout();
                window.location.reload();
            });
        } else {
            // 未登入狀態
            loginBtn.classList.remove('d-none');
            logoutBtn.classList.add('d-none');
        }
    }
    
    // 初始化示例數據
    await db.initSampleData();
});}