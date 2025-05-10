document.addEventListener('DOMContentLoaded', () => {
    const bookList = document.getElementById('bookList');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const adminControls = document.getElementById('adminControls');
    const addBookBtn = document.getElementById('addBookBtn');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const importFile = document.getElementById('importFile');
    const importBtn = document.getElementById('importBtn');
    const backupGithubBtn = document.getElementById('backupGithubBtn'); // GitHub備份功能較複雜，暫時註釋 -> const backupGithubBtn = document.getElementById('backupGithubBtn');

    const bookModal = document.getElementById('bookModal');
    const adminLoginModal = document.getElementById('adminLoginModal');
    const githubBackupModal = document.getElementById('githubBackupModal'); // 新增：提前聲明 githubBackupModal
    const closeModalBtns = document.querySelectorAll('.close-btn, .close-login-btn');
    const bookForm = document.getElementById('bookForm');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const modalTitle = document.getElementById('modalTitle');
    const saveBookBtn = document.getElementById('saveBookBtn');

    let books = JSON.parse(localStorage.getItem('books')) || [
        { id: 1, title: 'JavaScript DOM編程藝術', author: 'Jeremy Keith', isbn: '9787115176050', category: '編程', location: '書架A-1', description: '學習DOM操作的經典書籍' },
        { id: 2, title: 'CSS權威指南', author: 'Eric A. Meyer', isbn: '9787115506836', category: '網頁設計', location: '書架B-3', description: '深入理解CSS的必讀之作' },
        { id: 3, title: '深入淺出Node.js', author: '朴靈', isbn: '9787115335500', category: '後端開發', location: '書架C-5', description: 'Node.js入門與進階' }
    ];
    let isAdminLoggedIn = false;
    let editingBookId = null;

    // --- 渲染書籍列表 ---
    function renderBooks(filteredBooks = books) {
        bookList.innerHTML = '';
        if (filteredBooks.length === 0) {
            bookList.innerHTML = '<p>沒有找到相關書籍。</p>';
            return;
        }
        filteredBooks.forEach(book => {
            const bookCard = document.createElement('div');
            bookCard.classList.add('book-card');
            bookCard.innerHTML = `
                <h3>${book.title}</h3>
                <p><strong>作者:</strong> ${book.author}</p>
                <p><strong>ISBN:</strong> ${book.isbn}</p>
                <p><strong>類別:</strong> ${book.category}</p>
                <p><strong>位置:</strong> ${book.location || '未指定'}</p>
                <p><strong>描述:</strong> ${book.description || '無'}</p>
                ${isAdminLoggedIn ? `
                    <div class="actions">
                        <button class="edit-btn" data-id="${book.id}">編輯</button>
                        <button class="delete-btn" data-id="${book.id}">刪除</button>
                    </div>
                ` : ''}
            `;
            bookList.appendChild(bookCard);
        });
        updateAdminActions();
    }

    // --- 更新類別過濾器選項 ---
    function updateCategoryFilter() {
        const categories = [...new Set(books.map(book => book.category))];
        categoryFilter.innerHTML = '<option value="all">所有類別</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }

    // --- 搜索和過濾 ---
    function filterAndSearchBooks() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategory = categoryFilter.value;

        const filteredBooks = books.filter(book => {
            const matchesSearch = book.title.toLowerCase().includes(searchTerm) ||
                                  book.author.toLowerCase().includes(searchTerm) ||
                                  book.isbn.toLowerCase().includes(searchTerm);
            const matchesCategory = selectedCategory === 'all' || book.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
        renderBooks(filteredBooks);
    }

    searchInput.addEventListener('input', filterAndSearchBooks);
    categoryFilter.addEventListener('change', filterAndSearchBooks);

    // --- 管理員登入 ---
    adminLoginBtn.addEventListener('click', () => {
        adminLoginModal.style.display = 'block';
    });

    adminLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = adminLoginForm.username.value;
        const password = adminLoginForm.password.value;
        // 簡單的憑證檢查
        if (username === 'admin' && password === 'admin123') {
            isAdminLoggedIn = true;
            adminControls.style.display = 'block';
            adminLoginBtn.textContent = '管理員已登入';
            adminLoginBtn.disabled = true;
            adminLoginModal.style.display = 'none';
            renderBooks(); // 重新渲染以顯示管理按鈕
        } else {
            alert('用戶名或密碼錯誤！');
        }
    });

    // --- 彈窗控制 ---
    closeModalBtns.forEach(btn => {
        btn.onclick = function() {
            bookModal.style.display = 'none';
            adminLoginModal.style.display = 'none';
        }
    });

    window.onclick = function(event) {
        if (event.target == bookModal) {
            bookModal.style.display = 'none';
        } else if (event.target == adminLoginModal) {
            adminLoginModal.style.display = 'none';
        } else if (event.target == githubBackupModal) { // 修改：增加對 githubBackupModal 的處理
            githubBackupModal.style.display = 'none';
        }
    }

    // --- 新增/編輯書籍 ---
    addBookBtn.addEventListener('click', () => {
        editingBookId = null;
        modalTitle.textContent = '新增書籍';
        bookForm.reset();
        bookModal.style.display = 'block';
    });

    bookForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const bookData = {
            id: editingBookId || Date.now(), // 如果是編輯則使用現有ID，否則生成新ID
            title: bookForm.title.value,
            author: bookForm.author.value,
            isbn: bookForm.isbn.value,
            category: bookForm.category.value,
            location: bookForm.location.value,
            description: bookForm.description.value,
        };

        if (editingBookId) {
            // 編輯書籍
            books = books.map(book => book.id === editingBookId ? bookData : book);
        } else {
            // 新增書籍
            books.push(bookData);
        }
        saveBooksToLocalStorage();
        renderBooks();
        updateCategoryFilter();
        bookModal.style.display = 'none';
    });

    // --- 編輯和刪除書籍 (事件代理) ---
    function updateAdminActions() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.onclick = (e) => {
                if (!isAdminLoggedIn) return;
                editingBookId = parseInt(e.target.dataset.id);
                const bookToEdit = books.find(book => book.id === editingBookId);
                if (bookToEdit) {
                    modalTitle.textContent = '編輯書籍';
                    bookForm.bookId.value = bookToEdit.id;
                    bookForm.title.value = bookToEdit.title;
                    bookForm.author.value = bookToEdit.author;
                    bookForm.isbn.value = bookToEdit.isbn;
                    bookForm.category.value = bookToEdit.category;
                    bookForm.location.value = bookToEdit.location || '';
                    bookForm.description.value = bookToEdit.description || '';
                    bookModal.style.display = 'block';
                }
            };
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = (e) => {
                if (!isAdminLoggedIn) return;
                if (confirm('確定要刪除這本書嗎？')) {
                    const bookIdToDelete = parseInt(e.target.dataset.id);
                    books = books.filter(book => book.id !== bookIdToDelete);
                    saveBooksToLocalStorage();
                    renderBooks();
                    updateCategoryFilter();
                }
            };
        });
    }

    // --- 數據持久化 ---
    function saveBooksToLocalStorage() {
        localStorage.setItem('books', JSON.stringify(books));
    }

    // --- 數據導出 ---
    exportJsonBtn.addEventListener('click', () => {
        if (!isAdminLoggedIn) return alert('請先登入管理員帳號');
        const dataStr = JSON.stringify(books, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = 'books_export.json';
        let linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    });

    exportExcelBtn.addEventListener('click', () => {
        if (!isAdminLoggedIn) return alert('請先登入管理員帳號');
        if (typeof XLSX === 'undefined') {
            alert('Excel導出功能需要XLSX庫，請確保已正確引入。');
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(books);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Books');
        XLSX.writeFile(workbook, 'books_export.xlsx');
    });

    // --- 數據導入 ---
    importBtn.addEventListener('click', () => {
        if (!isAdminLoggedIn) return alert('請先登入管理員帳號');
        if (!importFile.files || importFile.files.length === 0) {
            alert('請選擇要導入的文件。');
            return;
        }
        const file = importFile.files[0];
        const reader = new FileReader();

        reader.onload = function(event) {
            try {
                let importedBooks = [];
                if (file.name.endsWith('.json')) {
                    importedBooks = JSON.parse(event.target.result);
                } else if (file.name.endsWith('.xlsx')) {
                    if (typeof XLSX === 'undefined') {
                        alert('Excel導入功能需要XLSX庫。');
                        return;
                    }
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, {type: 'array'});
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    importedBooks = XLSX.utils.sheet_to_json(worksheet);
                } else {
                    alert('不支持的文件格式。請選擇 JSON 或 Excel 文件。');
                    return;
                }

                if (!Array.isArray(importedBooks)) {
                    alert('導入的數據格式不正確。');
                    return;
                }

                // 過濾重複數據 (基於ISBN)
                const existingIsbns = new Set(books.map(b => b.isbn));
                const newBooks = importedBooks.filter(ib => ib.isbn && !existingIsbns.has(ib.isbn));
                
                // 為新書生成ID (如果導入數據中沒有)
                newBooks.forEach(nb => {
                    if (!nb.id) nb.id = Date.now() + Math.random(); // 確保ID唯一性
                });

                books = [...books, ...newBooks];
                saveBooksToLocalStorage();
                renderBooks();
                updateCategoryFilter();
                alert(`成功導入 ${newBooks.length} 本新書籍。過濾掉 ${importedBooks.length - newBooks.length} 本重複或無效書籍。`);
                importFile.value = ''; // 清空文件選擇
            } catch (error) {
                console.error('導入錯誤:', error);
                alert('導入文件失敗，請檢查文件格式和內容。');
            }
        };

        if (file.name.endsWith('.json')) {
            reader.readAsText(file);
        } else if (file.name.endsWith('.xlsx')) {
            reader.readAsArrayBuffer(file);
        }
    });

    // --- GitHub 備份 (佔位符，實際實現需要後端或更複雜的前端OAuth流程) ---
    // backupGithubBtn.addEventListener('click', () => {
    //     if (!isAdminLoggedIn) return alert('請先登入管理員帳號');
    //     alert('GitHub備份功能需要配置個人訪問令牌和倉庫信息，此為演示項目，暫未完整實現。');
    //     // 實際實現會涉及調用GitHub API
    // });

// GitHub 備份相關 DOM 元素
const backupGithubBtn = document.getElementById('backupGithubBtn');
// const githubBackupModal = document.getElementById('githubBackupModal'); // 移除：聲明已移至文件頂部
const closeGithubBackupBtn = githubBackupModal.querySelector('.close-github-backup-btn');
const githubBackupForm = document.getElementById('githubBackupForm');
const githubTokenInput = document.getElementById('githubToken');
const githubOwnerInput = document.getElementById('githubOwner');
const githubRepoInput = document.getElementById('githubRepo');
const githubBranchInput = document.getElementById('githubBranch');
const githubFilePathInput = document.getElementById('githubFilePath');

// 初始化應用
loadBooksFromLocalStorage();
renderBooks();
updateCategoryFilter();
initAdminControls();
initGithubBackupControls();

function initGithubBackupControls() {
    if (backupGithubBtn) {
        backupGithubBtn.addEventListener('click', () => {
            githubBackupModal.style.display = 'block';
        });
    }

    if (closeGithubBackupBtn) {
        closeGithubBackupBtn.addEventListener('click', () => {
            githubBackupModal.style.display = 'none';
        });
    }

    if (githubBackupForm) {
        githubBackupForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const token = githubTokenInput.value.trim();
            const owner = githubOwnerInput.value.trim();
            const repo = githubRepoInput.value.trim();
            const branch = githubBranchInput.value.trim() || 'main'; // 默認為 main 分支
            const filePath = githubFilePathInput.value.trim() || 'books_backup.json'; // 默認文件路徑

            if (!token || !owner || !repo) {
                alert('請填寫 GitHub 令牌、倉庫所有者和倉庫名稱。');
                return;
            }

            await backupToGithub(token, owner, repo, branch, filePath);
        });
    }
}

async function backupToGithub(token, owner, repo, branch, filePath) {
    const booksData = localStorage.getItem('books');
    if (!booksData) {
        alert('沒有書籍數據可備份。');
        return;
    }

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(JSON.parse(booksData), null, 2)))); // 編碼為 base64
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    try {
        // 首先嘗試獲取文件 SHA (如果文件已存在)
        let sha = null;
        try {
            const getFileResponse = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (getFileResponse.ok) {
                const fileData = await getFileResponse.json();
                sha = fileData.sha;
            }
        } catch (e) {
            // 文件不存在，忽略錯誤，sha 將為 null
            console.info('File does not exist, creating new one.');
        }

        const body = {
            message: `Backup books data on ${new Date().toISOString()}`,
            content: content,
            branch: branch
        };
        if (sha) {
            body.sha = sha; // 如果文件存在，則提供 SHA 以更新文件
        }

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            alert('數據成功備份到 GitHub！');
            githubBackupModal.style.display = 'none';
            githubBackupForm.reset();
        } else {
            const errorData = await response.json();
            console.error('GitHub API 錯誤:', errorData);
            alert(`備份失敗: ${errorData.message || response.statusText}`);
        }
    } catch (error) {
        console.error('備份到 GitHub 時發生錯誤:', error);
        alert('備份到 GitHub 時發生錯誤，請檢查控制台獲取更多信息。');
    }
}
});