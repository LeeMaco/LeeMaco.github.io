/**
 * 書籍查詢管理系統 - 權限管理模塊
 * 負責處理管理員權限設置和權限控制
 * 支持多用戶權限管理
 */

const PermissionManager = {
    // 權限設置的存儲鍵名
    PERMISSIONS_KEY: 'admin_permissions',
    
    // 默認權限設置
    defaultPermissions: {
        // 清空垃圾桶功能
        emptyTrash: true,
        // 匯出Excel功能
        exportExcel: true,
        // 匯出JSON功能
        exportJson: true,
        // 匯入Excel功能
        importExcel: true,
        // GitHub設置功能
        githubSettings: true,
        // 備份設置功能
        backupSettings: true,
        // 備份歷史功能
        backupHistory: true,
        // 去除重複功能
        removeDuplicates: true,
        // 用戶管理功能（僅超級管理員可用）
        userManagement: false
    },
    
    // 初始化權限管理
    init: function() {
        // 如果本地存儲中沒有權限設置，則初始化默認設置
        if (!localStorage.getItem(this.PERMISSIONS_KEY)) {
            // 創建一個包含默認超級管理員權限的對象
            const initialPermissions = {
                'default': this.defaultPermissions,
                '1': this.defaultPermissions // 超級管理員ID為1
            };
            localStorage.setItem(this.PERMISSIONS_KEY, JSON.stringify(initialPermissions));
        }
        
        // 確保DOM已完全加載後再添加按鈕
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.addPermissionSettingsButton();
                this.applyPermissions();
            });
        } else {
            // 添加權限設置按鈕到管理員界面
            this.addPermissionSettingsButton();
            
            // 應用權限設置到界面
            this.applyPermissions();
        }
    },
    
    // 添加權限設置按鈕
    addPermissionSettingsButton: function() {
        // 此函數已被禁用，不再添加權限設置按鈕
        console.log('權限設置按鈕功能已禁用');
        
        // 僅添加用戶管理按鈕（僅對超級管理員顯示）
        const adminActions = document.querySelector('.admin-actions-menu');
        if (adminActions && window.UserManager && UserManager.isSuperAdmin()) {
            // 在登出按鈕前添加用戶管理按鈕
            const logoutBtn = document.getElementById('logoutBtn');
            
            // 檢查是否已存在用戶管理按鈕，避免重複添加
            if (!document.getElementById('userManagementBtn')) {
                const userManagementBtn = document.createElement('button');
                userManagementBtn.id = 'userManagementBtn';
                userManagementBtn.className = 'excel-btn';
                userManagementBtn.innerHTML = '<i class="fas fa-users-cog"></i> 用戶管理';
                
                if (logoutBtn) {
                    adminActions.insertBefore(userManagementBtn, logoutBtn);
                } else {
                    adminActions.appendChild(userManagementBtn);
                }
                
                // 綁定用戶管理按鈕點擊事件
                userManagementBtn.addEventListener('click', function() {
                    PermissionManager.showUserManagementModal();
                });
            }
        }
    },
    
    // 顯示權限設置彈窗 (已禁用)
    showPermissionSettingsModal: function() {
        console.log('權限設置功能已禁用');
        // 不再顯示權限設置彈窗
        return;
    },
    
    // 顯示密碼驗證彈窗 (已禁用)
    showPasswordVerificationModal: function() {
        console.log('權限設置驗證功能已禁用');
        // 不再顯示密碼驗證彈窗
        return;
    },
    
    // 驗證成功後顯示權限設置彈窗 (已禁用)
    showPermissionSettingsModalAfterVerification: function() {
        console.log('權限設置功能已禁用');
        // 不再顯示權限設置彈窗
        return;
    },
    
    // 顯示用戶管理彈窗
    showUserManagementModal: function() {
        // 檢查是否為超級管理員
        if (window.UserManager && !UserManager.isSuperAdmin()) {
            alert('您沒有權限訪問用戶管理功能');
            return;
        }
        
        // 檢查彈窗是否已存在
        let userManagementModal = document.getElementById('userManagementModal');
        
        if (!userManagementModal) {
            // 創建彈窗
            userManagementModal = document.createElement('div');
            userManagementModal.id = 'userManagementModal';
            userManagementModal.className = 'modal';
            
            // 創建彈窗內容
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            modalContent.style.width = '80%';
            modalContent.style.maxWidth = '800px';
            
            // 創建關閉按鈕
            const closeBtn = document.createElement('span');
            closeBtn.className = 'close';
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', function() {
                userManagementModal.style.display = 'none';
            });
            
            // 創建標題
            const title = document.createElement('h2');
            title.textContent = '用戶管理';
            
            // 創建說明
            const description = document.createElement('p');
            description.textContent = '管理系統用戶和權限設置。';
            
            // 創建用戶列表區域
            const userListContainer = document.createElement('div');
            userListContainer.className = 'user-list-container';
            
            // 創建添加用戶按鈕
            const addUserBtn = document.createElement('button');
            addUserBtn.className = 'excel-btn';
            addUserBtn.innerHTML = '<i class="fas fa-user-plus"></i> 添加用戶';
            addUserBtn.style.marginBottom = '15px';
            
            // 創建用戶表格
            const userTable = document.createElement('table');
            userTable.className = 'admin-table';
            userTable.style.width = '100%';
            
            // 創建表頭
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            const headers = ['用戶名', '顯示名稱', '角色', '操作'];
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.textContent = headerText;
                headerRow.appendChild(th);
            });
            
            thead.appendChild(headerRow);
            userTable.appendChild(thead);
            
            // 創建表格內容
            const tbody = document.createElement('tbody');
            tbody.id = 'userTableBody';
            userTable.appendChild(tbody);
            
            // 添加到用戶列表容器
            userListContainer.appendChild(addUserBtn);
            userListContainer.appendChild(userTable);
            
            // 組裝彈窗
            modalContent.appendChild(closeBtn);
            modalContent.appendChild(title);
            modalContent.appendChild(description);
            modalContent.appendChild(userListContainer);
            userManagementModal.appendChild(modalContent);
            
            // 添加彈窗到頁面
            document.body.appendChild(userManagementModal);
            
            // 點擊彈窗外部關閉彈窗
            window.addEventListener('click', function(e) {
                if (e.target === userManagementModal) {
                    userManagementModal.style.display = 'none';
                }
            });
            
            // 綁定添加用戶按鈕點擊事件
            addUserBtn.addEventListener('click', function() {
                PermissionManager.showAddUserModal();
            });
        }
        
        // 加載用戶列表
        this.loadUserList();
        
        // 顯示彈窗
        userManagementModal.style.display = 'block';
    },
    
    // 加載用戶列表
    loadUserList: function() {
        if (!window.UserManager) return;
        
        const userTableBody = document.getElementById('userTableBody');
        if (!userTableBody) return;
        
        // 清空表格
        userTableBody.innerHTML = '';
        
        // 獲取所有用戶
        const users = UserManager.getAllUsers();
        
        // 填充表格
        users.forEach(user => {
            const row = document.createElement('tr');
            
            // 用戶名
            const usernameCell = document.createElement('td');
            usernameCell.textContent = user.username;
            row.appendChild(usernameCell);
            
            // 顯示名稱
            const displayNameCell = document.createElement('td');
            displayNameCell.textContent = user.displayName || '-';
            row.appendChild(displayNameCell);
            
            // 角色
            const roleCell = document.createElement('td');
            roleCell.textContent = user.isSuperAdmin ? '超級管理員' : '管理員';
            row.appendChild(roleCell);
            
            // 操作
            const actionCell = document.createElement('td');
            
            // 編輯按鈕
            const editBtn = document.createElement('button');
            editBtn.className = 'action-btn edit-btn';
            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
            editBtn.title = '編輯用戶';
            editBtn.addEventListener('click', function() {
                PermissionManager.showEditUserModal(user.id);
            });
            
            // 權限設置按鈕
            const permissionBtn = document.createElement('button');
            permissionBtn.className = 'action-btn permission-btn';
            permissionBtn.innerHTML = '<i class="fas fa-user-lock"></i>';
            permissionBtn.title = '設置權限';
            permissionBtn.addEventListener('click', function() {
                PermissionManager.showUserPermissionModal(user.id);
            });
            
            // 刪除按鈕（不允許刪除超級管理員）
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn delete-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.title = '刪除用戶';
            
            if (user.isSuperAdmin) {
                deleteBtn.disabled = true;
                deleteBtn.style.opacity = '0.5';
                deleteBtn.title = '無法刪除超級管理員';
            } else {
                deleteBtn.addEventListener('click', function() {
                    if (confirm(`確定要刪除用戶 ${user.username} 嗎？`)) {
                        UserManager.deleteUser(user.id);
                        PermissionManager.loadUserList(); // 重新加載用戶列表
                    }
                });
            }
            
            actionCell.appendChild(editBtn);
            actionCell.appendChild(permissionBtn);
            actionCell.appendChild(deleteBtn);
            row.appendChild(actionCell);
            
            userTableBody.appendChild(row);
        });
    },
    
    // 顯示添加用戶模態框
    showAddUserModal: function() {
        // 創建模態框
        let addUserModal = document.getElementById('addUserModal');
        
        if (!addUserModal) {
            addUserModal = document.createElement('div');
            addUserModal.id = 'addUserModal';
            addUserModal.className = 'modal';
            
            // 創建模態框內容
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            
            // 創建關閉按鈕
            const closeBtn = document.createElement('span');
            closeBtn.className = 'close';
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', function() {
                addUserModal.style.display = 'none';
            });
            
            // 創建標題
            const title = document.createElement('h2');
            title.textContent = '添加用戶';
            
            // 創建表單
            const form = document.createElement('form');
            form.id = 'addUserForm';
            
            // 用戶名
            const usernameGroup = document.createElement('div');
            usernameGroup.className = 'form-group';
            
            const usernameLabel = document.createElement('label');
            usernameLabel.htmlFor = 'newUsername';
            usernameLabel.textContent = '用戶名：';
            
            const usernameInput = document.createElement('input');
            usernameInput.type = 'text';
            usernameInput.id = 'newUsername';
            usernameInput.required = true;
            
            usernameGroup.appendChild(usernameLabel);
            usernameGroup.appendChild(usernameInput);
            
            // 密碼
            const passwordGroup = document.createElement('div');
            passwordGroup.className = 'form-group';
            
            const passwordLabel = document.createElement('label');
            passwordLabel.htmlFor = 'newPassword';
            passwordLabel.textContent = '密碼：';
            
            const passwordInput = document.createElement('input');
            passwordInput.type = 'password';
            passwordInput.id = 'newPassword';
            passwordInput.required = true;
            
            passwordGroup.appendChild(passwordLabel);
            passwordGroup.appendChild(passwordInput);
            
            // 顯示名稱
            const displayNameGroup = document.createElement('div');
            displayNameGroup.className = 'form-group';
            
            const displayNameLabel = document.createElement('label');
            displayNameLabel.htmlFor = 'newDisplayName';
            displayNameLabel.textContent = '顯示名稱：';
            
            const displayNameInput = document.createElement('input');
            displayNameInput.type = 'text';
            displayNameInput.id = 'newDisplayName';
            
            displayNameGroup.appendChild(displayNameLabel);
            displayNameGroup.appendChild(displayNameInput);
            
            // 提交按鈕
            const submitBtn = document.createElement('button');
            submitBtn.type = 'submit';
            submitBtn.textContent = '添加';
            
            // 添加到表單
            form.appendChild(usernameGroup);
            form.appendChild(passwordGroup);
            form.appendChild(displayNameGroup);
            form.appendChild(submitBtn);
            
            // 綁定表單提交事件
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const username = document.getElementById('newUsername').value;
                const password = document.getElementById('newPassword').value;
                const displayName = document.getElementById('newDisplayName').value;
                
                if (window.UserManager) {
                    const result = UserManager.addUser(username, password, displayName);
                    if (result.success) {
                        alert('用戶添加成功');
                        addUserModal.style.display = 'none';
                        PermissionManager.loadUserList(); // 重新加載用戶列表
                    } else {
                        alert('添加用戶失敗: ' + result.message);
                    }
                }
            });
            
            // 組裝模態框
            modalContent.appendChild(closeBtn);
            modalContent.appendChild(title);
            modalContent.appendChild(form);
            addUserModal.appendChild(modalContent);
            
            // 添加到頁面
            document.body.appendChild(addUserModal);
        }
        
        // 重置表單
        document.getElementById('addUserForm').reset();
        
        // 顯示模態框
        addUserModal.style.display = 'block';
    },
    
    // 顯示編輯用戶模態框
    showEditUserModal: function(userId) {
        if (!window.UserManager) return;
        
        // 獲取用戶信息
        const user = UserManager.getUserById(userId);
        if (!user) {
            alert('用戶不存在');
            return;
        }
        
        // 創建模態框
        let editUserModal = document.getElementById('editUserModal');
        
        if (!editUserModal) {
            editUserModal = document.createElement('div');
            editUserModal.id = 'editUserModal';
            editUserModal.className = 'modal';
            
            // 創建模態框內容
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            
            // 創建關閉按鈕
            const closeBtn = document.createElement('span');
            closeBtn.className = 'close';
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', function() {
                editUserModal.style.display = 'none';
            });
            
            // 創建標題
            const title = document.createElement('h2');
            title.textContent = '編輯用戶';
            
            // 創建表單
            const form = document.createElement('form');
            form.id = 'editUserForm';
            
            // 隱藏的用戶ID
            const userIdInput = document.createElement('input');
            userIdInput.type = 'hidden';
            userIdInput.id = 'editUserId';
            
            // 用戶名（只讀）
            const usernameGroup = document.createElement('div');
            usernameGroup.className = 'form-group';
            
            const usernameLabel = document.createElement('label');
            usernameLabel.htmlFor = 'editUsername';
            usernameLabel.textContent = '用戶名：';
            
            const usernameInput = document.createElement('input');
            usernameInput.type = 'text';
            usernameInput.id = 'editUsername';
            usernameInput.readOnly = true;
            
            usernameGroup.appendChild(usernameLabel);
            usernameGroup.appendChild(usernameInput);
            
            // 新密碼（可選）
            const passwordGroup = document.createElement('div');
            passwordGroup.className = 'form-group';
            
            const passwordLabel = document.createElement('label');
            passwordLabel.htmlFor = 'editPassword';
            passwordLabel.textContent = '新密碼（留空表示不修改）：';
            
            const passwordInput = document.createElement('input');
            passwordInput.type = 'password';
            passwordInput.id = 'editPassword';
            
            passwordGroup.appendChild(passwordLabel);
            passwordGroup.appendChild(passwordInput);
            
            // 顯示名稱
            const displayNameGroup = document.createElement('div');
            displayNameGroup.className = 'form-group';
            
            const displayNameLabel = document.createElement('label');
            displayNameLabel.htmlFor = 'editDisplayName';
            displayNameLabel.textContent = '顯示名稱：';
            
            const displayNameInput = document.createElement('input');
            displayNameInput.type = 'text';
            displayNameInput.id = 'editDisplayName';
            
            displayNameGroup.appendChild(displayNameLabel);
            displayNameGroup.appendChild(displayNameInput);
            
            // 提交按鈕
            const submitBtn = document.createElement('button');
            submitBtn.type = 'submit';
            submitBtn.textContent = '保存';
            
            // 添加到表單
            form.appendChild(userIdInput);
            form.appendChild(usernameGroup);
            form.appendChild(passwordGroup);
            form.appendChild(displayNameGroup);
            form.appendChild(submitBtn);
            
            // 綁定表單提交事件
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const userId = document.getElementById('editUserId').value;
                const password = document.getElementById('editPassword').value;
                const displayName = document.getElementById('editDisplayName').value;
                
                if (window.UserManager) {
                    const result = UserManager.updateUser(userId, { password, displayName });
                    if (result.success) {
                        alert('用戶更新成功');
                        editUserModal.style.display = 'none';
                        PermissionManager.loadUserList(); // 重新加載用戶列表
                    } else {
                        alert('更新用戶失敗: ' + result.message);
                    }
                }
            });
            
            // 組裝模態框
            modalContent.appendChild(closeBtn);
            modalContent.appendChild(title);
            modalContent.appendChild(form);
            editUserModal.appendChild(modalContent);
            
            // 添加到頁面
            document.body.appendChild(editUserModal);
        }
        
        // 填充表單數據
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUsername').value = user.username;
        document.getElementById('editPassword').value = '';
        document.getElementById('editDisplayName').value = user.displayName || '';
        
        // 顯示模態框
        editUserModal.style.display = 'block';
    },
    
    // 顯示用戶權限設置模態框
    showUserPermissionModal: function(userId) {
        if (!window.UserManager) return;
        
        // 獲取用戶信息
        const user = UserManager.getUserById(userId);
        if (!user) {
            alert('用戶不存在');
            return;
        }
        
        // 獲取用戶權限
        const permissions = this.getUserPermissions(userId);
        
        // 創建模態框
        let userPermissionModal = document.getElementById('userPermissionModal');
        
        if (!userPermissionModal) {
            userPermissionModal = document.createElement('div');
            userPermissionModal.id = 'userPermissionModal';
            userPermissionModal.className = 'modal';
            
            // 創建模態框內容
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            
            // 創建關閉按鈕
            const closeBtn = document.createElement('span');
            closeBtn.className = 'close';
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', function() {
                userPermissionModal.style.display = 'none';
            });
            
            // 創建標題
            const title = document.createElement('h2');
            title.id = 'userPermissionTitle';
            
            // 創建說明
            const description = document.createElement('p');
            description.id = 'userPermissionDescription';
            
            // 創建表單
            const form = document.createElement('form');
            form.id = 'userPermissionForm';
            
            // 隱藏的用戶ID
            const userIdInput = document.createElement('input');
            userIdInput.type = 'hidden';
            userIdInput.id = 'permissionUserId';
            
            form.appendChild(userIdInput);
            
            // 創建權限選項
            const permissionOptions = [
                { id: 'emptyTrash', label: '清空垃圾桶' },
                { id: 'exportExcel', label: '匯出Excel' },
                { id: 'exportJson', label: '匯出JSON' },
                { id: 'importExcel', label: '匯入Excel' },
                { id: 'githubSettings', label: 'GitHub設置' },
                { id: 'backupSettings', label: '備份設置' },
                { id: 'backupHistory', label: '備份歷史' },
                { id: 'removeDuplicates', label: '去除重複' }
            ];
            
            // 如果是超級管理員，添加用戶管理權限選項
            if (user.isSuperAdmin) {
                permissionOptions.push({ id: 'userManagement', label: '用戶管理' });
            }
            
            // 添加權限選項到表單
            permissionOptions.forEach(option => {
                const formGroup = document.createElement('div');
                formGroup.className = 'form-group';
                formGroup.style.display = 'flex';
                formGroup.style.alignItems = 'center';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = 'perm_' + option.id;
                checkbox.style.marginRight = '8px';
                
                const label = document.createElement('label');
                label.htmlFor = 'perm_' + option.id;
                label.textContent = option.label;
                
                formGroup.appendChild(checkbox);
                formGroup.appendChild(label);
                form.appendChild(formGroup);
            });
            
            // 創建提交按鈕
            const submitBtn = document.createElement('button');
            submitBtn.type = 'submit';
            submitBtn.textContent = '保存設置';
            form.appendChild(submitBtn);
            
            // 綁定表單提交事件
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const userId = document.getElementById('permissionUserId').value;
                
                // 獲取表單數據
                const newPermissions = {};
                permissionOptions.forEach(option => {
                    newPermissions[option.id] = document.getElementById('perm_' + option.id).checked;
                });
                
                // 保存權限設置
                PermissionManager.saveUserPermissions(userId, newPermissions);
                
                // 關閉彈窗
                userPermissionModal.style.display = 'none';
                
                // 顯示成功消息
                alert('權限設置已保存');
            });
            
            // 組裝模態框
            modalContent.appendChild(closeBtn);
            modalContent.appendChild(title);
            modalContent.appendChild(description);
            modalContent.appendChild(form);
            userPermissionModal.appendChild(modalContent);
            
            // 添加到頁面
            document.body.appendChild(userPermissionModal);
        }
        
        // 更新標題和說明
        document.getElementById('userPermissionTitle').textContent = `設置 ${user.displayName || user.username} 的權限`;
        document.getElementById('userPermissionDescription').textContent = `您正在為用戶 ${user.username} 設置功能權限。`;
        
        // 填充表單數據
        document.getElementById('permissionUserId').value = user.id;
        
        // 設置權限選項的狀態
        const permissionOptions = [
            'emptyTrash', 'exportExcel', 'exportJson', 'importExcel', 
            'githubSettings', 'backupSettings', 'backupHistory', 'removeDuplicates'
        ];
        
        if (user.isSuperAdmin) {
            permissionOptions.push('userManagement');
        }
        
        permissionOptions.forEach(option => {
            const checkbox = document.getElementById('perm_' + option);
            if (checkbox) {
                checkbox.checked = permissions[option] !== undefined ? permissions[option] : true;
            }
        });
        
        // 顯示模態框
        userPermissionModal.style.display = 'block';
    },
    
    // 獲取所有用戶的權限設置
    getAllPermissions: function() {
        const permissions = localStorage.getItem(this.PERMISSIONS_KEY);
        return permissions ? JSON.parse(permissions) : { 'default': this.defaultPermissions };
    },
    
    // 獲取指定用戶的權限設置
    getUserPermissions: function(userId) {
        const allPermissions = this.getAllPermissions();
        // 如果指定用戶的權限存在，則返回；否則返回默認權限
        return allPermissions[userId] || allPermissions['default'] || this.defaultPermissions;
    },
    
    // 獲取當前用戶的權限設置
    getPermissions: function() {
        // 獲取當前登錄用戶
        const currentUser = window.UserManager ? UserManager.getCurrentUser() : null;
        if (currentUser) {
            return this.getUserPermissions(currentUser.id);
        }
        return this.getUserPermissions('default');
    },
    
    // 保存指定用戶的權限設置
    saveUserPermissions: function(userId, permissions) {
        const allPermissions = this.getAllPermissions();
        allPermissions[userId] = permissions;
        localStorage.setItem(this.PERMISSIONS_KEY, JSON.stringify(allPermissions));
        
        // 同步權限設置到GitHub Pages
        this.syncPermissionsToGitHub(allPermissions);
    },
    
    // 同步權限設置到GitHub Pages
    syncPermissionsToGitHub: function(permissions) {
        // 檢查是否有GitHub設置
        const token = localStorage.getItem('githubToken');
        const repo = localStorage.getItem('githubRepo');
        
        if (!token || !repo) {
            console.log('未設置GitHub訪問令牌或倉庫信息，無法同步權限設置');
            return false;
        }
        
        // 準備權限數據
        const jsonContent = JSON.stringify(permissions, null, 2);
        
        // 創建上傳狀態元素
        let statusElement = document.getElementById('permissionUploadStatus');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'permissionUploadStatus';
            statusElement.style.position = 'fixed';
            statusElement.style.bottom = '20px';
            statusElement.style.right = '20px';
            statusElement.style.padding = '10px 15px';
            statusElement.style.backgroundColor = '#f8f9fa';
            statusElement.style.border = '1px solid #ddd';
            statusElement.style.borderRadius = '4px';
            statusElement.style.zIndex = '1000';
            statusElement.style.fontWeight = 'bold';
            document.body.appendChild(statusElement);
        }
        
        statusElement.textContent = '正在同步權限設置到GitHub...';
        statusElement.style.color = '#3498db';
        
        // 使用現有的uploadToGitHub函數上傳
        try {
            // 檢查uploadToGitHub函數是否存在
            if (typeof uploadToGitHub === 'function') {
                uploadToGitHub(jsonContent, 'permissions.json')
                    .then(() => {
                        console.log('權限設置同步到GitHub成功');
                        statusElement.textContent = '權限設置同步成功！';
                        statusElement.style.color = '#2ecc71';
                        setTimeout(() => {
                            statusElement.textContent = '';
                        }, 5000);
                    })
                    .catch(error => {
                        console.error('權限設置同步到GitHub失敗:', error);
                        statusElement.textContent = `同步失敗: ${error.message}`;
                        statusElement.style.color = '#e74c3c';
                    });
            } else {
                console.error('uploadToGitHub函數不存在，無法同步權限設置');
                statusElement.textContent = '同步失敗: 上傳功能不可用';
                statusElement.style.color = '#e74c3c';
            }
        } catch (error) {
            console.error('嘗試同步權限設置時發生錯誤:', error);
            statusElement.textContent = `同步失敗: ${error.message}`;
            statusElement.style.color = '#e74c3c';
        }
    },
    
    // 保存當前用戶的權限設置
    savePermissions: function(permissions) {
        // 獲取當前登錄用戶
        const currentUser = window.UserManager ? UserManager.getCurrentUser() : null;
        if (currentUser) {
            this.saveUserPermissions(currentUser.id, permissions);
        } else {
            this.saveUserPermissions('default', permissions);
        }
    },
    
    // 檢查功能是否啟用
    isEnabled: function(feature) {
        const permissions = this.getPermissions();
        return permissions[feature] === true;
    },
    
    // 應用權限設置到界面
    applyPermissions: function() {
        // 獲取權限設置
        const permissions = this.getPermissions();
        
        // 應用到清空垃圾桶按鈕
        const emptyTrashBtn = document.getElementById('emptyTrashBtn');
        if (emptyTrashBtn) {
            if (permissions.emptyTrash) {
                emptyTrashBtn.removeAttribute('disabled');
                emptyTrashBtn.style.opacity = '1';
            } else {
                emptyTrashBtn.setAttribute('disabled', 'disabled');
                emptyTrashBtn.style.opacity = '0.5';
                emptyTrashBtn.title = '此功能已被管理員禁用';
            }
        }
        
        // 應用到匯出Excel按鈕
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        if (exportExcelBtn) {
            if (permissions.exportExcel) {
                exportExcelBtn.removeAttribute('disabled');
                exportExcelBtn.style.opacity = '1';
            } else {
                exportExcelBtn.setAttribute('disabled', 'disabled');
                exportExcelBtn.style.opacity = '0.5';
                exportExcelBtn.title = '此功能已被管理員禁用';
            }
        }
        
        // 應用到匯出JSON按鈕
        const exportJsonBtn = document.getElementById('exportJsonBtn');
        if (exportJsonBtn) {
            if (permissions.exportJson) {
                exportJsonBtn.removeAttribute('disabled');
                exportJsonBtn.style.opacity = '1';
            } else {
                exportJsonBtn.setAttribute('disabled', 'disabled');
                exportJsonBtn.style.opacity = '0.5';
                exportJsonBtn.title = '此功能已被管理員禁用';
            }
        }
        
        // 應用到匯入Excel按鈕
        const importExcelBtn = document.getElementById('importExcelBtn');
        if (importExcelBtn) {
            if (permissions.importExcel) {
                importExcelBtn.removeAttribute('disabled');
                importExcelBtn.style.opacity = '1';
            } else {
                importExcelBtn.setAttribute('disabled', 'disabled');
                importExcelBtn.style.opacity = '0.5';
                importExcelBtn.title = '此功能已被管理員禁用';
            }
        }
        
        // 應用到GitHub設置按鈕
        const githubSettingsBtn = document.getElementById('githubSettingsBtn');
        if (githubSettingsBtn) {
            if (permissions.githubSettings) {
                githubSettingsBtn.removeAttribute('disabled');
                githubSettingsBtn.style.opacity = '1';
            } else {
                githubSettingsBtn.setAttribute('disabled', 'disabled');
                githubSettingsBtn.style.opacity = '0.5';
                githubSettingsBtn.title = '此功能已被管理員禁用';
            }
        }
        
        // 應用到備份設置按鈕
        const backupSettingsBtn = document.getElementById('backupSettingsBtn');
        if (backupSettingsBtn) {
            if (permissions.backupSettings) {
                backupSettingsBtn.removeAttribute('disabled');
                backupSettingsBtn.style.opacity = '1';
            } else {
                backupSettingsBtn.setAttribute('disabled', 'disabled');
                backupSettingsBtn.style.opacity = '0.5';
                backupSettingsBtn.title = '此功能已被管理員禁用';
            }
        }
        
        // 應用到備份歷史按鈕
        const backupHistoryBtn = document.getElementById('backupHistoryBtn');
        if (backupHistoryBtn) {
            if (permissions.backupHistory) {
                backupHistoryBtn.removeAttribute('disabled');
                backupHistoryBtn.style.opacity = '1';
            } else {
                backupHistoryBtn.setAttribute('disabled', 'disabled');
                backupHistoryBtn.style.opacity = '0.5';
                backupHistoryBtn.title = '此功能已被管理員禁用';
            }
        }
        
        // 應用到去除重複按鈕
        const removeDuplicatesBtn = document.getElementById('removeDuplicatesBtn');
        if (removeDuplicatesBtn) {
            if (permissions.removeDuplicates) {
                removeDuplicatesBtn.removeAttribute('disabled');
                removeDuplicatesBtn.style.opacity = '1';
            } else {
                removeDuplicatesBtn.setAttribute('disabled', 'disabled');
                removeDuplicatesBtn.style.opacity = '0.5';
                removeDuplicatesBtn.title = '此功能已被管理員禁用';
            }
        }
    }
};

// 在頁面加載完成後初始化權限管理
document.addEventListener('DOMContentLoaded', function() {
    // 檢查是否已登入
    if (localStorage.getItem('isLoggedIn')) {
        // 初始化權限管理
        PermissionManager.init(); // 直接調用初始化方法，不使用setTimeout
    }
});