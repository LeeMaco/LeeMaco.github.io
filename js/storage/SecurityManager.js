/**
 * 安全管理模塊 - 處理數據加密和安全相關功能
 * 實現敏感數據加密和數據完整性校驗
 */

class SecurityManager {
    constructor() {
        // 加密密鑰（在實際應用中應從安全來源獲取）
        this.encryptionKey = null;
        
        // 初始化加密密鑰
        this.initEncryptionKey();
    }
    
    /**
     * 初始化加密密鑰
     * 嘗試從安全存儲獲取密鑰，如果不存在則創建新密鑰
     */
    async initEncryptionKey() {
        try {
            // 嘗試從sessionStorage獲取臨時密鑰（僅在當前會話有效）
            let key = sessionStorage.getItem('encryptionKey');
            
            if (!key) {
                // 如果不存在，生成新的隨機密鑰
                key = this.generateRandomKey(32);
                // 存儲到sessionStorage（僅當前會話有效）
                sessionStorage.setItem('encryptionKey', key);
            }
            
            this.encryptionKey = key;
            console.log('加密密鑰已初始化');
        } catch (error) {
            console.error('初始化加密密鑰失敗:', error);
            // 使用備用密鑰（固定密鑰，安全性較低）
            this.encryptionKey = 'BookManagementSystemDefaultKey';
        }
    }
    
    /**
     * 生成隨機密鑰
     * @param {number} length 密鑰長度
     * @returns {string} 隨機密鑰
     */
    generateRandomKey(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
        let result = '';
        const randomValues = new Uint8Array(length);
        
        // 使用Web Crypto API生成隨機值（如果可用）
        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(randomValues);
            for (let i = 0; i < length; i++) {
                result += chars.charAt(randomValues[i] % chars.length);
            }
        } else {
            // 備用方案：使用Math.random（安全性較低）
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        }
        
        return result;
    }
    
    /**
     * 加密數據
     * @param {string|Object} data 要加密的數據
     * @returns {string} 加密後的數據
     */
    encrypt(data) {
        try {
            // 如果數據是對象，先轉換為JSON字符串
            const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
            
            // 使用簡單的XOR加密（在實際應用中應使用更強的加密算法）
            let encrypted = '';
            for (let i = 0; i < dataString.length; i++) {
                const charCode = dataString.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
                encrypted += String.fromCharCode(charCode);
            }
            
            // 轉換為Base64以便存儲
            return btoa(encrypted);
        } catch (error) {
            console.error('加密數據失敗:', error);
            // 加密失敗時返回原始數據，但添加標記
            return `ENCRYPTION_FAILED:${typeof data === 'object' ? JSON.stringify(data) : String(data)}`;
        }
    }
    
    /**
     * 解密數據
     * @param {string} encryptedData 加密的數據
     * @returns {string|Object} 解密後的數據
     */
    decrypt(encryptedData) {
        try {
            // 檢查是否是加密失敗的數據
            if (encryptedData.startsWith('ENCRYPTION_FAILED:')) {
                const originalData = encryptedData.substring('ENCRYPTION_FAILED:'.length);
                try {
                    return JSON.parse(originalData);
                } catch {
                    return originalData;
                }
            }
            
            // 從Base64解碼
            const encrypted = atob(encryptedData);
            
            // 使用XOR解密
            let decrypted = '';
            for (let i = 0; i < encrypted.length; i++) {
                const charCode = encrypted.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
                decrypted += String.fromCharCode(charCode);
            }
            
            // 嘗試解析JSON
            try {
                return JSON.parse(decrypted);
            } catch {
                // 如果不是有效的JSON，返回字符串
                return decrypted;
            }
        } catch (error) {
            console.error('解密數據失敗:', error);
            return null;
        }
    }
    
    /**
     * 計算數據的哈希值（用於數據完整性校驗）
     * @param {string|Object} data 要計算哈希的數據
     * @returns {Promise<string>} 哈希值的Promise
     */
    async calculateHash(data) {
        try {
            // 如果數據是對象，先轉換為JSON字符串
            const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
            
            // 使用Web Crypto API計算SHA-256哈希（如果可用）
            if (window.crypto && window.crypto.subtle) {
                const encoder = new TextEncoder();
                const dataBuffer = encoder.encode(dataString);
                const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
                
                // 將哈希值轉換為十六進制字符串
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } else {
                // 備用方案：簡單的字符串哈希（安全性較低）
                let hash = 0;
                for (let i = 0; i < dataString.length; i++) {
                    const char = dataString.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash; // 轉換為32位整數
                }
                return hash.toString(16);
            }
        } catch (error) {
            console.error('計算哈希值失敗:', error);
            return null;
        }
    }
    
    /**
     * 驗證數據完整性
     * @param {string|Object} data 要驗證的數據
     * @param {string} expectedHash 預期的哈希值
     * @returns {Promise<boolean>} 驗證結果的Promise
     */
    async verifyDataIntegrity(data, expectedHash) {
        try {
            // 計算數據的哈希值
            const actualHash = await this.calculateHash(data);
            
            // 比較哈希值
            return actualHash === expectedHash;
        } catch (error) {
            console.error('驗證數據完整性失敗:', error);
            return false;
        }
    }
    
    /**
     * 加密敏感設置
     * @param {Object} settings 設置對象
     * @returns {Object} 加密後的設置對象
     */
    encryptSettings(settings) {
        try {
            const encryptedSettings = { ...settings };
            
            // 加密敏感字段
            if (settings.token) {
                encryptedSettings.token = this.encrypt(settings.token);
            }
            
            if (settings.password) {
                encryptedSettings.password = this.encrypt(settings.password);
            }
            
            if (settings.apiKey) {
                encryptedSettings.apiKey = this.encrypt(settings.apiKey);
            }
            
            // 添加完整性校驗
            this.calculateHash(settings).then(hash => {
                encryptedSettings._integrity = hash;
            });
            
            return encryptedSettings;
        } catch (error) {
            console.error('加密設置失敗:', error);
            return settings; // 加密失敗時返回原始設置
        }
    }
    
    /**
     * 解密敏感設置
     * @param {Object} encryptedSettings 加密的設置對象
     * @returns {Object} 解密後的設置對象
     */
    decryptSettings(encryptedSettings) {
        try {
            const settings = { ...encryptedSettings };
            
            // 解密敏感字段
            if (encryptedSettings.token && !encryptedSettings.token.startsWith('ENCRYPTION_FAILED:')) {
                settings.token = this.decrypt(encryptedSettings.token);
            }
            
            if (encryptedSettings.password && !encryptedSettings.password.startsWith('ENCRYPTION_FAILED:')) {
                settings.password = this.decrypt(encryptedSettings.password);
            }
            
            if (encryptedSettings.apiKey && !encryptedSettings.apiKey.startsWith('ENCRYPTION_FAILED:')) {
                settings.apiKey = this.decrypt(encryptedSettings.apiKey);
            }
            
            // 移除完整性校驗字段
            delete settings._integrity;
            
            return settings;
        } catch (error) {
            console.error('解密設置失敗:', error);
            return encryptedSettings; // 解密失敗時返回加密的設置
        }
    }
    
    /**
     * 安全地保存設置到存儲
     * @param {Object} storage 存儲對象（如IndexedDBStorage）
     * @param {string} key 設置鍵
     * @param {Object} settings 設置值
     * @returns {Promise<void>}
     */
    async secureStoreSetting(storage, key, settings) {
        try {
            // 加密敏感設置
            const encryptedSettings = this.encryptSettings(settings);
            
            // 保存到存儲
            await storage.saveSetting(key, encryptedSettings);
        } catch (error) {
            console.error(`安全保存設置 ${key} 失敗:`, error);
            throw error;
        }
    }
    
    /**
     * 安全地從存儲獲取設置
     * @param {Object} storage 存儲對象（如IndexedDBStorage）
     * @param {string} key 設置鍵
     * @returns {Promise<Object>} 設置值
     */
    async secureGetSetting(storage, key) {
        try {
            // 從存儲獲取加密的設置
            const encryptedSettings = await storage.getSetting(key);
            
            if (!encryptedSettings) {
                return null;
            }
            
            // 解密設置
            return this.decryptSettings(encryptedSettings);
        } catch (error) {
            console.error(`安全獲取設置 ${key} 失敗:`, error);
            return null;
        }
    }
}

// 導出模塊
export default SecurityManager;