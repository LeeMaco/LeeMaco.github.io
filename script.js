document.addEventListener('DOMContentLoaded', () => {
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const adminLoginModal = document.getElementById('adminLoginModal');
    const closeLoginBtn = adminLoginModal.querySelector('.close-login-btn');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminPanel = document.getElementById('admin-panel');
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');

    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const searchBtn = document.getElementById('searchBtn');
    const bookListDiv = document.getElementById('bookList');

    const addBookBtn = document.getElementById('addBookBtn');
    const bookFormModal = document.getElementById('bookFormModal');
    const closeFormBtn = bookFormModal.querySelector('.close-form-btn');
    const bookForm = document.getElementById('bookForm');
    const formTitle = document.getElementById('formTitle');
    const bookIdInput = document.getElementById('bookId');
    const titleInput = document.getElementById('title');
    const authorInput = document.getElementById('author');
    const categoryInput = document.getElementById('category');
    const isbnInput = document.getElementById('isbn');
    const locationInput = document.getElementById('location');
    const descriptionInput = document.getElementById('description');

    const bookDetailModal = document.getElementById('bookDetailModal');
    const closeDetailBtn = bookDetailModal.querySelector('.close-btn');

    const exportDataBtn = document.getElementById('exportDataBtn');
    const importFileIn = document.getElementById('importFile');
    const importDataBtn = document.getElementById('importDataBtn');
    const backupDataBtn = document.getElementById('backupDataBtn');

    let books = JSON.parse(localStorage.getItem('books')) || [];
    let isAdminLoggedIn = false;
    let editingBookId = null;

    // --- Helper Functions ---
    function saveBooks() {
        localStorage.setItem('books', JSON.stringify(books));
    }

    function generateId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    function displayBooks(filteredBooks = books) {
        bookListDiv.innerHTML = '';
        if (filteredBooks.length === 0) {
            bookListDiv.innerHTML = '<p>沒有找到書籍。</p>';
            return;
        }
        filteredBooks.forEach(book => {
            const bookCard = document.createElement('div');
            bookCard.classList.add('book-card');
            bookCard.innerHTML = `
                <h3>${book.title}</h3>
                <p>作者: ${book.author}</p>
                <p>類別: ${book.category}</p>
                <button class="view-details-btn" data-id="${book.id}">查看詳情</button>
                ${isAdminLoggedIn ? `
                    <button class="edit-book-btn" data-id="${book.id}">編輯</button>
                    <button class="delete-book-btn" data-id="${book.id}">刪除</button>
                ` : ''}
            `;
            bookListDiv.appendChild(bookCard);
        });
        addBookCardEventListeners();
    }

    function populateCategories() {
        const categories = [...new Set(books.map(book => book.category))];
        categoryFilter.innerHTML = '<option value="all">所有類別</option>'; // Reset
        categories.forEach(category => {
            if (category) { // Ensure category is not empty
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            }
        });
    }

    function showModal(modal) {
        modal.classList.remove('hidden');
    }

    function hideModal(modal) {
        modal.classList.add('hidden');
    }

    function clearForm() {
        bookForm.reset();
        bookIdInput.value = '';
        editingBookId = null;
        formTitle.textContent = '新增書籍';
    }

    // --- Event Listeners ---
    adminLoginBtn.addEventListener('click', () => showModal(adminLoginModal));
    closeLoginBtn.addEventListener('click', () => hideModal(adminLoginModal));

    adminLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = adminLoginForm.username.value;
        const password = adminLoginForm.password.value;
        if (username === 'admin' && password === '26221160') {
            isAdminLoggedIn = true;
            adminPanel.classList.remove('hidden');
            adminLoginBtn.classList.add('hidden');
            hideModal(adminLoginModal);
            displayBooks(); // Refresh book list to show admin buttons
            alert('管理員登入成功！');
        } else {
            alert('用戶名或密碼錯誤！');
        }
    });

    adminLogoutBtn.addEventListener('click', () => {
        isAdminLoggedIn = false;
        adminPanel.classList.add('hidden');
        adminLoginBtn.classList.remove('hidden');
        displayBooks(); // Refresh book list to hide admin buttons
        alert('已登出管理員帳戶。');
    });

    searchBtn.addEventListener('click', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategory = categoryFilter.value;

        const filteredBooks = books.filter(book => {
            const matchesSearchTerm = book.title.toLowerCase().includes(searchTerm) || 
                                      book.author.toLowerCase().includes(searchTerm);
            const matchesCategory = selectedCategory === 'all' || book.category === selectedCategory;
            return matchesSearchTerm && matchesCategory;
        });
        displayBooks(filteredBooks);
    });

    addBookBtn.addEventListener('click', () => {
        clearForm();
        formTitle.textContent = '新增書籍';
        showModal(bookFormModal);
    });

    closeFormBtn.addEventListener('click', () => {
        hideModal(bookFormModal);
        clearForm();
    });

    bookForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const bookData = {
            id: bookIdInput.value || generateId(),
            title: titleInput.value,
            author: authorInput.value,
            category: categoryInput.value,
            isbn: isbnInput.value,
            location: locationInput.value,
            description: descriptionInput.value,
        };

        if (editingBookId) {
            const index = books.findIndex(book => book.id === editingBookId);
            if (index !== -1) {
                books[index] = bookData;
            }
        } else {
            books.push(bookData);
        }
        saveBooks();
        displayBooks();
        populateCategories();
        hideModal(bookFormModal);
        clearForm();
        alert(editingBookId ? '書籍更新成功！' : '書籍新增成功！');
    });

    function addBookCardEventListeners() {
        document.querySelectorAll('.view-details-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const bookId = e.target.dataset.id;
                const book = books.find(b => b.id === bookId);
                if (book) {
                    document.getElementById('modalBookTitle').textContent = book.title;
                    document.getElementById('modalBookAuthor').textContent = book.author;
                    document.getElementById('modalBookCategory').textContent = book.category;
                    document.getElementById('modalBookIsbn').textContent = book.isbn || 'N/A';
                    document.getElementById('modalBookLocation').textContent = book.location || 'N/A';
                    document.getElementById('modalBookDescription').textContent = book.description || 'N/A';
                    showModal(bookDetailModal);
                }
            });
        });

        if (isAdminLoggedIn) {
            document.querySelectorAll('.edit-book-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const bookId = e.target.dataset.id;
                    const book = books.find(b => b.id === bookId);
                    if (book) {
                        editingBookId = book.id;
                        formTitle.textContent = '編輯書籍';
                        bookIdInput.value = book.id;
                        titleInput.value = book.title;
                        authorInput.value = book.author;
                        categoryInput.value = book.category;
                        isbnInput.value = book.isbn || '';
                        locationInput.value = book.location || '';
                        descriptionInput.value = book.description || '';
                        showModal(bookFormModal);
                    }
                });
            });

            document.querySelectorAll('.delete-book-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const bookId = e.target.dataset.id;
                    if (confirm('確定要刪除這本書嗎？')) {
                        books = books.filter(book => book.id !== bookId);
                        saveBooks();
                        displayBooks();
                        populateCategories();
                        alert('書籍刪除成功！');
                    }
                });
            });
        }
    }

    closeDetailBtn.addEventListener('click', () => hideModal(bookDetailModal));

    // --- Data Import/Export ---
    exportDataBtn.addEventListener('click', () => {
        if (books.length === 0) {
            alert('沒有書籍數據可導出。');
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(books);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Books');
        XLSX.writeFile(workbook, '書籍數據.xlsx');
        alert('數據導出成功！');
    });

    importDataBtn.addEventListener('click', () => {
        const file = importFileIn.files[0];
        if (!file) {
            alert('請選擇要導入的 Excel 文件。');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const importedBooks = XLSX.utils.sheet_to_json(worksheet);

                let newBooksCount = 0;
                let duplicateCount = 0;

                importedBooks.forEach(importedBook => {
                    // Basic validation: check for title and author
                    if (!importedBook.title || !importedBook.author) {
                        console.warn('Skipping book due to missing title or author:', importedBook);
                        return; // Skip if essential data is missing
                    }

                    const existingBook = books.find(book => 
                        book.title.toLowerCase() === importedBook.title.toLowerCase() && 
                        book.author.toLowerCase() === importedBook.author.toLowerCase()
                    );

                    if (existingBook) {
                        duplicateCount++;
                        // Optionally, update existing book data here if needed
                        // For now, we just count duplicates as per requirement "自動過濾重複資料"
                    } else {
                        const newBook = {
                            id: generateId(),
                            title: importedBook.title,
                            author: importedBook.author,
                            category: importedBook.category || '未分類',
                            isbn: importedBook.isbn || '',
                            location: importedBook.location || '',
                            description: importedBook.description || ''
                        };
                        books.push(newBook);
                        newBooksCount++;
                    }
                });

                saveBooks();
                displayBooks();
                populateCategories();
                importFileIn.value = ''; // Clear the file input
                alert(`數據導入完成！\n新增書籍: ${newBooksCount}\n重複書籍 (已過濾): ${duplicateCount}`);
            } catch (error) {
                console.error('導入 Excel 文件時出錯:', error);
                alert('導入失敗，請檢查文件格式或控制台錯誤信息。');
            }
        };
        reader.readAsArrayBuffer(file);
    });

    // --- GitHub Backup (Placeholder - Requires server-side or more complex client-side OAuth) ---
    backupDataBtn.addEventListener('click', () => {
        alert('GitHub 備份功能需要配置個人訪問令牌和倉庫信息，並可能需要更複雜的客戶端或服務器端實現。此處為占位符。');
        // Actual implementation would involve:
        // 1. Getting GitHub Personal Access Token (PAT) from user (securely)
        // 2. Getting repository details (owner, repo name, path)
        // 3. Using GitHub API to create or update a file (e.g., books.json)
        // Example (conceptual - DO NOT USE IN PRODUCTION WITHOUT PROPER SECURITY):
        /*
        const GITHUB_TOKEN = prompt('請輸入您的 GitHub 個人訪問令牌:');
        const GITHUB_REPO_OWNER = prompt('請輸入倉庫擁有者 (例如: your-username):');
        const GITHUB_REPO_NAME = prompt('請輸入倉庫名稱:');
        const GITHUB_FILE_PATH = prompt('請輸入備份文件路徑 (例如: data/books.json):', 'data/books.json');

        if (!GITHUB_TOKEN || !GITHUB_REPO_OWNER || !GITHUB_REPO_NAME || !GITHUB_FILE_PATH) {
            alert('備份取消，缺少必要信息。');
            return;
        }

        const contentToBackup = JSON.stringify(books, null, 2);
        const encodedContent = btoa(unescape(encodeURIComponent(contentToBackup))); // Base64 encode

        const apiUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${GITHUB_FILE_PATH}`;

        // First, try to get the file to see if it exists (to get its SHA for updating)
        fetch(apiUrl, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        })
        .then(response => {
            if (response.status === 404) { // File doesn't exist, create it
                return null;
            }
            return response.json();
        })
        .then(fileData => {
            const sha = fileData ? fileData.sha : undefined;
            const message = fileData ? '更新書籍數據備份' : '創建書籍數據備份';

            fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    content: encodedContent,
                    sha: sha // Include SHA if updating an existing file
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.content) {
                    alert('數據成功備份到 GitHub！');
                } else {
                    console.error('GitHub API 響應錯誤:', data);
                    alert(`備份失敗: ${data.message || '未知錯誤'}`);
                }
            })
            .catch(error => {
                console.error('備份到 GitHub 時出錯:', error);
                alert('備份到 GitHub 時出錯，請查看控制台。');
            });
        })
        .catch(error => {
            console.error('獲取 GitHub 文件信息時出錯:', error);
            alert('獲取 GitHub 文件信息時出錯，請查看控制台。');
        });
        */
    });

    // --- Initial Load ---
    displayBooks();
    populateCategories();
});