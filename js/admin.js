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
    
    // 垃圾桶 - 存儲被過濾的重複數據
    trashBin: [],
    
    // 從localStorage獲取GitHub設置
    loadGithubSettings: function() {
        const settings = localStorage.getItem('githubSettings');
        if (settings) {
            this.githubSettings = JSON.parse(settings);
        }
        return this.githubSettings;
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
    
    // 獲取垃圾桶數據
    getTrashBin: function() {
        const storedTrash = localStorage.getItem('trashBin');
        this.trashBin = storedTrash ? JSON.parse(storedTrash) : [];
        return this.trashBin;
    },
    
    // 保存數據到垃圾桶
    saveToTrashBin: function(books) {
        this.trashBin = this.getTrashBin();
        this.trashBin = [...this.trashBin, ...books];
        localStorage.setItem('trashBin', JSON.stringify(this.trashBin));
    },
    
    // 清空垃圾桶
    clearTrashBin: function() {
        this.trashBin = [];
        localStorage.removeItem('trashBin');
        return true;
    },
    
    // 從垃圾桶恢復書籍
    restoreFromTrashBin: function(bookIds) {
        const trashBooks = this.getTrashBin();
        const booksToRestore = trashBooks.filter(book => bookIds.includes(book.id));
        const remainingTrash = trashBooks.filter(book => !bookIds.includes(book.id));
        
        // 更新垃圾桶
        this.trashBin = remainingTrash;
        localStorage.setItem('trashBin', JSON.stringify(this.trashBin));
        
        // 將書籍添加到主數據庫
        const existingBooks = BookData.getBooks();
        const mergedBooks = [...existingBooks, ...booksToRestore];
        BookData.saveBooks(mergedBooks);
        
        return booksToRestore.length;
    },
    
    // 從Excel導入數據
    importFromExcel: function(file, autoUpload, showNotification) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {type: 'array'});
                    
                    // 獲取第一個工作表
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    
                    // 將工作表轉換為JSON
                    let books = XLSX.utils.sheet_to_json(firstSheet);
                    
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
                    
                    showNotification(`成功導入 ${newBooks.length} 本新書籍，${duplicateBooks.length} 本重複書籍已移至垃圾桶`, 'success');
                    
                    // 如果啟用了自動上傳，則上傳到GitHub
                    if (autoUpload) {
                        await this.uploadToGitHub(mergedBooks, showNotification);
                    }
                    
                    resolve(true);
                } catch (error) {
                    console.error('Excel導入錯誤:', error);
                    showNotification(`導入失敗: ${error.message}`, 'error');
                    reject(error);
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
    },
    
    // 導出垃圾桶數據為Excel
    exportTrashBinToExcel: function() {
        const trashBooks = this.getTrashBin();
        
        if (trashBooks.length === 0) {
            return false;
        }
        
        // 創建工作簿
        const wb = XLSX.utils.book_new();
        
        // 創建工作表
        const ws = XLSX.utils.json_to_sheet(trashBooks);
        
        // 將工作表添加到工作簿
        XLSX.utils.book_append_sheet(wb, ws, '垃圾桶數據');
        
        // 生成Excel文件並下載
        const fileName = 'trash_bin_export_' + new Date().toISOString().slice(0, 10) + '.xlsx';
        XLSX.writeFile(wb, fileName);
        
        return true;
    }
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