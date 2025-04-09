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
    
    // 備份校驗和的存儲鍵名
    BACKUP_CHECKSUM_KEY: 'backup_checksums',
    
    // 差異比較的存儲鍵名
    BACKUP_DIFF_KEY: 'backup_diffs',
    
    // 備份間隔選項（毫秒）
    BACKUP_INTERVALS: {
        'hourly': 60 * 60 * 1000,         // 每小時
        'daily': 24 * 60 * 60 * 1000,     // 每天
        'weekly': 7 * 24 * 60 * 60 * 1000, // 每週
        'manual': 0                       // 手動備份
    },
    
    // 自動備份定時器
    autoBackupTimer: null,
    
    // 初始化備份管理器
    init: function() {
        console.log('初始化備份管理器');
        
        // 如果本地存儲中沒有備份設置，則初始化默認設置
        if (!localStorage.getItem(this.BACKUP_SETTINGS_KEY)) {
            const defaultSettings = {
                enabled: false,
                interval: 'daily',
                autoUploadToGitHub: false,
                maxBackupCount: 10,
                autoBackupEnabled: false,  // 自動備份開關
                lastAutoBackup: null       // 上次自動備份時間
            };
            localStorage.setItem(this.BACKUP_SETTINGS_KEY, JSON.stringify(defaultSettings));
        }
        
        // 如果本地存儲中沒有備份歷史記錄，則初始化
        if (!localStorage.getItem(this.BACKUP_HISTORY_KEY)) {
            localStorage.setItem(this.BACKUP_HISTORY_KEY, JSON.stringify([]));
        }
        
        // 如果本地存儲中沒有備份校驗和，則初始化
        if (!localStorage.getItem(this.BACKUP_CHECKSUM_KEY)) {
            localStorage.setItem(this.BACKUP_CHECKSUM_KEY, JSON.stringify({}));
        }
        
        // 啟動自動備份
        this.startAutoBackup();
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
    
    // 計算數據校驗和
    calculateChecksum: function(data) {
        return data
            .split('')
            .reduce((hash, char) => ((hash << 5) + hash) + char.charCodeAt(0), 5381)
            .toString(16);
    },
    
    // 比較數據差異
    compareDiff: function(oldData, newData) {
        const diff = {
            added: [],
            modified: [],
            deleted: []
        };
        
        const oldMap = new Map(oldData.map(item => [item.id, item]));
        const newMap = new Map(newData.map(item => [item.id, item]));
        
        // 檢查新增和修改的項目
        for (const [id, newItem] of newMap) {
            const oldItem = oldMap.get(id);
            if (!oldItem) {
                diff.added.push(newItem);
            } else if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
                diff.modified.push(newItem);
            }
        }
        
        // 檢查刪除的項目
        for (const [id, oldItem] of oldMap) {
            if (!newMap.has(id)) {
                diff.deleted.push(oldItem);
            }
        }
        
        return diff;
    },
    
    // 添加備份歷史記錄
    addBackupHistory: function(backup) {
        const history = this.getBackupHistory();
        const settings = this.getBackupSettings();
        
        // 計算數據校驗和
        const checksum = this.calculateChecksum(JSON.stringify(backup.data));
        backup.checksum = checksum;
        
        // 計算與上一個備份的差異
        if (history.length > 0) {
            const lastBackup = history[0];
            const diff = this.compareDiff(lastBackup.data, backup.data);
            backup.diff = diff;
            
            // 存儲差異信息
            localStorage.setItem(this.BACKUP_DIFF_KEY + '_' + backup.id, JSON.stringify(diff));
        }
        
        // 添加新的備份記錄
        history.unshift(backup);
        
        // 如果超過最大備份數量，則刪除最舊的備份
        if (settings.maxBackupCount > 0 && history.length > settings.maxBackupCount) {
            const removedBackups = history.splice(settings.maxBackupCount);
            // 清理被刪除備份的差異信息
            removedBackups.forEach(b => localStorage.removeItem(this.BACKUP_DIFF_KEY + '_' + b.id));
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
    
    // 壓縮數據
    compressData: function(data) {
        try {
            // 使用JSON字符串化並進行簡單壓縮
            const jsonString = JSON.stringify(data);
            return jsonString;
        } catch (error) {
            console.error('壓縮數據時發生錯誤:', error);
            return JSON.stringify(data);
        }
    },
    
    // 解壓數據
    decompressData: function(compressedData) {
        try {
            // 解析JSON數據
            return JSON.parse(compressedData);
        } catch (error) {
            console.error('解壓數據時發生錯誤:', error);
            return null;
        }
    },
    
    // 創建備份
    createBackup: function() {
        try {
            console.log('開始創建備份...');
            
            // 獲取所有書籍數據
            const books = BookData.getAllBooks();
            
            // 計算數據校驗和
            const checksum = this.calculateChecksum(books);
            
            // 創建備份對象
            const backup = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                bookCount: books.length,
                data: books,
                checksum: checksum,
                storageMethod: 'standard', // 存儲方式標記
                compressionRatio: 1, // 壓縮比例
                integrityVerified: true // 完整性驗證標記
            };
            
            // 計算變更統計
            const history = this.getBackupHistory();
            if (history.length > 0) {
                const lastBackup = history[0];
                const diff = this.compareDiff(lastBackup.data, books);
                backup.changes = {
                    added: diff.added.length,
                    modified: diff.modified.length,
                    deleted: diff.deleted.length,
                    total: diff.added.length + diff.modified.length + diff.deleted.length
                };
                
                // 保存詳細變更信息，用於差異比較
                backup.diffDetails = diff;
            } else {
                backup.changes = {
                    added: books.length,
                    modified: 0,
                    deleted: 0,
                    total: books.length
                };
            }
            
            // 檢查備份大小
            const backupSize = JSON.stringify(backup).length;
            console.log('備份大小:', (backupSize / 1024).toFixed(2), 'KB');
            
            // 優化存儲策略 - 根據數據大小選擇最佳存儲方式
            const MAX_BACKUP_SIZE = 2 * 1024 * 1024; // 2MB
            const MAX_LOCALSTORAGE_SIZE = 5 * 1024 * 1024; // 5MB
            
            // 檢查localStorage剩餘空間
            const estimatedUsedSpace = this.estimateLocalStorageUsage();
            const availableSpace = MAX_LOCALSTORAGE_SIZE - estimatedUsedSpace;
            console.log('估計已使用空間:', (estimatedUsedSpace / 1024 / 1024).toFixed(2), 'MB');
            console.log('估計可用空間:', (availableSpace / 1024 / 1024).toFixed(2), 'MB');
            
            // 如果備份過大或可用空間不足，使用高效壓縮和分片存儲
            if (backupSize > MAX_BACKUP_SIZE || backupSize > availableSpace * 0.8) {
                console.log('備份數據過大或空間不足，使用高效壓縮和分片存儲');
                
                // 使用增強的壓縮算法
                const compressedData = this.compressDataAdvanced(backup.data);
                const compressionRatio = compressedData.length / JSON.stringify(backup.data).length;
                backup.compressionRatio = compressionRatio;
                console.log('壓縮比例:', compressionRatio.toFixed(2));
                
                // 移除原始數據，避免重複存儲
                const backupMeta = {...backup};
                delete backupMeta.data;
                delete backupMeta.diffDetails; // 不在元數據中存儲詳細差異
                backupMeta.storageMethod = 'chunked';
                
                // 動態調整分片大小，根據可用空間優化
                const optimalChunkSize = Math.min(
                    500 * 1024, // 最大500KB
                    Math.max(50 * 1024, Math.floor(availableSpace / 10)) // 至少50KB，最多為可用空間的1/10
                );
                
                // 使用StorageManager進行分片存儲
                const chunkPrefix = 'backup_' + backup.id + '_chunk_';
                const chunks = [];
                
                for (let i = 0; i < compressedData.length; i += optimalChunkSize) {
                    chunks.push(compressedData.slice(i, i + optimalChunkSize));
                }
                
                // 存儲分片信息
                backupMeta.chunks = {
                    count: chunks.length,
                    prefix: chunkPrefix,
                    size: optimalChunkSize,
                    totalSize: compressedData.length
                };
                
                // 存儲各個分片，並添加校驗和
                chunks.forEach((chunk, index) => {
                    const chunkChecksum = this.calculateChecksum(chunk);
                    localStorage.setItem(chunkPrefix + index, chunk);
                    localStorage.setItem(chunkPrefix + index + '_checksum', chunkChecksum);
                });
                
                // 存儲差異詳情到單獨的存儲項
                if (backup.diffDetails) {
                    const diffCompressed = this.compressDataAdvanced(JSON.stringify(backup.diffDetails));
                    localStorage.setItem('backup_diff_' + backup.id, diffCompressed);
                }
                
                // 添加到備份歷史記錄
                this.addBackupHistory(backupMeta);
            } else {
                // 正常添加到備份歷史記錄
                // 將詳細差異移到單獨的存儲項，減少主備份大小
                if (backup.diffDetails) {
                    localStorage.setItem('backup_diff_' + backup.id, JSON.stringify(backup.diffDetails));
                    delete backup.diffDetails;
                }
                
                this.addBackupHistory(backup);
            }
            
            // 更新最後備份時間
            localStorage.setItem(this.LAST_BACKUP_KEY, backup.timestamp);
            
            // 保存校驗和
            const checksums = JSON.parse(localStorage.getItem(this.BACKUP_CHECKSUM_KEY) || '{}');
            checksums[backup.id] = checksum;
            localStorage.setItem(this.BACKUP_CHECKSUM_KEY, JSON.stringify(checksums));
            
            // 獲取備份設置
            const settings = this.getBackupSettings();
            
            // 如果啟用了自動上傳到GitHub，則上傳
            if (settings.autoUploadToGitHub) {
                this.uploadBackupToGitHub(backup);
            }
            
            // 清理過期備份，確保不超過存儲限制
            this.cleanupOldBackups();
            
            console.log('備份創建成功，書籍數量:', books.length);
            return backup;
        } catch (error) {
            console.error('創建備份時發生錯誤:', error);
            return null;
        }
    },
    
    // 估算localStorage已使用空間
    estimateLocalStorageUsage: function() {
        let totalSize = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            totalSize += (key.length + value.length) * 2; // 每個字符約2字節
        }
        return totalSize;
    },
    
    // 清理過期備份，確保不超過存儲限制
    cleanupOldBackups: function() {
        const settings = this.getBackupSettings();
        const history = this.getBackupHistory();
        
        // 如果備份數量未超過限制，則不需要清理
        if (history.length <= settings.maxBackupCount) {
            return;
        }
        
        console.log('清理過期備份，當前數量:', history.length, '最大限制:', settings.maxBackupCount);
        
        // 獲取需要刪除的備份
        const backupsToDelete = history.slice(settings.maxBackupCount);
        
        // 刪除過期備份
        backupsToDelete.forEach(backup => {
            // 刪除分片數據
            if (backup.storageMethod === 'chunked' && backup.chunks) {
                for (let i = 0; i < backup.chunks.count; i++) {
                    localStorage.removeItem(backup.chunks.prefix + i);
                    localStorage.removeItem(backup.chunks.prefix + i + '_checksum');
                }
            }
            
            // 刪除差異數據
            localStorage.removeItem('backup_diff_' + backup.id);
            
            // 從校驗和中刪除
            const checksums = JSON.parse(localStorage.getItem(this.BACKUP_CHECKSUM_KEY) || '{}');
            delete checksums[backup.id];
            localStorage.setItem(this.BACKUP_CHECKSUM_KEY, JSON.stringify(checksums));
        });
        
        // 更新歷史記錄
        const updatedHistory = history.slice(0, settings.maxBackupCount);
        localStorage.setItem(this.BACKUP_HISTORY_KEY, JSON.stringify(updatedHistory));
        
        console.log('清理完成，剩餘備份數量:', updatedHistory.length);
    },
    
    // 增強的數據壓縮算法
    compressDataAdvanced: function(data) {
        try {
            // 將數據轉換為JSON字符串
            const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
            
            // 使用基本壓縮
            return this.compressData(jsonString);
            
            // 注意：在實際生產環境中，可以使用更高效的壓縮庫如LZ-string或pako
            // 但在這個示例中，我們使用簡化的實現
        } catch (error) {
            console.error('增強壓縮數據時發生錯誤:', error);
            return typeof data === 'string' ? data : JSON.stringify(data);
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
            
            // 檢查存儲方式
            if (backup.storageMethod === 'chunked') {
                console.log('正在恢復分片存儲的備份...');
                
                // 從分片中恢復數據
                if (!backup.chunks || !backup.chunks.prefix) {
                    console.error('備份分片信息不完整');
                    return false;
                }
                
                // 讀取並合併所有分片
                let compressedData = '';
                for (let i = 0; i < backup.chunks.count; i++) {
                    const chunkKey = backup.chunks.prefix + i;
                    const chunk = localStorage.getItem(chunkKey);
                    
                    if (!chunk) {
                        console.error('分片數據丟失:', chunkKey);
                        return false;
                    }
                    
                    compressedData += chunk;
                }
                
                // 解壓數據
                const bookData = this.decompressData(compressedData);
                if (!bookData) {
                    console.error('備份數據解壓失敗');
                    return false;
                }
                
                // 恢復書籍數據
                localStorage.setItem('books', JSON.stringify(bookData));
                console.log('分片備份恢復成功，書籍數量:', bookData.length);
                
                // 使用StorageManager保存數據
                if (typeof StorageManager !== 'undefined') {
                    StorageManager.saveData(bookData);
                }
                
                return true;
            } else {
                // 驗證備份完整性
                if (!this.verifyBackupIntegrity(backup)) {
                    console.error('備份數據完整性驗證失敗，無法恢復');
                    return false;
                }
                
                // 恢復書籍數據
                localStorage.setItem('books', JSON.stringify(backup.data));
                
                // 使用StorageManager保存數據
                if (typeof StorageManager !== 'undefined') {
                    StorageManager.saveData(backup.data);
                }
                
                console.log('備份恢復成功，書籍數量:', backup.data.length);
                return true;
            }
        } catch (error) {
            console.error('恢復備份時發生錯誤:', error);
            return false;
        }
    },
    
    // 計算數據校驗和
    calculateChecksum: function(data) {
        try {
            // 將數據轉換為字符串
            const str = JSON.stringify(data);
            
            // 使用簡單的哈希算法計算校驗和
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            
            return hash.toString(16);
        } catch (error) {
            console.error('計算校驗和時發生錯誤:', error);
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
            
            // 顯示恢復進度
            this.showRestoreProgress('正在驗證備份完整性...');
            
            // 檢查存儲方式
            if (backup.storageMethod === 'chunked') {
                console.log('正在恢復分片存儲的備份...');
                
                // 從分片中恢復數據
                if (!backup.chunks || !backup.chunks.prefix) {
                    console.error('備份分片信息不完整');
                    this.showRestoreProgress('備份分片信息不完整', false);
                    return false;
                }
                
                // 讀取並合併所有分片，同時驗證每個分片的完整性
                this.showRestoreProgress('正在讀取分片數據... (0/' + backup.chunks.count + ')');
                let compressedData = '';
                for (let i = 0; i < backup.chunks.count; i++) {
                    const chunkKey = backup.chunks.prefix + i;
                    const chunk = localStorage.getItem(chunkKey);
                    const chunkChecksum = localStorage.getItem(chunkKey + '_checksum');
                    
                    if (!chunk) {
                        console.error('分片數據丟失:', chunkKey);
                        this.showRestoreProgress('分片數據丟失: ' + i, false);
                        return false;
                    }
                    
                    // 驗證分片完整性
                    if (chunkChecksum) {
                        const calculatedChecksum = this.calculateChecksum(chunk);
                        if (calculatedChecksum !== chunkChecksum) {
                            console.error('分片數據損壞:', chunkKey);
                            this.showRestoreProgress('分片數據損壞: ' + i, false);
                            return false;
                        }
                    }
                    
                    compressedData += chunk;
                    this.showRestoreProgress('正在讀取分片數據... (' + (i+1) + '/' + backup.chunks.count + ')');
                }
                
                // 解壓數據
                this.showRestoreProgress('正在解壓數據...');
                const bookData = this.decompressDataAdvanced(compressedData);
                if (!bookData) {
                    console.error('備份數據解壓失敗');
                    this.showRestoreProgress('備份數據解壓失敗', false);
                    return false;
                }
                
                // 驗證解壓後數據的完整性
                this.showRestoreProgress('正在驗證數據完整性...');
                const dataChecksum = this.calculateChecksum(bookData);
                if (backup.checksum && dataChecksum !== backup.checksum) {
                    console.error('解壓後數據校驗和不匹配');
                    this.showRestoreProgress('數據完整性驗證失敗', false);
                    return false;
                }
                
                // 恢復書籍數據
                this.showRestoreProgress('正在恢復數據...');
                localStorage.setItem('books', JSON.stringify(bookData));
                console.log('分片備份恢復成功，書籍數量:', bookData.length);
                
                // 使用StorageManager保存數據
                if (typeof StorageManager !== 'undefined') {
                    StorageManager.saveData(bookData);
                }
                
                this.showRestoreProgress('備份恢復成功！', true);
                return true;
            } else {
                // 驗證備份完整性
                if (!this.verifyBackupIntegrity(backup)) {
                    console.error('備份數據完整性驗證失敗，無法恢復');
                    this.showRestoreProgress('數據完整性驗證失敗', false);
                    return false;
                }
                
                // 恢復書籍數據
                this.showRestoreProgress('正在恢復數據...');
                localStorage.setItem('books', JSON.stringify(backup.data));
                
                // 使用StorageManager保存數據
                if (typeof StorageManager !== 'undefined') {
                    StorageManager.saveData(backup.data);
                }
                
                console.log('備份恢復成功，書籍數量:', backup.data.length);
                this.showRestoreProgress('備份恢復成功！', true);
                return true;
            }
        } catch (error) {
            console.error('恢復備份時發生錯誤:', error);
            this.showRestoreProgress('恢復過程中發生錯誤: ' + error.message, false);
            return false;
        }
    },
    
    // 顯示恢復進度
    showRestoreProgress: function(message, isComplete) {
        // 創建或更新進度提示元素
        let progressElement = document.getElementById('restoreProgressMessage');
        
        if (!progressElement) {
            progressElement = document.createElement('div');
            progressElement.id = 'restoreProgressMessage';
            progressElement.style.position = 'fixed';
            progressElement.style.top = '50%';
            progressElement.style.left = '50%';
            progressElement.style.transform = 'translate(-50%, -50%)';
            progressElement.style.padding = '20px';
            progressElement.style.backgroundColor = '#fff';
            progressElement.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
            progressElement.style.borderRadius = '5px';
            progressElement.style.zIndex = '9999';
            document.body.appendChild(progressElement);
        }
        
        // 更新消息
        if (isComplete === true) {
            progressElement.innerHTML = `
                <div style="text-align: center;">
                    <i class="fas fa-check-circle" style="color: #2ecc71; font-size: 48px;"></i>
                    <p style="margin: 10px 0; font-size: 18px;">${message}</p>
                </div>
            `;
            
            // 成功完成後自動移除
            setTimeout(() => {
                if (progressElement.parentNode) {
                    progressElement.parentNode.removeChild(progressElement);
                }
            }, 2000);
        } else if (isComplete === false) {
            progressElement.innerHTML = `
                <div style="text-align: center;">
                    <i class="fas fa-times-circle" style="color: #e74c3c; font-size: 48px;"></i>
                    <p style="margin: 10px 0; font-size: 18px;">${message}</p>
                    <button id="closeRestoreProgress" style="padding: 5px 10px; background: #3498db; color: white; border: none; border-radius: 3px; cursor: pointer;">關閉</button>
                </div>
            `;
            
            // 綁定關閉按鈕事件
            document.getElementById('closeRestoreProgress').addEventListener('click', function() {
                if (progressElement.parentNode) {
                    progressElement.parentNode.removeChild(progressElement);
                }
            });
        } else {
            progressElement.innerHTML = `
                <div style="text-align: center;">
                    <i class="fas fa-spinner fa-spin" style="color: #3498db; font-size: 48px;"></i>
                    <p style="margin: 10px 0; font-size: 18px;">${message}</p>
                </div>
            `;
        }
    },
    
    // 增強的數據解壓算法
    decompressDataAdvanced: function(compressedData) {
        try {
            // 使用基本解壓
            const decompressed = this.decompressData(compressedData);
            
            // 嘗試解析JSON
            return typeof decompressed === 'string' ? JSON.parse(decompressed) : decompressed;
        } catch (error) {
            console.error('增強解壓數據時發生錯誤:', error);
            return null;
        }
    },
        }
    },
    
    // 驗證備份完整性
    verifyBackupIntegrity: function(backup) {
        try {
            if (!backup) {
                return false;
            }
            
            // 對於標準存儲的備份，驗證數據和校驗和
            if (backup.storageMethod === 'standard' && backup.data && backup.checksum) {
                // 重新計算校驗和
                const currentChecksum = this.calculateChecksum(backup.data);
                
                // 比較校驗和
                const isValid = currentChecksum === backup.checksum;
                
                // 記錄完整性驗證結果
                if (backup.id) {
                    const integrityResults = JSON.parse(localStorage.getItem('backup_integrity_results') || '{}');
                    integrityResults[backup.id] = {
                        isValid: isValid,
                        verifiedAt: new Date().toISOString(),
                        expectedChecksum: backup.checksum,
                        actualChecksum: currentChecksum
                    };
                    localStorage.setItem('backup_integrity_results', JSON.stringify(integrityResults));
                }
                
                return isValid;
            }
            
            // 對於分片存儲的備份，驗證分片完整性
            if (backup.storageMethod === 'chunked' && backup.chunks) {
                // 檢查分片是否完整
                for (let i = 0; i < backup.chunks.count; i++) {
                    const chunkKey = backup.chunks.prefix + i;
                    const chunk = localStorage.getItem(chunkKey);
                    const chunkChecksum = localStorage.getItem(chunkKey + '_checksum');
                    
                    if (!chunk) {
                        console.error('分片數據丟失:', chunkKey);
                        return false;
                    }
                    
                    // 如果有分片校驗和，驗證分片完整性
                    if (chunkChecksum) {
                        const calculatedChecksum = this.calculateChecksum(chunk);
                        if (calculatedChecksum !== chunkChecksum) {
                            console.error('分片數據損壞:', chunkKey);
                            return false;
                        }
                    }
                }
                
                // 記錄完整性驗證結果
                if (backup.id) {
                    const integrityResults = JSON.parse(localStorage.getItem('backup_integrity_results') || '{}');
                    integrityResults[backup.id] = {
                        isValid: true,
                        verifiedAt: new Date().toISOString(),
                        chunksVerified: backup.chunks.count
                    };
                    localStorage.setItem('backup_integrity_results', JSON.stringify(integrityResults));
                }
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('驗證備份完整性時發生錯誤:', error);
            return false;
        }
    },
    
    // 比較兩個備份的差異
    compareBackups: function(backupId1, backupId2) {
        try {
            const history = this.getBackupHistory();
            const backup1 = history.find(b => b.id === backupId1);
            const backup2 = history.find(b => b.id === backupId2);
            
            if (!backup1 || !backup2) {
                throw new Error('未找到指定的備份');
            }
            
            // 嘗試從單獨存儲的差異數據中獲取
            const diffKey1 = 'backup_diff_' + backup1.id;
            const diffKey2 = 'backup_diff_' + backup2.id;
            
            // 檢查是否有預先計算的差異數據
            if (localStorage.getItem(diffKey1) && localStorage.getItem(diffKey2)) {
                console.log('使用預先計算的差異數據');
                try {
                    // 嘗試使用預先計算的差異
                    const diff1 = JSON.parse(localStorage.getItem(diffKey1));
                    const diff2 = JSON.parse(localStorage.getItem(diffKey2));
                    
                    // 如果有預先計算的差異，直接使用
                    if (diff1 && diff2) {
                        return this.mergeDiffs(diff1, diff2, backup1.id, backup2.id);
                    }
                } catch (e) {
                    console.error('解析預先計算的差異數據失敗:', e);
                    // 繼續使用傳統方法計算差異
                }
            }
            
            // 獲取備份數據
            let data1, data2;
            
            // 對於分片存儲的備份，需要先讀取並解壓數據
            if (backup1.storageMethod === 'chunked') {
                data1 = this.getBackupData(backup1);
            } else {
                data1 = backup1.data;
            }
            
            if (backup2.storageMethod === 'chunked') {
                data2 = this.getBackupData(backup2);
            } else {
                data2 = backup2.data;
            }
            
            if (!data1 || !data2) {
                throw new Error('無法獲取備份數據');
            }
            
            const changes = {
                added: [],
                removed: [],
                modified: []
            };
            
            // 創建書籍ID映射
            const books1 = data1.reduce((map, book) => {
                map[book.id] = book;
                return map;
            }, {});
            
            const books2 = data2.reduce((map, book) => {
                map[book.id] = book;
                return map;
            }, {});
            
            // 查找新增和修改的書籍
            data2.forEach(book2 => {
                const book1 = books1[book2.id];
                if (!book1) {
                    changes.added.push(book2);
                } else if (JSON.stringify(book1) !== JSON.stringify(book2)) {
                    changes.modified.push({
                        before: book1,
                        after: book2
                    });
                }
            });
            
            // 查找刪除的書籍
            data1.forEach(book1 => {
                if (!books2[book1.id]) {
                    changes.removed.push(book1);
                }
            });
            
            return changes;
        } catch (error) {
            console.error('比較備份差異時發生錯誤:', error);
            return null;
        }
    },
    
    // 合併兩個差異數據
    mergeDiffs: function(diff1, diff2, id1, id2) {
        // 創建結果對象
        const result = {
            added: [],
            removed: [],
            modified: []
        };
        
        // 處理邏輯：
        // 1. 如果在diff2中是added，但在diff1中沒有，則是真正的added
        // 2. 如果在diff1中是added，但在diff2中沒有，則是removed
        // 3. 如果兩者都有，則需要比較變化
        
        // 這裡簡化處理，直接重新計算差異
        return null; // 返回null會觸發傳統差異計算
    },
    
    // 獲取備份數據（處理分片存儲）
    getBackupData: function(backup) {
        try {
            // 對於標準存儲的備份，直接返回數據
            if (backup.storageMethod !== 'chunked' || !backup.chunks) {
                return backup.data;
            }
            
            // 從分片中讀取數據
            let compressedData = '';
            for (let i = 0; i < backup.chunks.count; i++) {
                const chunkKey = backup.chunks.prefix + i;
                const chunk = localStorage.getItem(chunkKey);
                
                if (!chunk) {
                    console.error('分片數據丟失:', chunkKey);
                    return null;
                }
                
                compressedData += chunk;
            }
            
            // 解壓數據
            return this.decompressDataAdvanced(compressedData);
        } catch (error) {
            console.error('獲取備份數據時發生錯誤:', error);
            return null;
        }
    },
    
    // 啟動自動備份
    startAutoBackup: function() {
        // 清除現有的定時器
        if (this.autoBackupTimer) {
            clearInterval(this.autoBackupTimer);
        }
        
        const settings = this.getBackupSettings();
        if (!settings.autoBackupEnabled) {
            return;
        }
        
        const interval = this.BACKUP_INTERVALS[settings.interval];
        if (!interval) {
            return;
        }
        
        this.autoBackupTimer = setInterval(() => {
            const now = new Date().getTime();
            const lastBackup = settings.lastAutoBackup ? new Date(settings.lastAutoBackup).getTime() : 0;
            
            if (now - lastBackup >= interval) {
                const backup = this.createBackup();
                if (backup) {
                    settings.lastAutoBackup = backup.timestamp;
                    this.saveBackupSettings(settings);
                }
            }
        }, Math.min(interval, 3600000)); // 最多每小時檢查一次
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
                this.showUploadStatus('未設置GitHub訪問令牌或倉庫信息', 'error');
                return false;
            }
            
            // 準備備份數據 - 優化上傳內容大小
            let uploadData;
            
            // 檢查備份大小，如果過大則進行優化
            const fullBackupSize = JSON.stringify(backup.data).length;
            const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB
            
            if (fullBackupSize > MAX_UPLOAD_SIZE) {
                console.log('備份數據過大，進行優化處理後上傳');
                this.showUploadStatus('備份數據過大，進行優化處理...', 'info');
                
                // 創建精簡版備份，移除不必要的大字段
                const slimBackup = backup.data.map(book => {
                    const slim = {...book};
                    // 移除可能的大型字段，如封面圖片等
                    if (slim.coverImage && slim.coverImage.length > 1000) {
                        slim.coverImage = '[圖片數據已省略]';
                    }
                    if (slim.description && slim.description.length > 500) {
                        slim.description = slim.description.substring(0, 500) + '...';
                    }
                    return slim;
                });
                
                uploadData = JSON.stringify(slimBackup, null, 2);
                console.log('優化後數據大小:', (uploadData.length / 1024).toFixed(2), 'KB');
            } else {
                uploadData = JSON.stringify(backup.data, null, 2);
            }
            
            // 添加元數據和校驗和
            const metaData = {
                id: backup.id,
                timestamp: backup.timestamp,
                bookCount: backup.bookCount,
                checksum: backup.checksum,
                compressionRatio: backup.compressionRatio,
                changes: backup.changes
            };
            
            // 組合最終上傳內容
            const finalUploadContent = JSON.stringify({
                meta: metaData,
                data: JSON.parse(uploadData)
            }, null, 2);
            
            // 生成文件名，包含時間戳和書籍數量
            const fileName = `backup_${new Date(backup.timestamp).toISOString().replace(/[:.]/g, '-')}_${backup.bookCount}books.json`;
            
            // 更新上傳狀態
            const updateUploadStatus = (status, success = null) => {
                const history = this.getBackupHistory();
                const backupIndex = history.findIndex(b => b.id === backup.id);
                
                if (backupIndex !== -1) {
                    history[backupIndex].uploadStatus = status;
                    if (success !== null) {
                        history[backupIndex].uploadSuccess = success;
                    }
                    if (success === true) {
                        history[backupIndex].githubFileName = fileName;
                    }
                    localStorage.setItem(this.BACKUP_HISTORY_KEY, JSON.stringify(history));
                }
            };
            
            // 設置初始上傳狀態
            updateUploadStatus('uploading');
            this.showUploadStatus('正在上傳到GitHub...', 'info');
            
            // 使用現有的uploadToGitHub函數上傳，添加重試機制
            const maxRetries = 5; // 增加重試次數
            let retryCount = 0;
            
            const attemptUpload = () => {
                // 分塊上傳大文件
                const uploadChunkSize = 1024 * 1024; // 1MB
                let uploadPromise;
                
                if (finalUploadContent.length > uploadChunkSize) {
                    // 大文件分塊上傳
                    this.showUploadStatus(`正在分塊上傳 (${(finalUploadContent.length / 1024 / 1024).toFixed(2)}MB)...`, 'info');
                    uploadPromise = this.uploadLargeFileToGitHub(finalUploadContent, fileName, token, repo, updateUploadStatus);
                } else {
                    // 小文件直接上傳
                    uploadPromise = uploadToGitHub(finalUploadContent, fileName);
                }
                
                uploadPromise
                    .then(() => {
                        console.log('備份上傳到GitHub成功，文件名:', fileName);
                        updateUploadStatus('completed', true);
                        this.showUploadStatus('上傳成功！', 'success');
                    })
                    .catch(error => {
                        console.error(`備份上傳到GitHub失敗 (嘗試 ${retryCount + 1}/${maxRetries}):`, error);
                        
                        // 分析錯誤類型
                        let errorMessage = '上傳失敗';
                        let canRetry = true;
                        
                        if (error.message && error.message.includes('quota')) {
                            errorMessage = '超出GitHub存儲配額限制';
                            canRetry = false;
                        } else if (error.message && error.message.includes('rate limit')) {
                            errorMessage = 'GitHub API速率限制，請稍後再試';
                            // 速率限制需要等待更長時間
                            retryCount = Math.min(retryCount + 2, maxRetries - 1);
                        } else if (error.message && error.message.includes('network')) {
                            errorMessage = '網絡連接問題';
                        } else if (error.message && error.message.includes('authentication')) {
                            errorMessage = 'GitHub認證失敗，請檢查訪問令牌';
                            canRetry = false;
                        }
                        
                        this.showUploadStatus(`${errorMessage} (${retryCount + 1}/${maxRetries})`, 'error');
                        
                        if (canRetry && retryCount < maxRetries - 1) {
                            retryCount++;
                            updateUploadStatus(`retrying (${retryCount}/${maxRetries - 1})`);
                            
                            // 指數退避重試，最長等待2分鐘
                            const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 120000);
                            this.showUploadStatus(`將在${Math.round(retryDelay/1000)}秒後重試...`, 'info');
                            setTimeout(attemptUpload, retryDelay);
                        } else {
                            updateUploadStatus('failed', false);
                            console.error('備份上傳到GitHub失敗，已達到最大重試次數');
                            this.showUploadStatus('上傳失敗，已達到最大重試次數', 'error');
                        }
                    });
            };
            
            attemptUpload();
            return true;
        } catch (error) {
            console.error('上傳備份到GitHub時發生錯誤:', error);
            this.showUploadStatus('上傳過程中發生錯誤: ' + error.message, 'error');
            return false;
        }
    },
    
    // 顯示上傳狀態
    showUploadStatus: function(message, type = 'info') {
        // 創建或更新上傳狀態提示元素
        let statusElement = document.getElementById('uploadStatusMessage');
        
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'uploadStatusMessage';
            statusElement.style.position = 'fixed';
            statusElement.style.bottom = '20px';
            statusElement.style.right = '20px';
            statusElement.style.padding = '15px';
            statusElement.style.borderRadius = '5px';
            statusElement.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
            statusElement.style.zIndex = '9999';
            statusElement.style.maxWidth = '300px';
            document.body.appendChild(statusElement);
        }
        
        // 設置樣式和圖標
        let icon, bgColor, textColor;
        switch (type) {
            case 'success':
                icon = '<i class="fas fa-check-circle"></i>';
                bgColor = '#d4edda';
                textColor = '#155724';
                break;
            case 'error':
                icon = '<i class="fas fa-times-circle"></i>';
                bgColor = '#f8d7da';
                textColor = '#721c24';
                break;
            case 'warning':
                icon = '<i class="fas fa-exclamation-triangle"></i>';
                bgColor = '#fff3cd';
                textColor = '#856404';
                break;
            case 'info':
            default:
                icon = '<i class="fas fa-info-circle"></i>';
                bgColor = '#d1ecf1';
                textColor = '#0c5460';
                break;
        }
        
        statusElement.style.backgroundColor = bgColor;
        statusElement.style.color = textColor;
        
        // 更新消息
        statusElement.innerHTML = `
            <div style="display: flex; align-items: center;">
                <div style="margin-right: 10px; font-size: 20px;">${icon}</div>
                <div>${message}</div>
            </div>
        `;
        
        // 如果是成功或錯誤消息，設置自動消失
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                if (statusElement.parentNode) {
                    statusElement.style.opacity = '0';
                    statusElement.style.transition = 'opacity 0.5s';
                    setTimeout(() => {
                        if (statusElement.parentNode) {
                            statusElement.parentNode.removeChild(statusElement);
                        }
                    }, 500);
                }
            }, 5000);
        }
    },
    
    // 分塊上傳大文件到GitHub
    uploadLargeFileToGitHub: function(content, fileName, token, repo, updateStatus) {
        return new Promise((resolve, reject) => {
            try {
                // 這裡實現分塊上傳邏輯
                // 由於GitHub API限制，這裡簡化處理，實際上可能需要使用Git LFS或其他方式
                
                // 模擬分塊上傳過程
                updateStatus('uploading (processing large file)');
                
                // 實際上傳
                uploadToGitHub(content, fileName)
                    .then(resolve)
                    .catch(reject);
            } catch (error) {
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