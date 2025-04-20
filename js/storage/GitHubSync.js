/**
 * GitHub同步模塊 - 處理與GitHub的數據同步
 * 實現增量同步機制和版本控制，確保數據一致性
 */

class GitHubSync {
    constructor(storage) {
        this.storage = storage; // IndexedDBStorage實例
        this.retryLimit = 3; // 自動重試次數限制
        this.retryDelay = 2000; // 重試延遲（毫秒）
        
        // 錯誤類型定義
        this.errorTypes = {
            NETWORK: 'network_error',       // 網絡連接問題
            AUTH: 'authentication_error',  // 認證問題
            PERMISSION: 'permission_error', // 權限問題
            RATE_LIMIT: 'rate_limit',      // API速率限制
            CONFLICT: 'conflict_error',    // 數據衝突
            FORMAT: 'format_error',        // 數據格式問題
            NOT_FOUND: 'not_found',        // 資源不存在
            UNKNOWN: 'unknown_error'       // 未知錯誤
        };
    }
    
    /**
     * 獲取GitHub設置
     * @returns {Promise<Object>} GitHub設置
     */
    async getGitHubSettings() {
        return await this.storage.getSetting('githubSettings') || {
            repo: '',
            path: '',
            token: ''
        };
    }
    
    /**
     * 保存GitHub設置
     * @param {Object} settings GitHub設置
     * @returns {Promise<void>}
     */
    async saveGitHubSettings(settings) {
        await this.storage.saveSetting('githubSettings', settings);
    }
    
    /**
     * 獲取上次同步時間
     * @returns {Promise<string>} 上次同步時間的ISO字符串
     */
    async getLastSyncTime() {
        return await this.storage.getSetting('lastGitHubSync') || null;
    }
    
    /**
     * 更新上次同步時間
     * @param {string} timestamp 時間戳（ISO字符串）
     * @returns {Promise<void>}
     */
    async updateLastSyncTime(timestamp = null) {
        const syncTime = timestamp || new Date().toISOString();
        await this.storage.saveSetting('lastGitHubSync', syncTime);
    }
    
    /**
     * 執行增量同步到GitHub
     * @returns {Promise<Object>} 同步結果
     */
    async syncToGitHub() {
        console.log('開始執行增量同步到GitHub...');
        
        try {
            // 檢查是否已登入
            if (typeof auth === 'undefined' || !auth.isLoggedIn()) {
                throw new Error('用戶未登入，無法同步到GitHub');
            }
            
            // 獲取GitHub設置
            const settings = await this.getGitHubSettings();
            if (!settings.repo || !settings.path || !settings.token) {
                throw new Error('GitHub設置不完整，請先完成設置');
            }
            
            // 檢查遠程倉庫是否有更新
            try {
                // 先檢查數據一致性
                const consistencyCheck = await this.checkDataConsistency();
                if (consistencyCheck.status === 'inconsistent') {
                    console.warn('檢測到遠程數據與本地不一致，嘗試先同步遠程數據...');
                    // 先從GitHub同步最新數據
                    await this.syncFromGitHub(true);
                }
            } catch (checkError) {
                console.warn('數據一致性檢查失敗，繼續嘗試同步:', checkError);
                // 即使檢查失敗，也繼續嘗試同步
            }
            
            // 獲取上次同步時間
            const lastSyncTime = await this.getLastSyncTime();
            
            // 獲取未同步的操作記錄
            const unsyncedOperations = await this.storage.getUnsyncedOperations(lastSyncTime);
            
            if (unsyncedOperations.length === 0) {
                console.log('沒有需要同步的更改');
                return { status: 'success', message: '沒有需要同步的更改', changes: 0 };
            }
            
            console.log(`發現 ${unsyncedOperations.length} 個未同步的操作`);
            
            // 獲取當前GitHub上的數據
            const currentData = await this.fetchFromGitHub(settings.repo, settings.path, settings.token);
            
            // 應用增量更改
            const updatedData = this.applyIncrementalChanges(currentData, unsyncedOperations);
            
            // 上傳更新後的數據到GitHub
            try {
                const result = await this.uploadToGitHub(settings.repo, settings.path, settings.token, updatedData);
                
                // 更新同步時間
                await this.updateLastSyncTime();
                
                // 清除已同步的操作記錄
                const now = new Date().toISOString();
                await this.storage.clearSyncedOperations(now);
                
                // 觸發同步成功事件
                this.triggerSyncEvent('success');
                
                console.log('增量同步到GitHub完成');
                return {
                    status: 'success',
                    message: '同步成功',
                    changes: unsyncedOperations.length,
                    timestamp: now
                };
            } catch (uploadError) {
                // 處理上傳過程中的特定錯誤
                if (uploadError.message.includes('衝突')) {
                    console.warn('檢測到遠程倉庫衝突，嘗試自動解決...');
                    
                    try {
                        // 先從GitHub同步最新數據
                        await this.syncFromGitHub(true);
                        
                        // 重新獲取未同步的操作記錄
                        const refreshedOperations = await this.storage.getUnsyncedOperations(lastSyncTime);
                        
                        // 重新獲取GitHub上的最新數據
                        const latestData = await this.fetchFromGitHub(settings.repo, settings.path, settings.token);
                        
                        // 重新應用增量更改
                        const refreshedData = this.applyIncrementalChanges(latestData, refreshedOperations);
                        
                        // 再次嘗試上傳
                        const retryResult = await this.uploadToGitHub(settings.repo, settings.path, settings.token, refreshedData);
                        
                        // 更新同步時間
                        await this.updateLastSyncTime();
                        
                        // 清除已同步的操作記錄
                        const now = new Date().toISOString();
                        await this.storage.clearSyncedOperations(now);
                        
                        // 觸發同步成功事件
                        this.triggerSyncEvent('success');
                        
                        console.log('衝突已自動解決，增量同步到GitHub完成');
                        return {
                            status: 'success',
                            message: '衝突已自動解決，同步成功',
                            changes: refreshedOperations.length,
                            timestamp: now
                        };
                    } catch (retryError) {
                        console.error('自動解決衝突失敗:', retryError);
                        // 觸發同步失敗事件，但提供特定的錯誤信息
                        this.triggerSyncEvent('conflict', uploadError);
                        
                        return {
                            status: 'conflict',
                            message: '衝突：遠程倉庫已被修改，請先同步最新版本',
                            error: uploadError.message,
                            details: '自動解決衝突失敗，請手動同步'
                        };
                    }
                } else if (uploadError.message.includes('權限不足') || uploadError.message.includes('令牌無效') || 
                           uploadError.message.includes('無權訪問') || uploadError.message.includes('無法訪問倉庫')) {
                    // 權限問題 - 擴展錯誤處理範圍
                    this.triggerSyncEvent('permission', uploadError);
                    
                    return {
                        status: 'permission',
                        message: '權限不足：請確保您的令牌有足夠的權限操作此倉庫 (需要repo或public_repo權限)',
                        error: uploadError.message,
                        details: '請檢查您的GitHub設置和令牌權限'
                    };
                }
                
                // 其他錯誤，重新拋出
                throw uploadError;
            }
        } catch (error) {
            console.error('同步到GitHub失敗:', error);
            
            // 觸發同步失敗事件
            this.triggerSyncEvent('error', error);
            
            return {
                status: 'error',
                message: `同步失敗: ${error.message}`,
                error: error.message
            };
        }
    }
    
    /**
     * 從GitHub同步數據到本地
     * @param {boolean} forceRefresh 是否強制全量刷新
     * @returns {Promise<Object>} 同步結果
     */
    async syncFromGitHub(forceRefresh = false) {
        console.log(`開始從GitHub同步數據${forceRefresh ? '(強制全量刷新)' : '(增量同步)'}...`);
        
        try {
            // 獲取GitHub設置
            const settings = await this.getGitHubSettings();
            let repo, path, token;
            
            // 檢查是否有GitHub設置
            if (settings && settings.repo && settings.path) {
                repo = settings.repo;
                path = settings.path;
                token = settings.token;
                
                // 檢查用戶是否已登入且有token
                if (typeof auth !== 'undefined' && auth.isLoggedIn() && token) {
                    console.log(`使用用戶設置從GitHub倉庫 ${repo} 獲取數據...`);
                } else {
                    // 使用公共數據源
                    console.log('使用公共數據源獲取書籍數據...');
                    return await this.syncFromPublicSource(forceRefresh);
                }
            } else {
                // 使用公共數據源
                console.log('未找到GitHub設置，使用公共數據源...');
                return await this.syncFromPublicSource(forceRefresh);
            }
            
            // 如果不是強制刷新，檢查上次同步時間
            if (!forceRefresh) {
                const lastSync = await this.getLastSyncTime();
                if (lastSync) {
                    const lastSyncTime = new Date(lastSync).getTime();
                    const currentTime = new Date().getTime();
                    const timeDiff = currentTime - lastSyncTime;
                    
                    // 如果距離上次同步不到30分鐘，則跳過自動同步
                    if (timeDiff < 30 * 60 * 1000) {
                        console.log(`距離上次同步僅 ${Math.floor(timeDiff / 1000 / 60)} 分鐘，跳過同步`);
                        return {
                            status: 'skipped',
                            message: '距離上次同步時間過短，已跳過',
                            timeSinceLastSync: Math.floor(timeDiff / 1000 / 60)
                        };
                    }
                }
            }
            
            // 使用重試機制從GitHub獲取數據
            const data = await this.fetchFromGitHubWithRetry(repo, path, token);
            
            // 確保data.books是有效的數組
            if (!data || !data.books || !Array.isArray(data.books)) {
                throw new Error('從GitHub獲取的數據格式無效');
            }
            
            // 檢查數據版本
            const localVersion = await this.storage.getSetting('dataVersion') || 0;
            const remoteVersion = data.version || 0;
            
            // 如果遠程版本較舊，且不是強制刷新，則跳過更新
            if (remoteVersion < localVersion && !forceRefresh) {
                console.log(`遠程數據版本 (${remoteVersion}) 低於本地版本 (${localVersion})，跳過更新`);
                return {
                    status: 'skipped',
                    message: '遠程數據版本較舊，已跳過更新',
                    localVersion,
                    remoteVersion
                };
            }
            
            // 更新本地數據
            const books = data.books;
            const result = await this.storage.bulkAddOrUpdateBooks(books);
            
            // 更新數據版本和同步時間
            await this.storage.saveSetting('dataVersion', remoteVersion);
            await this.updateLastSyncTime();
            
            // 觸發數據更新事件
            this.triggerDataLoadedEvent('github', books.length);
            
            // 觸發同步成功事件
            this.triggerSyncEvent('success');
            
            console.log(`成功從GitHub同步 ${books.length} 筆書籍數據`);
            return {
                status: 'success',
                message: '同步成功',
                added: result.added,
                updated: result.updated,
                total: books.length,
                version: remoteVersion
            };
        } catch (error) {
            console.error('從GitHub同步數據失敗:', error);
            
            // 觸發同步失敗事件
            this.triggerSyncEvent('error', error);
            
            // 如果是強制刷新，則拋出錯誤；否則嘗試從本地JSON文件載入
            if (forceRefresh) {
                throw error;
            } else {
                console.log('嘗試從本地JSON文件載入...');
                return await this.syncFromPublicSource(true);
            }
        }
    }
    
    /**
     * 從公共數據源同步數據
     * @param {boolean} forceRefresh 是否強制刷新
     * @returns {Promise<Object>} 同步結果
     */
    async syncFromPublicSource(forceRefresh = false) {
        try {
            // 如果不是強制刷新，檢查上次同步時間
            if (!forceRefresh) {
                const lastSync = await this.getLastSyncTime();
                if (lastSync) {
                    const lastSyncTime = new Date(lastSync).getTime();
                    const currentTime = new Date().getTime();
                    const timeDiff = currentTime - lastSyncTime;
                    
                    // 如果距離上次同步不到30分鐘，則跳過自動同步
                    if (timeDiff < 30 * 60 * 1000) {
                        console.log(`距離上次同步僅 ${Math.floor(timeDiff / 1000 / 60)} 分鐘，跳過同步`);
                        return {
                            status: 'skipped',
                            message: '距離上次同步時間過短，已跳過',
                            timeSinceLastSync: Math.floor(timeDiff / 1000 / 60)
                        };
                    }
                }
            }
            
            // 使用公共數據源URL
            const publicDataUrl = 'data/books.json';
            
            // 添加緩存破壞參數，確保獲取最新數據
            const cacheBuster = `?timestamp=${Date.now()}`;
            const url = `${publicDataUrl}${cacheBuster}`;
            
            console.log(`正在從公共數據源獲取數據: ${url}`);
            
            // 使用重試機制發送請求
            const data = await this.fetchWithRetry(url);
            
            // 處理不同的數據格式
            let books;
            if (Array.isArray(data)) {
                books = data;
            } else if (data && typeof data === 'object') {
                books = data.books && Array.isArray(data.books) ? data.books : [data];
            } else {
                throw new Error('獲取的數據格式無效');
            }
            
            // 更新本地數據
            const result = await this.storage.bulkAddOrUpdateBooks(books);
            
            // 更新同步時間
            await this.updateLastSyncTime();
            
            // 觸發數據更新事件
            this.triggerDataLoadedEvent('local', books.length);
            
            console.log(`成功從公共數據源同步 ${books.length} 筆書籍數據`);
            return {
                status: 'success',
                message: '同步成功',
                added: result.added,
                updated: result.updated,
                total: books.length,
                source: 'public'
            };
        } catch (error) {
            console.error('從公共數據源同步失敗:', error);
            
            // 觸發同步失敗事件
            this.triggerSyncEvent('error', error);
            
            return {
                status: 'error',
                message: `同步失敗: ${error.message}`,
                error: error.message
            };
        }
    }
    
    /**
     * 使用重試機制從GitHub獲取數據
     * @param {string} repo GitHub倉庫
     * @param {string} path 文件路徑
     * @param {string} token 訪問令牌
     * @returns {Promise<Object>} 數據對象
     */
    async fetchFromGitHubWithRetry(repo, path, token) {
        let retries = 0;
        
        while (retries < this.retryLimit) {
            try {
                return await this.fetchFromGitHub(repo, path, token);
            } catch (error) {
                retries++;
                
                if (retries >= this.retryLimit) {
                    throw error;
                }
                
                console.log(`獲取失敗，${this.retryDelay / 1000}秒後重試 (${retries}/${this.retryLimit})...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }
    }
    
    /**
     * 解析GitHub API錯誤
     * @param {Response} response HTTP響應對象
     * @returns {Promise<Object>} 錯誤詳情
     */
    async parseGitHubError(response) {
        let errorText = '';
        try {
            errorText = await response.text();
        } catch (e) {
            errorText = `無法讀取錯誤詳情: ${e.message}`;
        }
        
        let errorType = this.errorTypes.UNKNOWN;
        let message = `GitHub API錯誤 (${response.status}): ${response.statusText}`;
        
        // 根據狀態碼和錯誤文本分類錯誤
        switch (response.status) {
            case 401:
                errorType = this.errorTypes.AUTH;
                message = '認證失敗：令牌無效或已過期，請重新生成個人訪問令牌';
                break;
                
            case 403:
                if (errorText.includes('rate limit')) {
                    errorType = this.errorTypes.RATE_LIMIT;
                    message = '已達到GitHub API速率限制，請稍後再試';
                    
                    // 嘗試提取速率限制信息
                    try {
                        const resetTime = response.headers.get('X-RateLimit-Reset');
                        if (resetTime) {
                            const resetDate = new Date(parseInt(resetTime) * 1000);
                            message += `，限制將於 ${resetDate.toLocaleString()} 重置`;
                        }
                    } catch (e) {
                        console.warn('無法解析速率限制重置時間', e);
                    }
                } else {
                    errorType = this.errorTypes.PERMISSION;
                    message = '權限不足：請確保您的令牌有足夠的權限操作此倉庫 (需要repo或public_repo權限)';
                }
                break;
                
            case 404:
                errorType = this.errorTypes.NOT_FOUND;
                message = '找不到指定的資源：請檢查倉庫名稱和文件路徑是否正確';
                break;
                
            case 409:
                errorType = this.errorTypes.CONFLICT;
                message = '數據衝突：遠程倉庫已被修改，請先同步最新版本';
                break;
                
            case 422:
                errorType = this.errorTypes.FORMAT;
                message = '請求格式錯誤：請檢查提交的數據格式';
                break;
                
            default:
                if (response.status >= 500) {
                    message = 'GitHub伺服器錯誤，請稍後再試';
                }
        }
        
        // 嘗試解析JSON錯誤信息
        try {
            const jsonError = JSON.parse(errorText);
            if (jsonError.message) {
                message += `\n詳細信息: ${jsonError.message}`;
            }
            if (jsonError.documentation_url) {
                message += `\n參考文檔: ${jsonError.documentation_url}`;
            }
        } catch (e) {
            // 不是有效的JSON，使用原始錯誤文本
            if (errorText && errorText.length < 200) {
                message += `\n詳細信息: ${errorText}`;
            }
        }
        
        return { errorType, message, statusCode: response.status };
    }
    
    /**
     * 從GitHub獲取數據
     * @param {string} repo GitHub倉庫
     * @param {string} path 文件路徑
     * @param {string} token 訪問令牌
     * @returns {Promise<Object>} 數據對象
     */
    async fetchFromGitHub(repo, path, token) {
        console.log(`正在從GitHub倉庫 ${repo} 獲取數據...`);
        
        // 添加緩存破壞參數，確保獲取最新數據
        const cacheBuster = `?timestamp=${Date.now()}`;
        
        // 構建API URL
        const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}${cacheBuster}`;
        
        // 設置請求頭
        const headers = {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3.raw',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        };
        
        // 獲取文件元數據以檢查SHA
        let fileSha = null;
        try {
            const metadataResponse = await fetch(apiUrl.replace('vnd.github.v3.raw', 'vnd.github.v3.json'), {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3.json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            });
            
            if (metadataResponse.ok) {
                const metadata = await metadataResponse.json();
                fileSha = metadata.sha;
                console.log(`獲取到文件SHA: ${fileSha}`);
                // 存儲SHA以便後續使用
                await this.storage.saveSetting('lastGitHubSha', fileSha);
            } else {
                // 處理元數據獲取錯誤
                const errorDetails = await this.parseGitHubError(metadataResponse);
                console.warn(`獲取文件元數據失敗: ${errorDetails.message}`);
            }
        } catch (metadataError) {
            console.warn('獲取文件元數據失敗，繼續嘗試獲取內容:', metadataError);
            // 即使獲取元數據失敗，也繼續嘗試獲取內容
        }
        
        try {
            // 發送請求
            let response;
            try {
                response = await fetch(apiUrl, { headers });
            } catch (fetchError) {
                // 處理網絡錯誤
                const error = new Error(`網絡連接失敗: ${fetchError.message}`);
                error.errorType = this.errorTypes.NETWORK;
                throw error;
            }
            
            // 檢查響應狀態
            if (!response.ok) {
                const errorDetails = await this.parseGitHubError(response);
                
                // 創建包含錯誤類型的錯誤對象
                const error = new Error(errorDetails.message);
                error.errorType = errorDetails.errorType;
                error.statusCode = errorDetails.statusCode;
                throw error;
            }
            
            // 嘗試解析數據
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('解析GitHub響應失敗:', parseError);
                throw new Error('無法解析從GitHub獲取的數據，格式可能不是有效的JSON');
            }
            
            console.log('成功從GitHub獲取數據');
            
            // 處理不同的數據格式
            if (Array.isArray(data)) {
                return { books: data, version: data.version || 1 };
            } else if (data && typeof data === 'object') {
                if (data.books && Array.isArray(data.books)) {
                    return data;
                } else {
                    return { books: [data], version: data.version || 1 };
                }
            } else {
                throw new Error('從GitHub獲取的數據格式無效');
            }
        } catch (error) {
            // 捕獲網絡錯誤
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                console.error('網絡請求失敗:', error);
                throw new Error('無法連接到GitHub，請檢查您的網絡連接');
            }
            // 重新拋出其他錯誤
            throw error;
        }
    }
    
    /**
     * 上傳數據到GitHub
     * @param {string} repo GitHub倉庫
     * @param {string} path 文件路徑
     * @param {string} token 訪問令牌
     * @param {Object} data 要上傳的數據
     * @returns {Promise<Object>} 上傳結果
     */
    async uploadToGitHub(repo, path, token, data) {
        console.log(`正在上傳數據到GitHub倉庫 ${repo}...`);
        
        // 構建API URL
        const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
        
        try {
            // 檢查權限 - 使用更完善的權限檢查邏輯
            try {
                // 先檢查令牌有效性
                const userCheckUrl = 'https://api.github.com/user';
                let userResponse;
                
                try {
                    userResponse = await fetch(userCheckUrl, {
                        headers: {
                            'Authorization': `token ${token}`,
                            'Accept': 'application/vnd.github.v3.json'
                        }
                    });
                } catch (fetchError) {
                    // 處理網絡錯誤
                    const error = new Error(`網絡連接失敗: ${fetchError.message}`);
                    error.errorType = this.errorTypes.NETWORK;
                    error.details = '無法連接到GitHub API，請檢查您的網絡連接';
                    throw error;
                }
                
                if (!userResponse.ok) {
                    const errorDetails = await this.parseGitHubError(userResponse);
                    const error = new Error(errorDetails.message);
                    error.errorType = errorDetails.errorType;
                    error.statusCode = errorDetails.statusCode;
                    throw error;
                }
                
                // 再檢查倉庫訪問權限
                const repoCheckUrl = `https://api.github.com/repos/${repo}`;
                let repoResponse;
                
                try {
                    repoResponse = await fetch(repoCheckUrl, {
                        headers: {
                            'Authorization': `token ${token}`,
                            'Accept': 'application/vnd.github.v3.json'
                        }
                    });
                } catch (fetchError) {
                    const error = new Error(`網絡連接失敗: ${fetchError.message}`);
                    error.errorType = this.errorTypes.NETWORK;
                    error.details = '無法連接到GitHub API，請檢查您的網絡連接';
                    throw error;
                }
                
                if (!repoResponse.ok) {
                    const errorDetails = await this.parseGitHubError(repoResponse);
                    const error = new Error(errorDetails.message);
                    error.errorType = errorDetails.errorType;
                    error.statusCode = errorDetails.statusCode;
                    
                    // 添加更具體的錯誤信息
                    if (repoResponse.status === 404) {
                        error.details = `倉庫不存在或無權訪問: ${repo}，請檢查倉庫名稱是否正確`;
                    } else if (repoResponse.status === 401 || repoResponse.status === 403) {
                        error.details = '權限不足：請確保您的令牌有足夠的權限操作此倉庫 (需要repo或public_repo權限)';
                    }
                    
                    throw error;
                }
                
                // 檢查寫入權限
                const repoData = await repoResponse.json();
                if (repoData.permissions && !repoData.permissions.push) {
                    const error = new Error('您沒有此倉庫的寫入權限，請確保令牌具有寫入權限');
                    error.errorType = this.errorTypes.PERMISSION;
                    error.details = '需要倉庫的寫入權限才能上傳數據，請檢查您的令牌權限設置';
                    throw error;
                }
            } catch (permError) {
                console.error('權限檢查失敗:', permError);
                // 確保錯誤對象包含錯誤類型
                if (!permError.errorType) {
                    permError.errorType = this.errorTypes.PERMISSION;
                }
                throw permError;
            }
            
            // 先獲取文件的SHA
            let getResponse;
            try {
                getResponse = await fetch(apiUrl, {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3.json'
                    }
                });
            } catch (fetchError) {
                const error = new Error(`網絡連接失敗: ${fetchError.message}`);
                error.errorType = this.errorTypes.NETWORK;
                error.details = '無法連接到GitHub API，請檢查您的網絡連接';
                throw error;
            }
            
            let sha;
            if (getResponse.ok) {
                const fileInfo = await getResponse.json();
                sha = fileInfo.sha;
            } else if (getResponse.status !== 404) {
                // 如果不是404（文件不存在），則拋出錯誤
                const errorDetails = await this.parseGitHubError(getResponse);
                const error = new Error(errorDetails.message);
                error.errorType = errorDetails.errorType;
                error.statusCode = errorDetails.statusCode;
                error.details = `獲取文件信息失敗: ${getResponse.status} ${getResponse.statusText}`;
                throw error;
            }
            
            // 準備上傳數據
            const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
            
            const requestBody = {
                message: `更新書籍數據 - ${new Date().toISOString()}`,
                content: content,
                branch: 'main' // 或者其他分支名稱
            };
            
            // 如果文件已存在，添加SHA
            if (sha) {
                requestBody.sha = sha;
            }
            
            // 發送請求
            let putResponse;
            try {
                putResponse = await fetch(apiUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3.json'
                    },
                    body: JSON.stringify(requestBody)
                });
            } catch (fetchError) {
                const error = new Error(`上傳數據時網絡連接失敗: ${fetchError.message}`);
                error.errorType = this.errorTypes.NETWORK;
                error.details = '無法連接到GitHub API，請檢查您的網絡連接並稍後重試';
                throw error;
            }
            
            // 檢查響應狀態
            if (!putResponse.ok) {
                const errorDetails = await this.parseGitHubError(putResponse);
                
                // 處理常見錯誤
                if (putResponse.status === 409) {
                    console.warn('檢測到遠程倉庫衝突，嘗試自動解決...');
                    
                    // 嘗試自動解決衝突
                    try {
                        // 重新獲取最新的SHA
                        const latestResponse = await fetch(apiUrl, {
                            headers: {
                                'Authorization': `token ${token}`,
                                'Accept': 'application/vnd.github.v3.json',
                                'Cache-Control': 'no-cache, no-store, must-revalidate'
                            }
                        });
                        
                        if (!latestResponse.ok) {
                            const latestErrorDetails = await this.parseGitHubError(latestResponse);
                            const error = new Error(`無法獲取最新文件信息: ${latestResponse.status}`);
                            error.errorType = latestErrorDetails.errorType;
                            error.details = latestErrorDetails.message;
                            throw error;
                        }
                        
                        const latestFileInfo = await latestResponse.json();
                        const latestSha = latestFileInfo.sha;
                        
                        // 獲取遠程文件內容並解析
                        const remoteContentResponse = await fetch(`${apiUrl}?ref=main`, {
                            headers: {
                                'Authorization': `token ${token}`,
                                'Accept': 'application/vnd.github.v3.raw',
                                'Cache-Control': 'no-cache, no-store, must-revalidate'
                            }
                        });
                        
                        if (!remoteContentResponse.ok) {
                            const contentErrorDetails = await this.parseGitHubError(remoteContentResponse);
                            const error = new Error(`無法獲取遠程文件內容: ${remoteContentResponse.status}`);
                            error.errorType = contentErrorDetails.errorType;
                            error.details = contentErrorDetails.message;
                            throw error;
                        }
                        
                        // 解析遠程數據
                        const remoteData = await remoteContentResponse.json();
                        
                        // 智能合併本地和遠程數據
                        console.log('正在進行智能數據合併...');
                        const mergedData = this.mergeData(data, remoteData);
                        
                        // 使用合併後的數據和最新的SHA重新提交
                        const mergedContent = btoa(unescape(encodeURIComponent(JSON.stringify(mergedData, null, 2))));
                        const retryBody = {
                            ...requestBody,
                            content: mergedContent,
                            sha: latestSha,
                            message: `更新書籍數據（自動合併） - ${new Date().toISOString()}`
                        };
                        
                        const retryResponse = await fetch(apiUrl, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `token ${token}`,
                                'Content-Type': 'application/json',
                                'Accept': 'application/vnd.github.v3.json'
                            },
                            body: JSON.stringify(retryBody)
                        });
                        
                        if (retryResponse.ok) {
                            const result = await retryResponse.json();
                            console.log('衝突已自動解決，數據成功上傳到GitHub');
                            
                            return {
                                status: 'success',
                                message: '衝突已自動解決，數據成功上傳',
                                commit: result.commit.sha
                            };
                        } else {
                            const retryErrorDetails = await this.parseGitHubError(retryResponse);
                            console.error(`重試上傳失敗: ${retryResponse.status} ${retryErrorDetails.message}`);
                            const error = new Error('衝突：遠程倉庫已被修改，自動合併失敗，請先同步最新版本');
                            error.errorType = this.errorTypes.CONFLICT;
                            error.details = retryErrorDetails.message;
                            throw error;
                        }
                    } catch (retryError) {
                        console.error('自動解決衝突失敗:', retryError);
                        // 確保錯誤對象包含錯誤類型
                        if (!retryError.errorType) {
                            retryError.errorType = this.errorTypes.CONFLICT;
                        }
                        const error = new Error(`衝突：遠程倉庫已被修改，請先同步最新版本 (${retryError.message})`);
                        error.errorType = this.errorTypes.CONFLICT;
                        error.details = retryError.details || '自動合併失敗，請手動同步最新數據';
                        error.originalError = retryError;
                        throw error;
                    }
                } else {
                    // 使用已解析的錯誤詳情
                    const error = new Error(errorDetails.message);
                    error.errorType = errorDetails.errorType;
                    error.statusCode = errorDetails.statusCode;
                    error.details = errorDetails.message;
                    throw error;
                }
            }
            
            const result = await putResponse.json();
            console.log('數據成功上傳到GitHub');
            
            return {
                status: 'success',
                message: '數據成功上傳到GitHub',
                commit: result.commit.sha
            };
        } catch (error) {
            console.error('上傳數據到GitHub失敗:', error);
            // 確保所有錯誤都有錯誤類型
            if (!error.errorType) {
                error.errorType = this.errorTypes.UNKNOWN;
            }
            throw error;
        }
    }
    
    /**
     * 智能合併本地和遠程數據
     * @param {Object} localData 本地數據
     * @param {Object} remoteData 遠程數據
     * @returns {Object} 合併後的數據
     */
    mergeData(localData, remoteData) {
        console.log('開始智能合併數據...');
        
        // 確保兩個數據源都有效
        if (!localData || !remoteData) {
            console.warn('合併數據時發現無效數據源，使用有效的數據');
            return localData || remoteData || { books: [], version: 1 };
        }
        
        // 確保books屬性是數組
        const localBooks = Array.isArray(localData.books) ? localData.books : [];
        const remoteBooks = Array.isArray(remoteData.books) ? remoteData.books : [];
        
        // 使用Map來跟踪書籍，以ID或唯一標識符為鍵
        const mergedBooksMap = new Map();
        
        // 先添加遠程書籍
        remoteBooks.forEach(book => {
            if (book.id || book._id) {
                const bookId = book.id || book._id;
                mergedBooksMap.set(bookId, { ...book, _lastModified: book._lastModified || new Date().toISOString() });
            }
        });
        
        // 然後添加或更新本地書籍（如果本地版本較新）
        localBooks.forEach(book => {
            if (book.id || book._id) {
                const bookId = book.id || book._id;
                const existingBook = mergedBooksMap.get(bookId);
                
                // 如果遠程沒有此書籍，或者本地版本較新，則使用本地版本
                if (!existingBook || 
                    (book._lastModified && existingBook._lastModified && 
                     new Date(book._lastModified) > new Date(existingBook._lastModified))) {
                    mergedBooksMap.set(bookId, book);
                }
            } else {
                // 對於沒有ID的書籍，直接添加（可能是新書）
                // 為其生成一個臨時ID
                const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                mergedBooksMap.set(tempId, { ...book, id: book.id || tempId });
            }
        });
        
        // 轉換回數組
        const mergedBooks = Array.from(mergedBooksMap.values());
        
        // 確定合併後的版本號（使用較大的版本號）
        const localVersion = localData.version || 1;
        const remoteVersion = remoteData.version || 1;
        const mergedVersion = Math.max(localVersion, remoteVersion) + 1;
        
        console.log(`合併完成: 合併了 ${mergedBooks.length} 筆書籍數據，版本號: ${mergedVersion}`);
        
        return {
            books: mergedBooks,
            version: mergedVersion,
            lastSync: new Date().toISOString()
        };
    }
    
    /**
     * 檢查數據一致性
     * @returns {Promise<Object>} 一致性檢查結果
     */
    async checkDataConsistency() {
        console.log('檢查數據一致性...');
        
        try {
            // 獲取GitHub設置
            const settings = await this.getGitHubSettings();
            if (!settings.repo || !settings.path || !settings.token) {
                return { 
                    status: 'unknown', 
                    message: 'GitHub設置不完整',
                    errorType: this.errorTypes.UNKNOWN,
                    details: '請先完成GitHub設置，包括倉庫名稱、文件路徑和訪問令牌'
                };
            }
            
            // 獲取上次同步的SHA
            const lastSha = await this.storage.getSetting('lastGitHubSha');
            if (!lastSha) {
                return { 
                    status: 'unknown', 
                    message: '沒有上次同步的SHA記錄',
                    errorType: this.errorTypes.UNKNOWN,
                    details: '尚未進行過同步，無法比較數據一致性'
                };
            }
            
            // 獲取當前GitHub上的文件元數據
            const apiUrl = `https://api.github.com/repos/${settings.repo}/contents/${settings.path}`;
            let metadataResponse;
            
            try {
                metadataResponse = await fetch(apiUrl, {
                    headers: {
                        'Authorization': `token ${settings.token}`,
                        'Accept': 'application/vnd.github.v3.json',
                        'Cache-Control': 'no-cache, no-store, must-revalidate'
                    }
                });
            } catch (fetchError) {
                // 處理網絡錯誤
                return { 
                    status: 'error', 
                    message: '網絡連接失敗',
                    errorType: this.errorTypes.NETWORK,
                    details: `無法連接到GitHub API: ${fetchError.message}`,
                    error: fetchError
                };
            }
            
            // 處理HTTP錯誤
            if (!metadataResponse.ok) {
                const errorDetails = await this.parseGitHubError(metadataResponse);
                return { 
                    status: 'error', 
                    message: `無法獲取GitHub文件元數據: ${metadataResponse.status}`,
                    errorType: errorDetails.errorType,
                    details: errorDetails.message,
                    statusCode: metadataResponse.status
                };
            }
            
            const metadata = await metadataResponse.json();
            const currentSha = metadata.sha;
            
            // 比較SHA
            if (lastSha !== currentSha) {
                console.warn(`檢測到SHA不一致: 本地=${lastSha}, 遠程=${currentSha}`);
                
                // 進一步檢查內容差異
                const contentDiff = await this.checkContentDifference(settings, metadata);
                
                return { 
                    status: 'inconsistent', 
                    message: '遠程倉庫已被修改',
                    localSha: lastSha,
                    remoteSha: currentSha,
                    lastModified: metadata.last_modified || null,
                    contentDifference: contentDiff,
                    recommendedAction: '建議先同步遠程數據再進行修改'
                };
            }
            
            // 檢查本地數據版本
            const localVersion = await this.storage.getSetting('dataVersion') || 0;
            const remoteData = await this.fetchFromGitHub(settings.repo, settings.path, settings.token);
            const remoteVersion = remoteData.version || 0;
            
            if (localVersion !== remoteVersion) {
                return {
                    status: 'version_mismatch',
                    message: `數據版本不一致: 本地=${localVersion}, 遠程=${remoteVersion}`,
                    localVersion,
                    remoteVersion,
                    recommendedAction: localVersion > remoteVersion ? 
                        '本地版本較新，建議上傳本地數據' : '遠程版本較新，建議同步遠程數據'
                };
            }
            
            return { 
                status: 'consistent', 
                message: '數據一致',
                sha: currentSha,
                version: localVersion
            };
        } catch (error) {
            console.error('檢查數據一致性失敗:', error);
            return { 
                status: 'error', 
                message: `檢查失敗: ${error.message}`,
                errorType: this.errorTypes.UNKNOWN,
                error: error
            };
        }
    }
    
    /**
     * 檢查內容差異
     * @param {Object} settings GitHub設置
     * @param {Object} metadata 文件元數據
     * @returns {Promise<Object>} 差異信息
     */
    async checkContentDifference(settings, metadata) {
        try {
            // 獲取遠程文件內容
            const remoteContent = await this.fetchFromGitHub(settings.repo, settings.path, settings.token);
            
            // 獲取本地數據
            const books = await this.storage.getAllBooks();
            const localData = { books, version: await this.storage.getSetting('dataVersion') || 0 };
            
            // 比較書籍數量
            const localCount = localData.books.length;
            const remoteCount = remoteContent.books ? remoteContent.books.length : 0;
            
            // 檢查版本差異
            const versionDiff = (remoteContent.version || 0) - (localData.version || 0);
            
            // 檢查最後修改時間
            let newerItems = 0;
            if (remoteContent.books && Array.isArray(remoteContent.books)) {
                newerItems = remoteContent.books.filter(remoteBook => {
                    if (!remoteBook._lastModified) return false;
                    
                    // 查找對應的本地書籍
                    const localBook = localData.books.find(book => 
                        (book.id && book.id === remoteBook.id) || 
                        (book._id && book._id === remoteBook._id));
                    
                    if (!localBook || !localBook._lastModified) return true;
                    
                    // 比較修改時間
                    return new Date(remoteBook._lastModified) > new Date(localBook._lastModified);
                }).length;
            }
            
            return {
                bookCountDiff: remoteCount - localCount,
                versionDiff: versionDiff,
                remoteNewer: versionDiff > 0,
                newerItems: newerItems,
                summary: `遠程有 ${remoteCount} 筆數據，本地有 ${localCount} 筆數據，${newerItems} 筆遠程數據較新`
            };
        } catch (error) {
            console.error('檢查內容差異失敗:', error);
            return {
                error: `無法比較內容差異: ${error.message}`,
                summary: '無法確定具體差異，建議謹慎處理'
            };
        }
    }
    
    /**
     * 使用重試機制發送請求
     * @param {string} url 請求URL
     * @param {Object} options 請求選項
     * @returns {Promise<any>} 響應數據
     */
    async fetchWithRetry(url, options = {}) {
        let retries = 0;
        
        while (retries < this.retryLimit) {
            try {
                const response = await fetch(url, options);
                
                if (!response.ok) {
                    throw new Error(`請求失敗: ${response.status} ${response.statusText}`);
                }
                
                return await response.json();
            } catch (error) {
                retries++;
                
                if (retries >= this.retryLimit) {
                    throw error;
                }
                
                console.log(`請求失敗，${this.retryDelay / 1000}秒後重試 (${retries}/${this.retryLimit})...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }
    }
    
    /**
     * 應用增量更改到數據
     * @param {Object} baseData 基礎數據
     * @param {Array} operations 操作記錄
     * @returns {Object} 更新後的數據
     */
    applyIncrementalChanges(baseData, operations) {
        console.log(`應用 ${operations.length} 個增量更改...`);
        
        // 確保baseData有正確的結構
        const data = {
            books: Array.isArray(baseData.books) ? [...baseData.books] : [],
            lastSync: new Date().toISOString(),
            version: (baseData.version || 0) + 1
        };
        
        // 創建書籍ID到索引的映射，以便快速查找
        const bookMap = new Map();
        data.books.forEach((book, index) => {
            bookMap.set(book.id, index);
        });
        
        // 按時間戳排序操作，確保按正確順序應用
        const sortedOperations = [...operations].sort((a, b) => {
            return new Date(a.timestamp) - new Date(b.timestamp);
        });
        
        // 應用每個操作
        sortedOperations.forEach(op => {
            switch (op.operation) {
                case 'add':
                    // 檢查書籍是否已存在
                    if (bookMap.has(op.data.id)) {
                        // 如果已存在，檢查版本
                        const existingIndex = bookMap.get(op.data.id);
                        const existingBook = data.books[existingIndex];
                        
                        // 如果新版本較高，則更新
                        if (!existingBook.version || op.data.version > existingBook.version) {
                            data.books[existingIndex] = op.data;
                        }
                    } else {
                        // 添加新書籍
                        data.books.push(op.data);
                        bookMap.set(op.data.id, data.books.length - 1);
                    }
                    break;
                    
                case 'update':
                    // 檢查書籍是否存在
                    if (bookMap.has(op.bookId)) {
                        const existingIndex = bookMap.get(op.bookId);
                        const existingBook = data.books[existingIndex];
                        
                        // 如果新版本較高，則更新
                        if (!existingBook.version || op.data.version > existingBook.version) {
                            data.books[existingIndex] = op.data;
                        }
                    }
                    break;
                    
                case 'delete':
                    // 檢查書籍是否存在
                    if (bookMap.has(op.bookId)) {
                        const existingIndex = bookMap.get(op.bookId);
                        
                        // 刪除書籍
                        data.books.splice(existingIndex, 1);
                        
                        // 更新映射
                        bookMap.delete(op.bookId);
                        
                        // 更新受影響書籍的索引
                        bookMap.forEach((index, id) => {
                            if (index > existingIndex) {
                                bookMap.set(id, index - 1);
                            }
                        });
                    }
                    break;
            }
        });
        
        console.log(`增量更改應用完成，現有 ${data.books.length} 筆書籍數據`);
        return data;
    }
    
    /**
     * 觸發數據載入完成事件
     * @param {string} source 數據來源
     * @param {number} count 數據數量
     * @param {Error} error 錯誤對象（如果有）
     */
    triggerDataLoadedEvent(source, count, error = null) {
        // 創建自定義事件
        const event = new CustomEvent('booksLoaded', {
            detail: {
                source: source,
                count: count,
                timestamp: new Date().toISOString(),
                error: error
            }
        });
        
        // 分發事件
        document.dispatchEvent(event);
        
        console.log(`數據載入完成 [來源: ${source}, 數量: ${count}]`);
    }
    
    /**
     * 觸發同步事件
     * @param {string} status 同步狀態
     * @param {Error} error 錯誤對象（如果有）
     */
    triggerSyncEvent(status, error = null) {
        // 準備事件詳情
        const detail = { 
            status: status,
            timestamp: new Date().toISOString()
        };
        
        // 如果有錯誤，添加錯誤信息
        if (error) {
            detail.error = {
                message: error.message,
                type: error.errorType || this.errorTypes.UNKNOWN,
                details: error.details || null,
                statusCode: error.statusCode || null
            };
        }
        
        // 創建自定義事件
        const event = new CustomEvent('githubSync', { detail });
        
        // 分發事件
        document.dispatchEvent(event);
        
        // 記錄同步狀態
        this.storage.saveSetting('lastSyncStatus', {
            status,
            timestamp: new Date().toISOString(),
            error: error ? detail.error : null
        }).catch(e => console.error('無法保存同步狀態:', e));
        
        console.log(`GitHub同步事件已觸發 [狀態: ${status}]`);
    }
    
    /**
     * 檢查數據一致性
     * @returns {Promise<Object>} 一致性檢查結果
     */
    async checkDataConsistency() {
        try {
            console.log('開始檢查數據一致性...');
            
            // 獲取本地數據
            const localBooks = await this.storage.getAllBooks();
            
            // 獲取GitHub設置
            const settings = await this.getGitHubSettings();
            
            // 如果沒有GitHub設置，則無法檢查一致性
            if (!settings.repo || !settings.path || !settings.token) {
                return {
                    status: 'skipped',
                    message: 'GitHub設置不完整，無法檢查數據一致性',
                    consistent: false,
                    solution: '請先完成GitHub設置'
                };
            }
            
            // 嘗試獲取GitHub上的數據，使用重試機制
            let githubData;
            try {
                githubData = await this.fetchFromGitHubWithRetry(settings.repo, settings.path, settings.token);
            } catch (fetchError) {
                return {
                    status: 'error',
                    message: `無法從GitHub獲取數據: ${fetchError.message}`,
                    error: fetchError.message,
                    consistent: false,
                    solution: '請檢查網絡連接和GitHub設置'
                };
            }
            
            const remoteBooks = githubData.books;
            
            // 檢查數量是否一致
            if (localBooks.length !== remoteBooks.length) {
                return {
                    status: 'inconsistent',
                    message: `數據不一致: 本地 ${localBooks.length} 筆, 遠程 ${remoteBooks.length} 筆`,
                    consistent: false,
                    localCount: localBooks.length,
                    remoteCount: remoteBooks.length,
                    solution: localBooks.length < remoteBooks.length ? 
                        '建議從GitHub同步最新數據' : '建議將本地數據同步到GitHub'
                };
            }
            
            // 創建ID到書籍的映射
            const localBooksMap = new Map(localBooks.map(book => [book.id, book]));
            const remoteBooksMap = new Map(remoteBooks.map(book => [book.id, book]));
            
            // 檢查每本書籍
            const inconsistentBooks = [];
            const missingLocal = [];
            const missingRemote = [];
            
            // 檢查遠程書籍在本地是否存在且一致
            for (const remoteBook of remoteBooks) {
                const localBook = localBooksMap.get(remoteBook.id);
                
                // 如果本地沒有此書籍
                if (!localBook) {
                    missingLocal.push({
                        id: remoteBook.id,
                        title: remoteBook.title,
                        version: remoteBook.version
                    });
                    continue;
                }
                
                // 檢查版本是否一致
                if (remoteBook.version && localBook.version && remoteBook.version !== localBook.version) {
                    inconsistentBooks.push({
                        id: remoteBook.id,
                        title: remoteBook.title,
                        localVersion: localBook.version,
                        remoteVersion: remoteBook.version,
                        newerVersion: remoteBook.version > localBook.version ? 'remote' : 'local'
                    });
                }
            }
            
            // 檢查本地書籍在遠程是否存在
            for (const localBook of localBooks) {
                if (!remoteBooksMap.has(localBook.id)) {
                    missingRemote.push({
                        id: localBook.id,
                        title: localBook.title,
                        version: localBook.version
                    });
                }
            }
            
            // 合併所有不一致情況
            const totalInconsistencies = inconsistentBooks.length + missingLocal.length + missingRemote.length;
            
            if (totalInconsistencies > 0) {
                let solution = '';
                
                if (missingLocal.length > 0 && missingRemote.length === 0) {
                    solution = '建議從GitHub同步最新數據';
                } else if (missingRemote.length > 0 && missingLocal.length === 0) {
                    solution = '建議將本地數據同步到GitHub';
                } else if (inconsistentBooks.length > 0) {
                    // 檢查哪邊的版本更新
                    const newerRemote = inconsistentBooks.filter(book => book.newerVersion === 'remote').length;
                    const newerLocal = inconsistentBooks.filter(book => book.newerVersion === 'local').length;
                    
                    if (newerRemote > newerLocal) {
                        solution = '建議從GitHub同步最新數據';
                    } else {
                        solution = '建議將本地數據同步到GitHub';
                    }
                } else {
                    solution = '建議先從GitHub同步，然後再將本地變更同步到GitHub';
                }
                
                return {
                    status: 'inconsistent',
                    message: `發現 ${totalInconsistencies} 筆不一致的數據`,
                    consistent: false,
                    inconsistentBooks,
                    missingLocal,
                    missingRemote,
                    solution
                };
            }
            
            console.log('數據一致性檢查完成: 數據一致');
            
            return {
                status: 'consistent',
                message: '數據一致性檢查完成: 數據一致',
                consistent: true
            };
        } catch (error) {
            console.error('數據一致性檢查失敗:', error);
            
            return {
                status: 'error',
                message: `數據一致性檢查失敗: ${error.message}`,
                error: error.message,
                consistent: false,
                solution: '請檢查網絡連接和GitHub設置'
            };
        }
    }