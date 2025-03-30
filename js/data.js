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
    
    // 存儲從JSON文件加載的書籍數據
    jsonBooks: [],
    
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
    
    // 從JSON文件加載書籍數據
    loadBooksFromJSON: function() {
        return fetch('/data/books.json')
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
    
    // 搜索書籍（增強版，支持多欄位搜索和篩選）
    searchBooks: function(query, type = 'title', filters = {}) {
        try {
            console.log('開始搜索書籍，查詢:', query, '類型:', type, '篩選條件:', filters);
            
            let books = this.getAllBooks();
            console.log('獲取到書籍總數:', books.length);
            
            if (books.length === 0) {
                console.log('書籍數據為空');
                return [];
            }
            
            // 應用關鍵字搜索
            if (query) {
                const lowerQuery = query.toLowerCase().trim();
                console.log('處理後的查詢關鍵字:', lowerQuery);
                
                books = books.filter(book => {
                    // 確保book存在且不為null
                    if (!book) return false;
                    
                    if (type === 'all') {
                        // 搜索所有欄位，使用安全的字符串處理和更寬鬆的比較方式
                        return (
                            (book.title && (String(book.title).toLowerCase().includes(lowerQuery) || lowerQuery.includes(String(book.title).toLowerCase()))) ||
                            (book.author && (String(book.author).toLowerCase().includes(lowerQuery) || lowerQuery.includes(String(book.author).toLowerCase()))) ||
                            (book.series && (String(book.series).toLowerCase().includes(lowerQuery) || lowerQuery.includes(String(book.series).toLowerCase()))) ||
                            (book.publisher && (String(book.publisher).toLowerCase().includes(lowerQuery) || lowerQuery.includes(String(book.publisher).toLowerCase()))) ||
                            (book.cabinet && (String(book.cabinet).toLowerCase().includes(lowerQuery) || lowerQuery.includes(String(book.cabinet).toLowerCase()))) ||
                            (book.row && (String(book.row).toLowerCase().includes(lowerQuery) || lowerQuery.includes(String(book.row).toLowerCase()))) ||
                            (book.isbn && (String(book.isbn).toLowerCase().includes(lowerQuery) || lowerQuery.includes(String(book.isbn).toLowerCase()))) ||
                            (book.description && (String(book.description).toLowerCase().includes(lowerQuery) || lowerQuery.includes(String(book.description).toLowerCase()))) ||
                            (book.notes && (String(book.notes).toLowerCase().includes(lowerQuery) || lowerQuery.includes(String(book.notes).toLowerCase())))
                        );
                    } else if (type === 'cabinet') {
                        // 特別處理櫃號搜索，確保安全的字符串比較
                        return book.cabinet && String(book.cabinet).toLowerCase() === lowerQuery;
                    } else {
                        // 搜索特定欄位，確保欄位存在且進行安全的字符串處理
                        // 使用更寬鬆的比較方式，允許部分匹配
                        if (book[type]) {
                            const fieldValue = String(book[type]).toLowerCase();
                            // 檢查是否包含查詢字符串，或查詢字符串包含欄位值
                            return fieldValue.includes(lowerQuery) || lowerQuery.includes(fieldValue);
                        }
                        return false;
                    }
                });
                
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
    
    // 刪除書籍
    deleteBook: function(id) {
        // 確保ID是字符串類型
        const bookId = String(id);
        console.log('刪除書籍ID:', bookId, '(原始ID:', id, ')');
        
        const books = this.getAllBooks();
        const filteredBooks = books.filter(book => String(book.id) !== bookId);
        
        if (filteredBooks.length < books.length) {
            localStorage.setItem('books', JSON.stringify(filteredBooks));
            console.log('成功刪除書籍ID:', bookId);
            return true;
        }
        
        console.log('未找到書籍ID:', bookId, '無法刪除');
        return false;
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
    }
};

// 初始化數據
document.addEventListener('DOMContentLoaded', function() {
    BookData.init();
});