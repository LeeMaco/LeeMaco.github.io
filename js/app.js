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
    
    // 高級搜索相關元素
    const advancedSearchBtn = document.getElementById('advancedSearchBtn');
    const advancedSearchSection = document.getElementById('advancedSearchSection');
    const searchFilterForm = document.getElementById('searchFilterForm');
    const titleSearch = document.getElementById('titleSearch');
    const authorSearch = document.getElementById('authorSearch');
    const publisherSearch = document.getElementById('publisherSearch');
    const cabinetFilter = document.getElementById('cabinetFilter');
    const rowFilter = document.getElementById('rowFilter');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    
    // 搜索建議相關元素
    let searchSuggestions;
    let currentSuggestions = [];
    
    // 創建搜索建議容器
    function createSuggestionsContainer() {
        searchSuggestions = document.createElement('div');
        searchSuggestions.className = 'search-suggestions';
        searchSuggestions.style.display = 'none';
        searchInput.parentNode.insertBefore(searchSuggestions, searchInput.nextSibling);
    }
    
    createSuggestionsContainer();
    
    // 初始化數據並確保數據加載完成
    BookData.init().then(() => {
        console.log('數據初始化完成');
    }).catch(error => {
        console.error('數據初始化失敗:', error);
    });
    
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
    
    // 綁定搜索輸入框輸入事件，實現搜索建議
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        if (query.length < 2) {
            searchSuggestions.style.display = 'none';
            return;
        }
        
        // 獲取搜索類型
        const type = searchType.value;
        
        // 獲取所有書籍
        const allBooks = BookData.getAllBooks();
        
        // 根據搜索類型和查詢生成建議
        currentSuggestions = [];
        const seen = new Set(); // 用於去重
        
        allBooks.forEach(book => {
            if (!book) return;
            
            let fieldValue = '';
            if (type === 'all') {
                // 檢查所有欄位
                const fields = ['title', 'author', 'publisher', 'isbn'];
                for (const field of fields) {
                    if (book[field] && String(book[field]).toLowerCase().includes(query.toLowerCase())) {
                        fieldValue = book[field];
                        break;
                    }
                }
            } else if (book[type]) {
                fieldValue = book[type];
            }
            
            if (fieldValue && String(fieldValue).toLowerCase().includes(query.toLowerCase())) {
                const suggestionText = String(fieldValue);
                if (!seen.has(suggestionText.toLowerCase())) {
                    seen.add(suggestionText.toLowerCase());
                    currentSuggestions.push({
                        text: suggestionText,
                        type: type
                    });
                }
            }
        });
        
        // 限制建議數量
        currentSuggestions = currentSuggestions.slice(0, 5);
        
        // 顯示建議
        if (currentSuggestions.length > 0) {
            displaySuggestions(currentSuggestions);
        } else {
            searchSuggestions.style.display = 'none';
        }
    });
    
    // 點擊文檔其他地方時隱藏搜索建議
    document.addEventListener('click', function(e) {
        if (e.target !== searchInput && e.target !== searchSuggestions) {
            searchSuggestions.style.display = 'none';
        }
    });
    
    // 顯示搜索建議
    function displaySuggestions(suggestions) {
        searchSuggestions.innerHTML = '';
        
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = suggestion.text;
            
            item.addEventListener('click', function() {
                searchInput.value = suggestion.text;
                searchType.value = suggestion.type;
                searchSuggestions.style.display = 'none';
                performSearch();
            });
            
            searchSuggestions.appendChild(item);
        });
        
        searchSuggestions.style.display = 'block';
    }
    
    // 綁定高級搜索按鈕點擊事件
    advancedSearchBtn.addEventListener('click', function() {
        // 切換高級搜索區域的顯示狀態
        if (advancedSearchSection.style.display === 'none' || !advancedSearchSection.style.display) {
            advancedSearchSection.style.display = 'block';
            advancedSearchBtn.innerHTML = '<i class="fas fa-times"></i> 關閉高級搜索';
        } else {
            advancedSearchSection.style.display = 'none';
            advancedSearchBtn.innerHTML = '<i class="fas fa-sliders-h"></i> 高級搜索';
        }
    });
    
    // 綁定重置按鈕點擊事件
    resetFiltersBtn.addEventListener('click', function() {
        // 重置所有搜索和篩選欄位
        titleSearch.value = '';
        authorSearch.value = '';
        publisherSearch.value = '';
        cabinetFilter.value = '';
        rowFilter.value = '';
    });
    
    // 綁定應用篩選按鈕點擊事件
    applyFiltersBtn.addEventListener('click', function() {
        performAdvancedSearch();
    });
    
    // 執行高級搜索
    function performAdvancedSearch() {
        // 顯示搜尋中的提示
        searchResults.innerHTML = '<p class="searching"><i class="fas fa-spinner fa-spin"></i> 正在搜尋中，請稍候...</p>';
        
        try {
            // 收集搜索條件
            const title = titleSearch.value.trim();
            const author = authorSearch.value.trim();
            const publisher = publisherSearch.value.trim();
            const cabinet = cabinetFilter.value;
            const row = rowFilter.value;
            
            // 檢查是否有輸入任何搜索條件
            if (!title && !author && !publisher && !cabinet && !row) {
                searchResults.innerHTML = '<p class="no-results">請輸入至少一個搜索條件</p>';
                return;
            }
            
            console.log('執行高級搜索，條件:', { title, author, publisher, cabinet, row });
            
            // 構建搜索條件
            let results = BookData.getAllBooks();
            
            // 應用標題篩選
            if (title) {
                results = results.filter(book => book.title && book.title.toLowerCase().includes(title.toLowerCase()));
            }
            
            // 應用作者篩選
            if (author) {
                results = results.filter(book => book.author && book.author.toLowerCase().includes(author.toLowerCase()));
            }
            
            // 應用出版社篩選
            if (publisher) {
                results = results.filter(book => book.publisher && book.publisher.toLowerCase().includes(publisher.toLowerCase()));
            }
            
            // 應用櫃號篩選
            if (cabinet) {
                results = results.filter(book => book.cabinet && book.cabinet.toLowerCase() === cabinet.toLowerCase());
            }
            
            // 應用行號篩選
            if (row) {
                results = results.filter(book => book.row && book.row.toLowerCase() === row.toLowerCase());
            }
            
            console.log('高級搜索結果數量:', results.length);
            displaySearchResults(results);
            
        } catch (error) {
            console.error('高級搜索過程中發生錯誤:', error);
            searchResults.innerHTML = '<p class="no-results"><i class="fas fa-exclamation-circle"></i> 搜索過程中發生錯誤，請稍後再試</p>';
        }
    }
    
    // 執行搜索
    function performSearch() {
        const query = searchInput.value.trim();
        const type = searchType.value;
        
        if (query === '') {
            searchResults.innerHTML = '<p class="no-results">請輸入關鍵字進行查詢</p>';
            return;
        }
        
        // 顯示搜尋中的提示
        searchResults.innerHTML = '<p class="searching"><i class="fas fa-spinner fa-spin"></i> 正在搜尋中，請稍候...</p>';
        
        try {
            console.log('執行搜索，關鍵字:', query, '類型:', type);
            
            // 檢查環境
            const isGitHubPages = window.location.href.includes('github.io');
            if (isGitHubPages) {
                console.log('檢測到GitHub Pages環境，使用優化的數據加載策略');
            }
            
            // 確保數據已完全加載
            const searchPromise = (BookData.jsonBooks.length === 0) 
                ? BookData.loadBooksFromJSON().then(data => {
                    console.log('數據重新加載完成，加載了', data.length, '本書籍');
                    return BookData.searchBooks(query, type);
                  })
                : Promise.resolve(BookData.searchBooks(query, type));
            
            searchPromise.then(results => {
                console.log('搜索結果數量:', results.length);
                displaySearchResults(results);
                
                // 如果在GitHub Pages環境中成功搜索，添加提示
                if (isGitHubPages && results.length > 0) {
                    const successNote = document.createElement('div');
                    successNote.className = 'search-success-note';
                    successNote.innerHTML = '<small>數據加載成功！</small>';
                    searchResults.appendChild(successNote);
                }
            }).catch(error => {
                console.error('搜索或加載數據時發生錯誤:', error);
                // 顯示更詳細的錯誤信息
                const errorMessage = error.message || '未知錯誤';
                searchResults.innerHTML = `
                    <div class="error-message">
                        <p class="no-results"><i class="fas fa-exclamation-triangle"></i> 搜索過程中發生錯誤：</p>
                        <p class="error-details">${errorMessage}</p>
                        <p>可能原因：</p>
                        <ul>
                            <li>無法加載書籍數據文件</li>
                            <li>數據格式不正確</li>
                            <li>網絡連接問題</li>
                        </ul>
                        <p>如果您在GitHub Pages上瀏覽，請確保data/books.json文件已正確上傳。</p>
                    </div>
                `;
            });
        } catch (error) {
            console.error('搜索過程中發生錯誤:', error);
            searchResults.innerHTML = '<p class="no-results"><i class="fas fa-exclamation-circle"></i> 搜索過程中發生錯誤，請稍後再試</p>';
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
                    <p><strong>位置：</strong>櫃號 ${book.cabinet || '未知'}, 行號 ${book.row || '未知'}</p>
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
        
        // 安全地處理文本，防止XSS攻擊
        import { escapeHtml } from './security.js';

        // 防抖函数
        function debounce(func, delay) {
            let timeoutId;
            return function(...args) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                }, delay);
            };
        }

        // 增强错误处理
        function handleError(error) {
            console.error('Error:', error);
            alert(`加载数据失败: ${error.message || '未知错误'}`);
            return null;
        }
        
        let html = `
            <h2>${escapeHtml(book.title)}</h2>
            <div class="book-detail-content">
                <p><strong>作者：</strong>${escapeHtml(book.author)}</p>
                ${book.series ? `<p><strong>集數：</strong>${escapeHtml(book.series)}</p>` : ''}
                <p><strong>位置：</strong>櫃號 ${escapeHtml(book.cabinet || '未知')}, 行號 ${escapeHtml(book.row || '未知')}</p>
                <p><strong>出版社：</strong>${escapeHtml(book.publisher || '未知')}</p>
                <p><strong>ISBN號：</strong>${escapeHtml(book.isbn || '未知')}</p>
                ${book.description ? `<p><strong>描述：</strong>${escapeHtml(book.description)}</p>` : ''}
                ${book.notes ? `<p><strong>備註：</strong>${escapeHtml(book.notes)}</p>` : ''}
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
        
        // 使用UserManager進行登錄驗證
        if (window.UserManager) {
            const result = UserManager.validateLogin(username, password);
            if (result.success) {
                // 跳轉到管理頁面
                window.location.href = 'admin.html';
            } else {
                alert(result.message || '帳號或密碼錯誤');
            }
        } else {
            // 向下兼容：使用BookData進行驗證
            if (BookData.validateAdmin(username, password)) {
                // 設置登入狀態
                localStorage.setItem('isLoggedIn', 'true');
                
                // 跳轉到管理頁面
                window.location.href = 'admin.html';
            } else {
                alert('帳號或密碼錯誤！');
            }
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