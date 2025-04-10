document.addEventListener('DOMContentLoaded', function() {
    // 獲取DOM元素
    const loginModal = document.getElementById('login-modal');
    const adminPassword = document.getElementById('admin-password');
    const loginBtn = document.getElementById('login-btn');
    const loginError = document.getElementById('login-error');
    const adminInterface = document.getElementById('admin-interface');
    const logoutBtn = document.getElementById('logout-btn');
    
    const addBookBtn = document.getElementById('add-book-btn');
    const importBtn = document.getElementById('import-btn');
    const exportBtn = document.getElementById('export-btn');
    const backupBtn = document.getElementById('backup-btn');
    const fileInput = document.getElementById('file-input');
    
    const editorForm = document.getElementById('editor-form');
    const editorTitle = document.getElementById('editor-title');
    const editTitle = document.getElementById('edit-title');
    const editAuthor = document.getElementById('edit-author');
    const editVolume = document.getElementById('edit-volume');
    const editCategory = document.getElementById('edit-category');
    const editCabinet = document.getElementById('edit-cabinet');
    const editRow = document.getElementById('edit-row');
    const editPublisher = document.getElementById('edit-publisher');
    const editDescription = document.getElementById('edit-description');
    const editIsbn = document.getElementById('edit-isbn');
    const editNotes = document.getElementById('edit-notes');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const saveBookBtn = document.getElementById('save-book-btn');
    
    const adminSearch = document.getElementById('admin-search');
    const adminFilterCategory = document.getElementById('admin-filter-category');
    const adminBookList = document.getElementById('admin-book-list');
    
    const backupFrequency = document.getElementById('backup-frequency');
    const backupEmail = document.getElementById('backup-email');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    
    // 書籍數據和當前編輯狀態
    let books = [];
    let currentBookId = null;
    let isEditing = false;
    
    // 管理員密碼 (在實際應用中應該使用更安全的方式)
    const ADMIN_PASSWORD = 'admin123'; // 請在部署前更改
    
    // 初始化
    checkLogin();
    loadBooks();
    loadSettings();
    
    // 檢查登錄狀態
    function checkLogin() {
        const isLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
        if (isLoggedIn) {
            loginModal.style.display = 'none';
            adminInterface.classList.remove('hidden');
        } else {
            loginModal.style.display = 'flex';
            adminInterface.classList.add('hidden');
        }
    }
    
    // 加載書籍數據
    function loadBooks() {
        fetch('data/books.json')
            .then(response => response.json())
            .then(data => {
                books = data;
                renderBookList();
            })
            .catch(error => {
                console.error('加載書籍數據失敗:', error);
                adminBookList.innerHTML = '<p class="error-message">無法加載書籍數據，請稍後再試。</p>';
            });
    }
    
    // 加載設置
    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem('adminSettings') || {};
        backupFrequency.value = settings.backupFrequency || 'disabled';
        backupEmail.value = settings.backupEmail || '';
    }
    
    // 保存設置
    function saveSettings() {
        const settings = {
            backupFrequency: backupFrequency.value,
            backupEmail: backupEmail.value
        };
        localStorage.setItem('adminSettings', JSON.stringify(settings));
        alert('設置已保存');
    }
    
    // 渲染書籍列表
    function renderBookList() {
        adminBookList.innerHTML = '';
        
        const query = adminSearch.value.toLowerCase();
        const category = adminFilterCategory.value;
        
        const filteredBooks = books.filter(book => {
            const matchesQuery = 
                book.title.toLowerCase().includes(query) || 
                book.author.toLowerCase().includes(query) || 
                (book.isbn && book.isbn.includes(query));
            
            const matchesCategory = category === 'all' || book.category === category;
            
            return matchesQuery && matchesCategory;
        });
        
        if (filteredBooks.length === 0) {
            adminBookList.innerHTML = '<p>沒有找到匹配的書籍。</p>';
            return;
        }
        
        filteredBooks.forEach(book => {
            const bookItem = document.createElement('div');
            bookItem.className = 'admin-book-item';
            
            bookItem.innerHTML = `
                <div class="book-item-info">
                    <h4>${book.title}</h4>
                    <p>${book.author} | ${getCategoryName(book.category)} ${book.volume ? `| 第${book.volume}集` : ''}</p>
                </div>
                <div class="book-item-actions">
                    <button class="edit-btn" data-id="${book.id}">編輯</button>
                    <button class="delete-btn" data-id="${book.id}">刪除</button>
                </div>
            `;
            
            adminBookList.appendChild(bookItem);
        });
        
        // 添加編輯和刪除按鈕的事件監聽器
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const bookId = this.getAttribute('data-id');
                editBook(bookId);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const bookId = this.getAttribute('data-id');
                deleteBook(bookId);
            });
        });
    }
    
    // 獲取類別名稱
    function getCategoryName(category) {
        const categories = {
            'fiction': '小說',
            'non-fiction': '非小說',
            'science': '科學',
            'history': '歷史',
            'other': '其他'
        };
        return categories[category] || category;
    }
    
    // 新增書籍
    function addBook() {
        isEditing = false;
        currentBookId = null;
        editorTitle.textContent = '新增書籍';
        
        // 清空表單
        editTitle.value = '';
        editAuthor.value = '';
        editVolume.value = '';
        editCategory.value = 'fiction';
        editCabinet.value = '';
        editRow.value = '';
        editPublisher.value = '';
        editDescription.value = '';
        editIsbn.value = '';
        editNotes.value = '';
        
        editorForm.classList.remove('hidden');
    }
    
    // 編輯書籍
    function editBook(bookId) {
        isEditing = true;
        currentBookId = bookId;
        editorTitle.textContent = '編輯書籍';
        
        const book = books.find(b => b.id === bookId);
        if (!book) return;
        
        // 填充表單
        editTitle.value = book.title;
        editAuthor.value = book.author;
        editVolume.value = book.volume || '';
        editCategory.value = book.category || 'fiction';
        editCabinet.value = book.cabinet || '';
        editRow.value = book.row || '';
        editPublisher.value = book.publisher || '';
        editDescription.value = book.description || '';
        editIsbn.value = book.isbn || '';
        editNotes.value = book.notes || '';
        
        editorForm.classList.remove('hidden');
    }
    
    // 保存書籍
    function saveBook() {
        // 驗證必填字段
        if (!editTitle.value.trim() || !editAuthor.value.trim()) {
            alert('書名和作者是必填字段');
            return;
        }
        
        const bookData = {
            title: editTitle.value.trim(),
            author: editAuthor.value.trim(),
            volume: editVolume.value.trim() || undefined,
            category: editCategory.value,
            cabinet: editCabinet.value.trim() || undefined,
            row: editRow.value.trim() || undefined,
            publisher: editPublisher.value.trim() || undefined,
            description: editDescription.value.trim() || undefined,
            isbn: editIsbn.value.trim() || undefined,
            notes: editNotes.value.trim() || undefined
        };
        
        if (isEditing) {
            // 更新現有書籍
            const index = books.findIndex(b => b.id === currentBookId);
            if (index !== -1) {
                books[index] = { ...books[index], ...bookData };
            }
        } else {
            // 新增書籍
            const newBook = {
                id: generateId(),
                ...bookData
            };
            books.push(newBook);
        }
        
        // 保存到數據庫
        saveBooksToDatabase();
        
        // 關閉編輯器並刷新列表
        editorForm.classList.add('hidden');
        renderBookList();
    }
    
    // 刪除書籍
    function deleteBook(bookId) {
        if (!confirm('確定要刪除這本書嗎？此操作無法撤銷。')) {
            return;
        }
        
        books = books.filter(book => book.id !== bookId);
        saveBooksToDatabase();
        renderBookList();
    }
    
    // 生成ID
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // 保存書籍到數據庫
    function saveBooksToDatabase() {
        // 這裡需要實現實際的保存邏輯
        // 由於GitHub Pages是靜態的，我們無法直接保存
        // 這只是一個模擬實現
        console.log('書籍數據已更新', books);
        alert('由於GitHub Pages的限制，實際數據無法保存。在實際應用中，這裡應該將數據保存到服務器。');
    }
    
    // 導入數據
    function importData() {
        fileInput.click();
    }
    
    // 處理文件導入
    function handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // 假設第一個工作表是我們需要的
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            if (jsonData.length === 0) {
                alert('文件中沒有數據');
                return;
            }
            
            // 轉換為我們的書籍格式
            const importedBooks = jsonData.map(item => {
                return {
                    id: generateId(),
                    title: item['書名'] || '',
                    author: item['作者'] || '',
                    volume: item['集數'] || undefined,
                    category: mapCategory(item['類別']),
                    cabinet: item['櫃號'] || undefined,
                    row: item['行號'] || undefined,
                    publisher: item['出版社'] || undefined,
                    description: item['描述'] || undefined,
                    isbn: item['ISBN號'] || undefined,
                    notes: item['備註'] || undefined
                };
            });
            
            // 過濾重複的ISBN (如果有的話)
            const uniqueBooks = filterDuplicateBooks(importedBooks);
            
            // 添加到現有書籍
            books = [...books, ...uniqueBooks];
            saveBooksToDatabase();
            renderBookList();
            alert(`成功導入 ${uniqueBooks.length} 本書籍`);
        };
        
        reader.readAsArrayBuffer(file);
    }
    
    // 映射類別
    function mapCategory(category) {
        if (!category) return 'other';
        
        const categoryMap = {
            '小說': 'fiction',
            '非小說': 'non-fiction',
            '科學': 'science',
            '歷史': 'history'
        };
        
        return categoryMap[category] || 'other';
    }
    
    // 過濾重複書籍 (基於ISBN)
    function filterDuplicateBooks(newBooks) {
        const existingIsbns = books.map(book => book.isbn).filter(isbn => isbn);
        return newBooks.filter(book => {
            if (!book.isbn) return true;
            return !existingIsbns.includes(book.isbn);
        });
    }
    
    // 導出數據
    function exportData() {
        if (books.length === 0) {
            alert('沒有數據可導出');
            return;
        }
        
        // 準備數據
        const exportData = books.map(book => ({
            '書名': book.title,
            '作者': book.author,
            '集數': book.volume || '',
            '類別': getCategoryName(book.category),
            '櫃號': book.cabinet || '',
            '行號': book.row || '',
            '出版社': book.publisher || '',
            '描述': book.description || '',
            'ISBN號': book.isbn || '',
            '備註': book.notes || ''
        }));
        
        // 創建工作表
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '書籍數據');
        
        // 導出文件
        XLSX.writeFile(workbook, `書籍數據_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
    
    // 備份數據
    function backupData() {
        // 在實際應用中，這裡應該將數據發送到服務器進行備份
        // 由於GitHub Pages的限制，我們只能模擬這個功能
        const backupData = {
            date: new Date().toISOString(),
            books: books
        };
        
        const settings = JSON.parse(localStorage.getItem('adminSettings') || {};
        const email = settings.backupEmail;
        
        if (email) {
            console.log('將備份發送到:', email);
            console.log('備份數據:', backupData);
            alert(`備份已創建，將發送到 ${email} (模擬)`);
        } else {
            console.log('創建本地備份:', backupData);
            alert('備份已創建 (模擬)');
        }
    }
    
    // 事件監聽器
    loginBtn.addEventListener('click', function() {
        if (adminPassword.value === ADMIN_PASSWORD) {
            localStorage.setItem('adminLoggedIn', 'true');
            loginModal.style.display = 'none';
            adminInterface.classList.remove('hidden');
        } else {
            loginError.textContent = '密碼錯誤';
        }
    });
    
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('adminLoggedIn');
        checkLogin();
    });
    
    addBookBtn.addEventListener('click', addBook);
    importBtn.addEventListener('click', importData);
    exportBtn.addEventListener('click', exportData);
    backupBtn.addEventListener('click', backupData);
    fileInput.addEventListener('change', handleFileImport);
    
    cancelEditBtn.addEventListener('click', function() {
        editorForm.classList.add('hidden');
    });
    
    saveBookBtn.addEventListener('click', saveBook);
    
    adminSearch.addEventListener('input', renderBookList);
    adminFilterCategory.addEventListener('change', renderBookList);
    
    saveSettingsBtn.addEventListener('click', saveSettings);
});