/**
 * 書籍管理系統 - 管理員功能模塊
 * 負責Excel數據導入導出和GitHub備份功能
 */

const AdminModule = {
    // GitHub API相關設置
    githubSettings: {
        token: '',
        repo: '',
        branch: 'main',
        path: 'books_data.json'
    },
    
    // 從localStorage獲取GitHub設置
    loadGithubSettings: function() {
        const settings = localStorage.getItem('githubSettings');
        if (settings) {
            this.githubSettings = JSON.parse(settings);
        }
        return this.githubSettings;
    },
    
    // 從GitHub獲取最新數據（無需認證，適用於公開倉庫）
    fetchLatestDataFromGitHub: async function(showNotification) {
        try {
            const settings = this.loadGithubSettings();
            
            // 如果未配置GitHub倉庫，使用默認設置
            if (!settings.repo) {
                console.log('未配置GitHub倉庫，使用默認公開倉庫');
                // 設置默認的公開倉庫
                settings.repo = 'bookstore-demo/library-data';
                settings.branch = 'main';
                settings.path = 'books_data.json';
            }
            
            // 使用GitHub API獲取文件內容（無需認證）
            const response = await fetch(`https://api.github.com/repos/${settings.repo}/contents/${settings.path}?ref=${settings.branch}`);
            
            if (!response.ok) {
                if (showNotification) {
                    showNotification(`無法從GitHub獲取數據: ${response.status} ${response.statusText}`, 'warning');
                }
                console.warn(`無法從GitHub獲取數據: ${response.status} ${response.statusText}`);
                return null;
            }
            
            const fileInfo = await response.json();
            
            // 解碼Base64內容
            const content = decodeURIComponent(escape(atob(fileInfo.content)));
            
            try {
                // 解析JSON數據
                const books = JSON.parse(content);
                if (showNotification) {
                    showNotification('已從GitHub獲取最新數據', 'success');
                }
                return books;
            } catch (parseError) {
                console.error('解析GitHub數據時出錯:', parseError);
                if (showNotification) {
                    showNotification('解析GitHub數據時出錯', 'error');
                }
                return null;
            }
        } catch (error) {
            console.error('從GitHub獲取數據時出錯:', error);
            if (showNotification) {
                showNotification(`從GitHub獲取數據時出錯: ${error.message}`, 'error');
            }
            return null;
        }
    },
    
    // 保存GitHub設置到localStorage
    saveGithubSettings: function(settings) {
        this.githubSettings = settings;
        localStorage.setItem('githubSettings', JSON.stringify(settings));
    },
    
    // 上傳數據到GitHub
    uploadToGitHub: async function(data, showNotification) {
        try {
            const settings = this.loadGithubSettings();
            
            if (!settings.token || !settings.repo) {
                showNotification('請先配置GitHub設置', 'error');
                return false;
            }
            
            const content = JSON.stringify(data, null, 2);
            const contentEncoded = btoa(unescape(encodeURIComponent(content)));
            
            // 檢查文件是否已存在
            let sha = null;
            try {
                const checkResponse = await fetch(`https://api.github.com/repos/${settings.repo}/contents/${settings.path}?ref=${settings.branch}`, {
                    headers: {
                        'Authorization': `token ${settings.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (checkResponse.status === 200) {
                    const fileInfo = await checkResponse.json();
                    sha = fileInfo.sha;
                }
            } catch (error) {
                console.log('文件不存在，將創建新文件');
            }
            
            // 準備請求體
            const requestBody = {
                message: `更新書籍數據 - ${new Date().toISOString()}`,
                content: contentEncoded,
                branch: settings.branch
            };
            
            // 如果文件已存在，添加sha
            if (sha) {
                requestBody.sha = sha;
            }
            
            // 發送請求
            const response = await fetch(`https://api.github.com/repos/${settings.repo}/contents/${settings.path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${settings.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (response.status === 200 || response.status === 201) {
                showNotification('數據已成功上傳到GitHub', 'success');
                return true;
            } else {
                const error = await response.json();
                showNotification(`上傳失敗: ${error.message}`, 'error');
                return false;
            }
        } catch (error) {
            console.error('上傳到GitHub時出錯:', error);
            showNotification(`上傳失敗: ${error.message}`, 'error');
            return false;
        }
    },
    
    // 保存書籍到垃圾桶
    saveToTrashBin: function(books) {
        // 從localStorage獲取垃圾桶數據，如果沒有則創建新數組
        const trashBin = localStorage.getItem('booksTrashBin') ? 
            JSON.parse(localStorage.getItem('booksTrashBin')) : [];
        
        // 為每本書添加刪除時間戳
        const booksWithTimestamp = books.map(book => ({
            ...book,
            deletedAt: new Date().toISOString()
        }));
        
        // 將新的重複書籍添加到垃圾桶
        const updatedTrashBin = [...trashBin, ...booksWithTimestamp];
        
        // 保存更新後的垃圾桶
        localStorage.setItem('booksTrashBin', JSON.stringify(updatedTrashBin));
        
        return updatedTrashBin.length;
    },
    
    // 從垃圾桶恢復書籍
    restoreFromTrashBin: function(bookId, showNotification) {
        // 獲取垃圾桶數據
        const trashBin = localStorage.getItem('booksTrashBin') ? 
            JSON.parse(localStorage.getItem('booksTrashBin')) : [];
        
        // 查找要恢復的書籍
        const bookToRestore = trashBin.find(book => book.id === bookId);
        
        if (!bookToRestore) {
            showNotification('找不到要恢復的書籍', 'error');
            return false;
        }
        
        // 從垃圾桶中移除該書籍
        const updatedTrashBin = trashBin.filter(book => book.id !== bookId);
        localStorage.setItem('booksTrashBin', JSON.stringify(updatedTrashBin));
        
        // 刪除時間戳屬性
        delete bookToRestore.deletedAt;
        
        // 獲取當前書籍數據並添加恢復的書籍
        const currentBooks = BookData.getBooks();
        currentBooks.push(bookToRestore);
        BookData.saveBooks(currentBooks);
        
        showNotification(`已成功恢復書籍: ${bookToRestore.title}`, 'success');
        return true;
    },
    
    // 獲取垃圾桶中的書籍
    getTrashBinBooks: function() {
        return localStorage.getItem('booksTrashBin') ? 
            JSON.parse(localStorage.getItem('booksTrashBin')) : [];
    },
    
    // 清空垃圾桶
    emptyTrashBin: function(showNotification) {
        localStorage.removeItem('booksTrashBin');
        showNotification('垃圾桶已清空', 'success');
        return true;
    },
    
    // 從Excel導入數據
    importFromExcel: function(file, autoUpload, showNotification) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    // 檢查文件是否為空
                    if (!e.target.result) {
                        showNotification('Excel文件為空或無法讀取', 'error');
                        resolve({ success: false, error: 'Excel文件為空或無法讀取' });
                        return;
                    }
                    
                    const data = new Uint8Array(e.target.result);
                    
                    // 嘗試讀取Excel文件
                    let workbook;
                    try {
                        workbook = XLSX.read(data, {type: 'array'});
                    } catch (readError) {
                        console.error('Excel文件讀取錯誤:', readError);
                        showNotification('Excel文件格式錯誤或損壞', 'error');
                        resolve({ success: false, error: `Excel文件讀取錯誤: ${readError.message}` });
                        return;
                    }
                    
                    // 檢查是否有工作表
                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        showNotification('Excel文件不包含任何工作表', 'error');
                        resolve({ success: false, error: 'Excel文件不包含任何工作表' });
                        return;
                    }
                    
                    // 獲取第一個工作表
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    
                    // 將工作表轉換為JSON
                    let books;
                    try {
                        books = XLSX.utils.sheet_to_json(firstSheet);
                    } catch (jsonError) {
                        console.error('Excel轉換為JSON錯誤:', jsonError);
                        showNotification('Excel數據轉換失敗', 'error');
                        resolve({ success: false, error: `Excel數據轉換失敗: ${jsonError.message}` });
                        return;
                    }
                    
                    // 檢查是否有書籍數據
                    if (!books || !Array.isArray(books) || books.length === 0) {
                        showNotification('Excel文件不包含有效的書籍數據', 'error');
                        resolve({ success: false, error: 'Excel文件不包含有效的書籍數據' });
                        return;
                    }
                    
                    // 自動映射欄位 - 處理可能的欄位名稱差異
                    books = books.map(book => {
                        // 創建一個標準化的書籍對象
                        const standardizedBook = {
                            id: Date.now().toString() + Math.floor(Math.random() * 1000),
                            title: '',
                            author: '',
                            volume: '',
                            isbn: '',
                            category: 'fiction',
                            year: new Date().getFullYear(),
                            publisher: '',
                            cabinet: '',
                            row: '',
                            location: '',
                            status: 'available',
                            description: '',
                            notes: ''
                        };
                        
                        // 遍歷Excel中的所有欄位，嘗試映射到標準欄位
                        Object.keys(book).forEach(key => {
                            const lowerKey = key.toLowerCase();
                            
                            // 標題/書名
                            if (lowerKey.includes('title') || lowerKey.includes('書名') || lowerKey.includes('名稱')) {
                                standardizedBook.title = book[key] || '';
                            }
                            // 作者
                            else if (lowerKey.includes('author') || lowerKey.includes('作者')) {
                                standardizedBook.author = book[key] || '';
                            }
                            // 卷號/冊數
                            else if (lowerKey.includes('volume') || lowerKey.includes('卷') || lowerKey.includes('冊')) {
                                standardizedBook.volume = book[key] || '';
                            }
                            // ISBN
                            else if (lowerKey.includes('isbn')) {
                                standardizedBook.isbn = book[key] ? book[key].toString() : '';
                            }
                            // 分類
                            else if (lowerKey.includes('category') || lowerKey.includes('分類')) {
                                standardizedBook.category = book[key] || 'fiction';
                            }
                            // 年份
                            else if (lowerKey.includes('year') || lowerKey.includes('年')) {
                                standardizedBook.year = parseInt(book[key]) || new Date().getFullYear();
                            }
                            // 出版社
                            else if (lowerKey.includes('publisher') || lowerKey.includes('出版')) {
                                standardizedBook.publisher = book[key] || '';
                            }
                            // 書櫃
                            else if (lowerKey.includes('cabinet') || lowerKey.includes('櫃')) {
                                standardizedBook.cabinet = book[key] || '';
                            }
                            // 排號
                            else if (lowerKey.includes('row') || lowerKey.includes('排')) {
                                standardizedBook.row = book[key] || '';
                            }
                            // 位置
                            else if (lowerKey.includes('location') || lowerKey.includes('位置')) {
                                standardizedBook.location = book[key] || '';
                            }
                            // 狀態
                            else if (lowerKey.includes('status') || lowerKey.includes('狀態')) {
                                standardizedBook.status = book[key] || 'available';
                            }
                            // 描述
                            else if (lowerKey.includes('description') || lowerKey.includes('描述')) {
                                standardizedBook.description = book[key] || '';
                            }
                            // 備註
                            else if (lowerKey.includes('notes') || lowerKey.includes('備註')) {
                                standardizedBook.notes = book[key] || '';
                            }
                            // ID (如果存在)
                            else if (lowerKey === 'id') {
                                standardizedBook.id = book[key] || standardizedBook.id;
                            }
                        });
                        
                        return standardizedBook;
                    });
                    
                    // 獲取現有書籍數據
                    const existingBooks = BookData.getBooks();
                    
                    // 檢測重複數據（基於ISBN和標題+作者組合）
                    const existingISBNs = new Set(existingBooks.map(book => book.isbn));
                    const existingTitleAuthorPairs = new Set(existingBooks.map(book => `${book.title}|${book.author}`));
                    
                    // 分離新書籍和重複書籍
                    const duplicateBooks = [];
                    const newBooks = [];
                    
                    books.forEach(book => {
                        const titleAuthorPair = `${book.title}|${book.author}`;
                        
                        // 檢查ISBN或標題+作者組合是否已存在
                        if ((book.isbn && existingISBNs.has(book.isbn)) || 
                            (book.title && book.author && existingTitleAuthorPairs.has(titleAuthorPair))) {
                            duplicateBooks.push(book);
                        } else {
                            newBooks.push(book);
                            // 更新已存在集合，防止Excel文件中的重複
                            if (book.isbn) existingISBNs.add(book.isbn);
                            if (book.title && book.author) existingTitleAuthorPairs.add(titleAuthorPair);
                        }
                    });
                    
                    // 將重複書籍保存到垃圾桶
                    if (duplicateBooks.length > 0) {
                        this.saveToTrashBin(duplicateBooks);
                    }
                    
                    // 合併數據
                    const mergedBooks = [...existingBooks, ...newBooks];
                    
                    // 保存合併後的數據
                    BookData.saveBooks(mergedBooks);
                    
                    // 同時保存到books_data.json文件（通過導出功能）
                    try {
                        const dataStr = JSON.stringify(mergedBooks, null, 2);
                        const dataBlob = new Blob([dataStr], {type: 'application/json'});
                        const dataUrl = URL.createObjectURL(dataBlob);
                        
                        const linkElement = document.createElement('a');
                        linkElement.setAttribute('href', dataUrl);
                        linkElement.setAttribute('download', 'books_data.json');
                        linkElement.style.display = 'none';
                        document.body.appendChild(linkElement);
                        linkElement.click();
                        document.body.removeChild(linkElement);
                    } catch (exportError) {
                        console.warn('導出到JSON文件失敗:', exportError);
                        // 繼續執行，不中斷流程
                    }
                    
                    // 如果啟用了自動上傳，則上傳到GitHub
                    if (autoUpload) {
                        await this.uploadToGitHub(mergedBooks, showNotification);
                    }
                    
                    const successMessage = `成功導入 ${newBooks.length} 本新書籍，${duplicateBooks.length} 本重複書籍已移至垃圾桶`;
                    showNotification(successMessage, 'success');
                    
                    // 返回結構化的結果對象
                    resolve({
                        success: true,
                        message: successMessage,
                        newBooks: newBooks.length,
                        duplicateBooks: duplicateBooks.length,
                        totalBooks: mergedBooks.length
                    });
                } catch (error) {
                    console.error('Excel導入錯誤:', error);
                    const errorMessage = `導入失敗: ${error.message || '未知錯誤'}`;
                    showNotification(errorMessage, 'error');
                    
                    // 返回結構化的錯誤對象
                    resolve({
                        success: false,
                        error: errorMessage
                    });
                }
            };
            
            reader.onerror = (error) => {
                showNotification('讀取文件時出錯', 'error');
                reject(error);
            };
            
            reader.readAsArrayBuffer(file);
        });
    },
    
    // 導出數據為Excel
    exportToExcel: function() {
        const books = BookData.getBooks();
        
        // 創建工作簿
        const wb = XLSX.utils.book_new();
        
        // 創建工作表
        const ws = XLSX.utils.json_to_sheet(books);
        
        // 將工作表添加到工作簿
        XLSX.utils.book_append_sheet(wb, ws, '書籍數據');
        
        // 生成Excel文件並下載
        const fileName = 'books_export_' + new Date().toISOString().slice(0, 10) + '.xlsx';
        XLSX.writeFile(wb, fileName);
        
        return true;
    }
};