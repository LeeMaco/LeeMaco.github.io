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
        if (isAdmin && e.target.id === "edit-book-btn") {
            const id = parseInt(document.querySelector("#book-detail").dataset.id || books.find(b => b.title === document.querySelector("#book-detail h2").textContent).id);
            const book = books.find(b => b.id === id);
            showBookForm(book, true);
        }
        if (isAdmin && e.target.id === "delete-book-btn") {
            const id = parseInt(document.querySelector("#book-detail").dataset.id || books.find(b => b.title === document.querySelector("#book-detail h2").textContent).id);
            if (confirm("確定要刪除這本書嗎？")) {
                books = books.filter(b => b.id !== id);
                saveBooks(books);
                renderBooksList(books);
                hideBookDetail();
            }
        }
    };
    document.getElementById("admin-login-btn").onclick = function() {
        adminLogin();
    };
    document.getElementById("add-book-btn").onclick = function() {
        showBookForm(null, false);
    };
    document.getElementById("export-json-btn").onclick = function() {
        const blob = new Blob([JSON.stringify(books, null, 2)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "books.json";
        a.click();
        URL.revokeObjectURL(url);
    };
    document.getElementById("import-json-btn").onclick = function() {
        document.getElementById("import-file").accept = ".json";
        document.getElementById("import-file").click();
    };
    document.getElementById("import-file").onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.name.endsWith(".json")) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const imported = JSON.parse(evt.target.result);
                    mergeBooks(imported);
                } catch {
                    alert("JSON格式錯誤");
                }
            };
            reader.readAsText(file);
        } else if (file.name.endsWith(".xls") || file.name.endsWith(".xlsx")) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const imported = XLSX.utils.sheet_to_json(sheet);
                mergeBooks(imported);
            };
            reader.readAsArrayBuffer(file);
        }
        e.target.value = "";
    };
    document.getElementById("export-excel-btn").onclick = function() {
        const ws = XLSX.utils.json_to_sheet(books);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Books");
        XLSX.writeFile(wb, "books.xlsx");
    };
    document.getElementById("import-excel-btn").onclick = function() {
        document.getElementById("import-file").accept = ".xls,.xlsx";
        document.getElementById("import-file").click();
    };
    document.getElementById("backup-github-btn").onclick = function() {
        showGithubBackupForm();
    };
});

function showBookForm(book, isEdit) {
    const modal = document.getElementById("modal");
    modal.innerHTML = `
        <div style="background:#fff;padding:2rem;border-radius:8px;min-width:260px;">
            <h2>${isEdit ? "編輯書籍" : "新增書籍"}</h2>
            <input id="book-title" placeholder="書名" value="${book ? book.title : ''}"/><br/>
            <input id="book-author" placeholder="作者" value="${book ? book.author : ''}"/><br/>
            <input id="book-isbn" placeholder="ISBN" value="${book ? book.isbn : ''}"/><br/>
            <input id="book-category" placeholder="類別" value="${book ? book.category : ''}"/><br/>
            <input id="book-location" placeholder="位置" value="${book ? book.location : ''}"/><br/>
            <textarea id="book-description" placeholder="簡介">${book ? book.description : ''}</textarea><br/>
            <button id="book-save-btn">儲存</button>
            <button id="book-cancel-btn">取消</button>
        </div>
    `;
    modal.style.display = "flex";
    document.getElementById("book-save-btn").onclick = function() {
        const newBook = {
            id: book ? book.id : Date.now(),
            title: document.getElementById("book-title").value.trim(),
            author: document.getElementById("book-author").value.trim(),
            isbn: document.getElementById("book-isbn").value.trim(),
            category: document.getElementById("book-category").value.trim(),
            location: document.getElementById("book-location").value.trim(),
            description: document.getElementById("book-description").value.trim()
        };
        if (!newBook.title || !newBook.author) {
            alert("書名與作者為必填");
            return;
        }
        if (isEdit) {
            books = books.map(b => b.id === newBook.id ? newBook : b);
        } else {
            books.push(newBook);
        }
        saveBooks(books);
        renderBooksList(books);
        renderCategoryOptions(books);
        modal.style.display = "none";
    };
    document.getElementById("book-cancel-btn").onclick = function() {
        modal.style.display = "none";
    };
}

function mergeBooks(imported) {
    let changed = false;
    imported.forEach(newBook => {
        if (!books.some(b => b.isbn === newBook.isbn && b.isbn)) {
            newBook.id = Date.now() + Math.floor(Math.random()*10000);
            books.push(newBook);
            changed = true;
        }
    });
    if (changed) {
        saveBooks(books);
        renderBooksList(books);
        renderCategoryOptions(books);
        alert("導入成功");
    } else {
        alert("無新資料被導入（可能全部重複）");
    }
}

function showGithubBackupForm() {
    const modal = document.getElementById("modal");
    modal.innerHTML = `
        <div style="background:#fff;padding:2rem;border-radius:8px;min-width:260px;">
            <h2>備份到GitHub</h2>
            <input id="github-token" placeholder="GitHub Token" style="width:100%;margin-bottom:0.5rem;"/><br/>
            <input id="github-repo" placeholder="用戶名/倉庫名" style="width:100%;margin-bottom:0.5rem;"/><br/>
            <input id="github-path" placeholder="檔案路徑 (如 data/books.json)" style="width:100%;margin-bottom:1rem;"/><br/>
            <button id="github-backup-confirm">備份</button>
            <button id="github-backup-cancel">取消</button>
            <p id="github-backup-msg" style="color:red;"></p>
        </div>
    `;
    modal.style.display = "flex";
    document.getElementById("github-backup-confirm").onclick = async function() {
        const token = document.getElementById("github-token").value.trim();
        const repo = document.getElementById("github-repo").value.trim();
        const path = document.getElementById("github-path").value.trim();
        if (!token || !repo || !path) {
            document.getElementById("github-backup-msg").textContent = "請填寫所有欄位";
            return;
        }
        try {
            const url = `https://api.github.com/repos/${repo}/contents/${path}`;
            const content = btoa(unescape(encodeURIComponent(JSON.stringify(books, null, 2))));
            // 先檢查檔案是否存在
            let sha = undefined;
            const getRes = await fetch(url, {headers: {Authorization: `token ${token}`}});
            if (getRes.status === 200) {
                const data = await getRes.json();
                sha = data.sha;
            }
            const res = await fetch(url, {
                method: "PUT",
                headers: {
                    "Authorization": `token ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: "備份書籍資料",
                    content,
                    sha
                })
            });
            if (res.ok) {
                document.getElementById("github-backup-msg").style.color = "green";
                document.getElementById("github-backup-msg").textContent = "備份成功！";
            } else {
                document.getElementById("github-backup-msg").textContent = "備份失敗，請檢查Token與倉庫資訊";
            }
        } catch {
            document.getElementById("github-backup-msg").textContent = "網路或API錯誤";
        }
    };
    document.getElementById("github-backup-cancel").onclick = function() {
        modal.style.display = "none";
    };
}