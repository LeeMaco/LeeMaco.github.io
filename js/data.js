/**
 * 書籍管理系統 - 數據模塊
 * 負責數據的存儲、讀取和操作
 */

const BookData = {
    // 默認的管理員憑證
    adminCredentials: {
        username: 'admin',
        password: 'admin123'
    },
    
    // 示例書籍數據
    sampleBooks: [
        {
            id: '1',
            title: '哈利波特與魔法石',
            author: 'J.K. 羅琳',
            isbn: '9789573317272',
            category: 'fiction',
            volume: '1',
            cabinet: 'A',
            row: '01',
            publisher: '皇冠出版',
            description: '哈利波特系列第一部，講述了哈利發現自己是巫師並進入霍格華茲魔法學校的故事。',
            notes: '',
            createdAt: new Date('2023-01-01').toISOString(),
            updatedAt: new Date('2023-01-01').toISOString()
        },
        {
            id: '2',
            title: '時間簡史',
            author: '史蒂芬·霍金',
            isbn: '9789571199924',
            category: 'science',
            volume: '',
            cabinet: 'B',
            row: '02',
            publisher: '遠流出版',
            description: '霍金的科普著作，介紹宇宙學的基本概念和理論。',
            notes: '暢銷科普讀物',
            createdAt: new Date('2023-01-02').toISOString(),
            updatedAt: new Date('2023-01-02').toISOString()
        },
        {
            id: '3',
            title: '三體',
            author: '劉慈欣',
            isbn: '9789865061197',
            category: 'fiction',
            volume: '1',
            cabinet: 'A',
            row: '03',
            publisher: '貓頭鷹出版',
            description: '中國科幻小說，講述人類與三體文明接觸的故事。',
            notes: '科幻三部曲第一部',
            createdAt: new Date('2023-01-03').toISOString(),
            updatedAt: new Date('2023-01-03').toISOString()
        },
        {
            id: '4',
            title: '人類簡史',
            author: '尤瓦爾·赫拉利',
            isbn: '9789869019415',
            category: 'history',
            volume: '',
            cabinet: 'C',
            row: '01',
            publisher: '天下文化',
            description: '從人類演化的角度回顧全球歷史。',
            notes: '',
            createdAt: new Date('2023-01-04').toISOString(),
            updatedAt: new Date('2023-01-04').toISOString()
        },
        {
            id: '5',
            title: '窮查理的普通常識',
            author: '查理·芒格',
            isbn: '9789578799943',
            category: 'biography',
            volume: '',
            cabinet: 'D',
            row: '02',
            publisher: '商業周刊',
            description: '查理·芒格的投資智慧和思想。',
            notes: '投資經典',
            createdAt: new Date('2023-01-05').toISOString(),
            updatedAt: new Date('2023-01-05').toISOString()
        }
    ],
    
    // 獲取本地存儲的書籍數據，如果沒有則使用示例數據
    getBooks: function() {
        const storedBooks = localStorage.getItem('books');
        return storedBooks ? JSON.parse(storedBooks) : this.sampleBooks;
    },
    
    // 保存書籍數據到本地存儲
    saveBooks: function(books) {
        localStorage.setItem('books', JSON.stringify(books));
    },
    
    // 初始化數據
    init: function() {
        // 如果本地存儲中沒有書籍數據，則使用示例數據初始化
        if (!localStorage.getItem('books')) {
            this.saveBooks(this.sampleBooks);
        }
    },
    
    // 添加新書籍
    addBook: function(book) {
        const books = this.getBooks();
        // 生成唯一ID
        book.id = Date.now().toString();
        books.push(book);
        this.saveBooks(books);
        return book;
    },
    
    // 更新書籍信息
    updateBook: function(updatedBook) {
        const books = this.getBooks();
        const index = books.findIndex(book => book.id === updatedBook.id);
        if (index !== -1) {
            books[index] = updatedBook;
            this.saveBooks(books);
            return true;
        }
        return false;
    },
    
    // 刪除書籍
    deleteBook: function(id) {
        const books = this.getBooks();
        const filteredBooks = books.filter(book => book.id !== id);
        if (filteredBooks.length < books.length) {
            this.saveBooks(filteredBooks);
            return true;
        }
        return false;
    },
    
    // 搜索書籍
    searchBooks: function(query, category = '') {
        const books = this.getBooks();
        // 如果沒有查詢條件和分類，返回所有書籍
        if (!query && !category) return books;
        
        return books.filter(book => {
            const matchesQuery = !query || 
                book.title.toLowerCase().includes(query.toLowerCase()) ||
                book.author.toLowerCase().includes(query.toLowerCase()) ||
                book.isbn.includes(query);
                
            const matchesCategory = !category || book.category === category;
            
            return matchesQuery && matchesCategory;
        });
    },
    
    // 驗證管理員登入
    validateAdmin: function(username, password) {
        return username === this.adminCredentials.username && 
               password === this.adminCredentials.password;
    },
    
    // 導出數據為JSON文件
    exportData: function() {
        const books = this.getBooks();
        const dataStr = JSON.stringify(books, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'books_export_' + new Date().toISOString().slice(0, 10) + '.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    },
    
    // 導入數據
    importData: function(jsonData) {
        try {
            const books = JSON.parse(jsonData);
            if (Array.isArray(books)) {
                this.saveBooks(books);
                return true;
            }
            return false;
        } catch (e) {
            console.error('導入數據失敗:', e);
            return false;
        }
    },
    
    // 備份數據到GitHub (使用AdminModule)
    backupToGitHub: function() {
        // 此功能已移至AdminModule
        console.log('數據備份功能已移至AdminModule');
        return false;
    }
};

// 初始化數據
BookData.init();