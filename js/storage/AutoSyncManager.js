/**
 * 自動同步管理模塊 - 處理定期檢查GitHub更新和增量同步
 * 實現靜默同步機制，優化用戶體驗
 */

class AutoSyncManager {
    constructor(githubSync, storage) {
        this.githubSync = githubSync;
        this.storage = storage;
        this.syncInterval = null;
        this.lastCheckTime = null;
        this.checkIntervalMinutes = 30; // 默認檢查間隔（分鐘）
        this.retryLimit = 3; // 自動重試次數限制
        this.retryDelay = 5000; // 重試延遲（毫秒）
        this.isSyncing = false; // 同步狀態標記
        this.syncQueue = []; // 同步請求隊列
        
        // 初始化設置
        this.init();
    }
    
    /**
     * 初始化自動同步設置
     */
    async init() {
        try {
            console.log('初始化自動同步管理器...');
            
            // 載入同步設置
            const settings = await this.loadSyncSettings();
            
            // 設置檢查間隔
            if (settings.enabled) {
                this.checkIntervalMinutes = settings.intervalMinutes || 30;
                this.setupAutoSync();
                console.log(`自動同步已啟用，檢查間隔: ${this.checkIntervalMinutes} 分鐘`);
            } else {
                console.log('自動同步未啟用');
            }
            
            // 註冊網絡狀態變化監聽器
            this.registerNetworkListeners();
            
            console.log('自動同步管理器初始化完成');
        } catch (error) {
            console.error('初始化自動同步管理器時發生錯誤:', error);
        }
    }
    
    /**
     * 載入同步設置
     * @returns {Promise<Object>} 同步設置
     */
    async loadSyncSettings() {
        const settings = await this.storage.getSetting('autoSyncSettings') || {};
        return {
            enabled: settings.enabled !== false, // 默認啟用
            intervalMinutes: settings.intervalMinutes || 30,
            syncOnNetworkReconnect: settings.syncOnNetworkReconnect !== false, // 默認啟用
            syncOnStartup: settings.syncOnStartup !== false, // 默認啟用
            silentSync: settings.silentSync !== false, // 默認啟用
            lastCheckTime: settings.lastCheckTime || null
        };
    }
    
    /**
     * 保存同步設置
     * @param {Object} settings 同步設置
     * @returns {Promise<void>}
     */
    async saveSyncSettings(settings) {
        await this.storage.saveSetting('autoSyncSettings', settings);
        
        // 更新當前設置
        if (settings.enabled) {
            this.checkIntervalMinutes = settings.intervalMinutes || 30;
            this.setupAutoSync();
        } else {
            this.stopAutoSync();
        }
    }
    
    /**
     * 設置自動同步
     */
    setupAutoSync() {
        // 清除現有的定時器
        this.stopAutoSync();
        
        // 設置新的定時器
        const intervalMs = this.checkIntervalMinutes * 60 * 1000;
        this.syncInterval = setInterval(() => this.checkForUpdates(), intervalMs);
        
        console.log(`自動同步已設置，每 ${this.checkIntervalMinutes} 分鐘檢查一次`);
        
        // 立即執行一次檢查（延遲10秒，避免應用啟動時負擔過重）
        setTimeout(() => this.checkForUpdates(true), 10000);
    }
    
    /**
     * 停止自動同步
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('自動同步已停止');
        }
    }
    
    /**
     * 註冊網絡狀態變化監聽器
     */
    registerNetworkListeners() {
        // 監聽網絡恢復事件
        window.addEventListener('online', () => {
            console.log('網絡連接已恢復，檢查更新...');
            this.loadSyncSettings().then(settings => {
                if (settings.syncOnNetworkReconnect) {
                    this.checkForUpdates(true);
                }
            });
        });
        
        // 監聽網絡斷開事件
        window.addEventListener('offline', () => {
            console.log('網絡連接已斷開，暫停同步');
            // 可以在這裡添加額外的處理邏輯
        });
    }
    
    /**
     * 檢查GitHub更新
     * @param {boolean} forceSilent 是否強制靜默同步
     * @returns {Promise<Object>} 檢查結果
     */
    async checkForUpdates(forceSilent = false) {
        // 如果已經在同步中，將請求加入隊列
        if (this.isSyncing) {
            console.log('已有同步任務在進行中，將請求加入隊列');
            return new Promise((resolve) => {
                this.syncQueue.push(resolve);
            });
        }
        
        this.isSyncing = true;
        this.lastCheckTime = new Date();
        
        try {
            console.log('檢查GitHub更新...');
            
            // 載入同步設置
            const settings = await this.loadSyncSettings();
            
            // 更新最後檢查時間
            settings.lastCheckTime = this.lastCheckTime.toISOString();
            await this.storage.saveSetting('autoSyncSettings', settings);
            
            // 檢查數據一致性
            const consistencyResult = await this.githubSync.checkDataConsistency();
            
            // 如果數據一致，不需要同步
            if (consistencyResult.consistent) {
                console.log('數據已是最新，無需同步');
                this.processNextInQueue({ status: 'skipped', message: '數據已是最新' });
                return { status: 'skipped', message: '數據已是最新' };
            }
            
            // 執行增量同步
            const silentSync = forceSilent || settings.silentSync;
            const syncResult = await this.performSync(silentSync);
            
            // 處理隊列中的下一個請求
            this.processNextInQueue(syncResult);
            
            return syncResult;
        } catch (error) {
            console.error('檢查更新時發生錯誤:', error);
            
            // 處理隊列中的下一個請求
            this.processNextInQueue({
                status: 'error',
                message: `檢查更新失敗: ${error.message}`,
                error: error.message
            });
            
            return {
                status: 'error',
                message: `檢查更新失敗: ${error.message}`,
                error: error.message
            };
        } finally {
            this.isSyncing = false;
        }
    }
    
    /**
     * 執行同步
     * @param {boolean} silentSync 是否靜默同步
     * @returns {Promise<Object>} 同步結果
     */
    async performSync(silentSync = true) {
        try {
            console.log(`執行${silentSync ? '靜默' : ''}同步...`);
            
            // 使用重試機制執行同步
            let retries = 0;
            let syncResult;
            
            while (retries <= this.retryLimit) {
                try {
                    // 執行同步
                    syncResult = await this.githubSync.syncFromGitHub(false);
                    
                    // 如果同步成功或被跳過，返回結果
                    if (syncResult.status === 'success' || syncResult.status === 'skipped') {
                        break;
                    }
                    
                    // 如果同步失敗，但不是因為網絡問題，不再重試
                    if (!this.isNetworkError(syncResult.error)) {
                        break;
                    }
                    
                    // 增加重試次數
                    retries++;
                    
                    if (retries <= this.retryLimit) {
                        console.log(`同步失敗，${this.retryDelay / 1000}秒後重試 (${retries}/${this.retryLimit})...`);
                        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                    }
                } catch (error) {
                    // 增加重試次數
                    retries++;
                    
                    if (retries > this.retryLimit || !this.isNetworkError(error)) {
                        throw error;
                    }
                    
                    console.log(`同步出錯，${this.retryDelay / 1000}秒後重試 (${retries}/${this.retryLimit})...`);
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                }
            }
            
            // 如果同步成功，觸發事件
            if (syncResult.status === 'success') {
                // 如果不是靜默同步，觸發同步成功事件
                if (!silentSync) {
                    this.triggerSyncEvent('success');
                }
                
                console.log(`同步成功，共 ${syncResult.total} 筆數據`);
            } else if (syncResult.status === 'skipped') {
                console.log(`同步已跳過: ${syncResult.message}`);
            } else {
                console.warn(`同步失敗: ${syncResult.message}`);
                
                // 如果不是靜默同步，觸發同步失敗事件
                if (!silentSync) {
                    this.triggerSyncEvent('error', new Error(syncResult.message));
                }
            }
            
            return syncResult;
        } catch (error) {
            console.error('執行同步時發生錯誤:', error);
            
            // 如果不是靜默同步，觸發同步失敗事件
            if (!silentSync) {
                this.triggerSyncEvent('error', error);
            }
            
            return {
                status: 'error',
                message: `同步失敗: ${error.message}`,
                error: error.message
            };
        }
    }
    
    /**
     * 處理隊列中的下一個請求
     * @param {Object} result 當前請求的結果
     */
    processNextInQueue(result) {
        // 如果隊列中有等待的請求，處理下一個
        if (this.syncQueue.length > 0) {
            const nextResolve = this.syncQueue.shift();
            nextResolve(result);
        }
    }
    
    /**
     * 判斷是否為網絡錯誤
     * @param {Error|string} error 錯誤對象或錯誤信息
     * @returns {boolean} 是否為網絡錯誤
     */
    isNetworkError(error) {
        if (!error) return false;
        
        const errorMessage = typeof error === 'string' ? error : error.message;
        
        // 檢查常見的網絡錯誤關鍵詞
        const networkErrorKeywords = [
            'network', '網絡', 'connection', '連接',
            'timeout', '超時', 'offline', '離線',
            'unreachable', '無法訪問', 'failed to fetch', '獲取失敗'
        ];
        
        return networkErrorKeywords.some(keyword => 
            errorMessage.toLowerCase().includes(keyword.toLowerCase())
        );
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
                error: error,
                source: 'autoSync'
            }
        });
        
        // 分發事件
        document.dispatchEvent(event);
        
        console.log(`GitHub同步事件已觸發 [狀態: ${status}, 來源: autoSync]`);
    }
}

export default AutoSyncManager;