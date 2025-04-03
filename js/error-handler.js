/**
 * 書籍查詢管理系統 - 錯誤處理模塊
 * 負責統一處理系統中的各種錯誤
 */

const ErrorHandler = {
    // 錯誤類型常量
    ERROR_TYPES: {
        NETWORK: 'network_error',
        DATA: 'data_error',
        AUTH: 'auth_error',
        VALIDATION: 'validation_error',
        UNKNOWN: 'unknown_error'
    },
    
    // 處理錯誤
    handleError: function(error, type = this.ERROR_TYPES.UNKNOWN) {
        // 記錄錯誤
        console.error(`[${type}]`, error);
        
        // 根據錯誤類型返回用戶友好的錯誤信息
        return this.getUserFriendlyMessage(error, type);
    },
    
    // 獲取用戶友好的錯誤信息
    getUserFriendlyMessage: function(error, type) {
        let message = '';
        
        switch(type) {
            case this.ERROR_TYPES.NETWORK:
                message = '網絡連接問題，請檢查您的網絡連接並重試。';
                break;
            case this.ERROR_TYPES.DATA:
                message = '數據處理錯誤，請重新加載頁面或聯繫管理員。';
                break;
            case this.ERROR_TYPES.AUTH:
                message = '身份驗證失敗，請重新登入。';
                break;
            case this.ERROR_TYPES.VALIDATION:
                message = '輸入數據無效，請檢查您的輸入並重試。';
                break;
            default:
                message = '發生未知錯誤，請重試或聯繫管理員。';
        }
        
        return {
            message: message,
            originalError: error.message || String(error),
            timestamp: new Date().toISOString()
        };
    },
    
    // 顯示錯誤信息到UI
    showErrorInUI: function(container, errorInfo) {
        if (!container) return;
        
        container.innerHTML = `
            <div class="error-message">
                <p class="no-results"><i class="fas fa-exclamation-triangle"></i> ${errorInfo.message}</p>
                <p class="error-details">${errorInfo.originalError}</p>
                <small>時間: ${new Date(errorInfo.timestamp).toLocaleString()}</small>
            </div>
        `;
    },
    
    // 全局錯誤處理初始化
    init: function() {
        // 添加全局錯誤捕獲
        window.addEventListener('error', function(event) {
            ErrorHandler.handleError(event.error || new Error('未知錯誤'));
            // 防止錯誤傳播
            event.preventDefault();
        });
        
        window.addEventListener('unhandledrejection', function(event) {
            ErrorHandler.handleError(event.reason || new Error('未處理的Promise拒絕'));
            // 防止錯誤傳播
            event.preventDefault();
        });
        
        console.log('錯誤處理模塊已初始化');
    }
};

// 初始化錯誤處理模塊
document.addEventListener('DOMContentLoaded', function() {
    ErrorHandler.init();
});