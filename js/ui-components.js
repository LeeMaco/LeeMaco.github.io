/**
 * 書籍查詢管理系統 - UI組件模塊
 * 負責提供統一的用戶界面組件
 */

const UIComponents = {
    // 顯示加載提示
    showLoading: function(container, message = '正在加載，請稍候...') {
        if (!container) return;
        
        container.innerHTML = `
            <div class="loading-indicator">
                <i class="fas fa-spinner fa-spin"></i>
                <p>${message}</p>
            </div>
        `;
    },
    
    // 隱藏加載提示
    hideLoading: function(container) {
        if (!container) return;
        
        const loadingIndicator = container.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    },
    
    // 顯示通知
    showNotification: function(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this._getIconForType(type)}"></i>
                <p>${message}</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 添加顯示動畫
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // 自動關閉
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, duration);
    },
    
    // 根據類型獲取圖標
    _getIconForType: function(type) {
        switch(type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-info-circle';
        }
    },
    
    // 創建確認對話框
    showConfirmDialog: function(message, onConfirm, onCancel) {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.innerHTML = `
            <div class="confirm-content">
                <p>${message}</p>
                <div class="confirm-buttons">
                    <button class="confirm-btn">確認</button>
                    <button class="cancel-btn">取消</button>
                </div>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // 綁定按鈕事件
        const confirmBtn = dialog.querySelector('.confirm-btn');
        const cancelBtn = dialog.querySelector('.cancel-btn');
        
        confirmBtn.addEventListener('click', function() {
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
            overlay.remove();
        });
        
        cancelBtn.addEventListener('click', function() {
            if (typeof onCancel === 'function') {
                onCancel();
            }
            overlay.remove();
        });
        
        // 點擊背景關閉對話框
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                if (typeof onCancel === 'function') {
                    onCancel();
                }
                overlay.remove();
            }
        });
    },
    
    // 添加CSS樣式
    addStyles: function() {
        // 檢查是否已添加樣式
        if (document.getElementById('ui-components-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'ui-components-styles';
        style.textContent = `
            /* 加載指示器樣式 */
            .loading-indicator {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
                text-align: center;
            }
            
            .loading-indicator i {
                font-size: 2rem;
                color: #4a89dc;
                margin-bottom: 10px;
            }
            
            /* 通知樣式 */
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                max-width: 300px;
                background-color: #fff;
                border-radius: 4px;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
                transform: translateX(120%);
                transition: transform 0.3s ease;
                z-index: 1000;
            }
            
            .notification.show {
                transform: translateX(0);
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                padding: 15px;
            }
            
            .notification-content i {
                margin-right: 10px;
                font-size: 1.2rem;
            }
            
            .notification.info i {
                color: #4a89dc;
            }
            
            .notification.success i {
                color: #37bc9b;
            }
            
            .notification.warning i {
                color: #f6b042;
            }
            
            .notification.error i {
                color: #da4453;
            }
            
            /* 確認對話框樣式 */
            .confirm-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            
            .confirm-dialog {
                background-color: #fff;
                border-radius: 4px;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
                width: 90%;
                max-width: 400px;
            }
            
            .confirm-content {
                padding: 20px;
            }
            
            .confirm-buttons {
                display: flex;
                justify-content: flex-end;
                margin-top: 20px;
            }
            
            .confirm-btn, .cancel-btn {
                padding: 8px 15px;
                margin-left: 10px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            
            .confirm-btn {
                background-color: #4a89dc;
                color: #fff;
            }
            
            .cancel-btn {
                background-color: #e6e9ed;
                color: #434a54;
            }
            
            /* 移動端適配 */
            @media (max-width: 576px) {
                .notification {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
};

// 初始化UI組件
document.addEventListener('DOMContentLoaded', function() {
    UIComponents.addStyles();
});