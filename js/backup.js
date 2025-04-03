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
            
            // 恢復書籍數據
            localStorage.setItem('books', JSON.stringify(backup.data));
            
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
            
            // 檢查是否有GitHub設置
            const token = localStorage.getItem('githubToken');
            const repo = localStorage.getItem('githubRepo');
            
            if (!token || !repo) {
                console.error('未設置GitHub訪問令牌或倉庫信息，無法上傳');
                this.showBackupUploadStatus('上傳失敗: 未設置GitHub訪問令牌或倉庫信息，請在GitHub設置中配置', false);
                return false;
            }
            
            // 檢查網絡連接
            if (!navigator.onLine) {
                console.error('網絡連接已斷開，無法上傳');
                this.showBackupUploadStatus('上傳失敗: 網絡連接已斷開，請檢查網絡連接後重試', false);
                return false;
            }
            
            // 準備備份數據
            const jsonContent = JSON.stringify(backup.data, null, 2);
            const fileName = `backup_${new Date(backup.timestamp).toISOString().replace(/[:.]/g, '-')}.json`;
            
            // 創建上傳狀態元素
            this.showBackupUploadStatus('正在上傳備份到GitHub...', null);
            
            // 使用window對象訪問全局uploadToGitHub函數
            if (typeof window.uploadToGitHub !== 'function') {
                console.error('uploadToGitHub函數不存在，請確保已加載admin.js');
                this.showBackupUploadStatus('上傳失敗: 上傳功能不可用，請確保已加載admin.js', false);
                return false;
            }
            
            // 使用現有的uploadToGitHub函數上傳
            window.uploadToGitHub(jsonContent, fileName)
                .then(() => {
                    console.log('備份上傳到GitHub成功，文件名:', fileName);
                    this.showBackupUploadStatus('備份上傳成功！', true);
                    
                    // 更新備份記錄，添加GitHub文件名
                    const history = this.getBackupHistory();
                    const backupIndex = history.findIndex(b => b.id === backup.id);
                    
                    if (backupIndex !== -1) {
                        history[backupIndex].githubFileName = fileName;
                        history[backupIndex].uploadedToGitHub = true;
                        localStorage.setItem(this.BACKUP_HISTORY_KEY, JSON.stringify(history));
                        
                        // 如果備份歷史彈窗是打開的，重新加載備份歷史記錄
                        if (document.getElementById('backupHistoryModal').style.display === 'block') {
                            if (typeof loadBackupHistory === 'function') {
                                loadBackupHistory();
                            }
                        }
                    }
                })
                .catch(error => {
                    console.error('備份上傳到GitHub失敗:', error);
                    let errorMessage = error.message || '未知錯誤';
                    
                    // 提供更具體的錯誤信息
                    if (errorMessage.includes('Bad credentials')) {
                        errorMessage = 'GitHub訪問令牌無效或已過期，請更新令牌';
                    } else if (errorMessage.includes('Not Found')) {
                        errorMessage = '找不到指定的GitHub倉庫，請檢查倉庫名稱';
                    } else if (errorMessage.includes('rate limit')) {
                        errorMessage = 'GitHub API請求次數超過限制，請稍後再試';
                    } else if (errorMessage.includes('network')) {
                        errorMessage = '網絡連接問題，請檢查您的網絡連接';
                    }
                    
                    this.showBackupUploadStatus(`上傳失敗: ${errorMessage}`, false);
                });
            
            return true;
        } catch (error) {
            console.error('上傳備份到GitHub時發生錯誤:', error);
            this.showBackupUploadStatus(`上傳失敗: ${error.message || '未知錯誤'}`, false);
            return false;
        }
    },
    
    // 顯示備份上傳狀態
    showBackupUploadStatus: function(message, success) {
        // 查找或創建狀態元素
        let statusElement = document.getElementById('backupUploadStatus');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'backupUploadStatus';
            statusElement.style.position = 'fixed';
            statusElement.style.bottom = '20px';
            statusElement.style.right = '20px';
            statusElement.style.padding = '10px 15px';
            statusElement.style.backgroundColor = '#f8f9fa';
            statusElement.style.border = '1px solid #ddd';
            statusElement.style.borderRadius = '4px';
            statusElement.style.zIndex = '1000';
            statusElement.style.fontWeight = 'bold';
            statusElement.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            document.body.appendChild(statusElement);
        }
        
        // 顯示狀態
        statusElement.style.display = 'block';
        statusElement.textContent = message;
        
        // 設置顏色
        if (success === true) {
            statusElement.style.color = '#2ecc71'; // 綠色
            // 成功後5秒隱藏
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 5000);
        } else if (success === false) {
            statusElement.style.color = '#e74c3c'; // 紅色
        } else {
            statusElement.style.color = '#3498db'; // 藍色
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