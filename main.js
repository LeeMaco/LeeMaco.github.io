// 書籍資料模型與初始資料
const defaultBooks = [
    { id: 1, title: "深入淺出JavaScript", author: "張三", isbn: "9781234567890", category: "程式設計", location: "A-1", description: "JavaScript入門與進階指南。" },
    { id: 2, title: "現代前端開發", author: "李四", isbn: "9780987654321", category: "網頁設計", location: "B-2", description: "前端技術全方位解析。" }
];

const STORAGE_KEY = "book_manager_books";
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";
let isAdmin = false;

function getBooks() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : defaultBooks.slice();
}

function saveBooks(books) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function renderCategoryOptions(books) {
    const categories = Array.from(new Set(books.map(b => b.category)));
    const select = document.getElementById("category-filter");
    select.innerHTML = '<option value="">所有類別</option>' + categories.map(c => `<option value="${c}">${c}</option>`).join("");
}

function renderBooksList(books) {
    const list = document.getElementById("books-list");
    if (books.length === 0) {
        list.innerHTML = "<p>查無書籍資料。</p>";
        return;
    }
    list.innerHTML = books.map(book => `
        <div class="book-card" data-id="${book.id}">
            <h3>${book.title}</h3>
            <p>作者：${book.author}</p>
            <p>ISBN：${book.isbn}</p>
            <p>類別：${book.category}</p>
        </div>
    `).join("");
}

function showBookDetail(book) {
    const detail = document.getElementById("book-detail");
    detail.innerHTML = `
        <h2>${book.title}</h2>
        <p><strong>作者：</strong>${book.author}</p>
        <p><strong>ISBN：</strong>${book.isbn}</p>
        <p><strong>類別：</strong>${book.category}</p>
        <p><strong>位置：</strong>${book.location}</p>
        <p><strong>簡介：</strong>${book.description}</p>
        ${isAdmin ? `<button id="edit-book-btn">編輯</button> <button id="delete-book-btn">刪除</button>` : ""}
        <button id="close-detail-btn">關閉</button>
    `;
    detail.style.display = "block";
}

function hideBookDetail() {
    document.getElementById("book-detail").style.display = "none";
}

function filterBooks(books, keyword, category) {
    return books.filter(book => {
        const matchKeyword = !keyword || [book.title, book.author, book.isbn].some(f => f.includes(keyword));
        const matchCategory = !category || book.category === category;
        return matchKeyword && matchCategory;
    });
}

function showAdminPanel(show) {
    document.getElementById("admin-panel").style.display = show ? "flex" : "none";
    isAdmin = show;
}

function adminLogin() {
    const modal = document.getElementById("modal");
    modal.innerHTML = `
        <div style="background:#fff;padding:2rem;border-radius:8px;min-width:260px;">
            <h2>管理員登入</h2>
            <input id="admin-user" placeholder="用戶名" style="width:100%;margin-bottom:0.5rem;"/><br/>
            <input id="admin-pass" type="password" placeholder="密碼" style="width:100%;margin-bottom:1rem;"/><br/>
            <button id="login-confirm-btn">登入</button>
            <button id="login-cancel-btn">取消</button>
            <p id="login-error" style="color:red;"></p>
        </div>
    `;
    modal.style.display = "flex";
    document.getElementById("login-confirm-btn").onclick = function() {
        const user = document.getElementById("admin-user").value;
        const pass = document.getElementById("admin-pass").value;
        if (user === ADMIN_USER && pass === ADMIN_PASS) {
            showAdminPanel(true);
            modal.style.display = "none";
        } else {
            document.getElementById("login-error").textContent = "帳號或密碼錯誤";
        }
    };
    document.getElementById("login-cancel-btn").onclick = function() {
        modal.style.display = "none";
    };
}

document.addEventListener("DOMContentLoaded", function() {
    let books = getBooks();
    renderCategoryOptions(books);
    renderBooksList(books);
    showAdminPanel(false);

    document.getElementById("search-btn").onclick = function() {
        const keyword = document.getElementById("search-input").value.trim();
        const category = document.getElementById("category-filter").value;
        const filtered = filterBooks(books, keyword, category);
        renderBooksList(filtered);
    };
    document.getElementById("category-filter").onchange = function() {
        document.getElementById("search-btn").click();
    };
    document.getElementById("books-list").onclick = function(e) {
        const card = e.target.closest(".book-card");
        if (card) {
            const book = books.find(b => b.id == card.dataset.id);
            showBookDetail(book);
        }
    };
    document.getElementById("book-detail").onclick = function(e) {
        if (e.target.id === "close-detail-btn") hideBookDetail();
        // 編輯與刪除功能後續補充
    };
    document.getElementById("admin-login-btn").onclick = function() {
        adminLogin();
    };
});