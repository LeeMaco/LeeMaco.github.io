/**
 * 書籍查詢管理系統 - UI反饋模塊
 * 負責處理操作反饋、加載狀態和表單驗證
 */

const UIFeedback = {
    // 反饋消息類型
    MESSAGE_TYPES: {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    },
    
    /**
     * 顯示反饋消息
     * @param {string} message - 要顯示的消息
     * @param {string} type - 消息類型 (success, error, warning, info)
     * @param {number} duration - 顯示時間(毫秒)，默認3000ms
     */
    showMessage: function(message, type = this.MESSAGE_TYPES.INFO, duration = 3000) {
        // 移除現有的反饋消息
        const existingMessages = document.querySelectorAll('.feedback-message');
        existingMessages.forEach(msg => msg.remove());
        
        // 創建新的反饋消息元素
        const messageElement = document.createElement('div');
        messageElement.className = `feedback-message feedback-${type}`;
        messageElement.textContent = message;
        
        // 添加到文檔中
        document.body.appendChild(messageElement);
        
        // 設置自動消失
        setTimeout(() => {
            messageElement.style.opacity = '0';
            messageElement.style.transform = 'translateY(-20px)';
            
            // 完全移除元素
            setTimeout(() => {
                messageElement.remove();
            }, 300);
        }, duration);
        
        return messageElement;
    },
    
    /**
     * 顯示成功消息
     * @param {string} message - 要顯示的消息
     * @param {number} duration - 顯示時間(毫秒)
     */
    showSuccess: function(message, duration = 3000) {
        return this.showMessage(message, this.MESSAGE_TYPES.SUCCESS, duration);
    },
    
    /**
     * 顯示錯誤消息
     * @param {string} message - 要顯示的消息
     * @param {number} duration - 顯示時間(毫秒)
     */
    showError: function(message, duration = 3000) {
        return this.showMessage(message, this.MESSAGE_TYPES.ERROR, duration);
    },
    
    /**
     * 顯示警告消息
     * @param {string} message - 要顯示的消息
     * @param {number} duration - 顯示時間(毫秒)
     */
    showWarning: function(message, duration = 3000) {
        return this.showMessage(message, this.MESSAGE_TYPES.WARNING, duration);
    },
    
    /**
     * 顯示信息消息
     * @param {string} message - 要顯示的消息
     * @param {number} duration - 顯示時間(毫秒)
     */
    showInfo: function(message, duration = 3000) {
        return this.showMessage(message, this.MESSAGE_TYPES.INFO, duration);
    },
    
    /**
     * 顯示加載中覆蓋層
     * @param {string} message - 可選的加載消息
     * @returns {HTMLElement} - 加載覆蓋層元素
     */
    showLoading: function(message = '加載中...') {
        // 移除現有的加載覆蓋層
        this.hideLoading();
        
        // 創建加載覆蓋層
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.id = 'loadingOverlay';
        
        // 創建加載內容
        const content = document.createElement('div');
        content.className = 'loading-content';
        
        // 創建加載圖標
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        content.appendChild(spinner);
        
        // 如果提供了消息，則添加消息
        if (message) {
            const messageElement = document.createElement('div');
            messageElement.className = 'loading-message';
            messageElement.textContent = message;
            messageElement.style.marginTop = '10px';
            messageElement.style.color = '#333';
            content.appendChild(messageElement);
        }
        
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        return overlay;
    },
    
    /**
     * 隱藏加載中覆蓋層
     */
    hideLoading: function() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.remove();
        }
    },
    
    /**
     * 驗證表單欄位
     * @param {HTMLElement} formElement - 表單元素
     * @param {Object} rules - 驗證規則，格式為 {欄位ID: {required: boolean, pattern: RegExp, message: string}}
     * @returns {boolean} - 驗證是否通過
     */
    validateForm: function(formElement, rules) {
        let isValid = true;
        
        // 移除所有現有的錯誤消息
        formElement.querySelectorAll('.error-message').forEach(el => el.remove());
        formElement.querySelectorAll('.form-group.error').forEach(el => el.classList.remove('error'));
        
        // 檢查每個欄位
        for (const fieldId in rules) {
            const field = document.getElementById(fieldId);
            if (!field) continue;
            
            const rule = rules[fieldId];
            const formGroup = field.closest('.form-group');
            let fieldValid = true;
            
            // 檢查是否必填
            if (rule.required && !field.value.trim()) {
                this.addErrorToField(field, rule.requiredMessage || '此欄位為必填項');
                fieldValid = false;
                isValid = false;
            }
            
            // 檢查正則表達式模式
            if (field.value.trim() && rule.pattern && !rule.pattern.test(field.value.trim())) {
                this.addErrorToField(field, rule.message || '輸入格式不正確');
                fieldValid = false;
                isValid = false;
            }
            
            // 檢查自定義驗證函數
            if (field.value.trim() && rule.validate && typeof rule.validate === 'function') {
                const validateResult = rule.validate(field.value.trim());
                if (validateResult !== true) {
                    this.addErrorToField(field, validateResult || '輸入不符合要求');
                    fieldValid = false;
                    isValid = false;
                }
            }
            
            // 更新表單組的狀態
            if (formGroup) {
                if (!fieldValid) {
                    formGroup.classList.add('error');
                } else {
                    formGroup.classList.remove('error');
                }
            }
        }
        
        return isValid;
    },
    
    /**
     * 向欄位添加錯誤消息
     * @param {HTMLElement} field - 欄位元素
     * @param {string} message - 錯誤消息
     */
    addErrorToField: function(field, message) {
        const formGroup = field.closest('.form-group');
        if (!formGroup) return;
        
        // 創建錯誤消息元素
        const errorElement = document.createElement('span');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        
        // 添加到表單組
        formGroup.appendChild(errorElement);
    },
    
    /**
     * 禁用按鈕並顯示加載狀態
     * @param {HTMLElement} button - 按鈕元素
     * @param {string} loadingText - 加載中顯示的文字
     */
    setButtonLoading: function(button, loadingText = '處理中...') {
        if (!button) return;
        
        // 保存原始文字
        button.dataset.originalText = button.innerHTML;
        
        // 設置加載狀態
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
        button.disabled = true;
    },
    
    /**
     * 恢復按鈕狀態
     * @param {HTMLElement} button - 按鈕元素
     */
    resetButton: function(button) {
        if (!button) return;
        
        // 恢復原始文字
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
            delete button.dataset.originalText;
        }
        
        button.disabled = false;
    }
};