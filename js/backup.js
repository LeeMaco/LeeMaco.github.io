/**
 * 書籍查詢管理系統 - 自動備份模塊
 * 負責處理數據的自動備份功能
 */

const BackupManager = {
    // 備份設置的存儲鍵名
    BACKUP_SETTINGS_KEY: 'backup_settings',
    
    // 備份歷史記錄的存儲鍵名
    BACKUP_HISTORY_KEY: 'backup_history',
    
    // 最後一次備份時間的存儲鍵名
    LAST_BACKUP_KEY: 'last_backup_time',
    
    // 備份間隔選項（毫秒）
    BACKUP_INTERVALS: {
        'hourly': 60 * 60 * 1000,         // 每小時
        'daily': 24 * 60 * 60 * 1000,     // 每天
        'weekly': 7 * 24 * 60 * 60 * 1000, // 每週
        'manual': 0                       // 手動備份
    },
    
    // 初始化備份管理器
    init: function() {
        console.log('初始化備份管理器');
        
        // 如果本地存儲中沒有備份設置，則初始化默認設置
        if (!localStorage.getItem(this.BACKUP_SETTINGS_KEY)) {
            const defaultSettings = {
                enabled: false,
                interval: 'daily',
                autoUploadToGitHub: false,
                maxBackupCount: 10
            };
            localStorage.setItem(this.BACKUP_SETTINGS_KEY, JSON.stringify(defaultSettings));
        }
        
        // 如果本地存儲中沒有備份歷史記錄，則初始化
        if (!localStorage.getItem(this.BACKUP_HISTORY_KEY)) {
            localStorage.setItem(this.BACKUP_HISTORY_KEY, JSON.stringify([]));
        }
        
        // 啟動備份檢查器
        this.startBackupChecker();
    },
    
    // 獲取備份設置
    getBackupSettings: function() {
        const settings = localStorage.getItem(this.BACKUP_SETTINGS_KEY);
        return settings ? JSON.parse(settings) : null;
    },
    
    // 保存備份設置
    saveBackupSettings: function(settings) {
        localStorage.setItem(this.BACKUP_SETTINGS_KEY, JSON.stringify(settings));
        console.log('備份設置已保存:', settings);
        
        // 重新啟動備份檢查器
        this.startBackupChecker();
        
        return settings;
    },
    
    // 獲取備份歷史記錄
    getBackupHistory: function() {
        const history = localStorage.getItem(this.BACKUP_HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    },
    
    // 添加備份歷史記錄
    addBackupHistory: function(backup) {
        const history = this.getBackupHistory();
        const settings = this.getBackupSettings();
        
        // 添加新的備份記錄
        history.unshift(backup);
        
        // 如果超過最大備份數量，則刪除最舊的備份
        if (settings.maxBackupCount > 0 && history.length > settings.maxBackupCount) {
            history.splice(settings.maxBackupCount);
        }
        
        // 保存更新後的歷史記錄
        localStorage.setItem(this.BACKUP_HISTORY_KEY, JSON.stringify(history));
        console.log('備份歷史記錄已更新，當前備份數量:', history.length);
        
        return history;
    },
    
    // 刪除備份歷史記錄
    deleteBackupHistory: function(backupId) {
        const history = this.getBackupHistory();
        const updatedHistory = history.filter(backup => backup.id !== backupId);
        
        localStorage.setItem(this.BACKUP_HISTORY_KEY, JSON.stringify(updatedHistory));
        console.log('已刪除備份記錄，ID:', backupId);
        
        return updatedHistory;
    },
    
    // 清空所有備份歷史記錄
    clearBackupHistory: function() {
        localStorage.setItem(this.BACKUP_HISTORY_KEY, JSON.stringify([]));
        console.log('已清空所有備份歷史記錄');
        
        return [];
    },
    
    // 創建備份
    createBackup: function() {
        try {
            console.log('開始創建備份...');
            
            // 獲取所有書籍數據
            const books = BookData.getAllBooks();
            
            // 檢查書籍數據是否有效
            if (!books || !Array.isArray(books)) {
                throw new Error('無法獲取有效的書籍數據');
            }
            
            // 創建備份對象
            const backup = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                bookCount: books.length,
                data: books
            };
            
            // 添加到備份歷史記錄
            this.addBackupHistory(backup);
            
            // 更新最後備份時間
            localStorage.setItem(this.LAST_BACKUP_KEY, backup.timestamp);
            
            // 獲取備份設置
            const settings = this.getBackupSettings();
            
            // 如果啟用了自動上傳到GitHub，則上傳
            if (settings.autoUploadToGitHub) {
                this.uploadBackupToGitHub(backup);
            }
            
            console.log('備份創建成功，書籍數量:', books.length);
            return backup;
        } catch (error) {
            console.error('創建備份時發生錯誤:', error);
            
            // 顯示錯誤消息
            const statusElement = document.getElementById('backupStatus');
            if (statusElement) {
                statusElement.textContent = `備份創建失敗: ${error.message}`;
                statusElement.style.color = '#e74c3c';
                setTimeout(() => {
                    statusElement.textContent = '';
                }, 8000);
            }
            
            return null;
        }
    },
    
    // 恢復備份
    restoreBackup: function(backupId) {
        try {
            console.log('開始恢復備份，ID:', backupId);
            
            // 獲取備份歷史記錄
            const history = this.getBackupHistory();
            
            // 查找指定ID的備份
            const backup = history.find(b => b.id === backupId);
            
            if (!backup) {
                console.error('未找到指定ID的備份:', backupId);
                return false;
            }
            
            // 確保所有書籍ID都是字符串類型
            if (backup.data && Array.isArray(backup.data)) {
                backup.data.forEach(book => {
                    if (book.id !== undefined) {
                        book.id = String(book.id);
                    }
                });
            }
            
            // 恢復書籍數據
            localStorage.setItem('books', JSON.stringify(backup.data));
            
            // 更新最後恢復時間
            const now = new Date();
            backup.lastRestored = now.toISOString();
            
            // 更新備份歷史記錄
            const backupIndex = history.findIndex(b => b.id === backupId);
            if (backupIndex !== -1) {
                history[backupIndex] = backup;
                localStorage.setItem(this.BACKUP_HISTORY_KEY, JSON.stringify(history));
            }
            
            console.log('備份恢復成功，書籍數量:', backup.data.length);
            return true;
        } catch (error) {
            console.error('恢復備份時發生錯誤:', error);
            return false;
        }
    },
    
    // 上傳備份到GitHub
    uploadBackupToGitHub: function(backup) {
        try {
            console.log('開始上傳備份到GitHub...');
            
            // 檢查備份對象是否有效
            if (!backup || !backup.data) {
                throw new Error('備份數據無效');
            }
            
            // 檢查是否有GitHub設置
            const token = localStorage.getItem('githubToken');
            const repo = localStorage.getItem('githubRepo');
            
            if (!token || !repo) {
                throw new Error('未設置GitHub訪問令牌或倉庫信息，無法上傳');
            }
            
            // 準備備份數據
            const jsonContent = JSON.stringify(backup.data, null, 2);
            const fileName = `backup_${new Date(backup.timestamp).toISOString().replace(/[:.]/g, '-')}.json`;
            
            // 顯示上傳中狀態
            const statusElement = document.getElementById('backupStatus');
            if (statusElement) {
                statusElement.textContent = '正在上傳備份到GitHub...';
                statusElement.style.color = '#3498db';
            }
            
            // 使用現有的uploadToGitHub函數上傳
            uploadToGitHub(jsonContent, fileName)
                .then((result) => {
                    console.log('備份上傳到GitHub成功，文件名:', fileName);
                    
                    // 更新備份記錄，添加GitHub文件名和上傳狀態
                    const history = this.getBackupHistory();
                    const backupIndex = history.findIndex(b => b.id === backup.id);
                    
                    if (backupIndex !== -1) {
                        history[backupIndex].githubFileName = fileName;
                        history[backupIndex].uploadedToGitHub = true;
                        history[backupIndex].uploadTime = new Date().toISOString();
                        localStorage.setItem(this.BACKUP_HISTORY_KEY, JSON.stringify(history));
                    }
                    
                    // 顯示成功消息
                    if (statusElement) {
                        statusElement.textContent = '備份已成功上傳到GitHub';
                        statusElement.style.color = '#2ecc71';
                        setTimeout(() => {
                            statusElement.textContent = '';
                        }, 5000);
                    }
                    
                    return result;
                })
                .catch(error => {
                    console.error('備份上傳到GitHub失敗:', error);
                    
                    // 更新備份記錄，標記上傳失敗
                    const history = this.getBackupHistory();
                    const backupIndex = history.findIndex(b => b.id === backup.id);
                    
                    if (backupIndex !== -1) {
                        history[backupIndex].uploadError = error.message || '上傳失敗';
                        localStorage.setItem(this.BACKUP_HISTORY_KEY, JSON.stringify(history));
                    }
                    
                    // 顯示詳細錯誤消息
                    if (statusElement) {
                        statusElement.textContent = `備份上傳失敗: ${error.message || '未知錯誤'}`;
                        statusElement.style.color = '#e74c3c';
                        setTimeout(() => {
                            statusElement.textContent = '';
                        }, 8000);
                    }
                    
                    throw error; // 重新拋出錯誤，以便外部捕獲
                });
            
            return true;
        } catch (error) {
            console.error('上傳備份到GitHub時發生錯誤:', error);
            
            // 顯示錯誤消息
            const statusElement = document.getElementById('backupStatus');
            if (statusElement) {
                statusElement.textContent = `備份上傳失敗: ${error.message || '未知錯誤'}`;
                statusElement.style.color = '#e74c3c';
                setTimeout(() => {
                    statusElement.textContent = '';
                }, 8000);
            }
            
            return false;
        }
    },
    
    // 獲取最後一次備份時間
    getLastBackupTime: function() {
        const lastBackup = localStorage.getItem(this.LAST_BACKUP_KEY);
        return lastBackup ? new Date(lastBackup) : null;
    },
    
    // 檢查是否需要備份
    checkIfBackupNeeded: function() {
        const settings = this.getBackupSettings();
        
        // 如果備份功能未啟用或設置為手動備份，則不需要自動備份
        if (!settings.enabled || settings.interval === 'manual') {
            return false;
        }
        
        const lastBackupTime = this.getLastBackupTime();
        
        // 如果從未備份過，則需要備份
        if (!lastBackupTime) {
            return true;
        }
        
        const now = new Date();
        const timeSinceLastBackup = now - lastBackupTime;
        const backupInterval = this.BACKUP_INTERVALS[settings.interval];
        
        // 如果距離上次備份的時間超過了設定的間隔，則需要備份
        return timeSinceLastBackup >= backupInterval;
    },
    
    // 啟動備份檢查器
    startBackupChecker: function() {
        console.log('啟動備份檢查器');
        
        // 清除現有的定時器
        if (this.backupCheckerId) {
            clearInterval(this.backupCheckerId);
        }
        
        // 獲取備份設置
        const settings = this.getBackupSettings();
        
        // 如果備份功能未啟用，則不啟動定時器
        if (!settings.enabled) {
            console.log('備份功能未啟用，不啟動定時器');
            return;
        }
        
        // 設置定時器，每分鐘檢查一次是否需要備份
        this.backupCheckerId = setInterval(() => {
            if (this.checkIfBackupNeeded()) {
                console.log('需要進行自動備份');
                this.createBackup();
            }
        }, 60 * 1000); // 每分鐘檢查一次
        
        console.log('備份檢查器已啟動，間隔:', settings.interval);
    },
    
    // 停止備份檢查器
    stopBackupChecker: function() {
        if (this.backupCheckerId) {
            clearInterval(this.backupCheckerId);
            this.backupCheckerId = null;
            console.log('備份檢查器已停止');
        }
    }
};

// 初始化備份管理器
document.addEventListener('DOMContentLoaded', function() {
    BackupManager.init();
});