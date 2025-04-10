/**
 * 書籍查詢管理系統 - 配置文件
 */

// 系統配置
const config = {
    // 應用名稱
    appName: '書籍查詢管理系統',
    
    // 版本號
    version: '1.0.0',
    
    // 默認分頁大小
    pageSize: 10,
    
    // 是否啟用調試模式
    debug: false,
    
    // 本地存儲前綴
    storagePrefix: 'bookSystem_',
    
    // 管理員設置
    admin: {
        // 默認管理員用戶名
        defaultUsername: 'admin',
        
        // 默認管理員密碼
        defaultPassword: 'admin123'
    }
};