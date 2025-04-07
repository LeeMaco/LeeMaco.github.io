/**
 * 書籍查詢管理系統 - 數據管理模塊
 * 負責處理數據的存儲和讀取
 */

const BookData = {
    
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
        
        // 管理員信息現在由UserManager模塊管理
        
        // 從JSON文件加載書籍數據
        // 返回Promise以便可以等待數據加載完成
        return this.loadBooksFromJSON();
    },
    
    // 從JSON文件加載書籍數據
    loadBooksFromJSON: function() {
        // 使用多種策略嘗試加載JSON數據
        const strategies = [];
        
        // 策略1: 相對路徑 (適用於本地環境)
        strategies.push('./data/books.json');
        
        // 策略2: 基於當前URL的路徑 (適用於大多數情況)
        const currentUrl = window.location.href;
        let basePath = currentUrl.includes('.html') 
            ? currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1)
            : (currentUrl.endsWith('/') ? currentUrl : currentUrl + '/');
        strategies.push(basePath + 'data/books.json');
        
        // 策略3: GitHub Pages特定路徑 (如果檢測到GitHub Pages環境)
        if (window.location.href.includes('github.io')) {
            const origin = window.location.origin;
            const pathParts = window.location.pathname.split('/');
            
            if (pathParts.length > 2) {
                const repoName = pathParts[1]; // 假設第二部分是倉庫名
                strategies.push(`${origin}/${repoName}/data/books.json`);
            }
            strategies.push(`${origin}/data/books.json`);
        }
        
        // 使用Promise.any嘗試所有策略，直到一個成功
        const fetchPromises = strategies.map(url => {
            return fetch(url, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`從 ${url} 加載失敗: ${response.status}`);
                }
                return response.json();
            });
        });
        
        return Promise.any(fetchPromises)
            .then(data => {
                if (!data || !Array.isArray(data)) {
                    console.warn('加載的JSON數據格式不正確，預期為數組');
                    return [];
                }
                
                // 確保所有JSON書籍的ID都是字符串類型並過濾無效數據
                const validBooks = data.filter(book => book && book.title && book.id)
                    .map(book => {
                        if (book.id !== undefined) {
                            book.id = String(book.id);
                        }
                        return book;
                    });
                
                this.jsonBooks = validBooks;
                return validBooks;
            })
            .catch(error => {
                console.error('加載JSON書籍數據時發生錯誤:', error);
                this.jsonBooks = [];
                return [];
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
        
        // 先從localStorage中查找
        const localBooks = localStorage.getItem('books');
        const parsedLocalBooks = localBooks ? JSON.parse(localBooks) : [];
        
        // 使用字符串比較查找書籍
        let book = parsedLocalBooks.find(book => String(book.id) === bookId);
        
        // 如果在localStorage中沒找到，再從JSON文件中查找
        if (!book && this.jsonBooks.length > 0) {
            book = this.jsonBooks.find(book => String(book.id) === bookId);
        }
        
        // 確保返回的書籍ID是字符串類型
        if (book) {
            book.id = String(book.id);
        }
        
        return book || null;
    },
    
    // 搜索書籍（增強版，支持多欄位搜索和篩選）
    searchBooks: function(query, type = 'title', filters = {}) {
        try {
            let books = this.getAllBooks();
            
            if (!books || books.length === 0) {
                return [];
            }
            
            // 過濾無效的書籍數據
            books = books.filter(book => book && typeof book === 'object' && book.title);
            
            // 應用關鍵字搜索
            if (query && typeof query === 'string' && query.trim() !== '') {
                const lowerQuery = query.toLowerCase().trim();
                
                books = books.filter(book => {
                    if (!book) return false;
                    
                    if (type === 'all') {
                        // 搜索所有欄位
                        const fields = ['title', 'author', 'series', 'publisher', 'cabinet', 'row', 'isbn', 'description', 'notes'];
                        return fields.some(field => {
                            if (!book[field]) return false;
                            const fieldValue = String(book[field]).toLowerCase();
                            return fieldValue.includes(lowerQuery) || lowerQuery.includes(fieldValue);
                        });
                    } else if (type === 'cabinet') {
                        // 特別處理櫃號搜索
                        return book.cabinet && String(book.cabinet).toLowerCase() === lowerQuery;
                    } else {
                        // 搜索特定欄位
                        if (book[type]) {
                            const fieldValue = String(book[type]).toLowerCase();
                            return fieldValue.includes(lowerQuery) || lowerQuery.includes(fieldValue);
                        }
                        return false;
                    }
                });
            }
            
            // 應用篩選條件
            if (filters && typeof filters === 'object' && Object.keys(filters).length > 0) {
                books = books.filter(book => {
                    if (!book) return false;
                    
                    for (const key in filters) {
                        if (filters[key]) {
                            if (!book[key] || String(book[key]).toLowerCase() !== String(filters[key]).toLowerCase()) {
                                return false;
                            }
                        }
                    }
                    return true;
                });
            }
            
            // 確保所有返回的書籍都有有效的ID
            books.forEach(book => {
                if (!book.id) {
                    book.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                } else {
                    book.id = String(book.id);
                }
            });
            
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
        
        // 先嘗試從getBookById獲取完整的書籍信息，確保獲取正確的書籍
        const originalBook = this.getBookById(bookId);
        if (!originalBook) {
            return null;
        }
        
        // 從localStorage中獲取所有書籍
        const localBooks = localStorage.getItem('books');
        const parsedLocalBooks = localBooks ? JSON.parse(localBooks) : [];
        
        // 使用字符串比較查找書籍
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
        } else {
            // 如果在localStorage中沒找到，但書籍存在（可能在JSON文件中），則添加到localStorage
            parsedLocalBooks.push(updatedBookData);
        }
        
        localStorage.setItem('books', JSON.stringify(parsedLocalBooks));
        return updatedBookData;
    },
    
    // 將書籍移至垃圾桶
    moveToTrash: function(id) {
        // 確保ID是字符串類型
        const bookId = String(id);
        
        // 獲取要刪除的書籍
        const book = this.getBookById(bookId);
        if (!book) {
            return false;
        }
        
        // 從localStorage中獲取書籍列表
        const localBooks = localStorage.getItem('books');
        const parsedLocalBooks = localBooks ? JSON.parse(localBooks) : [];
        
        // 從書籍列表中移除
        const filteredBooks = parsedLocalBooks.filter(b => String(b.id) !== bookId);
        
        // 創建書籍的副本，避免引用問題
        const bookCopy = JSON.parse(JSON.stringify(book));
        
        // 添加刪除時間戳和原因
        bookCopy.deletedAt = new Date().toISOString();
        bookCopy.deleteReason = '手動刪除';
        
        // 獲取垃圾桶中的書籍
        const trashBooks = this.getTrashBooks();
        
        // 檢查垃圾桶中是否已存在相同ID的書籍
        const existingIndex = trashBooks.findIndex(b => String(b.id) === bookId);
        if (existingIndex !== -1) {
            // 如果已存在，則更新該書籍
            trashBooks[existingIndex] = bookCopy;
        } else {
            // 否則添加到垃圾桶
            trashBooks.push(bookCopy);
        }
        
        // 保存更新後的書籍列表和垃圾桶
        localStorage.setItem('books', JSON.stringify(filteredBooks));
        localStorage.setItem(this.TRASH_KEY, JSON.stringify(trashBooks));
        
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
        
        // 獲取垃圾桶中的書籍
        const trashBooks = this.getTrashBooks();
        const bookIndex = trashBooks.findIndex(book => String(book.id) === bookId);
        
        if (bookIndex === -1) {
            return false;
        }
        
        // 從垃圾桶中取出書籍
        const book = trashBooks[bookIndex];
        trashBooks.splice(bookIndex, 1);
        
        // 移除刪除時間戳和原因標記
        delete book.deletedAt;
        delete book.deleteReason;
        
        // 更新修改時間
        book.updatedAt = new Date().toISOString();
        
        // 獲取當前書籍列表
        const localBooks = localStorage.getItem('books');
        const parsedLocalBooks = localBooks ? JSON.parse(localBooks) : [];
        
        // 檢查是否已存在相同ID的書籍，避免重複
        const existingIndex = parsedLocalBooks.findIndex(b => String(b.id) === String(book.id));
        if (existingIndex !== -1) {
            // 如果已存在，則更新該書籍
            parsedLocalBooks[existingIndex] = book;
        } else {
            // 否則添加到列表
            parsedLocalBooks.push(book);
        }
        
        // 保存更新後的書籍列表和垃圾桶
        localStorage.setItem('books', JSON.stringify(parsedLocalBooks));
        localStorage.setItem(this.TRASH_KEY, JSON.stringify(trashBooks));
        
        return true;
    },
    
    // 從垃圾桶永久刪除書籍
    deleteFromTrash: function(id) {
        // 確保ID是字符串類型
        const bookId = String(id);
        
        // 獲取垃圾桶中的書籍
        const trashBooks = this.getTrashBooks();
        const filteredBooks = trashBooks.filter(book => String(book.id) !== bookId);
        
        if (filteredBooks.length < trashBooks.length) {
            localStorage.setItem(this.TRASH_KEY, JSON.stringify(filteredBooks));
            return true;
        }
        
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
        try {
            const trashBooks = this.getTrashBooks();
            if (!trashBooks || !Array.isArray(trashBooks)) {
                return 0;
            }
            
            const now = new Date();
            const cleanedBooks = [];
            const removedBooks = [];
            
            // 檢查每本書籍
            trashBooks.forEach(book => {
                // 確保book是有效對象
                if (!book || typeof book !== 'object') {
                    return;
                }
                
                // 如果沒有刪除時間，添加當前時間作為刪除時間
                if (!book.deletedAt) {
                    book.deletedAt = now.toISOString();
                    cleanedBooks.push(book);
                    return;
                }
                
                try {
                    const deletedDate = new Date(book.deletedAt);
                    const diffTime = now - deletedDate;
                    const diffDays = diffTime / (1000 * 60 * 60 * 24);
                    
                    if (diffDays <= days) {
                        // 保留未超過指定天數的書籍
                        cleanedBooks.push(book);
                    } else {
                        // 記錄被移除的書籍
                        removedBooks.push(book);
                    }
                } catch (dateError) {
                    // 如果日期處理出錯，保留該書籍
                    book.deletedAt = now.toISOString(); // 重置刪除時間
                    cleanedBooks.push(book);
                }
            });
            
            // 保存更新後的垃圾桶
            localStorage.setItem(this.TRASH_KEY, JSON.stringify(cleanedBooks));
            
            return removedBooks.length;
        } catch (error) {
            console.error('清理垃圾桶時發生錯誤:', error);
            return 0;
        }
    },
    
    // 管理員登錄驗證已移至UserManager模塊
    
    // 移除重複書籍並將其移至垃圾桶
    removeDuplicateBooks: function(criteria = ['title', 'author', 'isbn']) {
        try {
            // 從localStorage獲取書籍，避免使用getAllBooks可能引入的JSON書籍
            const localBooks = localStorage.getItem('books');
            const allBooks = localBooks ? JSON.parse(localBooks) : [];
            
            if (allBooks.length <= 1) {
                return { removed: 0, total: allBooks.length };
            }
            
            // 確保所有書籍的ID都是字符串類型
            allBooks.forEach(book => {
                if (book && book.id !== undefined) {
                    book.id = String(book.id);
                }
            });
            
            // 用於存儲唯一書籍的Map
            const uniqueBooks = new Map();
            // 用於存儲被移除的書籍
            const removedBooks = [];
            
            // 遍歷所有書籍，根據指定的標準生成唯一鍵
            allBooks.forEach(book => {
                // 確保book是有效對象
                if (!book || typeof book !== 'object') {
                    return;
                }
                
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
                        // 創建副本，避免引用問題
                        const existingBookCopy = JSON.parse(JSON.stringify(existingBook));
                        removedBooks.push(existingBookCopy);
                        uniqueBooks.set(key, book);
                    } else {
                        // 創建副本，避免引用問題
                        const bookCopy = JSON.parse(JSON.stringify(book));
                        removedBooks.push(bookCopy);
                    }
                } else {
                    // 如果該鍵不存在，則添加到唯一書籍Map中
                    uniqueBooks.set(key, book);
                }
            });
            
            // 將唯一書籍轉換為數組
            const uniqueBookArray = Array.from(uniqueBooks.values());
            
            // 更新localStorage中的書籍數據
            localStorage.setItem('books', JSON.stringify(uniqueBookArray));
            
            // 將移除的書籍添加到垃圾桶
            if (removedBooks.length > 0) {
                // 獲取垃圾桶中的書籍
                const trashBooks = this.getTrashBooks();
                
                // 為每本移除的書籍添加刪除時間和原因
                const now = new Date().toISOString();
                const processedRemovedBooks = removedBooks.map(book => {
                    // 確保每本書都有ID
                    if (!book.id) {
                        book.id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                    }
                    
                    // 添加刪除時間和原因
                    book.deletedAt = now;
                    book.deleteReason = '自動去重';
                    return book;
                });
                
                // 檢查垃圾桶中是否已存在相同ID的書籍
                const updatedTrashBooks = [...trashBooks];
                processedRemovedBooks.forEach(book => {
                    const existingIndex = updatedTrashBooks.findIndex(b => String(b.id) === String(book.id));
                    if (existingIndex !== -1) {
                        // 如果已存在，則更新該書籍
                        updatedTrashBooks[existingIndex] = book;
                    } else {
                        // 否則添加到垃圾桶
                        updatedTrashBooks.push(book);
                    }
                });
                
                // 保存更新後的垃圾桶
                localStorage.setItem(this.TRASH_KEY, JSON.stringify(updatedTrashBooks));
            }
            
            // 返回去重結果
            return {
                removed: removedBooks.length,
                total: uniqueBookArray.length,
                removedBooks: removedBooks
            };
        } catch (error) {
            console.error('去重過程中發生錯誤:', error);
            return {
                removed: 0,
                total: 0,
                error: error.message
            };
        }
    }
};

// 初始化數據
document.addEventListener('DOMContentLoaded', function() {
    BookData.init();
});