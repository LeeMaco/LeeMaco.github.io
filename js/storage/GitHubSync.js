/**
 * GitHub同步模塊 - 處理與GitHub的數據同步
 * 實現增量同步機制和版本控制，確保數據一致性
 */

class GitHubSync {
    constructor(storage) {
        this.storage = storage; // IndexedDBStorage實例
        this.retryLimit = 3; // 自動重試次數限制
        this.retryDelay = 2000; // 重試延遲（毫秒）
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
        
        // 發送請求
        const response = await fetch(apiUrl, { headers });
        
        // 檢查響應狀態
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`GitHub API錯誤 (${response.status}): ${errorText}`);
            throw new Error(`GitHub API錯誤: ${response.status} ${response.statusText}`);
        }
        
        // 解析數據
        const data = await response.json();
        
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
                message: `更新書籍數據 - ${new Date().toISOString()}`,
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
                // 檢查是否為衝突錯誤 (409 Conflict)
                if (putResponse.status === 409) {
                    console.error('上傳衝突：遠程文件已被修改。', errorText);
                    throw new Error('同步衝突：遠程倉庫已被修改，請先從GitHub同步最新版本');
                } else {
                    console.error(`上傳失敗 (${putResponse.status}): ${errorText}`);
                    throw new Error(`上傳失敗: ${putResponse.status} ${putResponse.statusText}`);
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