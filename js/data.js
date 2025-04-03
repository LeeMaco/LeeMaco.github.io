/**
 * 書籍查詢管理系統 - 數據管理模塊
 * 負責處理數據的存儲和讀取
 */

const BookData = {
    // 管理員帳號信息
    adminCredentials: {
        username: 'admin',
        password: 'admin123'
    },
    
    // 敏感數據的存儲鍵名
    ADMIN_CREDENTIALS_KEY: 'adminCredentials',
    GITHUB_TOKEN_KEY: 'githubToken',
    
    // 存儲從JSON文件加載的書籍數據
    jsonBooks: [],
    
    // 垃圾桶存儲鍵名
    TRASH_KEY: 'books_trash',
    
    // 初始化數據
    init: function() {
        // 如果本地存儲中沒有書籍數據，則初始化一些示例數據
        if (!localStorage.getItem('books')) {
            const sampleBooks = [
                {
                    id: '1',
                    title: '哈利波特與魔法石',
                    author: 'J.K.羅琳',
                    series: '哈利波特系列 1',
                    publisher: '皇冠文化',
                    description: '這是一個關於魔法、友誼和勇氣的故事，講述了年輕的哈利波特發現自己是一名巫師，並進入霍格華茲魔法學校學習的冒險。',
                    cabinet: 'A',
                    row: '1',
                    isbn: '9789573317883',
                    notes: '暢銷書'
                },
                {
                    id: '2',
                    title: '小王子',
                    author: '安東尼·德·聖修伯里',
                    series: '',
                    publisher: '商務印書館',
                    description: '一個來自外星球的小王子，透過他天真的眼睛，帶領讀者重新審視生命中真正重要的事物。',
                    cabinet: 'B',
                    row: '3',
                    isbn: '9789570516388',
                    notes: '經典文學'
                },
                {
                    id: '3',
                    title: '三體',
                    author: '劉慈欣',
                    series: '三體三部曲 1',
                    publisher: '重慶出版社',
                    description: '文化大革命期間，一個秘密軍事項目向宇宙發出信號，引來了三體文明的注意。地球文明因此面臨被征服的命運。',
                    cabinet: 'C',
                    row: '2',
                    isbn: '9787536692930',
                    notes: '科幻小說'
                }
            ];
            localStorage.setItem('books', JSON.stringify(sampleBooks));
        }
        
        // 如果本地存儲中沒有管理員信息，則初始化
        if (!localStorage.getItem('adminCredentials')) {
            localStorage.setItem('adminCredentials', JSON.stringify(this.adminCredentials));
        }
        
        // 從JSON文件加載書籍數據
        // 返回Promise以便可以等待數據加載完成
        return this.loadBooksFromJSON();
    },
    
    // 保存管理員憑證
    saveAdminCredentials: function(credentials) {
        const encryptedCredentials = CryptoUtils.encryptData(credentials);
        localStorage.setItem(this.ADMIN_CREDENTIALS_KEY, encryptedCredentials);
        console.log('管理員憑證已加密保存');
    },
    
    // 獲取管理員憑證
    getAdminCredentials: function() {
        const encryptedCredentials = localStorage.getItem(this.ADMIN_CREDENTIALS_KEY);
        if (!encryptedCredentials) return this.adminCredentials;
        
        const decryptedCredentials = CryptoUtils.decryptData(encryptedCredentials);
        return decryptedCredentials || this.adminCredentials;
    },
    
    // 保存GitHub訪問令牌
    saveGitHubToken: function(token) {
        const encryptedToken = CryptoUtils.encryptData(token);
        localStorage.setItem(this.GITHUB_TOKEN_KEY, encryptedToken);
        console.log('GitHub訪問令牌已加密保存');
    },
    
    // 獲取GitHub訪問令牌
    getGitHubToken: function() {
        const encryptedToken = localStorage.getItem(this.GITHUB_TOKEN_KEY);
        if (!encryptedToken) return null;
        
        return CryptoUtils.decryptData(encryptedToken);
    },
    
    // 從JSON文件加載書籍數據
    loadBooksFromJSON: function() {
        // 使用多種策略嘗試加載JSON數據
        const strategies = [];
        
        // 策略1: 相對路徑 (適用於本地環境)
        strategies.push('./data/books.json');
        
        // 策略2: 基於當前URL的路徑 (適用於大多數情況)
        const currentUrl = window.location.href;
        let basePath = '';
        
        // 從當前URL中提取基礎路徑
        if (currentUrl.includes('.html')) {
            // 如果URL包含HTML文件名，則移除文件名部分
            basePath = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
        } else {
            // 如果沒有明確的HTML文件名，則假設當前URL就是基礎路徑
            basePath = currentUrl.endsWith('/') ? currentUrl : currentUrl + '/';
        }
        strategies.push(basePath + 'data/books.json');
        
        // 策略3: GitHub Pages特定路徑 (如果檢測到GitHub Pages環境)
        if (window.location.href.includes('github.io')) {
            const origin = window.location.origin;
            const pathParts = window.location.pathname.split('/');
            
            // 如果在倉庫子目錄中，嘗試構建正確的路徑
            if (pathParts.length > 2) {
                const repoName = pathParts[1]; // 假設第二部分是倉庫名
                strategies.push(`${origin}/${repoName}/data/books.json`);
            }
            
            // 直接從根路徑嘗試
            strategies.push(`${origin}/data/books.json`);
        }
        
        console.log('將嘗試以下數據加載策略:', strategies);
        
        // 使用Promise.any嘗試所有策略，直到一個成功
        const fetchPromises = strategies.map(url => {
            console.log('嘗試從URL加載:', url);
            return fetch(url, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`從 ${url} 加載失敗: ${response.status} ${response.statusText}`);
                }
                console.log('成功從URL加載數據:', url);
                return response.json();
            });
        });
        
        return Promise.any(fetchPromises)
            .then(response => {
                if (!response.ok) {
                    throw new Error('無法加載JSON文件: ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                console.log('從JSON文件加載了', data.length, '本書籍');
                // 確保所有JSON書籍的ID都是字符串類型
                data.forEach(book => {
                    if (book.id !== undefined) {
                        book.id = String(book.id);
                    }
                });
                this.jsonBooks = data;
                return data;
            })
            .catch(error => {
                console.error('加載JSON書籍數據時發生錯誤:', error);
                // 提供更詳細的錯誤信息
                const errorMessage = `無法加載書籍數據: ${error.message}\n` +
                                    `嘗試的URL: ${strategies.join(', ')}\n` +
                                    `當前環境: ${window.location.href.includes('github.io') ? 'GitHub Pages' : '本地'}\n` +
                                    `當前頁面: ${window.location.href}`;
                console.error(errorMessage);
                
                // 如果在GitHub Pages環境中，嘗試使用備用方法
                if (window.location.href.includes('github.io')) {
                    console.log('在GitHub Pages環境中檢測到錯誤，嘗試使用備用方法加載數據...');
                    // 嘗試使用絕對路徑
                    const fallbackUrl = window.location.origin + '/data/books.json';
                    console.log('嘗試備用URL:', fallbackUrl);
                    
                    return fetch(fallbackUrl, { cache: 'no-store' })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`備用方法也失敗: ${response.status} ${response.statusText}`);
                            }
                            return response.json();
                        })
                        .then(data => {
                            console.log('使用備用方法成功加載了', data.length, '本書籍');
                            this.jsonBooks = data;
                            return data;
                        })
                        .catch(fallbackError => {
                            console.error('備用方法也失敗:', fallbackError);
                            this.jsonBooks = [];
                            throw new Error(`無法加載書籍數據。原始錯誤: ${error.message}, 備用方法錯誤: ${fallbackError.message}`);
                        });
                }
                
                this.jsonBooks = [];
                throw error; // 重新拋出錯誤，以便上層捕獲
            });
    },
    
    // 獲取所有書籍（合併localStorage和JSON文件中的數據）
    getAllBooks: function() {
        // 從localStorage獲取書籍
        const localBooks = localStorage.getItem('books');
        const parsedLocalBooks = localBooks ? JSON.parse(localBooks) : [];
        
        // 確保所有本地書籍的ID都是字符串類型
        parsedLocalBooks.forEach(book => {
            if (book.id !== undefined) {
                book.id = String(book.id);
            }
        });
        
        // 確保jsonBooks不為空
        if (!this.jsonBooks || this.jsonBooks.length === 0) {
            console.log('jsonBooks為空，只返回localStorage中的書籍');
            return parsedLocalBooks;
        }
        
        // 合併localStorage和JSON文件中的書籍，避免ID重複
        // 使用字符串ID進行比較，避免類型不匹配問題
        const localBookIds = new Set(parsedLocalBooks.map(book => String(book.id)));
        const uniqueJsonBooks = this.jsonBooks.filter(book => {
            // 確保book.id存在且轉換為字符串
            return book.id !== undefined && !localBookIds.has(String(book.id));
        });
        
        // 確保所有JSON書籍的ID都是字符串類型
        uniqueJsonBooks.forEach(book => {
            if (book.id !== undefined) {
                book.id = String(book.id);
            }
        });
        
        const allBooks = [...parsedLocalBooks, ...uniqueJsonBooks];
        console.log('合併後的書籍總數:', allBooks.length, '(localStorage:', parsedLocalBooks.length, ', JSON:', uniqueJsonBooks.length, ')');
        return allBooks;
    },
    
    // 根據ID獲取書籍
    getBookById: function(id) {
        // 確保ID是字符串類型
        const bookId = String(id);
        console.log('查詢書籍ID:', bookId, '(原始ID:', id, ')');
        
        // 先從localStorage中查找
        const localBooks = localStorage.getItem('books');
        const parsedLocalBooks = localBooks ? JSON.parse(localBooks) : [];
        
        // 嚴格確保使用字符串比較，並且確保返回的書籍ID也是字符串
        // 使用嚴格相等比較(===)而不是寬鬆比較，避免類型轉換問題
        let book = parsedLocalBooks.find(book => String(book.id) === bookId);
        
        // 如果在localStorage中沒找到，再從JSON文件中查找
        if (!book && this.jsonBooks.length > 0) {
            book = this.jsonBooks.find(book => String(book.id) === bookId);
        }
        
        // 確保返回的書籍ID是字符串類型
        if (book) {
            book.id = String(book.id);
            console.log('獲取到書籍:', book.title);
        } else {
            console.error('未找到ID為', bookId, '的書籍');
        }
        
        console.log('獲取書籍ID:', bookId, '結果:', book);
        return book || null;
    },
    
    // 搜索索引
    _searchIndex: null,
    
    // 搜索緩存
    _cachedSearchResult: null,
    _cachedSearchQuery: null,
    _cachedSearchType: null,
    _cachedSearchFilters: null,
    
    // 創建搜索索引
    _createSearchIndex: function(books) {
        console.log('創建搜索索引');
        this._searchIndex = {
            title: {},
            author: {},
            publisher: {},
            isbn: {},
            series: {},
            cabinet: {},
            row: {},
            description: {},
            notes: {}
        };
        
        // 為每本書的每個欄位創建索引
        books.forEach(book => {
            if (!book) return;
            
            // 為每個欄位創建索引
            Object.keys(this._searchIndex).forEach(field => {
                if (book[field]) {
                    const value = String(book[field]).toLowerCase();
                    // 將每個單詞添加到索引中
                    value.split(/\s+/).forEach(word => {
                        if (word.length > 1) {
                            if (!this._searchIndex[field][word]) {
                                this._searchIndex[field][word] = [];
                            }
                            this._searchIndex[field][word].push(book);
                        }
                    });
                }
            });
        });
        
        console.log('搜索索引創建完成');
    },
    
    // 使用索引進行搜索
    _searchWithIndex: function(query, type) {
        console.log('使用索引搜索:', query, '類型:', type);
        
        // 如果搜索所有欄位
        if (type === 'all') {
            const results = new Set();
            const fields = Object.keys(this._searchIndex);
            
            // 將查詢拆分為單詞
            const words = query.split(/\s+/).filter(word => word.length > 1);
            
            // 如果沒有有效的單詞，返回所有書籍
            if (words.length === 0) {
                return this.getAllBooks();
            }
            
            // 對每個單詞在每個欄位中搜索
            words.forEach(word => {
                fields.forEach(field => {
                    const fieldIndex = this._searchIndex[field];
                    // 查找包含該單詞的書籍
                    Object.keys(fieldIndex).forEach(indexWord => {
                        if (indexWord.includes(word) || word.includes(indexWord)) {
                            fieldIndex[indexWord].forEach(book => results.add(book));
                        }
                    });
                });
            });
            
            return Array.from(results);
        } else {
            // 搜索特定欄位
            const results = new Set();
            const fieldIndex = this._searchIndex[type];
            
            if (!fieldIndex) return [];
            
            // 將查詢拆分為單詞
            const words = query.split(/\s+/).filter(word => word.length > 1);
            
            // 如果沒有有效的單詞，返回所有書籍
            if (words.length === 0) {
                return this.getAllBooks();
            }
            
            // 對每個單詞在指定欄位中搜索
            words.forEach(word => {
                Object.keys(fieldIndex).forEach(indexWord => {
                    if (indexWord.includes(word) || word.includes(indexWord)) {
                        fieldIndex[indexWord].forEach(book => results.add(book));
                    }
                });
            });
            
            return Array.from(results);
        }
    },
    
    // 應用篩選器
    _applyFilters: function(books, filters) {
        console.log('應用篩選條件:', filters);
        
        return books.filter(book => {
            // 檢查每個篩選條件
            for (const [key, value] of Object.entries(filters)) {
                // 如果篩選值為空，則跳過
                if (!value) continue;
                
                // 如果書籍沒有該欄位或欄位值不匹配，則排除
                if (!book[key] || String(book[key]).toLowerCase() !== String(value).toLowerCase()) {
                    return false;
                }
            }
            
            return true;
        });
    },
    
    // 搜索書籍（增強版，支持多欄位搜索和篩選）
    searchBooks: function(query, type = 'title', filters = {}) {
        try {
            console.log('開始搜索書籍，查詢:', query, '類型:', type, '篩選條件:', filters);
            
            // 使用緩存減少重複計算
            if (this._cachedSearchResult && 
                this._cachedSearchQuery === query && 
                this._cachedSearchType === type &&
                JSON.stringify(this._cachedSearchFilters) === JSON.stringify(filters)) {
                console.log('使用緩存的搜索結果');
                return this._cachedSearchResult;
            }
            
            let books = this.getAllBooks();
            console.log('獲取到書籍總數:', books.length);
            
            if (books.length === 0) {
                console.log('書籍數據為空');
                return [];
            }
            
            // 創建索引以加速搜索（僅在首次搜索時創建）
            if (!this._searchIndex) {
                this._createSearchIndex(books);
            }
            
            // 使用索引進行搜索
            let results = books;
            if (query) {
                const lowerQuery = query.toLowerCase().trim();
                results = this._searchWithIndex(lowerQuery, type);
            }
            
            // 應用篩選器
            if (Object.keys(filters).length > 0) {
                results = this._applyFilters(results, filters);
            }
            
            // 緩存搜索結果
            this._cachedSearchResult = results;
            this._cachedSearchQuery = query;
            this._cachedSearchType = type;
            this._cachedSearchFilters = {...filters};
            
            return results;
                
                console.log('關鍵字搜索後的書籍數量:', books.length);
                if (books.length === 0) {
                    console.log('關鍵字搜索無結果');
                }
            }
            
            // 應用篩選條件
            if (filters && Object.keys(filters).length > 0) {
                books = books.filter(book => {
                    // 確保book存在且不為null
                    if (!book) return false;
                    
                    for (const key in filters) {
                        if (filters[key]) {
                            // 確保所有比較都使用字符串比較，避免類型不一致問題
                            if (!book[key] || String(book[key]).toLowerCase() !== String(filters[key]).toLowerCase()) {
                                return false;
                            }
                        }
                    }
                    return true;
                });
            }
            
            console.log('篩選後的書籍數量:', books.length);
            
            console.log('搜索結果數量:', books.length);
            return books;
        } catch (error) {
            console.error('搜索書籍時發生錯誤:', error);
            return [];
        }
    },
    
    // 添加新書籍
    addBook: function(bookData) {
        const books = this.getAllBooks();
        const now = new Date();
        const newBook = {
            ...bookData,
            id: Date.now().toString(), // 使用時間戳作為唯一ID
            createdAt: now.toISOString(), // 添加創建時間
            updatedAt: now.toISOString()  // 添加更新時間
        };
        
        books.push(newBook);
        localStorage.setItem('books', JSON.stringify(books));
        return newBook;
    },
    
    // 更新書籍
    updateBook: function(id, bookData) {
        // 確保ID是字符串類型
        const bookId = String(id);
        console.log('更新書籍ID:', bookId, '(原始ID:', id, ')');
        
        // 先嘗試從getBookById獲取完整的書籍信息，確保獲取正確的書籍
        const originalBook = this.getBookById(bookId);
        if (!originalBook) {
            console.log('未找到書籍ID:', bookId, '無法更新');
            return null;
        }
        
        // 從localStorage中獲取所有書籍
        const localBooks = localStorage.getItem('books');
        const parsedLocalBooks = localBooks ? JSON.parse(localBooks) : [];
        
        // 嚴格確保使用字符串比較
        const index = parsedLocalBooks.findIndex(book => String(book.id) === bookId);
        
        // 準備更新的書籍數據
        const now = new Date();
        const updatedBookData = {
            ...originalBook,  // 使用原始書籍作為基礎
            ...bookData,     // 覆蓋更新的欄位
            id: bookId,      // 確保ID保持一致且為字符串
            updatedAt: now.toISOString() // 更新修改時間
        };
        
        // 如果在localStorage中找到了書籍，則更新它
        if (index !== -1) {
            parsedLocalBooks[index] = updatedBookData;
            localStorage.setItem('books', JSON.stringify(parsedLocalBooks));
            console.log('已更新localStorage中的書籍:', updatedBookData);
            return updatedBookData;
        } else {
            // 如果在localStorage中沒找到，但書籍存在（可能在JSON文件中），則添加到localStorage
            parsedLocalBooks.push(updatedBookData);
            localStorage.setItem('books', JSON.stringify(parsedLocalBooks));
            console.log('已將書籍添加到localStorage並更新:', updatedBookData);
            return updatedBookData;
        }
    },
    
    // 將書籍移至垃圾桶
    moveToTrash: function(id) {
        // 確保ID是字符串類型
        const bookId = String(id);
        console.log('將書籍移至垃圾桶，ID:', bookId, '(原始ID:', id, ')');
        
        // 獲取要刪除的書籍
        const book = this.getBookById(bookId);
        if (!book) {
            console.log('未找到書籍ID:', bookId, '無法移至垃圾桶');
            return false;
        }
        
        // 從書籍列表中移除
        const books = this.getAllBooks();
        const filteredBooks = books.filter(b => String(b.id) !== bookId);
        
        // 添加刪除時間戳
        book.deletedAt = new Date().toISOString();
        
        // 獲取垃圾桶中的書籍
        const trashBooks = this.getTrashBooks();
        
        // 添加到垃圾桶
        trashBooks.push(book);
        
        // 保存更新後的書籍列表和垃圾桶
        localStorage.setItem('books', JSON.stringify(filteredBooks));
        localStorage.setItem(this.TRASH_KEY, JSON.stringify(trashBooks));
        
        console.log('成功將書籍移至垃圾桶，ID:', bookId);
        return true;
    },
    
    // 刪除書籍（現在調用moveToTrash）
    deleteBook: function(id) {
        return this.moveToTrash(id);
    },
    
    // 獲取垃圾桶中的所有書籍
    getTrashBooks: function() {
        const trashBooks = localStorage.getItem(this.TRASH_KEY);
        return trashBooks ? JSON.parse(trashBooks) : [];
    },
    
    // 從垃圾桶恢復書籍
    restoreFromTrash: function(id) {
        // 確保ID是字符串類型
        const bookId = String(id);
        console.log('從垃圾桶恢復書籍，ID:', bookId);
        
        // 獲取垃圾桶中的書籍
        const trashBooks = this.getTrashBooks();
        const bookIndex = trashBooks.findIndex(book => String(book.id) === bookId);
        
        if (bookIndex === -1) {
            console.log('垃圾桶中未找到書籍ID:', bookId);
            return false;
        }
        
        // 從垃圾桶中取出書籍
        const book = trashBooks[bookIndex];
        trashBooks.splice(bookIndex, 1);
        
        // 移除刪除時間戳
        delete book.deletedAt;
        
        // 更新修改時間
        book.updatedAt = new Date().toISOString();
        
        // 獲取當前書籍列表並添加恢復的書籍
        const books = this.getAllBooks();
        books.push(book);
        
        // 保存更新後的書籍列表和垃圾桶
        localStorage.setItem('books', JSON.stringify(books));
        localStorage.setItem(this.TRASH_KEY, JSON.stringify(trashBooks));
        
        console.log('成功從垃圾桶恢復書籍，ID:', bookId);
        return true;
    },
    
    // 從垃圾桶永久刪除書籍
    deleteFromTrash: function(id) {
        // 確保ID是字符串類型
        const bookId = String(id);
        console.log('從垃圾桶永久刪除書籍，ID:', bookId);
        
        // 獲取垃圾桶中的書籍
        const trashBooks = this.getTrashBooks();
        const filteredBooks = trashBooks.filter(book => String(book.id) !== bookId);
        
        if (filteredBooks.length < trashBooks.length) {
            localStorage.setItem(this.TRASH_KEY, JSON.stringify(filteredBooks));
            console.log('成功從垃圾桶永久刪除書籍，ID:', bookId);
            return true;
        }
        
        console.log('垃圾桶中未找到書籍ID:', bookId);
        return false;
    },
    
    // 清空垃圾桶
    emptyTrash: function() {
        localStorage.setItem(this.TRASH_KEY, JSON.stringify([]));
        console.log('垃圾桶已清空');
        return true;
    },
    
    // 清理垃圾桶中超過指定天數的書籍
    cleanupTrash: function(days = 30) {
        console.log(`開始清理垃圾桶中超過 ${days} 天的書籍`);
        
        const trashBooks = this.getTrashBooks();
        const now = new Date();
        const cleanedBooks = trashBooks.filter(book => {
            if (!book.deletedAt) return true; // 如果沒有刪除時間，保留
            
            const deletedDate = new Date(book.deletedAt);
            const diffTime = now - deletedDate;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            
            return diffDays <= days; // 保留未超過指定天數的書籍
        });
        
        const removedCount = trashBooks.length - cleanedBooks.length;
        localStorage.setItem(this.TRASH_KEY, JSON.stringify(cleanedBooks));
        
        console.log(`垃圾桶清理完成，刪除了 ${removedCount} 本超過 ${days} 天的書籍`);
        return removedCount;
    },
    
    // 驗證管理員登錄
    validateAdmin: function(username, password) {
        const storedCredentials = localStorage.getItem('adminCredentials');
        if (storedCredentials) {
            const credentials = JSON.parse(storedCredentials);
            return username === credentials.username && password === credentials.password;
        }
        
        // 如果沒有存儲的憑證，使用默認值
        return username === this.adminCredentials.username && password === this.adminCredentials.password;
    },
    
    // 移除重複書籍並將其移至垃圾桶
    removeDuplicateBooks: function(criteria = ['title', 'author', 'isbn']) {
        console.log('開始移除重複書籍，判斷標準:', criteria);
        
        // 獲取所有書籍
        const allBooks = this.getAllBooks();
        console.log('原始書籍總數:', allBooks.length);
        
        if (allBooks.length <= 1) {
            console.log('書籍數量不足，無需去重');
            return { removed: 0, total: allBooks.length };
        }
        
        // 用於存儲唯一書籍的Map
        const uniqueBooks = new Map();
        // 用於存儲被移除的書籍
        const removedBooks = [];
        
        // 遍歷所有書籍，根據指定的標準生成唯一鍵
        allBooks.forEach(book => {
            // 生成唯一鍵，基於指定的標準欄位
            let key = criteria.map(field => {
                // 確保欄位存在且轉換為小寫字符串
                return book[field] ? String(book[field]).toLowerCase() : '';
            }).join('|');
            
            // 如果是空鍵（所有標準欄位都為空），則使用ID作為鍵
            if (key === '' || key.split('|').every(part => part === '')) {
                key = String(book.id);
            }
            
            // 如果該鍵已存在，表示找到重複書籍
            if (uniqueBooks.has(key)) {
                // 比較創建時間，保留最新的記錄
                const existingBook = uniqueBooks.get(key);
                const existingTime = existingBook.createdAt ? new Date(existingBook.createdAt).getTime() : 0;
                const currentTime = book.createdAt ? new Date(book.createdAt).getTime() : 0;
                
                // 如果當前書籍比已存在的書籍更新，則替換
                if (currentTime > existingTime) {
                    removedBooks.push(existingBook);
                    uniqueBooks.set(key, book);
                } else {
                    removedBooks.push(book);
                }
            } else {
                // 如果該鍵不存在，則添加到唯一書籍Map中
                uniqueBooks.set(key, book);
            }
        });
        
        // 將唯一書籍轉換為數組
        const uniqueBookArray = Array.from(uniqueBooks.values());
        console.log('去重後的書籍數量:', uniqueBookArray.length);
        console.log('移除的重複書籍數量:', removedBooks.length);
        
        // 更新localStorage中的書籍數據
        localStorage.setItem('books', JSON.stringify(uniqueBookArray));
        
        // 將移除的書籍添加到垃圾桶
        if (removedBooks.length > 0) {
            // 獲取垃圾桶中的書籍
            const trashBooks = this.getTrashBooks();
            
            // 為每本移除的書籍添加刪除時間
            removedBooks.forEach(book => {
                book.deletedAt = new Date().toISOString();
                book.deleteReason = '自動去重'; // 標記刪除原因
            });
            
            // 添加到垃圾桶
            trashBooks.push(...removedBooks);
            localStorage.setItem(this.TRASH_KEY, JSON.stringify(trashBooks));
            console.log('已將', removedBooks.length, '本重複書籍移至垃圾桶');
        }
        
        // 返回去重結果
        return {
            removed: removedBooks.length,
            total: uniqueBookArray.length,
            removedBooks: removedBooks
        };
    }
};

// 初始化數據
document.addEventListener('DOMContentLoaded', function() {
    BookData.init();
});