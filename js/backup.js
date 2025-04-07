/**
 * 書籍查詢管理系統 - 自動備份模塊
 * 負責處理數據的自動備份功能
 */

const BackupManager = {
    // 備份設置的存儲鍵名
    BACKUP_SETTINGS_KEY: 'backup_settings',
    
    // 備份歷史記錄的存儲鍵名
    BACKUP_HISTORY_KEY: 'backup_history',
    
    // 備份數據的存儲鍵前綴
    BACKUP_DATA_PREFIX: 'backup_data_',
    
    // 最後一次備份時間的存儲鍵名
    LAST_BACKUP_KEY: 'last_backup_time',
    
    // 備份分片大小（字節）
    BACKUP_CHUNK_SIZE: 1024 * 1024, // 1MB
    
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
        
        try {
            // 如果本地存儲中沒有備份設置，則初始化默認設置
            if (!localStorage.getItem(this.BACKUP_SETTINGS_KEY)) {
                const defaultSettings = {
                    enabled: false,
                    interval: 'daily',
                    autoUploadToGitHub: false,
                    maxBackupCount: 10
                };
                localStorage.setItem(this.BACKUP_SETTINGS_KEY, JSON.stringify(defaultSettings));
            } else {
                // 驗證現有設置的有效性
                try {
                    const settings = JSON.parse(localStorage.getItem(this.BACKUP_SETTINGS_KEY));
                    // 確保所有必要的屬性都存在
                    if (!settings.hasOwnProperty('enabled') || 
                        !settings.hasOwnProperty('interval') || 
                        !settings.hasOwnProperty('autoUploadToGitHub') || 
                        !settings.hasOwnProperty('maxBackupCount')) {
                        throw new Error('備份設置格式無效');
                    }
                } catch (e) {
                    console.error('備份設置解析失敗，重置為默認值:', e);
                    const defaultSettings = {
                        enabled: false,
                        interval: 'daily',
                        autoUploadToGitHub: false,
                        maxBackupCount: 10
                    };
                    localStorage.setItem(this.BACKUP_SETTINGS_KEY, JSON.stringify(defaultSettings));
                }
            }
            
            // 如果本地存儲中沒有備份歷史記錄，則初始化
            if (!localStorage.getItem(this.BACKUP_HISTORY_KEY)) {
                localStorage.setItem(this.BACKUP_HISTORY_KEY, JSON.stringify([]));
            } else {
                // 驗證備份歷史記錄的有效性
                try {
                    const history = JSON.parse(localStorage.getItem(this.BACKUP_HISTORY_KEY));
                    if (!Array.isArray(history)) {
                        throw new Error('備份歷史記錄格式無效');
                    }
                } catch (e) {
                    console.error('備份歷史記錄解析失敗，重置為空數組:', e);
                    localStorage.setItem(this.BACKUP_HISTORY_KEY, JSON.stringify([]));
                }
            }
            
            // 啟動備份檢查器
            this.startBackupChecker();
            
            console.log('備份管理器初始化成功');
        } catch (error) {
            console.error('初始化備份管理器時發生錯誤:', error);
        }
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
    
    // 壓縮數據
    compressData: function(data) {
        try {
            // 將數據轉換為JSON字符串
            const jsonString = JSON.stringify(data);
            // 使用LZString進行壓縮
            if (typeof LZString !== 'undefined') {
                return LZString.compressToUTF16(jsonString);
            } else {
                console.warn('LZString庫未加載，無法壓縮數據');
                return jsonString;
            }
        } catch (error) {
            console.error('壓縮數據時發生錯誤:', error);
            return JSON.stringify(data);
        }
    },
    
    // 解壓數據
    decompressData: function(compressedData) {
        try {
            // 檢查是否是壓縮數據
            if (typeof LZString !== 'undefined' && typeof compressedData === 'string') {
                try {
                    // 嘗試解壓
                    const decompressed = LZString.decompressFromUTF16(compressedData);
                    if (decompressed) {
                        return JSON.parse(decompressed);
                    }
                } catch (e) {
                    // 如果解壓失敗，可能是未壓縮的JSON字符串
                    console.warn('解壓數據失敗，嘗試直接解析JSON:', e);
                }
            }
            // 直接解析JSON
            return JSON.parse(compressedData);
        } catch (error) {
            console.error('解壓數據時發生錯誤:', error);
            return null;
        }
    },
    
    // 將數據分片存儲
    storeDataInChunks: function(key, data) {
        try {
            // 壓縮數據
            const compressedData = this.compressData(data);
            
            // 計算需要的分片數量
            const totalChunks = Math.ceil(compressedData.length / this.BACKUP_CHUNK_SIZE);
            
            // 存儲分片信息
            const chunkInfo = {
                totalChunks: totalChunks,
                timestamp: new Date().toISOString(),
                size: compressedData.length
            };
            
            localStorage.setItem(`${key}_info`, JSON.stringify(chunkInfo));
            
            // 存儲每個分片
            for (let i = 0; i < totalChunks; i++) {
                const start = i * this.BACKUP_CHUNK_SIZE;
                const end = Math.min(start + this.BACKUP_CHUNK_SIZE, compressedData.length);
                const chunk = compressedData.substring(start, end);
                
                try {
                    localStorage.setItem(`${key}_chunk_${i}`, chunk);
                } catch (e) {
                    throw new Error(`存儲分片 ${i+1}/${totalChunks} 失敗: ${e.message}`);
                }
            }
            
            return true;
        } catch (error) {
            console.error('分片存儲數據時發生錯誤:', error);
            throw error;
        }
    },
    
    // 從分片中讀取數據
    loadDataFromChunks: function(key) {
        try {
            // 讀取分片信息
            const chunkInfoStr = localStorage.getItem(`${key}_info`);
            if (!chunkInfoStr) {
                return null;
            }
            
            const chunkInfo = JSON.parse(chunkInfoStr);
            const totalChunks = chunkInfo.totalChunks;
            
            // 讀取並合併所有分片
            let compressedData = '';
            for (let i = 0; i < totalChunks; i++) {
                const chunk = localStorage.getItem(`${key}_chunk_${i}`);
                if (!chunk) {
                    throw new Error(`無法讀取分片 ${i+1}/${totalChunks}`);
                }
                compressedData += chunk;
            }
            
            // 解壓數據
            return this.decompressData(compressedData);
        } catch (error) {
            console.error('從分片讀取數據時發生錯誤:', error);
            return null;
        }
    },
    
    // 刪除分片數據
    deleteChunkedData: function(key) {
        try {
            // 讀取分片信息
            const chunkInfoStr = localStorage.getItem(`${key}_info`);
            if (!chunkInfoStr) {
                return false;
            }
            
            const chunkInfo = JSON.parse(chunkInfoStr);
            const totalChunks = chunkInfo.totalChunks;
            
            // 刪除所有分片
            for (let i = 0; i < totalChunks; i++) {
                localStorage.removeItem(`${key}_chunk_${i}`);
            }
            
            // 刪除分片信息
            localStorage.removeItem(`${key}_info`);
            
            return true;
        } catch (error) {
            console.error('刪除分片數據時發生錯誤:', error);
            return false;
        }
    },
    
    // 添加備份歷史記錄
    addBackupHistory: function(backup) {
        try {
            const history = this.getBackupHistory();
            const settings = this.getBackupSettings();
            
            // 創建不包含完整數據的歷史記錄
            const backupMeta = {
                id: backup.id,
                timestamp: backup.timestamp,
                bookCount: backup.bookCount,
                dataKey: `${this.BACKUP_DATA_PREFIX}${backup.id}`
            };
            
            // 添加新的備份記錄
            history.unshift(backupMeta);
            
            // 如果超過最大備份數量，則刪除最舊的備份
            if (settings.maxBackupCount > 0 && history.length > settings.maxBackupCount) {
                // 獲取要刪除的備份
                const backupsToDelete = history.splice(settings.maxBackupCount);
                
                // 刪除對應的備份數據
                backupsToDelete.forEach(oldBackup => {
                    if (oldBackup.dataKey) {
                        this.deleteChunkedData(oldBackup.dataKey);
                    }
                });
            }
            
            // 保存更新後的歷史記錄
            try {
                localStorage.setItem(this.BACKUP_HISTORY_KEY, JSON.stringify(history));
            } catch (e) {
                throw new Error(`無法保存備份歷史記錄: ${e.message}`);
            }
            
            // 單獨存儲備份數據
            try {
                this.storeDataInChunks(backupMeta.dataKey, backup.data);
            } catch (e) {
                throw new Error(`無法存儲備份數據: ${e.message}`);
            }
            
            console.log('備份歷史記錄已更新，當前備份數量:', history.length);
            return history;
        } catch (error) {
            console.error('添加備份歷史記錄時發生錯誤:', error);
            throw error;
        }
    },
    
    // 刪除備份歷史記錄
    deleteBackupHistory: function(backupId) {
        try {
            const history = this.getBackupHistory();
            const backupToDelete = history.find(backup => backup.id === backupId);
            
            // 刪除備份數據
            if (backupToDelete && backupToDelete.dataKey) {
                this.deleteChunkedData(backupToDelete.dataKey);
            }
            
            // 更新歷史記錄
            const updatedHistory = history.filter(backup => backup.id !== backupId);
            localStorage.setItem(this.BACKUP_HISTORY_KEY, JSON.stringify(updatedHistory));
            
            console.log('已刪除備份記錄，ID:', backupId);
            return updatedHistory;
        } catch (error) {
            console.error('刪除備份歷史記錄時發生錯誤:', error);
            throw error;
        }
    },
    
    // 清空所有備份歷史記錄
    clearBackupHistory: function() {
        try {
            // 獲取所有備份歷史
            const history = this.getBackupHistory();
            
            // 刪除所有備份數據
            history.forEach(backup => {
                if (backup.dataKey) {
                    this.deleteChunkedData(backup.dataKey);
                }
            });
            
            // 清空歷史記錄
            localStorage.setItem(this.BACKUP_HISTORY_KEY, JSON.stringify([]));
            console.log('已清空所有備份歷史記錄');
            
            return [];
        } catch (error) {
            console.error('清空備份歷史記錄時發生錯誤:', error);
            throw error;
        }
    },
    
    // 創建備份
    createBackup: function() {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('開始創建備份...');
                
                // 獲取所有書籍數據
                const books = BookData.getAllBooks();
                
                // 檢查書籍數據是否有效
                if (!books || !Array.isArray(books)) {
                    throw new Error('無法獲取有效的書籍數據');
                }
                
                // 檢查書籍數據是否為空
                if (books.length === 0) {
                    throw new Error('書籍數據為空，無法創建備份');
                }
                
                // 創建備份對象
                const backup = {
                    id: Date.now().toString(),
                    timestamp: new Date().toISOString(),
                    bookCount: books.length,
                    data: books
                };
                
                try {
                    // 添加到備份歷史記錄
                    this.addBackupHistory(backup);
                    
                    // 更新最後備份時間
                    localStorage.setItem(this.LAST_BACKUP_KEY, backup.timestamp);
                } catch (storageError) {
                    // 處理存儲錯誤
                    console.error('存儲備份數據時發生錯誤:', storageError);
                    
                    // 顯示詳細錯誤消息和解決方案
                    const statusElement = document.getElementById('backupStatus');
                    if (statusElement) {
                        let errorMsg = `備份創建失敗: ${storageError.message || '未知錯誤'}`;
                        
                        // 如果是存儲配額錯誤，提供解決方案
                        if (storageError.message && storageError.message.includes('quota')) {
                            errorMsg += '\n\n解決方案:\n1. 刪除一些舊的備份\n2. 清理瀏覽器緩存\n3. 導出重要備份到文件';
                        }
                        
                        statusElement.textContent = errorMsg;
                        statusElement.style.color = '#e74c3c';
                        statusElement.style.whiteSpace = 'pre-line';
                        setTimeout(() => {
                            statusElement.textContent = '';
                            statusElement.style.whiteSpace = 'normal';
                        }, 15000);
                    }
                    
                    throw storageError;
                }
                
                // 獲取備份設置
                const settings = this.getBackupSettings();
                
                // 如果啟用了自動上傳到GitHub，則上傳
                if (settings.autoUploadToGitHub) {
                    try {
                        await this.uploadBackupToGitHub(backup);
                    } catch (uploadError) {
                        console.error('上傳備份到GitHub時發生錯誤:', uploadError);
                        // 不中斷備份過程，但記錄錯誤
                        const history = this.getBackupHistory();
                        const backupIndex = history.findIndex(b => b.id === backup.id);
                        if (backupIndex !== -1) {
                            history[backupIndex].uploadError = uploadError.message || '上傳失敗';
                            localStorage.setItem(this.BACKUP_HISTORY_KEY, JSON.stringify(history));
                        }
                    }
                }
                
                console.log('備份創建成功，書籍數量:', books.length);
                resolve(backup);
            } catch (error) {
                console.error('創建備份時發生錯誤:', error);
                
                // 顯示詳細錯誤消息
                const statusElement = document.getElementById('backupStatus');
                if (statusElement && !statusElement.textContent) {
                    statusElement.textContent = `備份創建失敗: ${error.message || '未知錯誤'}`;
                    statusElement.style.color = '#e74c3c';
                    setTimeout(() => {
                        statusElement.textContent = '';
                    }, 8000);
                }
                
                reject(error);
            }
        });
    },
    
    // 恢復備份
    restoreBackup: function(backupId) {
        try {
            console.log('開始恢復備份，ID:', backupId);
            
            // 獲取備份歷史記錄
            const history = this.getBackupHistory();
            
            // 查找指定ID的備份元數據
            const backupMeta = history.find(b => b.id === backupId);
            
            if (!backupMeta) {
                console.error('未找到指定ID的備份:', backupId);
                return false;
            }
            
            // 從分片存儲中獲取完整備份數據
            const backupData = this.loadDataFromChunks(backupMeta.dataKey);
            
            if (!backupData || !Array.isArray(backupData)) {
                console.error('無法讀取備份數據或數據格式無效:', backupId);
                return false;
            }
            
            // 確保所有書籍ID都是字符串類型
            backupData.forEach(book => {
                if (book.id !== undefined) {
                    book.id = String(book.id);
                }
            });
            
            // 恢復書籍數據
            localStorage.setItem('books', JSON.stringify(backupData));
            
            // 更新最後恢復時間
            const now = new Date();
            backupMeta.lastRestored = now.toISOString();
            
            // 更新備份歷史記錄
            const backupIndex = history.findIndex(b => b.id === backupId);
            if (backupIndex !== -1) {
                history[backupIndex] = backupMeta;
                localStorage.setItem(this.BACKUP_HISTORY_KEY, JSON.stringify(history));
            }
            
            console.log('備份恢復成功，書籍數量:', backupData.length);
            return true;
        } catch (error) {
            console.error('恢復備份時發生錯誤:', error);
            return false;
        }
    },
    
    // 上傳備份到GitHub
    uploadBackupToGitHub: function(backup) {
        return new Promise((resolve, reject) => {
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
                
                // 準備備份數據 - 嘗試壓縮數據以減小文件大小
                let jsonContent;
                try {
                    // 使用壓縮函數處理數據
                    const compressedData = this.compressData(backup.data);
                    // 如果壓縮成功且大小減小，則使用壓縮數據
                    if (typeof compressedData === 'string' && compressedData.length < JSON.stringify(backup.data).length) {
                        jsonContent = compressedData;
                    } else {
                        // 否則使用標準JSON
                        jsonContent = JSON.stringify(backup.data, null, 2);
                    }
                } catch (e) {
                    // 如果壓縮失敗，使用標準JSON
                    jsonContent = JSON.stringify(backup.data, null, 2);
                }
                
                const fileName = `backup_${new Date(backup.timestamp).toISOString().replace(/[:.]/g, '-')}.json`;
                
                // 顯示上傳中狀態
                const statusElement = document.getElementById('backupStatus');
                if (statusElement) {
                    statusElement.textContent = '正在上傳備份到GitHub...';
                    statusElement.style.color = '#3498db';
                }
                
                // 使用GitHubUploader模塊上傳
                if (typeof GitHubUploader !== 'undefined' && GitHubUploader.uploadToGitHub) {
                    // 使用新的GitHubUploader模塊上傳
                    GitHubUploader.uploadToGitHub(jsonContent, fileName, {
                        onProgress: (progressData) => {
                            if (statusElement) {
                                statusElement.textContent = progressData.message;
                                statusElement.style.color = progressData.status === GitHubUploader.UPLOAD_STATUS.FAILED ? '#e74c3c' : '#3498db';
                            }
                        },
                        onSuccess: (result) => {
                            console.log('備份上傳到GitHub成功，文件名:', fileName);
                            
                            // 更新備份記錄，添加GitHub文件名和上傳狀態
                            const history = this.getBackupHistory();
                            const backupIndex = history.findIndex(b => b.id === backup.id);
                            
                            if (backupIndex !== -1) {
                                history[backupIndex].githubFileName = fileName;
                                history[backupIndex].uploadedToGitHub = true;
                                history[backupIndex].uploadTime = new Date().toISOString();
                                
                                // 刪除上傳錯誤信息（如果有）
                                if (history[backupIndex].uploadError) {
                                    delete history[backupIndex].uploadError;
                                }
                                
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
                            
                            resolve(result);
                        },
                        onError: (error) => {
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
                            
                            reject(error); // 拋出錯誤，以便外部捕獲
                        }
                    }).catch(error => {
                        reject(error);
                    });
                } else {
                    // 使用舊的uploadToGitHub函數上傳（向後兼容）
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
                            
                            resolve(result);
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
                            
                            reject(error); // 拋出錯誤，以便外部捕獲
                        });
                }
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
                
                reject(error);
            }
        });
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
            console.log('已清除現有的備份檢查器定時器');
        }
        
        try {
            // 獲取備份設置
            const settings = this.getBackupSettings();
            
            // 檢查設置是否有效
            if (!settings) {
                console.error('無法獲取有效的備份設置');
                return;
            }
            
            // 如果備份功能未啟用，則不啟動定時器
            if (!settings.enabled) {
                console.log('備份功能未啟用，不啟動定時器');
                return;
            }
            
            // 檢查備份間隔設置是否有效
            if (!this.BACKUP_INTERVALS[settings.interval] && settings.interval !== 'manual') {
                console.warn('無效的備份間隔設置:', settings.interval, '，使用默認值「每天」');
                settings.interval = 'daily';
                this.saveBackupSettings(settings);
            }
            
            // 設置定時器，每分鐘檢查一次是否需要備份
            this.backupCheckerId = setInterval(() => {
                try {
                    if (this.checkIfBackupNeeded()) {
                        console.log('需要進行自動備份');
                        this.createBackup()
                            .then(backup => {
                                console.log('自動備份創建成功，書籍數量:', backup.bookCount);
                            })
                            .catch(error => {
                                console.error('自動備份創建失敗:', error.message);
                                
                                // 記錄備份失敗信息
                                const failedBackups = JSON.parse(localStorage.getItem('failed_backups') || '[]');
                                failedBackups.push({
                                    timestamp: new Date().toISOString(),
                                    error: error.message || '未知錯誤'
                                });
                                
                                // 只保留最近10條失敗記錄
                                if (failedBackups.length > 10) {
                                    failedBackups.splice(0, failedBackups.length - 10);
                                }
                                
                                localStorage.setItem('failed_backups', JSON.stringify(failedBackups));
                            });
                    }
                } catch (error) {
                    console.error('備份檢查過程中發生錯誤:', error);
                }
            }, 60 * 1000); // 每分鐘檢查一次
            
            console.log('備份檢查器已啟動，間隔:', settings.interval);
        } catch (error) {
            console.error('啟動備份檢查器時發生錯誤:', error);
        }
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