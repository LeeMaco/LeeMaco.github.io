/**
 * 認證模組 - 處理管理員登入和權限控制
 */

class Auth {
    constructor() {
        // 初始化認證狀態
        this.initAuth();
    }
    
    /**
     * 初始化認證狀態
     */
    initAuth() {
        // 檢查是否已設置管理員帳號
        if (!localStorage.getItem('adminAccount')) {
            // 設置默認管理員帳號（實際應用中應使用更安全的方式）
            localStorage.setItem('adminAccount', JSON.stringify({
                username: 'admin',
                password: 'admin123'
            }));
        }
    }
    
    /**
     * 檢查登入狀態
     */
    checkLoginStatus() {
        const isLoggedIn = this.isLoggedIn();
        
        // 更新UI元素顯示
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const adminPanel = document.getElementById('adminPanel');
        const actionHeader = document.getElementById('actionHeader');
        
        if (isLoggedIn) {
            loginBtn.classList.add('d-none');
            logoutBtn.classList.remove('d-none');
            adminPanel.classList.remove('d-none');
            actionHeader.classList.remove('d-none');
            
            // 設置登出事件
            logoutBtn.onclick = () => this.logout();
        } else {
            loginBtn.classList.remove('d-none');
            logoutBtn.classList.add('d-none');
            adminPanel.classList.add('d-none');
            actionHeader.classList.add('d-none');
        }
        
        // 設置登入表單提交事件
        const loginForm = document.getElementById('loginForm');
        loginForm.onsubmit = (e) => {
            e.preventDefault();
            this.login();
        };
    }
    
    /**
     * 登入
     */
    login() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const loginError = document.getElementById('loginError');
        
        // 獲取管理員帳號
        const adminAccount = JSON.parse(localStorage.getItem('adminAccount'));
        
        // 驗證帳號密碼
        if (username === adminAccount.username && password === adminAccount.password) {
            // 設置登入狀態
            localStorage.setItem('isLoggedIn', 'true');
            
            // 關閉登入彈窗
            const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            modal.hide();
            
            // 更新UI
            this.checkLoginStatus();
            
            // 重新載入書籍列表
            if (window.app) {
                window.app.loadBooks();
            }
        } else {
            // 顯示錯誤訊息
            loginError.textContent = '用戶名或密碼錯誤';
            loginError.classList.remove('d-none');
        }
    }
    
    /**
     * 登出
     */
    logout() {
        // 清除登入狀態
        localStorage.removeItem('isLoggedIn');
        
        // 更新UI
        this.checkLoginStatus();
        
        // 重新載入書籍列表
        if (window.app) {
            window.app.loadBooks();
        }
    }
    
    /**
     * 檢查是否已登入
     * @returns {boolean} 是否已登入
     */
    isLoggedIn() {
        return localStorage.getItem('isLoggedIn') === 'true';
    }
    
    /**
     * 更改管理員密碼
     * @param {string} newPassword 新密碼
     * @returns {boolean} 是否成功更改
     */
    changePassword(newPassword) {
        // 檢查是否已登入
        if (!this.isLoggedIn()) {
            return false;
        }
        
        // 獲取管理員帳號
        const adminAccount = JSON.parse(localStorage.getItem('adminAccount'));
        
        // 更新密碼
        adminAccount.password = newPassword;
        localStorage.setItem('adminAccount', JSON.stringify(adminAccount));
        
        return true;
    }
}

// 初始化認證實例
const auth = new Auth();