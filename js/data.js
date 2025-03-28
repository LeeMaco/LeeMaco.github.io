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
        this.loadBooksFromJSON();
    },
    
    // 從JSON文件加載書籍數據
    loadBooksFromJSON: function() {
        fetch('/data/books.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('無法加載JSON文件: ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                console.log('從JSON文件加載了', data.length, '本書籍');
                this.jsonBooks = data;
            })
            .catch(error => {
                console.error('加載JSON書籍數據時發生錯誤:', error);
                this.jsonBooks = [];
            });
    },
    
    // 獲取所有書籍（合併localStorage和JSON文件中的數據）
    getAllBooks: function() {
        // 從localStorage獲取書籍
        const localBooks = localStorage.getItem('books');
        const parsedLocalBooks = localBooks ? JSON.parse(localBooks) : [];
        
        // 合併localStorage和JSON文件中的書籍，避免ID重複
        const localBookIds = new Set(parsedLocalBooks.map(book => book.id));
        const uniqueJsonBooks = this.jsonBooks.filter(book => !localBookIds.has(book.id));
        
        return [...parsedLocalBooks, ...uniqueJsonBooks];
    },
    
    // 根據ID獲取書籍
    getBookById: function(id) {
        const books = this.getAllBooks();
        return books.find(book => book.id === id) || null;
    },
    
    // 搜索書籍
    searchBooks: function(query, type = 'title') {
        try {
            console.log('開始搜索書籍，查詢:', query, '類型:', type);
            
            if (!query) {
                console.log('查詢為空，返回空結果');
                return [];
            }
            
            const books = this.getAllBooks();
            console.log('獲取到書籍總數:', books.length);
            
            if (books.length === 0) {
                console.log('書籍數據為空');
                return [];
            }
            
            const lowerQuery = query.toLowerCase();
            
            const results = books.filter(book => {
                if (type === 'title') {
                    return book.title && book.title.toLowerCase().includes(lowerQuery);
                } else if (type === 'author') {
                    return book.author && book.author.toLowerCase().includes(lowerQuery);
                }
                return false;
            });
            
            console.log('搜索結果數量:', results.length);
            return results;
        } catch (error) {
            console.error('搜索書籍時發生錯誤:', error);
            return [];
        }
    },
    
    // 添加新書籍
    addBook: function(bookData) {
        const books = this.getAllBooks();
        const newBook = {
            ...bookData,
            id: Date.now().toString() // 使用時間戳作為唯一ID
        };
        
        books.push(newBook);
        localStorage.setItem('books', JSON.stringify(books));
        return newBook;
    },
    
    // 更新書籍
    updateBook: function(id, bookData) {
        const books = this.getAllBooks();
        const index = books.findIndex(book => book.id === id);
        
        if (index !== -1) {
            books[index] = { ...books[index], ...bookData };
            localStorage.setItem('books', JSON.stringify(books));
            return books[index];
        }
        
        return null;
    },
    
    // 刪除書籍
    deleteBook: function(id) {
        const books = this.getAllBooks();
        const filteredBooks = books.filter(book => book.id !== id);
        
        if (filteredBooks.length < books.length) {
            localStorage.setItem('books', JSON.stringify(filteredBooks));
            return true;
        }
        
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