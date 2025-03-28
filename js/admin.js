/**
 * 書籍查詢管理系統 - 管理員頁面模塊
 * 負責處理管理員頁面的交互和功能
 */

document.addEventListener('DOMContentLoaded', function() {
    // 檢查是否已登入
    if (!localStorage.getItem('isLoggedIn')) {
        // 未登入則跳轉到首頁
        window.location.href = 'index.html';
        return;
    }
    
    // 獲取DOM元素
    const bookTableBody = document.getElementById('bookTableBody');
    const addBookBtn = document.getElementById('addBookBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const importExcelBtn = document.getElementById('importExcelBtn');
    const githubSettingsBtn = document.getElementById('githubSettingsBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const backToHomeBtn = document.getElementById('backToHomeBtn');
    const bookFormModal = document.getElementById('bookFormModal');
    const importExcelModal = document.getElementById('importExcelModal');
    const githubSettingsModal = document.getElementById('githubSettingsModal');
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const bookForm = document.getElementById('bookForm');
    const importExcelForm = document.getElementById('importExcelForm');
    const githubSettingsForm = document.getElementById('githubSettingsForm');
    const formTitle = document.getElementById('formTitle');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');}]}}],"name":"open_preview
    
    // 檢查DOM元素是否存在，如果不存在則輸出錯誤信息
    if (!importExcelModal || !importExcelForm) {
        console.error('匯入Excel相關DOM元素不存在，請檢查HTML結構');
    }
    
    // 初始化數據
    BookData.init();
    
    // 加載並顯示所有書籍
    loadBooks();
    
    // 綁定登出按鈕點擊事件
    logoutBtn.addEventListener('click', function() {
        // 清除登入狀態
        localStorage.removeItem('isLoggedIn');
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
    
    // 綁定匯入Excel表單提交事件
    importExcelForm.addEventListener('submit', function(e) {
        e.preventDefault();
        importFromExcel();
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
        
        // 保存數據
        if (bookId) {
            // 更新現有書籍
            BookData.updateBook(bookId, bookData);
        } else {
            // 添加新書籍
            BookData.addBook(bookData);
        }
        
        // 重新加載書籍列表
        loadBooks();
        
        // 關閉彈窗
        bookFormModal.style.display = 'none';
    });
    
    // 綁定編輯按鈕點擊事件（使用事件委託）
    bookTableBody.addEventListener('click', function(e) {
        if (e.target.classList.contains('edit-btn') || e.target.parentElement.classList.contains('edit-btn')) {
            const bookId = e.target.closest('tr').getAttribute('data-id');
            editBook(bookId);
        } else if (e.target.classList.contains('delete-btn') || e.target.parentElement.classList.contains('delete-btn')) {
            const bookId = e.target.closest('tr').getAttribute('data-id');
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
    
    // 加載並顯示所有書籍
    function loadBooks() {
        const books = BookData.getAllBooks();
        let html = '';
        
        books.forEach(book => {
            html += `
                <tr data-id="${book.id}">
                    <td>${book.title}</td>
                    <td>${book.author}</td>
                    <td>${book.publisher || '-'}</td>
                    <td>${book.isbn || '-'}</td>
                    <td>
                        <button class="edit-btn"><i class="fas fa-edit"></i></button>
                        <button class="delete-btn"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
        
        bookTableBody.innerHTML = html;
    }
    
    // 編輯書籍
    function editBook(bookId) {
        const book = BookData.getBookById(bookId);
        if (!book) return;
        
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
        confirmDeleteBtn.setAttribute('data-id', bookId);
        deleteConfirmModal.style.display = 'block';
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
    async function uploadToGitHub(content, fileName = 'books.json') {
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
                    const jsonContent = JSON.stringify(books, null, 2);
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