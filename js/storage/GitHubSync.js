/**
 * GitHub同步模塊 - 處理與GitHub的數據同步
 * 實現增量同步機制和版本控制，確保數據一致性
 */

class GitHubSync {
    constructor(storage) {
        this.storage = storage; // IndexedDBStorage實例
        this.retryLimit = 3; // 自動重試次數限制
        this.retryDelay = 2000; // 重試延遲（毫秒）
        this.autoSyncInterval = 30 * 60 * 1000; // 自動同步間隔（默認30分鐘）
        this.syncInProgress = false; // 同步進行中標記
        this.lastSyncStatus = null; // 最後同步狀態
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
     * 獲取當前數據版本
     * @returns {Promise<number>} 當前數據版本
     */
    async getCurrentDataVersion() {
        return await this.storage.getSetting('dataVersion') || 0;
    }
    
    /**
     * 更新數據版本
     * @param {number} version 新版本號
     * @returns {Promise<void>}
     */
    async updateDataVersion(version) {
        await this.storage.saveSetting('dataVersion', version);
    }
    
    /**
     * 執行增量同步到GitHub
     * @returns {Promise<Object>} 同步結果
     */
    async syncToGitHub() {
        console.log('開始執行增量同步到GitHub...');
        
        // 防止重複同步
        if (this.syncInProgress) {
            console.log('同步已在進行中，跳過本次同步');
            return { status: 'skipped', message: '同步已在進行中，請稍後再試' };
        }
        
        this.syncInProgress = true;
        
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
            
            // 獲取上次同步時間
            const lastSyncTime = await this.getLastSyncTime();
            
            // 獲取未同步的操作記錄
            const unsyncedOperations = await this.storage.getUnsyncedOperations(lastSyncTime);
            
            if (unsyncedOperations.length === 0) {
                console.log('沒有需要同步的更改');
                this.lastSyncStatus = { status: 'success', message: '沒有需要同步的更改', changes: 0 };
                return this.lastSyncStatus;
            }
            
            console.log(`發現 ${unsyncedOperations.length} 個未同步的操作`);
            
            // 獲取當前GitHub上的數據
            const currentData = await this.fetchFromGitHub(settings.repo, settings.path, settings.token);
            
            // 獲取當前本地數據版本
            const localVersion = await this.getCurrentDataVersion();
            
            // 檢查版本衝突
            if (currentData.version > localVersion) {
                console.log(`檢測到版本衝突：遠程版本 ${currentData.version} > 本地版本 ${localVersion}`);
                // 先進行合併處理
                await this.mergeConflicts(currentData, unsyncedOperations);
            }
            
            // 應用增量更改
            const updatedData = this.applyIncrementalChanges(currentData, unsyncedOperations);
            
            // 更新版本號
            updatedData.version = Math.max(currentData.version || 0, localVersion || 0) + 1;
            
            // 上傳更新後的數據到GitHub
            const result = await this.uploadToGitHub(settings.repo, settings.path, settings.token, updatedData);
            
            // 更新本地數據版本
            await this.updateDataVersion(updatedData.version);
            
            // 更新同步時間
            await this.updateLastSyncTime();
            
            // 清除已同步的操作記錄
            const now = new Date().toISOString();
            await this.storage.clearSyncedOperations(now);
            
            // 觸發同步成功事件
            this.triggerSyncEvent('success');
            
            console.log('增量同步到GitHub完成');
            this.lastSyncStatus = {
                status: 'success',
                message: '同步成功',
                changes: unsyncedOperations.length,
                timestamp: now,
                version: updatedData.version
            };
            return this.lastSyncStatus;
        } catch (error) {
            console.error('同步到GitHub失敗:', error);
            
            // 觸發同步失敗事件
            this.triggerSyncEvent('error', error);
            
            this.lastSyncStatus = {
                status: 'error',
                message: `同步失敗: ${error.message}`,
                error: error.message
            };
            return this.lastSyncStatus;
        } finally {
            this.syncInProgress = false;
        }
    }
    
    /**
     * 從GitHub同步數據到本地
     * @param {boolean} forceRefresh 是否強制全量刷新
     * @returns {Promise<Object>} 同步結果
     */
    async syncFromGitHub(forceRefresh = false) {
        console.log(`開始從GitHub同步數據${forceRefresh ? '(強制全量刷新)' : '(增量同步)'}...`);
        
        // 防止重複同步
        if (this.syncInProgress) {
            console.log('同步已在進行中，跳過本次同步');
            return { status: 'skipped', message: '同步已在進行中，請稍後再試' };
        }
        
        this.syncInProgress = true;
        
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
                    
                    // 如果距離上次同步不到設定的時間，則跳過自動同步
                    if (timeDiff < this.autoSyncInterval) {
                        console.log(`距離上次同步僅 ${Math.floor(timeDiff / 1000 / 60)} 分鐘，跳過同步`);
                        this.lastSyncStatus = {
                            status: 'skipped',
                            message: '距離上次同步時間過短，已跳過',
                            timeSinceLastSync: Math.floor(timeDiff / 1000 / 60)
                        };
                        return this.lastSyncStatus;
                    }
                }
            }
            
            // 獲取本地書籍數據和最後修改時間
            const localBooks = await this.storage.getAllBooks();
            const lastModified = await this.storage.getSetting('lastDataModified') || null;
            
            // 使用重試機制從GitHub獲取數據
            // 如果有lastModified，則傳遞給API以實現增量同步
            const data = await this.fetchFromGitHubWithRetry(repo, path, token, lastModified);
            
            // 如果服務器返回304 Not Modified，表示數據未變更
            if (data && data.notModified) {
                console.log('GitHub數據未變更，跳過更新');
                this.lastSyncStatus = {
                    status: 'skipped',
                    message: 'GitHub數據未變更，已跳過更新',
                    timestamp: new Date().toISOString()
                };
                return this.lastSyncStatus;
            }
            
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
                this.lastSyncStatus = {
                    status: 'skipped',
                    message: '遠程數據版本較舊，已跳過更新',
                    localVersion,
                    remoteVersion
                };
                return this.lastSyncStatus;
            }
            
            // 如果版本相同但不是強制刷新，檢查是否有增量變更
            if (remoteVersion === localVersion && !forceRefresh) {
                // 比較本地和遠程數據是否有差異
                const hasChanges = this.compareData(localBooks, data.books);
                
                if (!hasChanges) {
                    console.log('本地數據與遠程數據一致，跳過更新');
                    this.lastSyncStatus = {
                        status: 'skipped',
                        message: '本地數據與遠程數據一致，已跳過更新',
                        version: localVersion
                    };
                    return this.lastSyncStatus;
                }
            }
            
            // 計算增量變更
            const changes = this.calculateIncrementalChanges(localBooks, data.books);
            console.log(`檢測到增量變更: 新增 ${changes.added.length}, 更新 ${changes.updated.length}, 刪除 ${changes.deleted.length}`);
            
            // 只更新變更的部分
            let result;
            if (forceRefresh) {
                // 強制全量刷新時，直接更新所有數據
                result = await this.storage.bulkAddOrUpdateBooks(data.books);
            } else {
                // 增量同步時，只更新變更的部分
                result = await this.applyIncrementalChanges(changes);
            }
            
            // 更新數據版本和同步時間
            await this.storage.saveSetting('dataVersion', remoteVersion);
            await this.updateLastSyncTime();
            
            // 保存最後修改時間，用於下次增量同步
            if (data.lastModified) {
                await this.storage.saveSetting('lastDataModified', data.lastModified);
            }
            
            // 觸發數據更新事件
            this.triggerDataLoadedEvent('github', data.books.length);
            
            // 觸發同步成功事件
            this.triggerSyncEvent('success');
            
            console.log(`成功從GitHub同步數據: 新增 ${result.added}, 更新 ${result.updated}, 總計 ${data.books.length} 筆`);
            this.lastSyncStatus = {
                status: 'success',
                message: '同步成功',
                added: result.added,
                updated: result.updated,
                deleted: result.deleted || 0,
                total: data.books.length,
                version: remoteVersion
            };
            return this.lastSyncStatus;
        } catch (error) {
            console.error('從GitHub同步數據失敗:', error);
            
            // 觸發同步失敗事件
            this.triggerSyncEvent('error', error);
            
            this.lastSyncStatus = {
                status: 'error',
                message: `同步失敗: ${error.message}`,
                error: error.message
            };
            
            // 如果是強制刷新，則拋出錯誤；否則嘗試從本地JSON文件載入
            if (forceRefresh) {
                throw error;
            } else {
                console.log('嘗試從本地JSON文件載入...');
                return await this.syncFromPublicSource(true);
            }
        } finally {
            this.syncInProgress = false;
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
                    
                    // 如果距離上次同步不到設定的時間，則跳過自動同步
                    if (timeDiff < this.autoSyncInterval) {
                        console.log(`距離上次同步僅 ${Math.floor(timeDiff / 1000 / 60)} 分鐘，跳過同步`);
                        this.lastSyncStatus = {
                            status: 'skipped',
                            message: '距離上次同步時間過短，已跳過',
                            timeSinceLastSync: Math.floor(timeDiff / 1000 / 60)
                        };
                        return this.lastSyncStatus;
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
     * @param {string} lastModified 上次修改時間，用於實現增量同步
     * @returns {Promise<Object>} 數據對象
     */
    async fetchFromGitHubWithRetry(repo, path, token, lastModified = null) {
        let retries = 0;
        
        while (retries < this.retryLimit) {
            try {
                return await this.fetchFromGitHub(repo, path, token, lastModified);
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
     * 從GitHub獲取數據
     * @param {string} repo GitHub倉庫
     * @param {string} path 文件路徑
     * @param {string} token 訪問令牌
     * @param {string} lastModified 上次修改時間，用於實現增量同步
     * @returns {Promise<Object>} 數據對象
     */
    async fetchFromGitHub(repo, path, token, lastModified = null) {
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
        
        // 如果有lastModified，添加If-Modified-Since頭，實現增量同步
        if (lastModified) {
            headers['If-Modified-Since'] = lastModified;
        }
        
        // 發送請求
        const response = await fetch(apiUrl, { headers });
        
        // 如果返回304 Not Modified，表示數據未變更
        if (response.status === 304) {
            console.log('GitHub數據未變更 (304 Not Modified)');
            return { notModified: true };
        }
        
        // 檢查響應狀態
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`GitHub API錯誤 (${response.status}): ${errorText}`);
            throw new Error(`GitHub API錯誤: ${response.status} ${response.statusText}`);
        }
        
        // 獲取Last-Modified頭，用於下次增量同步
        const newLastModified = response.headers.get('Last-Modified');
        
        // 解析數據
        const data = await response.json();
        
        console.log('成功從GitHub獲取數據');
        
        // 處理不同的數據格式
        let result;
        if (Array.isArray(data)) {
            result = { books: data, version: data.version || 1 };
        } else if (data && typeof data === 'object') {
            if (data.books && Array.isArray(data.books)) {
                result = data;
            } else {
                result = { books: [data], version: data.version || 1 };
            }
        } else {
            throw new Error('從GitHub獲取的數據格式無效');
        }
        
        // 添加Last-Modified信息到返回數據
        if (newLastModified) {
            result.lastModified = newLastModified;
        }
        
        return result;
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
            // 先獲取文件的SHA
            const getResponse = await fetch(apiUrl, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3.json'
                }
            });
            
            let sha;
            if (getResponse.ok) {
                const fileInfo = await getResponse.json();
                sha = fileInfo.sha;
            } else if (getResponse.status !== 404) {
                // 如果不是404（文件不存在），則拋出錯誤
                throw new Error(`獲取文件信息失敗: ${getResponse.status} ${getResponse.statusText}`);
            }
            
            // 準備上傳數據
            const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
            
            const requestBody = {
                message: `更新書籍數據 - ${new Date().toISOString()} - 版本 ${data.version}`,
                content: content,
                branch: 'main' // 或者其他分支名稱
            };
            
            // 如果文件已存在，添加SHA
            if (sha) {
                requestBody.sha = sha;
            }
            
            // 發送請求
            const putResponse = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3.json'
                },
                body: JSON.stringify(requestBody)
            });
            
            // 檢查響應狀態
            if (!putResponse.ok) {
                const errorText = await putResponse.text();
                throw new Error(`上傳失敗: ${putResponse.status} ${errorText}`);
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
            throw error;
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
     * 比較兩個數據集是否有差異
     * @param {Array} localBooks 本地書籍數據
     * @param {Array} remoteBooks 遠程書籍數據
     * @returns {boolean} 是否有差異
     */
    compareData(localBooks, remoteBooks) {
        // 如果數量不同，肯定有差異
        if (localBooks.length !== remoteBooks.length) {
            return true;
        }
        
        // 創建本地書籍ID到書籍的映射
        const localBooksMap = new Map();
        localBooks.forEach(book => {
            localBooksMap.set(book.id, book);
        });
        
        // 檢查每本遠程書籍是否與本地書籍相同
        for (const remoteBook of remoteBooks) {
            const localBook = localBooksMap.get(remoteBook.id);
            
            // 如果本地沒有這本書，或者版本不同，則有差異
            if (!localBook || localBook.version !== remoteBook.version) {
                return true;
            }
            
            // 比較書籍內容是否相同（忽略時間戳等非關鍵字段）
            if (!this.areBooksEqual(localBook, remoteBook)) {
                return true;
            }
        }
        
        return false; // 沒有差異
    }
    
    /**
     * 計算增量變更
     * @param {Array} localBooks 本地書籍數據
     * @param {Array} remoteBooks 遠程書籍數據
     * @returns {Object} 增量變更 {added, updated, deleted}
     */
    calculateIncrementalChanges(localBooks, remoteBooks) {
        const added = [];
        const updated = [];
        const deleted = [];
        
        // 創建本地和遠程書籍的ID映射
        const localBooksMap = new Map();
        const remoteBooksMap = new Map();
        
        localBooks.forEach(book => {
            localBooksMap.set(book.id, book);
        });
        
        remoteBooks.forEach(book => {
            remoteBooksMap.set(book.id, book);
            
            // 檢查是新增還是更新
            if (!localBooksMap.has(book.id)) {
                // 本地沒有，是新增的
                added.push(book);
            } else if (!this.areBooksEqual(localBooksMap.get(book.id), book)) {
                // 本地有但內容不同，是更新的
                updated.push(book);
            }
        });
        
        // 檢查刪除的書籍
        localBooks.forEach(book => {
            if (!remoteBooksMap.has(book.id)) {
                // 遠程沒有，是刪除的
                deleted.push(book.id);
            }
        });
        
        return { added, updated, deleted };
    }
    
    /**
     * 應用增量變更到本地數據庫
     * @param {Object} changes 增量變更 {added, updated, deleted}
     * @returns {Promise<Object>} 操作結果
     */
    async applyIncrementalChanges(changes) {
        const result = {
            added: 0,
            updated: 0,
            deleted: 0
        };
        
        // 處理新增和更新
        if (changes.added.length > 0 || changes.updated.length > 0) {
            const addUpdateResult = await this.storage.bulkAddOrUpdateBooks([...changes.added, ...changes.updated]);
            result.added = addUpdateResult.added;
            result.updated = addUpdateResult.updated;
        }
        
        // 處理刪除
        if (changes.deleted.length > 0) {
            for (const id of changes.deleted) {
                await this.storage.deleteBook(id);
                result.deleted++;
            }
        }
        
        return result;
    }
    
    /**
     * 比較兩本書籍是否相同
     * @param {Object} book1 第一本書籍
     * @param {Object} book2 第二本書籍
     * @returns {boolean} 是否相同
     */
    areBooksEqual(book1, book2) {
        // 檢查基本屬性是否相同
        const basicProps = ['title', 'author', 'series', 'category', 'cabinet', 'row', 'publisher', 'isbn'];
        
        for (const prop of basicProps) {
            if (book1[prop] !== book2[prop]) {
                return false;
            }
        }
        
        // 檢查描述和筆記（可能包含較長文本）
        if ((book1.description || '') !== (book2.description || '')) {
            return false;
        }
        
        if ((book1.notes || '') !== (book2.notes || '')) {
            return false;
        }
        
        // 檢查最後修改時間
        if (book1.lastModified && book2.lastModified && 
            new Date(book1.lastModified).getTime() !== new Date(book2.lastModified).getTime()) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 比較兩個數據集是否有差異
     * @param {Array} localBooks 本地書籍數據
     * @param {Array} remoteBooks 遠程書籍數據
     * @returns {boolean} 是否有差異
     */
    compareData(localBooks, remoteBooks) {
        // 檢查數量是否不同
        if (localBooks.length !== remoteBooks.length) {
            return true;
        }
        
        // 創建本地書籍的ID映射
        const localBooksMap = new Map();
        localBooks.forEach(book => {
            localBooksMap.set(book.id, book);
        });
        
        // 檢查每本遠程書籍是否與本地相同
        for (const remoteBook of remoteBooks) {
            const localBook = localBooksMap.get(remoteBook.id);
            
            // 如果本地沒有這本書，或者內容不同，則有差異
            if (!localBook || !this.areBooksEqual(localBook, remoteBook)) {
                return true;
            }
        }
        
        return false;
    }
    
    // 已在上方定義了areBooksEqual方法，此處刪除重複定義
    
    /**
     * 處理數據衝突
     * @param {Object} remoteData 遠程數據
     * @param {Array} localOperations 本地操作記錄
     * @returns {Promise<void>}
     */
    async mergeConflicts(remoteData, localOperations) {
        console.log('處理數據衝突...');
        
        // 創建遠程書籍ID到書籍的映射
        const remoteBooksMap = new Map();
        remoteData.books.forEach(book => {
            remoteBooksMap.set(book.id, book);
        });
        
        // 獲取本地書籍
        const localBooks = await this.storage.getAllBooks();
        const localBooksMap = new Map();
        localBooks.forEach(book => {
            localBooksMap.set(book.id, book);
        });
        
        // 處理每個本地操作
        for (const op of localOperations) {
            switch (op.operation) {
                case 'add':
                case 'update':
                    const bookId = op.bookId || (op.data && op.data.id);
                    const remoteBook = remoteBooksMap.get(bookId);
                    
                    // 如果遠程也有這本書，比較版本
                    if (remoteBook) {
                        const localBook = op.data || localBooksMap.get(bookId);
                        
                        // 如果遠程版本較新，更新本地書籍
                        if (remoteBook.version > (localBook.version || 0)) {
                            await this.storage.updateBook(remoteBook);
                            console.log(`衝突解決：更新本地書籍 "${remoteBook.title}" 到遠程版本 ${remoteBook.version}`);
                        }
                    }
                    break;
                    
                case 'delete':
                    const deleteBookId = op.bookId;
                    const remoteDeleteBook = remoteBooksMap.get(deleteBookId);
                    
                    // 如果遠程仍有這本書，且版本較新，則取消本地刪除操作
                    if (remoteDeleteBook && remoteDeleteBook.version > (op.version || 0)) {
                        await this.storage.updateBook(remoteDeleteBook);
                        console.log(`衝突解決：取消刪除書籍 "${remoteDeleteBook.title}"，使用遠程版本 ${remoteDeleteBook.version}`);
                    }
                    break;
            }
        }
        
        console.log('數據衝突處理完成');
    }
    
    /**
     * 比較兩本書籍是否相同
     * @param {Object} book1 第一本書籍
     * @param {Object} book2 第二本書籍
     * @returns {boolean} 是否相同
     */
    areBooksEqual(book1, book2) {
        // 檢查基本屬性是否相同
        const basicProps = ['title', 'author', 'series', 'category', 'cabinet', 'row', 'publisher', 'isbn'];
        
        for (const prop of basicProps) {
            if (book1[prop] !== book2[prop]) {
                return false;
            }
        }
        
        // 檢查描述和筆記（可能包含較長文本）
        if ((book1.description || '') !== (book2.description || '')) {
            return false;
        }
        
        if ((book1.notes || '') !== (book2.notes || '')) {
            return false;
        }
        
        // 檢查最後修改時間
        if (book1.lastModified && book2.lastModified && 
            new Date(book1.lastModified).getTime() !== new Date(book2.lastModified).getTime()) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 比較兩個數據集是否有差異
     * @param {Array} localBooks 本地書籍數據
     * @param {Array} remoteBooks 遠程書籍數據
     * @returns {boolean} 是否有差異
     */
    compareData(localBooks, remoteBooks) {
        // 檢查數量是否不同
        if (localBooks.length !== remoteBooks.length) {
            return true;
        }
        
        // 創建本地書籍的ID映射
        const localBooksMap = new Map();
        localBooks.forEach(book => {
            localBooksMap.set(book.id, book);
        });
        
        // 檢查每本遠程書籍是否與本地相同
        for (const remoteBook of remoteBooks) {
            const localBook = localBooksMap.get(remoteBook.id);
            
            // 如果本地沒有這本書，或者內容不同，則有差異
            if (!localBook || !this.areBooksEqual(localBook, remoteBook)) {
                return true;
            }
        }
        
        return false;
    }
    
    // 已在上方定義了areBooksEqual方法，此處刪除重複定義
    
    /**
     * 處理數據衝突
     * @param {Object} remoteData 遠程數據
     * @param {Array} localOperations 本地操作記錄
     * @returns {Promise<void>}
     */
    async mergeConflicts(remoteData, localOperations) {
        console.log('處理數據衝突...');
        
        // 創建遠程書籍ID到書籍的映射
        const remoteBooksMap = new Map();
        remoteData.books.forEach(book => {
            remoteBooksMap.set(book.id, book);
        });
        
        // 獲取本地書籍
        const localBooks = await this.storage.getAllBooks();
        const localBooksMap = new Map();
        localBooks.forEach(book => {
            localBooksMap.set(book.id, book);
        });
        
        // 處理每個本地操作
        for (const op of localOperations) {
            switch (op.operation) {
                case 'add':
                case 'update':
                    const bookId = op
    
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
        // 創建自定義事件
        const event = new CustomEvent('githubSync', {
            detail: {
                status: status,
                timestamp: new Date().toISOString(),
                error: error
            }
        });
        
        // 分發事件
        document.dispatchEvent(event);
        
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
                    consistent: false
                };
            }
            
            // 獲取GitHub上的數據
            const githubData = await this.fetchFromGitHub(settings.repo, settings.path, settings.token);
            const remoteBooks = githubData.books;
            
            // 檢查數量是否一致
            if (localBooks.length !== remoteBooks.length) {
                return {
                    status: 'inconsistent',
                    message: `數據不一致: 本地 ${localBooks.length} 筆, 遠程 ${remoteBooks.length} 筆`,
                    consistent: false,
                    localCount: localBooks.length,
                    remoteCount: remoteBooks.length
                };
            }
            
            // 創建ID到書籍的映射
            const localBooksMap = new Map(localBooks.map(book => [book.id, book]));
            
            // 檢查每本書籍
            const inconsistentBooks = [];
            
            for (const remoteBook of remoteBooks) {
                const localBook = localBooksMap.get(remoteBook.id);
                
                // 如果本地沒有此書籍，或版本不一致
                if (!localBook || (remoteBook.version && localBook.version && remoteBook.version !== localBook.version)) {
                    inconsistentBooks.push({
                        id: remoteBook.id,
                        title: remoteBook.title,
                        localVersion: localBook ? localBook.version : null,
                        remoteVersion: remoteBook.version
                    });
                }
            }
            
            if (inconsistentBooks.length > 0) {
                return {
                    status: 'inconsistent',
                    message: `發現 ${inconsistentBooks.length} 筆不一致的數據`,
                    consistent: false,
                    inconsistentBooks
                };
            }
            
            console.log('數據一致性檢查完成: 數