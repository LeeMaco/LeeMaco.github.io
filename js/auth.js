/**
 * 書籍查詢管理系統 - 認證模塊
 * 使用localStorage實現用戶認證和權限管理
 */

// 認證模塊
const auth = {
    // 存儲鍵名
    STORAGE_KEY: 'bookManagementAuth',
    
    // 預設管理員帳號
    DEFAULT_ADMIN: {
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        displayName: '系統管理員'
    },
    
    /**
     * 初始化認證模塊
     */
    init: function() {
        // 檢查是否已有管理員帳號
        const users = this.getUsers();
        if (users.length === 0) {
            // 初始化預設管理員帳號
            this.addUser(this.DEFAULT_ADMIN);
        }
    },
    
    /**
     * 獲取所有用戶
     * @returns {Array} - 用戶數組
     */
    getUsers: function() {
        const usersJson = localStorage.getItem(this.STORAGE_KEY + '_users');
        return usersJson ? JSON.parse(usersJson) : [];
    },
    
    /**
     * 添加用戶
     * @param {Object} user - 用戶對象
     * @returns {boolean} - 是否添加成功
     */
    addUser: function(user) {
        const users = this.getUsers();
        
        // 檢查用戶名是否已存在
        if (users.some(u => u.username === user.username)) {
            return false;
        }
        
        // 添加用戶
        users.push(user);
        localStorage.setItem(this.STORAGE_KEY + '_users', JSON.stringify(users));
        return true;
    },
    
    /**
     * 用戶登入
     * @param {string} username - 用戶名
     * @param {string} password - 密碼
     * @returns {boolean} - 是否登入成功
     */
    login: function(username, password) {
        const users = this.getUsers();
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            // 存儲登入信息
            const authInfo = {
                username: user.username,
                role: user.role,
                displayName: user.displayName,
                loginTime: new Date().toISOString()
            };
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authInfo));
            return true;
        }
        
        return false;
    },
    
    /**
     * 用戶登出
     */
    logout: function() {
        localStorage.removeItem(this.STORAGE_KEY);
    },
    
    /**
     * 檢查是否已登入
     * @returns {boolean} - 是否已登入
     */
    isAuthenticated: function() {
        return !!localStorage.getItem(this.STORAGE_KEY);
    },
    
    /**
     * 獲取當前登入用戶信息
     * @returns {Object|null} - 用戶信息
     */
    getCurrentUser: function() {
        const authJson = localStorage.getItem(this.STORAGE_KEY);
        return authJson ? JSON.parse(authJson) : null;
    },
    
    /**
     * 檢查是否有管理員權限
     * @returns {boolean} - 是否有管理員權限
     */
    isAdmin: function() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    },
    
    /**
     * 更新用戶信息
     * @param {string} username - 用戶名
     * @param {Object} userData - 用戶數據
     * @returns {boolean} - 是否更新成功
     */
    updateUser: function(username, userData) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.username === username);
        
        if (index === -1) {
            return false;
        }
        
        // 更新用戶信息
        users[index] = { ...users[index], ...userData };
        localStorage.setItem(this.STORAGE_KEY + '_users', JSON.stringify(users));
        
        // 如果更新的是當前登入用戶，同時更新登入信息
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.username === username) {
            const authInfo = {
                ...currentUser,
                displayName: users[index].displayName,
                role: users[index].role
            };
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authInfo));
        }
        
        return true;
    },
    
    /**
     * 刪除用戶
     * @param {string} username - 用戶名
     * @returns {boolean} - 是否刪除成功
     */
    deleteUser: function(username) {
        // 不允許刪除預設管理員
        if (username === this.DEFAULT_ADMIN.username) {
            return false;
        }
        
        const users = this.getUsers();
        const filteredUsers = users.filter(u => u.username !== username);
        
        if (filteredUsers.length === users.length) {
            return false; // 用戶不存在
        }
        
        localStorage.setItem(this.STORAGE_KEY + '_users', JSON.stringify(filteredUsers));
        
        // 如果刪除的是當前登入用戶，則登出
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.username === username) {
            this.logout();
        }
        
        return true;
    },
    
    /**
     * 更改密碼
     * @param {string} username - 用戶名
     * @param {string} oldPassword - 舊密碼
     * @param {string} newPassword - 新密碼
     * @returns {boolean} - 是否更改成功
     */
    changePassword: function(username, oldPassword, newPassword) {
        const users = this.getUsers();
        const user = users.find(u => u.username === username && u.password === oldPassword);
        
        if (!user) {
            return false; // 用戶不存在或密碼錯誤
        }
        
        // 更新密碼
        user.password = newPassword;
        localStorage.setItem(this.STORAGE_KEY + '_users', JSON.stringify(users));
        return true;
    }
};

// 初始化認證模塊
document.addEventListener('DOMContentLoaded', () => {
    auth.init();
});