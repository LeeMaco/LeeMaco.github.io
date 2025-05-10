document.addEventListener('DOMContentLoaded', () => {
    const adminLoginButton = document.getElementById('admin-login');
    const searchBar = document.getElementById('search-bar');
    const categoryFilter = document.getElementById('category-filter');
    const bookList = document.getElementById('book-list');

    // Sample data
    const books = [
        { title: 'Book 1', author: 'Author 1', isbn: '1234567890', category: 'Fiction' },
        { title: 'Book 2', author: 'Author 2', isbn: '0987654321', category: 'Non-Fiction' },
        // Add more books as needed
    ];

    function displayBooks(filter = '') {
        bookList.innerHTML = '';
        const filteredBooks = books.filter(book => {
            return (
                book.title.includes(searchBar.value) ||
                book.author.includes(searchBar.value) ||
                book.isbn.includes(searchBar.value)
            ) && (filter === '' || book.category === filter);
        });

        filteredBooks.forEach(book => {
            const bookCard = document.createElement('div');
            bookCard.className = 'book-card';
            bookCard.innerHTML = `
                <h3>${book.title}</h3>
                <p>Author: ${book.author}</p>
                <p>ISBN: ${book.isbn}</p>
                <p>Category: ${book.category}</p>
            `;
            bookList.appendChild(bookCard);
        });
    }

    searchBar.addEventListener('input', () => displayBooks(categoryFilter.value));
    categoryFilter.addEventListener('change', () => displayBooks(categoryFilter.value));

    adminLoginButton.addEventListener('click', () => {
        // Remove or replace alert statements for production
        // console.log('Enter username:');
        const username = prompt('Enter username:');
        // console.log('Enter password:');
        const password = prompt('Enter password:');
        if (username === 'admin' && password === 'admin123') {
            console.log('Login successful!');
            // Implement admin functionalities here
            // Add book functionality
            const addBookButton = document.createElement('button');
            addBookButton.textContent = '新增書籍';
            addBookButton.addEventListener('click', () => {
                const title = prompt('Enter book title:');
                const author = prompt('Enter book author:');
                const isbn = prompt('Enter book ISBN:');
                const category = prompt('Enter book category:');
                books.push({ title, author, isbn, category });
                displayBooks();
            });
            document.body.appendChild(addBookButton);
    
            // Edit and delete functionality
            bookList.addEventListener('click', (event) => {
                if (event.target.tagName === 'BUTTON') {
                    const bookCard = event.target.parentElement;
                    const bookIndex = Array.from(bookList.children).indexOf(bookCard);
                    if (event.target.textContent === '編輯') {
                        console.log('Edit book title:', books[bookIndex].title);
                        const title = prompt('Edit book title:', books[bookIndex].title);
                        console.log('Edit book author:', books[bookIndex].author);
                        const author = prompt('Edit book author:', books[bookIndex].author);
                        console.log('Edit book ISBN:', books[bookIndex].isbn);
                        const isbn = prompt('Edit book ISBN:', books[bookIndex].isbn);
                        console.log('Edit book category:', books[bookIndex].category);
                        const category = prompt('Edit book category:', books[bookIndex].category);
                        books[bookIndex] = { title, author, isbn, category };
                        displayBooks();
                    } else if (event.target.textContent === '刪除') {
                        books.splice(bookIndex, 1);
                        displayBooks();
                    }
                }
            });
    
            // Add edit and delete buttons to each book card
            function displayBooks(filter = '') {
                bookList.innerHTML = '';
                const filteredBooks = books.filter(book => {
                    return (
                        book.title.includes(searchBar.value) ||
                        book.author.includes(searchBar.value) ||
                        book.isbn.includes(searchBar.value)
                    ) && (filter === '' || book.category === filter);
                });
    
                filteredBooks.forEach(book => {
                    const bookCard = document.createElement('div');
                    bookCard.className = 'book-card';
                    bookCard.innerHTML = `
                        <h3>${book.title}</h3>
                        <p>Author: ${book.author}</p>
                        <p>ISBN: ${book.isbn}</p>
                        <p>Category: ${book.category}</p>
                        <button>編輯</button>
                        <button>刪除</button>
                    `;
                    bookList.appendChild(bookCard);
                });
            }
            const xlsx = require('xlsx');

            // Ensure importButton and exportButton are defined before use
            const importButton = document.getElementById('import-data');
            const exportButton = document.getElementById('export-data');

            importButton.addEventListener('click', () => {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = '.json, .xlsx';
                fileInput.addEventListener('change', (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const data = e.target.result;
                            if (file.type === 'application/json') {
                                try {
                                    const jsonData = JSON.parse(data);
                                    books.push(...jsonData);
                                    displayBooks();
                                    console.log('JSON數據導入成功！');
                                } catch (error) {
                                    console.log('導入失敗，數據格式錯誤。');
                                }
                            } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                                const workbook = xlsx.read(data, { type: 'binary' });
                                const sheetName = workbook.SheetNames[0];
                                const worksheet = workbook.Sheets[sheetName];
                                const excelData = xlsx.utils.sheet_to_json(worksheet);
                                books.push(...excelData);
                                displayBooks();
                                console.log('Excel數據導入成功！');
                            };
                            reader.readAsBinaryString(file);
                        }
                    });
                    fileInput.click();
                });
            
                exportButton.addEventListener('click', () => {
                    const jsonData = JSON.stringify(books);
                    const blob = new Blob([jsonData], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'books.json';
                    a.click();
                    URL.revokeObjectURL(url);
    
                    const worksheet = xlsx.utils.json_to_sheet(books);
                    const workbook = xlsx.utils.book_new();
                    xlsx.utils.book_append_sheet(workbook, worksheet, 'Books');
                    xlsx.writeFile(workbook, 'books.xlsx');
                    console.log('數據導出成功！');
                });
                document.body.appendChild(importButton);
    
                const exportButton = document.createElement('button');
                exportButton.textContent = '導出數據';
                exportButton.addEventListener('click', () => {
                    // Implement export functionality here
                    const jsonData = JSON.stringify(books);
                    const blob = new Blob([jsonData], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'books.json';
                    a.click();
                    URL.revokeObjectURL(url);
                    console.log('數據導出成功！');
                });
                document.body.appendChild(exportButton);
        } else {
            console.log('Invalid credentials!');
        }
    });

    displayBooks();
});