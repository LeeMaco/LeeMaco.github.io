document.addEventListener('DOMContentLoaded', function() {
    // 獲取DOM元素
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const searchCategory = document.getElementById('search-category');
    const resultsList = document.getElementById('results-list');
    const resultsCount = document.getElementById('results-count');
    const lastUpdated = document.getElementById('last-updated');
    
    // 書籍數據
    let books = [];
    
    // 初始化 - 加載書籍數據
    loadBooks();
    
    // 加載書籍數據
    function loadBooks() {
        fetch('data/books.json')
            .then(response => response.json())
            .then(data => {
                books = data;
                updateLastUpdated();
            })
            .catch(error => {
                console.error('加載書籍數據失敗:', error);
                resultsList.innerHTML = '<p class="error-message">無法加載書籍數據，請稍後再試。</p>';
            });
    }
    
    // 更新最後更新時間
    function updateLastUpdated() {
        const now = new Date();
        lastUpdated.textContent = now.toLocaleString();
    }
    
    // 搜索書籍
    function searchBooks() {
        const query = searchInput.value.toLowerCase();
        const category = searchCategory.value;
        
        const filteredBooks = books.filter(book => {
            const matchesQuery = 
                book.title.toLowerCase().includes(query) || 
                book.author.toLowerCase().includes(query) || 
                (book.isbn && book.isbn.includes(query));
            
            const matchesCategory = category === 'all' || book.category === category;
            
            return matchesQuery && matchesCategory;
        });
        
        displayResults(filteredBooks);
    }
    
    // 顯示結果
    function displayResults(filteredBooks) {
        resultsList.innerHTML = '';
        resultsCount.textContent = `${filteredBooks.length} 本書`;
        
        if (filteredBooks.length === 0) {
            resultsList.innerHTML = '<p>沒有找到匹配的書籍。</p>';
            return;
        }
        
        filteredBooks.forEach(book => {
            const bookCard = document.createElement('div');
            bookCard.className = 'book-card';
            
            bookCard.innerHTML = `
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">${book.author}</p>
                <div class="book-details">
                    ${book.volume ? `<div><strong>集數:</strong> ${book.volume}</div>` : ''}
                    <div><strong>類別:</strong> ${getCategoryName(book.category)}</div>
                    ${book.cabinet && book.row ? `<div><strong>位置:</strong> ${book.cabinet}櫃 ${book.row}行</div>` : ''}
                    ${book.publisher ? `<div><strong>出版社:</strong> ${book.publisher}</div>` : ''}
                    ${book.isbn ? `<div><strong>ISBN:</strong> ${book.isbn}</div>` : ''}
                    ${book.description ? `<div><strong>描述:</strong> ${book.description}</div>` : ''}
                    ${book.notes ? `<div><strong>備註:</strong> ${book.notes}</div>` : ''}
                </div>
            `;
            
            resultsList.appendChild(bookCard);
        });
    }
    
    // 獲取類別名稱
    function getCategoryName(category) {
        const categories = {
            'fiction': '小說',
            'non-fiction': '非小說',
            'science': '科學',
            'history': '歷史',
            'other': '其他'
        };
        return categories[category] || category;
    }
    
    // 事件監聽器
    searchBtn.addEventListener('click', searchBooks);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchBooks();
        }
    });
    searchCategory.addEventListener('change', searchBooks);
    
    // 初始搜索
    searchBooks();
});