/**
 * 書籍查詢管理系統 - 數據緩存模塊
 * 負責處理數據的緩存，提高系統性能
 */

const CacheManager = {
    // 緩存存儲對象
    cache: {},
    
    // 緩存配置
    config: {
        // 默認緩存過期時間（毫秒）
        defaultTTL: 5 * 60 * 1000, // 5分鐘
        // 是否啟用本地存儲持久化
        enableStorage: true,
        // 本地存儲鍵前綴
        storagePrefix: 'cache_',
        // 緩存統計鍵名
        statsKey: 'cache_stats'
    },
    
    // 緩存統計信息
    stats: {
        hits: 0,
        misses: 0,
        sets: 0,
        removes: 0,
        lastReset: new Date().toISOString()
    },
    
    // 初始化緩存系統
    init: function(options = {}) {
        // 合併配置
        this.config = { ...this.config, ...options };
        
        // 從本地存儲加載緩存統計
        if (this.config.enableStorage) {
            const savedStats = localStorage.getItem(this.config.statsKey);
            if (savedStats) {
                try {
                    this.stats = JSON.parse(savedStats);
                } catch (e) {
                    console.error('加載緩存統計失敗:', e);
                }
            }
            
            // 加載持久化的緩存
            this.loadFromStorage();
        }
        
        console.log('緩存系統初始化完成');
        return this;
    },
    
    // 從本地存儲加載緩存
    loadFromStorage: function() {
        if (!this.config.enableStorage) return;
        
        try {
            // 獲取所有緩存鍵
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.config.storagePrefix)) {
                    const cacheKey = key.substring(this.config.storagePrefix.length);
                    const item = localStorage.getItem(key);
                    if (item) {
                        try {
                            const parsed = JSON.parse(item);
                            // 檢查是否過期
                            if (parsed.expiry && parsed.expiry > Date.now()) {
                                this.cache[cacheKey] = parsed;
                            } else {
                                // 刪除過期項
                                localStorage.removeItem(key);
                            }
                        } catch (e) {
                            console.error(`解析緩存項 ${key} 失敗:`, e);
                        }
                    }
                }
            }
            console.log(`從本地存儲加載了 ${Object.keys(this.cache).length} 個緩存項`);
        } catch (e) {
            console.error('從本地存儲加載緩存失敗:', e);
        }
    },
    
    // 保存緩存項到本地存儲
    saveToStorage: function(key, item) {
        if (!this.config.enableStorage) return;
        
        try {
            const storageKey = this.config.storagePrefix + key;
            localStorage.setItem(storageKey, JSON.stringify(item));
        } catch (e) {
            console.error(`保存緩存項 ${key} 到本地存儲失敗:`, e);
            
            // 如果是存儲空間不足，嘗試清理一些緩存
            if (e.name === 'QuotaExceededError') {
                this.clearOldest(10); // 清理10個最舊的項
                try {
                    // 再次嘗試保存
                    const storageKey = this.config.storagePrefix + key;
                    localStorage.setItem(storageKey, JSON.stringify(item));
                } catch (retryError) {
                    console.error(`再次嘗試保存緩存項 ${key} 失敗:`, retryError);
                }
            }
        }
    },
    
    // 更新緩存統計
    updateStats: function() {
        if (this.config.enableStorage) {
            try {
                localStorage.setItem(this.config.statsKey, JSON.stringify(this.stats));
            } catch (e) {
                console.error('保存緩存統計失敗:', e);
            }
        }
    },
    
    // 設置緩存項
    set: function(key, value, ttl) {
        const expiry = Date.now() + (ttl || this.config.defaultTTL);
        const item = {
            value: value,
            expiry: expiry,
            created: Date.now()
        };
        
        this.cache[key] = item;
        this.saveToStorage(key, item);
        
        this.stats.sets++;
        this.updateStats();
        
        return value;
    },
    
    // 獲取緩存項
    get: function(key) {
        const item = this.cache[key];
        
        // 如果項不存在
        if (!item) {
            this.stats.misses++;
            this.updateStats();
            return null;
        }
        
        // 如果項已過期
        if (item.expiry && item.expiry < Date.now()) {
            this.remove(key);
            this.stats.misses++;
            this.updateStats();
            return null;
        }
        
        this.stats.hits++;
        this.updateStats();
        return item.value;
    },
    
    // 移除緩存項
    remove: function(key) {
        if (this.cache[key]) {
            delete this.cache[key];
            
            if (this.config.enableStorage) {
                const storageKey = this.config.storagePrefix + key;
                localStorage.removeItem(storageKey);
            }
            
            this.stats.removes++;
            this.updateStats();
            return true;
        }
        return false;
    },
    
    // 檢查緩存項是否存在且未過期
    has: function(key) {
        const item = this.cache[key];
        if (!item) return false;
        if (item.expiry && item.expiry < Date.now()) {
            this.remove(key);
            return false;
        }
        return true;
    },
    
    // 清除所有緩存
    clear: function() {
        this.cache = {};
        
        if (this.config.enableStorage) {
            // 只清除緩存前綴的項
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.config.storagePrefix)) {
                    localStorage.removeItem(key);
                }
            }
        }
        
        // 重置統計
        this.resetStats();
        
        return true;
    },
    
    // 清理過期的緩存項
    clearExpired: function() {
        const now = Date.now();
        let count = 0;
        const expiredKeys = [];
        
        // 先收集所有過期的鍵，避免在迭代過程中修改對象
        for (const key in this.cache) {
            const item = this.cache[key];
            if (item.expiry && item.expiry < now) {
                expiredKeys.push(key);
                count++;
            }
        }
        
        // 批量刪除過期項
        expiredKeys.forEach(key => this.remove(key));
        
        // 記錄到日誌系統
        if (count > 0 && window.Logger) {
            Logger.info(`已清理 ${count} 個過期緩存項`);
        }
        console.log(`已清理 ${count} 個過期緩存項`);
        return count;
    },
    
    // 清理最舊的N個緩存項
    clearOldest: function(count = 5) {
        // 獲取所有緩存項並按創建時間排序
        const items = Object.keys(this.cache).map(key => ({
            key,
            created: this.cache[key].created || 0
        })).sort((a, b) => a.created - b.created);
        
        // 取最舊的N個
        const oldest = items.slice(0, count);
        
        // 刪除這些項
        oldest.forEach(item => this.remove(item.key));
        
        console.log(`已清理 ${oldest.length} 個最舊的緩存項`);
        return oldest.length;
    },
    
    // 重置統計信息
    resetStats: function() {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            removes: 0,
            lastReset: new Date().toISOString()
        };
        this.updateStats();
    },
    
    // 獲取緩存統計信息
    getStats: function() {
        // 計算命中率
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : 'N/A';
        
        return {
            ...this.stats,
            total,
            hitRate,
            itemCount: Object.keys(this.cache).length
        };
    },
    
    // 創建一個帶有緩存功能的函數
    memoize: function(fn, keyFn, ttl) {
        return (...args) => {
            // 生成緩存鍵
            const key = keyFn ? keyFn(...args) : JSON.stringify(args);
            
            // 檢查緩存
            if (this.has(key)) {
                return this.get(key);
            }
            
            // 執行原函數
            const result = fn(...args);
            
            // 如果結果是Promise，等待解析後緩存
            if (result instanceof Promise) {
                return result.then(value => {
                    this.set(key, value, ttl);
                    return value;
                });
            }
            
            // 緩存結果
            this.set(key, result, ttl);
            return result;
        };
    },
    
    // 創建緩存UI界面
    createCacheViewer: function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('找不到緩存容器元素:', containerId);
            return;
        }
        
        // 創建緩存查看器UI
        container.innerHTML = `
            <div class="cache-viewer">
                <div class="cache-controls">
                    <button id="clearCache">清除所有緩存</button>
                    <button id="clearExpiredCache">清除過期緩存</button>
                    <button id="resetCacheStats">重置統計</button>
                </div>
                <div class="cache-stats">
                    <h3>緩存統計</h3>
                    <table class="stats-table">
                        <tr>
                            <td>項目數量:</td>
                            <td id="cacheItemCount">0</td>
                        </tr>
                        <tr>
                            <td>命中次數:</td>
                            <td id="cacheHits">0</td>
                        </tr>
                        <tr>
                            <td>未命中次數:</td>
                            <td id="cacheMisses">0</td>
                        </tr>
                        <tr>
                            <td>命中率:</td>
                            <td id="cacheHitRate">N/A</td>
                        </tr>
                        <tr>
                            <td>設置次數:</td>
                            <td id="cacheSets">0</td>
                        </tr>
                        <tr>
                            <td>移除次數:</td>
                            <td id="cacheRemoves">0</td>
                        </tr>
                        <tr>
                            <td>上次重置:</td>
                            <td id="cacheLastReset">-</td>
                        </tr>
                    </table>
                </div>
                <div class="cache-items">
                    <h3>緩存項目 <span id="cacheItemsCount"></span></h3>
                    <div class="cache-items-container">
                        <table class="cache-table">
                            <thead>
                                <tr>
                                    <th>鍵</th>
                                    <th>創建時間</th>
                                    <th>過期時間</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody id="cacheEntries"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        // 添加樣式
        const style = document.createElement('style');
        style.textContent = `
            .cache-viewer {
                font-family: Arial, sans-serif;
                margin: 10px 0;
            }
            .cache-controls {
                margin-bottom: 10px;
            }
            .cache-controls button {
                margin-right: 5px;
                padding: 5px 10px;
                background-color: #f8f9fa;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
            }
            .cache-controls button:hover {
                background-color: #e9ecef;
            }
            .cache-stats {
                margin-bottom: 15px;
                padding: 10px;
                background-color: #f8f9fa;
                border-radius: 4px;
            }
            .stats-table {
                width: 100%;
            }
            .stats-table td {
                padding: 3px 5px;
            }
            .cache-items-container {
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            .cache-table {
                width: 100%;
                border-collapse: collapse;
            }
            .cache-table th, .cache-table td {
                padding: 6px 8px;
                text-align: left;
                border-bottom: 1px solid #eee;
            }
            .cache-table th {
                background-color: #f5f5f5;
            }
            .cache-expired {
                color: #dc3545;
            }
            .remove-cache-btn {
                padding: 2px 5px;
                background-color: #dc3545;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            }
        `;
        document.head.appendChild(style);
        
        // 綁定事件
        document.getElementById('clearCache').addEventListener('click', () => {
            if (confirm('確定要清除所有緩存嗎？')) {
                this.clear();
                this.refreshCacheViewer();
            }
        });
        
        document.getElementById('clearExpiredCache').addEventListener('click', () => {
            const count = this.clearExpired();
            alert(`已清理 ${count} 個過期緩存項`);
            this.refreshCacheViewer();
        });
        
        document.getElementById('resetCacheStats').addEventListener('click', () => {
            if (confirm('確定要重置緩存統計嗎？')) {
                this.resetStats();
                this.refreshCacheViewer();
            }
        });
        
        // 初始顯示緩存
        this.refreshCacheViewer();
    },
    
    // 刷新緩存查看器
    refreshCacheViewer: function() {
        // 更新統計信息
        const stats = this.getStats();
        document.getElementById('cacheItemCount').textContent = stats.itemCount;
        document.getElementById('cacheHits').textContent = stats.hits;
        document.getElementById('cacheMisses').textContent = stats.misses;
        document.getElementById('cacheHitRate').textContent = stats.hitRate;
        document.getElementById('cacheSets').textContent = stats.sets;
        document.getElementById('cacheRemoves').textContent = stats.removes;
        document.getElementById('cacheLastReset').textContent = new Date(stats.lastReset).toLocaleString();
        
        // 更新緩存項目
        const cacheEntries = document.getElementById('cacheEntries');
        if (!cacheEntries) return;
        
        // 清空現有項目
        cacheEntries.innerHTML = '';
        
        // 顯示項目數量
        const cacheItemsCount = document.getElementById('cacheItemsCount');
        if (cacheItemsCount) {
            cacheItemsCount.textContent = `(${stats.itemCount})`;
        }
        
        // 獲取所有緩存項並按創建時間排序（最新的在前）
        const now = Date.now();
        const items = Object.keys(this.cache).map(key => ({
            key,
            item: this.cache[key],
            isExpired: this.cache[key].expiry < now
        })).sort((a, b) => b.item.created - a.item.created);
        
        // 顯示緩存項
        items.forEach(({ key, item, isExpired }) => {
            const row = document.createElement('tr');
            if (isExpired) {
                row.className = 'cache-expired';
            }
            
            row.innerHTML = `
                <td title="${key}">${key.length > 30 ? key.substring(0, 27) + '...' : key}</td>
                <td>${new Date(item.created).toLocaleString()}</td>
                <td>${new Date(item.expiry).toLocaleString()}</td>
                <td>
                    <button class="remove-cache-btn" data-key="${key}">移除</button>
                </td>
            `;
            
            cacheEntries.appendChild(row);
        });
        
        // 綁定移除按鈕事件
        const removeButtons = cacheEntries.querySelectorAll('.remove-cache-btn');
        removeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const key = e.target.getAttribute('data-key');
                this.remove(key);
                this.refreshCacheViewer();
            });
        });
    }
};

// 導出CacheManager對象
window.CacheManager = CacheManager;