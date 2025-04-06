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
        'trashBtn',            // 垃圾桶
        'createBackupBtn',     // 創建備份
        'clearBackupHistoryBtn', // 清空備份歷史
        'bulkRestoreBtn'       // 批量恢復
    ],
    
    // 密碼
    PASSWORD: '0211', // 設置為指定的密碼
    
    // 初始化驗證功能
    init: function() {
        console.log('初始化密碼驗證功能');
        // 確保DOM已完全加載後再添加事件監聽器
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupButtonValidation();
            });
        } else {
            this.setupButtonValidation();
        }
    },
    
    // 移除其他JS文件中添加的衝突事件監聽器
    removeConflictingEventListeners: function() {
        // 為每個受保護的按鈕移除現有的點擊事件監聽器
        this.PROTECTED_BUTTONS.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                console.log(`處理按鈕: ${buttonId}`);
                
                // 創建一個新的按鈕元素，替換原有的按鈕
                // 這是移除所有事件監聽器的最徹底方法
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                // 重新添加驗證事件處理器
                this.setupButtonValidationForSingleButton(newButton, buttonId);
                
                // 將新按鈕引用保存到全局變數，以便其他腳本可以訪問
                window[buttonId] = newButton;
                
                // 特殊處理trashBtn按鈕，確保它的功能正常
                if (buttonId === 'trashBtn') {
                    window.trashBtn = newButton;
                }
            }
        });
        
        // 在控制台輸出提示信息
        console.log('已移除所有衝突的事件監聽器，並重新設置密碼驗證');
    },
    
    // 為單個按鈕設置驗證事件處理器
    setupButtonValidationForSingleButton: function(button, buttonId) {
        if (button) {
            console.log(`為按鈕設置驗證: ${buttonId}`);
            
            // 創建一個標記屬性，防止重複添加驗證
            if (button.hasAttribute('auth-protected')) {
                return; // 如果已經添加過驗證，則跳過
            }
            button.setAttribute('auth-protected', 'true');
            
            // 添加新的點擊事件監聽器
            const authHandler = (event) => {
                console.log(`按鈕 ${buttonId} 點擊事件被捕獲`);
                
                // 阻止事件冒泡和默認行為
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation(); // 阻止其他事件處理器執行
                
                // 保存按鈕ID，以便在回調中使用
                const currentButtonId = buttonId;
                
                // 顯示密碼驗證對話框
                this.showPasswordVerificationModal(() => {
                    console.log('密碼驗證成功，準備執行功能:', currentButtonId);
                    
                    try {
                        // 根據按鈕ID執行對應功能
                        switch(currentButtonId) {
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
                                console.log('未知按鈕ID:', currentButtonId);
                        }
                    } catch (error) {
                        console.error('執行功能時發生錯誤:', error);
                        console.error('錯誤詳情:', error.stack);
                    }
                });
            };
            
            // 使用捕獲階段添加事件監聽器，確保在其他事件處理器之前執行
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
    },
    
    // 設置按鈕驗證
    setupButtonValidation: function() {
        // 為每個受保護的按鈕添加點擊事件監聽器
        this.PROTECTED_BUTTONS.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            this.setupButtonValidationForSingleButton(button, buttonId);
        });
    },
    
    // 顯示密碼驗證對話框
    showPasswordVerificationModal: function(onSuccess) {
        // 檢查是否已存在驗證對話框
        let modal = document.getElementById('passwordVerificationModal');
        
        // 如果不存在，則創建一個新的對話框
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'passwordVerificationModal';
            modal.className = 'modal';
            
            // 創建對話框內容
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            
            // 添加關閉按鈕
            const closeBtn = document.createElement('span');
            closeBtn.className = 'close';
            closeBtn.innerHTML = '&times;';
            closeBtn.onclick = function() {
                modal.style.display = 'none';
            };
            
            // 添加標題
            const title = document.createElement('h2');
            title.textContent = '密碼驗證';
            
            // 添加說明文字
            const description = document.createElement('p');
            description.textContent = '請輸入管理員密碼以繼續操作：';
            
            // 創建表單
            const form = document.createElement('form');
            form.id = 'passwordVerificationForm';
            
            // 添加密碼輸入框
            const passwordGroup = document.createElement('div');
            passwordGroup.className = 'form-group';
            
            const passwordLabel = document.createElement('label');
            passwordLabel.setAttribute('for', 'adminPassword');
            passwordLabel.textContent = '密碼：';
            
            const passwordInput = document.createElement('input');
            passwordInput.type = 'password';
            passwordInput.id = 'adminPassword';
            passwordInput.required = true;
            
            // 添加錯誤信息顯示區域
            const errorMessage = document.createElement('div');
            errorMessage.id = 'passwordError';
            errorMessage.className = 'error-message';
            errorMessage.style.color = '#e74c3c';
            errorMessage.style.marginTop = '5px';
            errorMessage.style.display = 'none';
            
            // 添加提交按鈕
            const submitBtn = document.createElement('button');
            submitBtn.type = 'submit';
            submitBtn.textContent = '驗證';
            
            // 組裝表單
            passwordGroup.appendChild(passwordLabel);
            passwordGroup.appendChild(passwordInput);
            passwordGroup.appendChild(errorMessage);
            
            form.appendChild(passwordGroup);
            form.appendChild(submitBtn);
            
            // 組裝對話框
            modalContent.appendChild(closeBtn);
            modalContent.appendChild(title);
            modalContent.appendChild(description);
            modalContent.appendChild(form);
            
            modal.appendChild(modalContent);
            
            // 添加到文檔中
            document.body.appendChild(modal);
            
            // 添加表單提交事件
            form.onsubmit = (event) => {
                event.preventDefault();
                
                const password = passwordInput.value;
                
                // 驗證密碼
                if (password === this.PASSWORD) {
                    // 密碼正確
                    modal.style.display = 'none';
                    passwordInput.value = ''; // 清空密碼輸入框
                    errorMessage.style.display = 'none';
                    
                    // 執行成功回調
                    if (typeof onSuccess === 'function') {
                        onSuccess();
                    }
                } else {
                    // 密碼錯誤
                    errorMessage.textContent = '密碼錯誤，請重試！';
                    errorMessage.style.display = 'block';
                    passwordInput.value = ''; // 清空密碼輸入框
                    passwordInput.focus();
                }
            };
            
            // 點擊對話框外部關閉對話框
            window.onclick = function(event) {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            };
        } else {
            // 重置錯誤信息
            const errorMessage = document.getElementById('passwordError');
            if (errorMessage) {
                errorMessage.style.display = 'none';
            }
            
            // 重置密碼輸入框
            const passwordInput = document.getElementById('adminPassword');
            if (passwordInput) {
                passwordInput.value = '';
            }
            
            // 更新表單提交事件
            const form = document.getElementById('passwordVerificationForm');
            if (form) {
                // 移除現有的事件監聽器
                const newForm = form.cloneNode(true);
                form.parentNode.replaceChild(newForm, form);
                
                // 添加新的事件監聽器
                newForm.onsubmit = (event) => {
                    event.preventDefault();
                    
                    const passwordInput = document.getElementById('adminPassword');
                    const password = passwordInput.value;
                    
                    // 驗證密碼
                    if (password === this.PASSWORD) {
                        // 密碼正確
                        modal.style.display = 'none';
                        passwordInput.value = ''; // 清空密碼輸入框
                        
                        const errorMessage = document.getElementById('passwordError');
                        if (errorMessage) {
                            errorMessage.style.display = 'none';
                        }
                        
                        // 執行成功回調
                        if (typeof onSuccess === 'function') {
                            onSuccess();
                        }
                    } else {
                        // 密碼錯誤
                        const errorMessage = document.getElementById('passwordError');
                        if (errorMessage) {
                            errorMessage.textContent = '密碼錯誤，請重試！';
                            errorMessage.style.display = 'block';
                        }
                        
                        passwordInput.value = ''; // 清空密碼輸入框
                        passwordInput.focus();
                    }
                };
            }
        }
        
        // 顯示對話框
        modal.style.display = 'block';
        
        // 聚焦到密碼輸入框
        const passwordInput = document.getElementById('adminPassword');
        if (passwordInput) {
            passwordInput.focus();
        }
    }
};

// 頁面加載完成後初始化驗證功能
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
        
        console.log('初始化密碼驗證功能');
        // 初始化驗證功能
        AuthValidator.init();
        
        // 移除其他JS文件中添加的事件監聽器
        console.log('移除其他JS文件中添加的事件監聽器');
        AuthValidator.removeConflictingEventListeners();
        
        // 添加MutationObserver以監視DOM變化，確保按鈕始終受到保護
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // 檢查是否有新添加的按鈕需要保護
                    AuthValidator.PROTECTED_BUTTONS.forEach(buttonId => {
                        const button = document.getElementById(buttonId);
                        if (button && !button.hasAttribute('auth-protected')) {
                            console.log(`檢測到未受保護的按鈕: ${buttonId}，重新應用保護`);
                            AuthValidator.setupButtonValidationForSingleButton(button, buttonId);
                        }
                    });
                }
            });
        });
        
        // 開始觀察文檔變化
        observer.observe(document.body, { childList: true, subtree: true });
    }
});