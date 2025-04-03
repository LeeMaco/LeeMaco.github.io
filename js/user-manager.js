/**
 * 書籍查詢管理系統 - 用戶管理模塊
 * 負責處理用戶的添加、編輯、刪除和權限管理
 */

const UserManager = {
    // 用戶數據的存儲鍵名
    USERS_KEY: 'admin_users',
    
    // 當前登錄用戶的存儲鍵名
    CURRENT_USER_KEY: 'current_user',
    
    // 初始化用戶管理
    init: function() {
        // 如果本地存儲中沒有用戶數據，則初始化默認超級管理員
        if (!localStorage.getItem(this.USERS_KEY)) {
            const defaultUsers = [
                {
                    id: '1',
                    username: 'admin',
                    password: 'admin123',
                    displayName: '超級管理員',
                    isSuperAdmin: true,
                    createdAt: new Date().toISOString()
                }
            ];
            localStorage.setItem(this.USERS_KEY, JSON.stringify(defaultUsers));
        }
        
        // 檢查登錄狀態
        if (localStorage.getItem('isLoggedIn') && !localStorage.getItem(this.CURRENT_USER_KEY)) {
            // 如果已登錄但沒有當前用戶信息，則設置為默認超級管理員
            const users = this.getAllUsers();
            if (users.length > 0) {
                const superAdmin = users.find(user => user.isSuperAdmin) || users[0];
                this.setCurrentUser(superAdmin);
            }
        }
    },
    
    // 獲取所有用戶
    getAllUsers: function() {
        const users = localStorage.getItem(this.USERS_KEY);
        return users ? JSON.parse(users) : [];
    },
    
    // 根據ID獲取用戶
    getUserById: function(id) {
        const users = this.getAllUsers();
        return users.find(user => user.id === id);
    },
    
    // 根據用戶名獲取用戶
    getUserByUsername: function(username) {
        const users = this.getAllUsers();
        return users.find(user => user.username === username);
    },
    
    // 添加新用戶
    addUser: function(username, password, displayName = '') {
        // 檢查用戶名是否已存在
        if (this.getUserByUsername(username)) {
            return { success: false, message: '用戶名已存在' };
        }
        
        // 獲取所有用戶
        const users = this.getAllUsers();
        
        // 創建新用戶
        const newUser = {
            id: Date.now().toString(),
            username,
            password,
            displayName,
            isSuperAdmin: false,
            createdAt: new Date().toISOString()
        };
        
        // 添加到用戶列表
        users.push(newUser);
        
        // 保存到本地存儲
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        
        return { success: true, user: newUser };
    },
    
    // 更新用戶信息
    updateUser: function(id, userData) {
        // 獲取所有用戶
        const users = this.getAllUsers();
        
        // 查找用戶
        const index = users.findIndex(user => user.id === id);
        if (index === -1) {
            return { success: false, message: '用戶不存在' };
        }
        
        // 更新用戶信息
        const user = users[index];
        
        // 如果提供了新密碼，則更新密碼
        if (userData.password) {
            user.password = userData.password;
        }
        
        // 更新顯示名稱
        if (userData.displayName !== undefined) {
            user.displayName = userData.displayName;
        }
        
        // 更新超級管理員狀態（如果提供）
        if (userData.isSuperAdmin !== undefined) {
            user.isSuperAdmin = userData.isSuperAdmin;
        }
        
        // 更新修改時間
        user.updatedAt = new Date().toISOString();
        
        // 保存到本地存儲
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
        
        // 如果更新的是當前用戶，則更新當前用戶信息
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === id) {
            this.setCurrentUser(user);
        }
        
        return { success: true, user };
    },
    
    // 刪除用戶
    deleteUser: function(id) {
        // 獲取所有用戶
        const users = this.getAllUsers();
        
        // 查找用戶
        const user = users.find(user => user.id === id);
        if (!user) {
            return { success: false, message: '用戶不存在' };
        }
        
        // 不允許刪除超級管理員
        if (user.isSuperAdmin) {
            return { success: false, message: '不能刪除超級管理員' };
        }
        
        // 從用戶列表中移除
        const filteredUsers = users.filter(user => user.id !== id);
        
        // 保存到本地存儲
        localStorage.setItem(this.USERS_KEY, JSON.stringify(filteredUsers));
        
        return { success: true };
    },
    
    // 驗證用戶登錄
    validateLogin: function(username, password) {
        const user = this.getUserByUsername(username);
        if (user && user.password === password) {
            // 設置當前用戶
            this.setCurrentUser(user);
            
            // 登入成功後同步權限設置
            if (window.PermissionSync && typeof window.PermissionSync.syncPermissionsAfterLogin === 'function') {
                // 使用setTimeout確保不阻塞登入過程
                setTimeout(() => {
                    window.PermissionSync.syncPermissionsAfterLogin(user);
                }, 500);
            }
            
            return { success: true, user };
        }
        return { success: false, message: '用戶名或密碼錯誤' };
    },
    
    // 設置當前用戶
    setCurrentUser: function(user) {
        // 存儲用戶信息（不包含密碼）
        const userInfo = { ...user };
        delete userInfo.password;
        
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(userInfo));
        localStorage.setItem('isLoggedIn', 'true');
    },
    
    // 獲取當前用戶
    getCurrentUser: function() {
        const userInfo = localStorage.getItem(this.CURRENT_USER_KEY);
        return userInfo ? JSON.parse(userInfo) : null;
    },
    
    // 檢查是否為超級管理員
    isSuperAdmin: function() {
        const currentUser = this.getCurrentUser();
        return currentUser && currentUser.isSuperAdmin;
    },
    
    // 登出
    logout: function() {
        localStorage.removeItem(this.CURRENT_USER_KEY);
        localStorage.removeItem('isLoggedIn');
    }
};

// 在頁面加載完成後初始化用戶管理
document.addEventListener('DOMContentLoaded', function() {
    // 初始化用戶管理
    UserManager.init();
});