/**
 * 書籍查詢管理系統 - 登入驗證模塊
 * 負責處理特定功能的密碼驗證
 */

const AuthValidator = {
    // 需要驗證的按鈕ID列表
    PROTECTED_BUTTONS: [
        'removeDuplicatesBtn',  // 去除重複
        'exportExcelBtn',      // 匯出Excel
        'exportJsonBtn',       // 匯出JSON
        'importExcelBtn',      // 匯入Excel
        'githubSettingsBtn',   // GitHub設置
        'backupSettingsBtn',   // 備份設置
        'backupHistoryBtn',    // 備份歷史
        'trashBtn'             // 垃圾桶
    ],
    
    // 密碼
    PASSWORD: '0211',
    
    // 初始化驗證功能
    init: function() {
        // 確保DOM已完全加載後再添加事件監聽器
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupButtonValidation();
            });
        } else {
            this.setupButtonValidation();
        }
    },
    
    // 設置按鈕驗證
    setupButtonValidation: function() {
        // 為每個受保護的按鈕添加點擊事件監聽器
        this.PROTECTED_BUTTONS.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                // 保存原始的點擊事件處理函數
                const originalClickHandler = button.onclick;
                
                // 保存原始的所有事件監聽器
                const originalEventListeners = [];
                if (button._eventListeners && button._eventListeners.click) {
                    originalEventListeners.push(...button._eventListeners.click);
                }
                
                // 移除所有現有的點擊事件處理函數
                button.onclick = null;
                
                // 創建一個標記屬性，防止重複添加驗證
                if (button.hasAttribute('auth-protected')) {
                    return; // 如果已經添加過驗證，則跳過
                }
                button.setAttribute('auth-protected', 'true');
                
                // 添加新的點擊事件監聽器
                const authHandler = (event) => {
                    // 先保存事件對象的副本，因為在異步操作中原始事件對象可能不可用
                    const eventCopy = {
                        preventDefault: () => {},
                        stopPropagation: () => {},
                        target: event.target,
                        currentTarget: event.currentTarget,
                        type: event.type
                    };
                    
                    // 阻止事件冒泡和默認行為
                    event.preventDefault();
                    event.stopPropagation();
                    
                    // 顯示密碼驗證對話框
                    this.showPasswordVerificationModal(() => {
                        console.log('密碼驗證成功，準備執行功能:', buttonId);
                        
                        try {
                            // 方法1：直接執行對應功能
                            switch(buttonId) {
                                case 'removeDuplicatesBtn':
                                    if (window.removeDuplicatesModal) {
                                        console.log('顯示去除重複對話框');
                                        window.removeDuplicatesModal.style.display = 'block';
                                    } else {
                                        console.error('找不到去除重複對話框元素');
                                    }
                                    break;
                                case 'exportExcelBtn':
                                    if (typeof window.exportToExcel === 'function') {
                                        console.log('執行匯出Excel功能');
                                        window.exportToExcel();
                                    } else {
                                        console.error('找不到匯出Excel功能');
                                    }
                                    break;
                                case 'exportJsonBtn':
                                    if (typeof window.exportToJSON === 'function') {
                                        console.log('執行匯出JSON功能');
                                        window.exportToJSON();
                                    } else {
                                        console.error('找不到匯出JSON功能');
                                    }
                                    break;
                                case 'importExcelBtn':
                                    if (window.importExcelModal) {
                                        console.log('顯示匯入Excel對話框');
                                        window.importExcelModal.style.display = 'block';
                                    } else {
                                        console.error('找不到匯入Excel對話框元素');
                                    }
                                    break;
                                case 'githubSettingsBtn':
                                    if (window.githubSettingsModal) {
                                        console.log('顯示GitHub設置對話框');
                                        window.githubSettingsModal.style.display = 'block';
                                    } else {
                                        console.error('找不到GitHub設置對話框元素');
                                    }
                                    break;
                                case 'backupSettingsBtn':
                                    if (window.BackupUI && typeof window.BackupUI.showBackupSettingsModal === 'function') {
                                        console.log('顯示備份設置對話框');
                                        window.BackupUI.showBackupSettingsModal();
                                    } else {
                                        console.error('找不到備份設置功能');
                                    }
                                    break;
                                case 'backupHistoryBtn':
                                    if (window.BackupUI && typeof window.BackupUI.showBackupHistoryModal === 'function') {
                                        console.log('顯示備份歷史對話框');
                                        window.BackupUI.showBackupHistoryModal();
                                    } else {
                                        console.error('找不到備份歷史功能');
                                    }
                                    break;
                                case 'trashBtn':
                                    if (window.trashModal) {
                                        console.log('顯示垃圾桶對話框');
                                        window.trashModal.style.display = 'block';
                                        if (typeof window.loadTrashBooks === 'function') {
                                            window.loadTrashBooks();
                                        }
                                    } else {
                                        console.error('找不到垃圾桶對話框元素');
                                    }
                                    break;
                                default:
                                    console.log('未知按鈕ID:', buttonId);
                                    
                                    // 嘗試執行原始處理函數
                                    if (originalClickHandler) {
                                        console.log('執行原始點擊處理函數');
                                        originalClickHandler.call(button, eventCopy);
                                    } else if (originalEventListeners.length > 0) {
                                        console.log('執行原始事件監聽器');
                                        originalEventListeners.forEach(listener => {
                                            if (typeof listener === 'function') {
                                                listener.call(button, eventCopy);
                                            }
                                        });
                                    }
                            }
                        } catch (error) {
                            console.error('執行功能時發生錯誤:', error);
                        }
                    });
                };
                
                // 使用捕獲階段添加事件監聽器
                button.addEventListener('click', authHandler, true);
                
                // 存儲事件處理函數引用，以便後續可能的清理
                if (!button._eventListeners) {
                    button._eventListeners = {};
                }
                if (!button._eventListeners.click) {
                    button._eventListeners.click = [];
                }
                button._eventListeners.click.push(authHandler);
            }
        });
    }
    },
    
    // 顯示密碼驗證對話框
    showPasswordVerificationModal: function(onSuccess) {
        // 檢查是否已存在驗證對話框
        let modal = document.getElementById('passwordVerificationModal');
        
        if (!modal) {
            // 創建驗證對話框
            modal = document.createElement('div');
            modal.id = 'passwordVerificationModal';
            modal.className = 'modal';
            
            // 創建對話框內容
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            modalContent.style.width = '300px';
            
            // 創建關閉按鈕
            const closeBtn = document.createElement('span');
            closeBtn.className = 'close';
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', function() {
                modal.style.display = 'none';
            });
            
            // 創建標題
            const title = document.createElement('h2');
            title.textContent = '請輸入密碼';
            
            // 創建表單
            const form = document.createElement('form');
            form.id = 'passwordVerificationForm';
            
            // 創建密碼輸入框
            const passwordInput = document.createElement('input');
            passwordInput.type = 'password';
            passwordInput.id = 'verificationPassword';
            passwordInput.placeholder = '請輸入密碼';
            passwordInput.required = true;
            passwordInput.style.width = '100%';
            passwordInput.style.padding = '8px';
            passwordInput.style.marginBottom = '15px';
            
            // 創建錯誤消息顯示區域
            const errorMsg = document.createElement('div');
            errorMsg.id = 'passwordError';
            errorMsg.style.color = 'red';
            errorMsg.style.marginBottom = '15px';
            errorMsg.style.display = 'none';
            
            // 創建提交按鈕
            const submitBtn = document.createElement('button');
            submitBtn.type = 'submit';
            submitBtn.className = 'excel-btn';
            submitBtn.textContent = '確認';
            submitBtn.style.width = '100%';
            
            // 組裝表單
            form.appendChild(passwordInput);
            form.appendChild(errorMsg);
            form.appendChild(submitBtn);
            
            // 組裝對話框
            modalContent.appendChild(closeBtn);
            modalContent.appendChild(title);
            modalContent.appendChild(form);
            modal.appendChild(modalContent);
            
            // 添加對話框到頁面
            document.body.appendChild(modal);
            
            // 綁定表單提交事件
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const password = passwordInput.value;
                
                if (password === this.PASSWORD) {
                    // 密碼正確
                    console.log('密碼驗證成功');
                    modal.style.display = 'none';
                    passwordInput.value = ''; // 清空密碼輸入框
                    errorMsg.style.display = 'none';
                    
                    // 執行成功回調
                    if (typeof onSuccess === 'function') {
                        console.log('執行成功回調函數');
                        // 儲存當前上下文
                        const self = this;
                        // 使用setTimeout確保模態框完全關閉後再執行回調
                        setTimeout(() => {
                            try {
                                // 直接調用回調函數，不使用call方法改變上下文
                                onSuccess();
                            } catch (error) {
                                console.error('執行回調函數時發生錯誤:', error);
                                console.error('錯誤詳情:', error.stack);
                            }
                        }, 100); // 減少延遲時間，確保更快響應
                    }
                } else {
                    // 密碼錯誤
                    errorMsg.textContent = '密碼錯誤，請重試';
                    errorMsg.style.display = 'block';
                    passwordInput.value = ''; // 清空密碼輸入框
                    passwordInput.focus();
                }
            });
            
            // 點擊對話框外部關閉對話框
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        } else {
            // 重置表單
            const passwordInput = document.getElementById('verificationPassword');
            const errorMsg = document.getElementById('passwordError');
            
            if (passwordInput) passwordInput.value = '';
            if (errorMsg) errorMsg.style.display = 'none';
        }
        
        // 顯示對話框
        modal.style.display = 'block';
        
        // 聚焦密碼輸入框
        setTimeout(() => {
            const passwordInput = document.getElementById('verificationPassword');
            if (passwordInput) passwordInput.focus();
        }, 100);
    }
};

// 初始化驗證功能
document.addEventListener('DOMContentLoaded', function() {
    // 檢查是否在管理頁面
    if (document.getElementById('removeDuplicatesBtn') || 
        document.getElementById('exportExcelBtn') || 
        document.getElementById('exportJsonBtn') || 
        document.getElementById('importExcelBtn') || 
        document.getElementById('githubSettingsBtn') || 
        document.getElementById('backupSettingsBtn') || 
        document.getElementById('backupHistoryBtn') || 
        document.getElementById('trashBtn')) {
        
        // 初始化驗證功能
        AuthValidator.init();
    }
});