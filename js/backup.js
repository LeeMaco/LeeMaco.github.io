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
        
        // 監聽書籍數據變化
        window.addEventListener('booksUpdated', () => {
          const settings = this.getBackupSettings();
          if (settings.autoUploadToGitHub) {
            this.createBackup();
          }
        });
    },
    
    // 獲取備份設置
    getBackupSettings: function() {
        return Utils.safeGetLocalStorage(this.BACKUP_SETTINGS_KEY);
    },
    
    // 保存備份設置
    saveBackupSettings: function(settings) {
        if (Utils.safeSetLocalStorage(this.BACKUP_SETTINGS_KEY, settings)) {
            console.log('備份設置已保存:', settings);
            
            // 重新啟動備份檢查器
            this.startBackupChecker();
            
            return settings;
        }
        return null;
    },
    
    // 獲取備份歷史記錄
    getBackupHistory: function() {
        return Utils.safeGetLocalStorage(this.BACKUP_HISTORY_KEY) || [];
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
        if (Utils.safeSetLocalStorage(this.BACKUP_HISTORY_KEY, history)) {
            console.log('備份歷史記錄已更新，當前備份數量:', history.length);
            return history;
        }
        return null;,
    
    // 刪除備份歷史記錄
    deleteBackupHistory: function(backupId) {
        const history = this.getBackupHistory();
        const updatedHistory = history.filter(backup => backup.id !== backupId);
        
        if (Utils.safeSetLocalStorage(this.BACKUP_HISTORY_KEY, updatedHistory)) {
            console.log('已刪除備份記錄，ID:', backupId);
            return updatedHistory;
        }
        return null;
    },
    
    // 清空所有備份歷史記錄
    clearBackupHistory: function() {
        if (Utils.safeSetLocalStorage(this.BACKUP_HISTORY_KEY, [])) {
            console.log('已清空所有備份歷史記錄');
            return [];
        }
        return null;
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
            
            // 返回備份對象
            return backup;
            
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
            Utils.safeSetLocalStorage('books', backup.data);
            
            // 觸發數據更新事件
            const event = new Event('booksUpdated');
            window.dispatchEvent(event);
            
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
                this.updateUploadStatus('error', '未設置GitHub訪問令牌或倉庫信息');
                return false;
            }
            
            // 檢查是否有衝突
            return this.checkGitHubConflict(repo, token).then(hasConflict => {
                if (hasConflict) {
                    this.updateUploadStatus('warning', '檢測到GitHub倉庫有衝突，正在嘗試合併...');
                    return this.resolveGitHubConflict(repo, token);
                }
                return true;
            }).then(() => {
            
            // 準備備份數據
            const jsonContent = JSON.stringify(backup.data, null, 2);
            const fileName = `backup_${new Date(backup.timestamp).toISOString().replace(/[:.]/g, '-')}.json`;
            
            // 更新上傳狀態
            this.updateUploadStatus('uploading', '正在準備上傳數據...');
            
            // 使用現有的uploadToGitHub函數上傳
            return uploadToGitHub(jsonContent, fileName, (progress) => {
                this.updateUploadStatus('uploading', `上傳進度: ${progress}%`);
            }).then(() => {
                this.updateUploadStatus('success', '備份已成功上傳到GitHub');
                
                // 更新最後同步時間
                localStorage.setItem('lastGitHubSync', new Date().toISOString());
                
                return true;
            }).catch(error => {
                console.error('上傳到GitHub失敗:', error);
                this.updateUploadStatus('error', '上傳到GitHub失敗: ' + error.message);
                return false;
            });
        }).catch(error => {
            console.error('GitHub同步過程中發生錯誤:', error);
            this.updateUploadStatus('error', 'GitHub同步失敗: ' + error.message);
            return false;
        });
                this.updateUploadStatus('uploading', `上傳中: ${Math.round(progress * 100)}%`);
            })
                .then(() => {
                    console.log('備份上傳到GitHub成功，文件名:', fileName);
                    this.updateUploadStatus('success', '備份已成功上傳到GitHub');
                    
                    // 更新備份記錄，添加GitHub文件名
                    const history = this.getBackupHistory();
                    const backupIndex = history.findIndex(b => b.id === backup.id);
                    
                    if (backupIndex !== -1) {
                        history[backupIndex].githubFileName = fileName;
                        Utils.safeSetLocalStorage(this.BACKUP_HISTORY_KEY, history);
                    }
                    return true;
                })
                .catch(error => {
                    console.error('備份上傳到GitHub失敗:', error);
                    let errorMsg = '上傳失敗';
                    
                    if (error.response) {
                        errorMsg = `GitHub API錯誤: ${error.response.status}`;
                        if (error.response.data && error.response.data.message) {
                            errorMsg += ` - ${error.response.data.message}`;
                        }
                    } else if (error.request) {
                        errorMsg = '網絡請求失敗，請檢查網絡連接';
                    } else {
                        errorMsg = error.message || '未知錯誤';
                    }
                    
                    this.updateUploadStatus('error', errorMsg);
                    return false;
                });
        } catch (error) {
            console.error('上傳備份到GitHub時發生錯誤:', error);
            this.updateUploadStatus('error', '上傳過程中發生錯誤');
            return false;
        }
    },
    
    // 同步GitHub備份
    syncWithGitHub: async function() {
        try {
            console.log('開始同步GitHub備份...');
            
            const token = localStorage.getItem('githubToken');
            const repo = localStorage.getItem('githubRepo');
            const branch = localStorage.getItem('githubBranch') || 'main';
            
            if (!token || !repo) {
                console.error('未設置GitHub訪問令牌或倉庫信息，無法同步');
                return false;
            }
            
            const [owner, repoName] = repo.split('/');
            if (!owner || !repoName) {
                throw new Error('GitHub倉庫格式不正確，應為 "用戶名/倉庫名"');
            }
            
            // 獲取GitHub上的備份文件列表
            const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/data?ref=${branch}`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API錯誤: ${response.status} - ${errorData.message}`);
            }
            
            const files = await response.json();
            const backupFiles = files.filter(file => file.name.startsWith('backup_'));
            
            console.log(`從GitHub獲取到${backupFiles.length}個備份文件`);
            return backupFiles;
        } catch (error) {
            console.error('同步GitHub備份時發生錯誤:', error);
            return false;
        }
    },
    
    // 從GitHub下載備份
    downloadFromGitHub: async function(fileName) {
        try {
            console.log(`開始下載GitHub備份文件: ${fileName}`);
            
            const token = localStorage.getItem('githubToken');
            const repo = localStorage.getItem('githubRepo');
            const branch = localStorage.getItem('githubBranch') || 'main';
            
            if (!token || !repo) {
                console.error('未設置GitHub訪問令牌或倉庫信息，無法下載');
                return false;
            }
            
            const [owner, repoName] = repo.split('/');
            if (!owner || !repoName) {
                throw new Error('GitHub倉庫格式不正確，應為 "用戶名/倉庫名"');
            }
            
            // 獲取文件內容
            const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/data/${fileName}?ref=${branch}`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API錯誤: ${response.status} - ${errorData.message}`);
            }
            
            const fileData = await response.json();
            const content = decodeURIComponent(escape(atob(fileData.content)));
            const backup = JSON.parse(content);
            
            console.log(`成功下載備份文件: ${fileName}`);
            return backup;
        } catch (error) {
            console.error('下載GitHub備份時發生錯誤:', error);
            return false;
        }
    },
    
    // 獲取最後一次備份時間
    getLastBackupTime: function() {
        const lastBackup = Utils.safeGetLocalStorage(this.LAST_BACKUP_KEY);
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
    },
    
    // 更新上傳狀態
    updateUploadStatus: function(status, message) {
        const statusElement = document.getElementById('uploadStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `upload-status upload-status-${status}`;
        }
        
        // 觸發自定義事件以便UI更新
        const event = new CustomEvent('backupUploadStatus', {
            detail: { status, message }
        });
        document.dispatchEvent(event);
    }
};

// 初始化備份管理器
document.addEventListener('DOMContentLoaded', function() {
    BackupManager.init();
});