/**
 * 書籍查詢管理系統 - 工具模塊
 * 存放共用工具函數和邏輯
 */

const Utils = {
    // 從localStorage安全讀取數據
    safeGetLocalStorage: function(key) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('讀取localStorage時發生錯誤:', error);
            return null;
        }
    },

    // 安全寫入localStorage
    safeSetLocalStorage: function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('寫入localStorage時發生錯誤:', error);
            return false;
        }
    },

    // 生成唯一ID
    generateId: function() {
        return Date.now().toString();
    },

    // 格式化日期
    formatDate: function(date) {
        return new Date(date).toLocaleString();
    }
};