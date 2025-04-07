/**
 * 書籍查詢管理系統 - GitHub上傳模塊
 * 負責處理數據上傳到GitHub的功能
 */

const GitHubUploader = {
    // 上傳狀態常量
    UPLOAD_STATUS: {
        PENDING: 'pending',
        UPLOADING: 'uploading',
        SUCCESS: 'success',
        FAILED: 'failed'
    },
    
    // 上傳重試次數
    MAX_RETRY_COUNT: 3,
    
    // 上傳超時時間（毫秒）
    UPLOAD_TIMEOUT: 30000,
    
    /**
     * 上傳數據到GitHub
     * @param {string} content - 要上傳的內容
     * @param {string} fileName - 文件名
     * @param {Object} options - 上傳選項
     * @param {number} options.retryCount - 重試次數
     * @param {Function} options.onProgress - 進度回調
     * @param {Function} options.onSuccess - 成功回調
     * @param {Function} options.onError - 錯誤回調
     * @returns {Promise} - 上傳結果
     */
    uploadToGitHub: async function(content, fileName = 'books.json', options = {}) {
        const retryCount = options.retryCount || 0;
        const onProgress = options.onProgress || function() {};
        const onSuccess = options.onSuccess || function() {};
        const onError = options.onError || function() {};
        
        try {
            // 更新上傳狀態
            onProgress({
                status: this.UPLOAD_STATUS.UPLOADING,
                message: '正在上傳到GitHub...',
                progress: 10
            });
            
            // 獲取GitHub個人訪問令牌
            const token = localStorage.getItem('githubToken');
            if (!token) {
                throw new Error('未設置GitHub訪問令牌，請在設置中配置');
            }
            
            // 獲取GitHub倉庫信息
            const repo = localStorage.getItem('githubRepo') || '';
            const [owner, repoName] = repo.split('/');
            if (!owner || !repoName) {
                throw new Error('GitHub倉庫格式不正確，應為 "用戶名/倉庫名"');
            }
            
            // 獲取分支名稱
            const branch = localStorage.getItem('githubBranch') || 'main';
            
            // 更新進度
            onProgress({
                status: this.UPLOAD_STATUS.UPLOADING,
                message: '正在檢查文件狀態...',
                progress: 20
            });
            
            // 檢查文件是否已存在，獲取最新的SHA
            let fileSha = '';
            let fileExists = false;
            try {
                const checkResponse = await this._fetchWithTimeout(
                    `https://api.github.com/repos/${owner}/${repoName}/contents/data/${fileName}?ref=${branch}`,
                    {
                        headers: {
                            'Authorization': `token ${token}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'If-None-Match': ''
                        }
                    },
                    this.UPLOAD_TIMEOUT
                );
                
                if (checkResponse.status === 200) {
                    const fileData = await checkResponse.json();
                    fileSha = fileData.sha;
                    fileExists = true;
                    console.log(`文件已存在，獲取到SHA: ${fileSha}`);
                } else if (checkResponse.status === 404) {
                    console.log('文件不存在，將創建新文件');
                } else {
                    console.warn(`檢查文件時收到非預期狀態碼: ${checkResponse.status}`);
                    const errorData = await checkResponse.json();
                    console.warn('API響應:', errorData);
                }
            } catch (error) {
                console.warn('檢查文件是否存在時發生錯誤:', error);
                // 繼續執行，嘗試創建文件
            }
            
            // 更新進度
            onProgress({
                status: this.UPLOAD_STATUS.UPLOADING,
                message: '正在準備上傳數據...',
                progress: 40
            });
            
            // 準備上傳數據
            const uploadData = {
                message: `更新書籍數據 - ${new Date().toLocaleString()}`,
                content: btoa(unescape(encodeURIComponent(content))),
                branch: branch
            };
            
            // 如果文件已存在，添加SHA
            if (fileExists && fileSha) {
                uploadData.sha = fileSha;
                console.log('添加SHA到上傳數據');
            }
            
            // 更新進度
            onProgress({
                status: this.UPLOAD_STATUS.UPLOADING,
                message: '正在上傳文件...',
                progress: 60
            });
            
            // 上傳到GitHub
            console.log(`正在上傳到 data/${fileName}，文件${fileExists ? '更新' : '創建'}`);
            const response = await this._fetchWithTimeout(
                `https://api.github.com/repos/${owner}/${repoName}/contents/data/${fileName}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify(uploadData)
                },
                this.UPLOAD_TIMEOUT
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('GitHub API錯誤詳情:', errorData);
                
                // 處理409衝突錯誤 - 嘗試重新獲取SHA並再次上傳
                if (response.status === 409 && retryCount < this.MAX_RETRY_COUNT) {
                    console.log(`檢測到文件衝突(409)，嘗試重新獲取SHA並再次上傳...（重試 ${retryCount + 1}/${this.MAX_RETRY_COUNT}）`);
                    
                    // 更新進度
                    onProgress({
                        status: this.UPLOAD_STATUS.UPLOADING,
                        message: `檢測到文件衝突，正在重試...（${retryCount + 1}/${this.MAX_RETRY_COUNT}）`,
                        progress: 70
                    });
                    
                    // 重新獲取最新的SHA
                    const refreshResponse = await this._fetchWithTimeout(
                        `https://api.github.com/repos/${owner}/${repoName}/contents/data/${fileName}?ref=${branch}`,
                        {
                            headers: {
                                'Authorization': `token ${token}`,
                                'Accept': 'application/vnd.github.v3+json',
                                'Cache-Control': 'no-cache'
                            }
                        },
                        this.UPLOAD_TIMEOUT
                    );
                    
                    if (refreshResponse.ok) {
                        const refreshData = await refreshResponse.json();
                        
                        // 遞迴調用自身，進行重試
                        return this.uploadToGitHub(content, fileName, {
                            ...options,
                            retryCount: retryCount + 1,
                            onProgress: (progressData) => {
                                // 調整進度，確保不會倒退
                                const adjustedProgress = Math.max(progressData.progress, 70);
                                onProgress({
                                    ...progressData,
                                    progress: adjustedProgress
                                });
                            }
                        });
                    } else {
                        throw new Error(`重新獲取SHA失敗: ${refreshResponse.status}`);
                    }
                } else {
                    throw new Error(`GitHub API錯誤: ${response.status} - ${errorData.message || '未知錯誤'}`);
                }
            }
            
            const result = await response.json();
            console.log('上傳成功:', result);
            
            // 更新進度
            onProgress({
                status: this.UPLOAD_STATUS.SUCCESS,
                message: '上傳成功！',
                progress: 100
            });
            
            // 調用成功回調
            onSuccess(result);
            
            return result;
        } catch (error) {
            console.error('上傳到GitHub時發生錯誤:', error);
            
            // 更新進度
            onProgress({
                status: this.UPLOAD_STATUS.FAILED,
                message: `上傳失敗: ${error.message || '未知錯誤'}`,
                progress: 0
            });
            
            // 調用錯誤回調
            onError(error);
            
            throw error;
        }
    },
    
    /**
     * 手動上傳備份到GitHub
     * @param {string} backupId - 備份ID
     * @returns {Promise} - 上傳結果
     */
    manualUploadBackup: async function(backupId) {
        try {
            // 獲取備份歷史記錄
            const history = BackupManager.getBackupHistory();
            
            // 查找指定ID的備份元數據
            const backupMeta = history.find(b => b.id === backupId);
            
            if (!backupMeta) {
                throw new Error('未找到指定ID的備份');
            }
            
            // 從分片存儲中獲取完整備份數據
            const backupData = BackupManager.loadDataFromChunks(backupMeta.dataKey);
            
            if (!backupData || !Array.isArray(backupData)) {
                throw new Error('無法讀取備份數據或數據格式無效');
            }
            
            // 準備文件名
            const fileName = `backup_${new Date(backupMeta.timestamp).toISOString().replace(/[:.]/g, '-')}.json`;
            
            // 準備JSON內容
            const jsonContent = JSON.stringify(backupData, null, 2);
            
            // 獲取狀態元素
            const statusElement = document.getElementById('backupStatus');
            
            // 上傳到GitHub
            const result = await this.uploadToGitHub(jsonContent, fileName, {
                onProgress: (progressData) => {
                    if (statusElement) {
                        statusElement.textContent = progressData.message;
                        statusElement.style.color = progressData.status === this.UPLOAD_STATUS.FAILED ? '#e74c3c' : '#3498db';
                    }
                },
                onSuccess: (result) => {
                    // 更新備份記錄
                    const updatedHistory = BackupManager.getBackupHistory();
                    const backupIndex = updatedHistory.findIndex(b => b.id === backupId);
                    
                    if (backupIndex !== -1) {
                        updatedHistory[backupIndex].githubFileName = fileName;
                        updatedHistory[backupIndex].uploadedToGitHub = true;
                        updatedHistory[backupIndex].uploadTime = new Date().toISOString();
                        
                        // 刪除上傳錯誤信息（如果有）
                        if (updatedHistory[backupIndex].uploadError) {
                            delete updatedHistory[backupIndex].uploadError;
                        }
                        
                        localStorage.setItem(BackupManager.BACKUP_HISTORY_KEY, JSON.stringify(updatedHistory));
                    }
                    
                    if (statusElement) {
                        statusElement.textContent = '備份已成功上傳到GitHub';
                        statusElement.style.color = '#2ecc71';
                        setTimeout(() => {
                            statusElement.textContent = '';
                        }, 5000);
                    }
                },
                onError: (error) => {
                    // 更新備份記錄，標記上傳失敗
                    const updatedHistory = BackupManager.getBackupHistory();
                    const backupIndex = updatedHistory.findIndex(b => b.id === backupId);
                    
                    if (backupIndex !== -1) {
                        updatedHistory[backupIndex].uploadError = error.message || '上傳失敗';
                        localStorage.setItem(BackupManager.BACKUP_HISTORY_KEY, JSON.stringify(updatedHistory));
                    }
                    
                    if (statusElement) {
                        statusElement.textContent = `備份上傳失敗: ${error.message || '未知錯誤'}`;
                        statusElement.style.color = '#e74c3c';
                        setTimeout(() => {
                            statusElement.textContent = '';
                        }, 8000);
                    }
                }
            });
            
            return result;
        } catch (error) {
            console.error('手動上傳備份到GitHub時發生錯誤:', error);
            throw error;
        }
    },
    
    /**
     * 帶超時的fetch請求
     * @param {string} url - 請求URL
     * @param {Object} options - fetch選項
     * @param {number} timeout - 超時時間（毫秒）
     * @returns {Promise} - fetch結果
     */
    _fetchWithTimeout: function(url, options, timeout) {
        return new Promise((resolve, reject) => {
            // 創建AbortController用於取消請求
            const controller = new AbortController();
            const signal = controller.signal;
            
            // 設置超時定時器
            const timeoutId = setTimeout(() => {
                controller.abort();
                reject(new Error(`請求超時（${timeout}ms）`));
            }, timeout);
            
            // 發送請求
            fetch(url, { ...options, signal })
                .then(response => {
                    clearTimeout(timeoutId);
                    resolve(response);
                })
                .catch(error => {
                    clearTimeout(timeoutId);
                    if (error.name === 'AbortError') {
                        reject(new Error(`請求超時（${timeout}ms）`));
                    } else {
                        reject(error);
                    }
                });
        });
    }
};