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
                    
                    // 處理數據格式
                    books = books.map(book => ({
                        id: book.id || Date.now().toString() + Math.floor(Math.random() * 1000),
                        title: book.title || '',
                        author: book.author || '',
                        isbn: book.isbn || '',
                        category: book.category || 'fiction',
                        year: parseInt(book.year) || new Date().getFullYear(),
                        location: book.location || '',
                        status: book.status || 'available'
                    }));
                    
                    // 獲取現有書籍數據
                    const existingBooks = BookData.getBooks();
                    
                    // 過濾重複數據（基於ISBN）
                    const existingISBNs = new Set(existingBooks.map(book => book.isbn));
                    const newBooks = books.filter(book => !existingISBNs.has(book.isbn));
                    
                    // 合併數據
                    const mergedBooks = [...existingBooks, ...newBooks];
                    
                    // 保存合併後的數據
                    BookData.saveBooks(mergedBooks);
                    
                    showNotification(`成功導入 ${newBooks.length} 本新書籍，過濾了 ${books.length - newBooks.length} 本重複書籍`, 'success');
                    
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
    }
};