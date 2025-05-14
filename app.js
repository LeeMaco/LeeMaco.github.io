// 初始化管理員帳號密碼
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// 初始化會員資料
let members = JSON.parse(localStorage.getItem('members')) || [];

// 當前登入狀態
let isLoggedIn = false;

// DOM 元素
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginModal = document.getElementById('login-modal');
const memberModal = document.getElementById('member-modal');
const confirmModal = document.getElementById('confirm-modal');
const searchBtn = document.getElementById('search-btn');
const searchInput = document.getElementById('search-input');
const searchResult = document.getElementById('search-result');
const adminSection = document.getElementById('admin-section');
const addMemberBtn = document.getElementById('add-member-btn');
const memberList = document.getElementById('member-list');
const userInfo = document.getElementById('user-info');

// 關閉按鈕
const closeButtons = document.querySelectorAll('.close');

// 初始化頁面
function initPage() {
    renderMemberList();
    checkLoginStatus();
    setupEventListeners();
}

// 設置事件監聽器
function setupEventListeners() {
    // 登入按鈕
    loginBtn.addEventListener('click', () => {
        loginModal.style.display = 'block';
    });

    // 登出按鈕
    logoutBtn.addEventListener('click', () => {
        logout();
    });

    // 登入提交
    document.getElementById('login-submit').addEventListener('click', () => {
        login();
    });

    // 新增會員按鈕
    addMemberBtn.addEventListener('click', () => {
        openMemberForm();
    });

    // 儲存會員按鈕
    document.getElementById('save-member').addEventListener('click', () => {
        saveMember();
    });

    // 搜尋按鈕
    searchBtn.addEventListener('click', () => {
        searchMember();
    });

    // 搜尋輸入框按Enter鍵
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchMember();
        }
    });

    // 確認刪除按鈕
    document.getElementById('confirm-delete').addEventListener('click', () => {
        deleteMember(document.getElementById('confirm-delete').dataset.id);
        confirmModal.style.display = 'none';
    });

    // 取消刪除按鈕
    document.getElementById('cancel-delete').addEventListener('click', () => {
        confirmModal.style.display = 'none';
    });

    // 關閉按鈕
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            loginModal.style.display = 'none';
            memberModal.style.display = 'none';
        });
    });

    // 點擊彈窗外部關閉彈窗
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
        }
        if (e.target === memberModal) {
            memberModal.style.display = 'none';
        }
        if (e.target === confirmModal) {
            confirmModal.style.display = 'none';
        }
    });
}

// 檢查登入狀態
function checkLoginStatus() {
    isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        adminSection.style.display = 'block';
        userInfo.textContent = '管理員已登入';
    } else {
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        adminSection.style.display = 'none';
        userInfo.textContent = '未登入';
    }
}

// 登入功能
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('login-error');

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        localStorage.setItem('isLoggedIn', 'true');
        isLoggedIn = true;
        loginModal.style.display = 'none';
        checkLoginStatus();
        loginError.textContent = '';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    } else {
        loginError.textContent = '帳號或密碼錯誤';
    }
}

// 登出功能
function logout() {
    localStorage.setItem('isLoggedIn', 'false');
    isLoggedIn = false;
    checkLoginStatus();
}

// 開啟會員表單
function openMemberForm(memberId = null) {
    const formTitle = document.getElementById('member-form-title');
    const memberIdInput = document.getElementById('member-id');
    const memberNameInput = document.getElementById('member-name');
    const memberPhoneInput = document.getElementById('member-phone');
    const memberEmailInput = document.getElementById('member-email');
    const memberLevelInput = document.getElementById('member-level');
    const memberNoteInput = document.getElementById('member-note');

    // 清空表單
    memberIdInput.value = '';
    memberNameInput.value = '';
    memberPhoneInput.value = '';
    memberEmailInput.value = '';
    memberLevelInput.value = '一般會員';
    memberNoteInput.value = '';
    document.getElementById('member-error').textContent = '';

    if (memberId) {
        // 編輯模式
        formTitle.textContent = '編輯會員';
        const member = members.find(m => m.id === memberId);
        if (member) {
            memberIdInput.value = member.id;
            memberNameInput.value = member.name;
            memberPhoneInput.value = member.phone;
            memberEmailInput.value = member.email || '';
            memberLevelInput.value = member.level || '一般會員';
            memberNoteInput.value = member.note || '';
        }
    } else {
        // 新增模式
        formTitle.textContent = '新增會員';
    }

    memberModal.style.display = 'block';
}

// 儲存會員資料
function saveMember() {
    const memberId = document.getElementById('member-id').value;
    const memberName = document.getElementById('member-name').value.trim();
    const memberPhone = document.getElementById('member-phone').value.trim();
    const memberEmail = document.getElementById('member-email').value.trim();
    const memberLevel = document.getElementById('member-level').value;
    const memberNote = document.getElementById('member-note').value.trim();
    const memberError = document.getElementById('member-error');

    // 驗證資料
    if (!memberName) {
        memberError.textContent = '請輸入姓名';
        return;
    }

    if (!memberPhone) {
        memberError.textContent = '請輸入手機號碼';
        return;
    }

    // 檢查手機號碼格式
    const phoneRegex = /^09\d{8}$/;
    if (!phoneRegex.test(memberPhone)) {
        memberError.textContent = '手機號碼格式不正確，請輸入09開頭的10位數字';
        return;
    }

    // 檢查Email格式
    if (memberEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(memberEmail)) {
            memberError.textContent = 'Email格式不正確';
            return;
        }
    }

    // 檢查手機號碼是否重複
    const isDuplicate = members.some(m => m.phone === memberPhone && m.id !== memberId);
    if (isDuplicate) {
        memberError.textContent = '此手機號碼已存在';
        return;
    }

    if (memberId) {
        // 更新會員
        const index = members.findIndex(m => m.id === memberId);
        if (index !== -1) {
            members[index] = {
                ...members[index],
                name: memberName,
                phone: memberPhone,
                email: memberEmail,
                level: memberLevel,
                note: memberNote,
                updatedAt: new Date().toISOString()
            };
        }
    } else {
        // 新增會員
        const newMember = {
            id: generateId(),
            name: memberName,
            phone: memberPhone,
            email: memberEmail,
            level: memberLevel,
            note: memberNote,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        members.push(newMember);
    }

    // 儲存到localStorage
    saveToLocalStorage();

    // 同步到GitHub
    syncToGitHub();

    // 關閉彈窗並重新渲染會員列表
    memberModal.style.display = 'none';
    renderMemberList();
}

// 刪除會員
function deleteMember(memberId) {
    members = members.filter(m => m.id !== memberId);
    saveToLocalStorage();
    syncToGitHub();
    renderMemberList();
}

// 確認刪除會員
function confirmDeleteMember(memberId) {
    document.getElementById('confirm-delete').dataset.id = memberId;
    confirmModal.style.display = 'block';
}

// 搜尋會員
function searchMember() {
    const keyword = searchInput.value.trim();
    if (!keyword) {
        searchResult.innerHTML = '<div class="no-result">請輸入搜尋關鍵字</div>';
        return;
    }

    const results = members.filter(m => 
        m.name.includes(keyword) || m.phone.includes(keyword)
    );

    if (results.length === 0) {
        searchResult.innerHTML = '<div class="no-result">找不到符合的會員資料</div>';
    } else {
        let html = '';
        results.forEach(member => {
            html += `
                <div class="search-result-item">
                    <div class="member-name">${member.name}</div>
                    <div class="member-details">
                        <div>手機: ${member.phone}</div>
                        ${member.email ? `<div>Email: ${member.email}</div>` : ''}
                        <div>會員等級: <span class="member-level level-${getLevelClass(member.level)}">${member.level}</span></div>
                        ${member.note ? `<div>備註: ${member.note}</div>` : ''}
                    </div>
                </div>
            `;
        });
        searchResult.innerHTML = html;
    }
}

// 渲染會員列表
function renderMemberList() {
    if (!isLoggedIn) return;

    if (members.length === 0) {
        memberList.innerHTML = '<div class="no-result">尚無會員資料</div>';
        return;
    }

    let html = '';
    members.forEach(member => {
        html += `
            <div class="member-item" data-id="${member.id}">
                <div class="member-info">
                    <div class="member-name">${member.name}</div>
                    <div class="member-details">
                        <div>手機: ${member.phone}</div>
                        ${member.email ? `<div>Email: ${member.email}</div>` : ''}
                        <div>會員等級: <span class="member-level level-${getLevelClass(member.level)}">${member.level}</span></div>
                        ${member.note ? `<div>備註: ${member.note}</div>` : ''}
                        <div>建立時間: ${formatDate(member.createdAt)}</div>
                        <div>更新時間: ${formatDate(member.updatedAt)}</div>
                    </div>
                </div>
                <div class="member-actions">
                    <button class="btn" onclick="openMemberForm('${member.id}')"><i class="fas fa-edit"></i> 編輯</button>
                    <button class="btn btn-danger" onclick="confirmDeleteMember('${member.id}')"><i class="fas fa-trash"></i> 刪除</button>
                </div>
            </div>
        `;
    });
    memberList.innerHTML = html;
}

// 產生唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW');
}

// 取得會員等級對應的CSS類別
function getLevelClass(level) {
    switch (level) {
        case '一般會員': return 'normal';
        case '銀卡會員': return 'silver';
        case '金卡會員': return 'gold';
        case '鑽石會員': return 'diamond';
        default: return 'normal';
    }
}

// 儲存資料到localStorage
function saveToLocalStorage() {
    localStorage.setItem('members', JSON.stringify(members));
}

// 同步資料到GitHub
function syncToGitHub() {
    // 在實際應用中，這裡會使用GitHub API來同步資料
    // 由於這是一個前端示範，我們只模擬同步功能
    console.log('資料已同步到GitHub');
    
    // 顯示同步狀態
    const syncStatus = document.createElement('div');
    syncStatus.className = 'sync-status';
    syncStatus.innerHTML = '<i class="fas fa-check-circle sync-success"></i> 資料已成功同步到GitHub';
    
    // 如果已有同步狀態，則移除
    const existingStatus = document.querySelector('.sync-status');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    // 添加到管理區塊
    adminSection.appendChild(syncStatus);
    
    // 3秒後自動移除
    setTimeout(() => {
        syncStatus.remove();
    }, 3000);
}

// 初始化頁面
document.addEventListener('DOMContentLoaded', initPage);

// 添加一些示範會員資料
function addDemoMembers() {
    if (members.length === 0) {
        const demoMembers = [
            {
                id: generateId(),
                name: '張小明',
                phone: '0912345678',
                email: 'ming@example.com',
                level: '金卡會員',
                note: '常客',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: generateId(),
                name: '李美麗',
                phone: '0923456789',
                email: 'mei@example.com',
                level: '鑽石會員',
                note: 'VIP客戶',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: generateId(),
                name: '王大華',
                phone: '0934567890',
                email: 'hua@example.com',
                level: '一般會員',
                note: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        
        members = demoMembers;
        saveToLocalStorage();
    }
}

// 添加示範資料
addDemoMembers();