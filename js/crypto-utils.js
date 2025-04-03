/**
 * 書籍查詢管理系統 - 加密工具模塊
 * 負責處理敏感數據的加密和解密
 */

const CryptoUtils = {
    // 簡單的加密密鑰
    DEFAULT_KEY: 'book-system-secure-key',
    
    // 加密數據
    encryptData: function(data, key = this.DEFAULT_KEY) {
        try {
            // 將數據轉換為JSON字符串
            const jsonString = JSON.stringify(data);
            
            // 使用Base64編碼和簡單的XOR加密
            // 注意：這不是強加密，僅用於基本保護
            // 實際應用中應使用更強的加密算法
            const encrypted = this._xorEncrypt(jsonString, key);
            const base64Encoded = btoa(encrypted);
            
            return base64Encoded;
        } catch (error) {
            console.error('加密數據失敗:', error);
            return null;
        }
    },
    
    // 解密數據
    decryptData: function(encryptedData, key = this.DEFAULT_KEY) {
        try {
            // 解碼Base64
            const base64Decoded = atob(encryptedData);
            
            // 使用XOR解密
            const decrypted = this._xorEncrypt(base64Decoded, key);
            
            // 解析JSON
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('解密數據失敗:', error);
            return null;
        }
    },
    
    // 使用XOR進行簡單加密/解密
    _xorEncrypt: function(text, key) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    },
    
    // 生成安全的哈希
    hashPassword: function(password, salt = '') {
        // 簡單的哈希實現
        // 實際應用中應使用更強的哈希算法，如bcrypt或PBKDF2
        let hash = 0;
        const text = password + salt;
        
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 轉換為32位整數
        }
        
        return hash.toString(16);
    },
    
    // 驗證密碼
    verifyPassword: function(password, hashedPassword, salt = '') {
        const hash = this.hashPassword(password, salt);
        return hash === hashedPassword;
    },
    
    // 生成隨機鹽值
    generateSalt: function(length = 16) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let salt = '';
        
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            salt += chars.charAt(randomIndex);
        }
        
        return salt;
    },
    
    // 驗證輸入
    validateInput: function(input, type) {
        if (!input) return false;
        
        switch(type) {
            case 'text':
                // 過濾HTML標籤和特殊字符
                return input.replace(/[<>"'&]/g, '');
            case 'number':
                // 確保是有效數字
                return /^\d+$/.test(input) ? input : '';
            case 'email':
                // 簡單的電子郵件驗證
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) ? input : '';
            default:
                return input;
        }
    }
};

// 導出模塊
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CryptoUtils;
}