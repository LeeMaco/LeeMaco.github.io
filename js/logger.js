/**
 * 書籍查詢管理系統 - 日誌系統模塊
 * 負責處理系統日誌記錄，替代直接使用console.log
 */

const Logger = {
    // 日誌級別
    LEVELS: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        NONE: 4
    },
    
    // 當前日誌級別，默認為INFO
    currentLevel: 1,
    
    // 是否啟用本地存儲
    enableStorage: true,
    
    // 本地存儲鍵名
    STORAGE_KEY: 'app_logs',
    
    // 最大存儲日誌數量
    MAX_STORED_LOGS: 1000,
    
    // 初始化日誌系統
    init: function(level, enableStorage = true) {
        if (level !== undefined) {
            this.currentLevel = level;
        }
        this.enableStorage = enableStorage;
        this.info('日誌系統初始化完成，級別:', this.getLevelName(this.currentLevel));
    },
    
    // 獲取日誌級別名稱
    getLevelName: function(level) {
        for (const name in this.LEVELS) {
            if (this.LEVELS[name] === level) {
                return name;
            }
        }
        return 'UNKNOWN';
    },
    
    // 設置日誌級別
    setLevel: function(level) {
        this.currentLevel = level;
        this.info('日誌級別已設置為:', this.getLevelName(level));
    },
    
    // 格式化日誌消息
    format: function(level, args) {
        const timestamp = new Date().toISOString();
        const levelName = this.getLevelName(level);
        return {
            timestamp,
            level: levelName,
            message: Array.from(args).map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ')
        };
    },
    
    // 存儲日誌到本地存儲
    store: function(logEntry) {
        if (!this.enableStorage) return;
        
        try {
            // 獲取現有日誌
            let logs = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
            
            // 添加新日誌
            logs.push(logEntry);
            
            // 如果超過最大數量，刪除最舊的日誌
            if (logs.length > this.MAX_STORED_LOGS) {
                logs = logs.slice(logs.length - this.MAX_STORED_LOGS);
            }
            
            // 保存回本地存儲
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
        } catch (e) {
            // 如果存儲失敗，直接輸出到控制台
            console.error('存儲日誌失敗:', e);
        }
    },
    
    // 清除存儲的日誌
    clearLogs: function() {
        if (this.enableStorage) {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('已清除所有存儲的日誌');
        }
    },
    
    // 獲取所有存儲的日誌
    getLogs: function() {
        if (!this.enableStorage) return [];
        
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        } catch (e) {
            console.error('獲取日誌失敗:', e);
            return [];
        }
    },
    
    // 導出日誌為JSON文件
    exportLogs: function() {
        const logs = this.getLogs();
        if (logs.length === 0) {
            alert('沒有可導出的日誌');
            return;
        }
        
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `app_logs_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    // 調試級別日誌
    debug: function() {
        if (this.currentLevel <= this.LEVELS.DEBUG) {
            const logEntry = this.format(this.LEVELS.DEBUG, arguments);
            console.debug(`[DEBUG] ${logEntry.message}`);
            this.store(logEntry);
        }
    },
    
    // 信息級別日誌
    info: function() {
        if (this.currentLevel <= this.LEVELS.INFO) {
            const logEntry = this.format(this.LEVELS.INFO, arguments);
            console.info(`[INFO] ${logEntry.message}`);
            this.store(logEntry);
        }
    },
    
    // 警告級別日誌
    warn: function() {
        if (this.currentLevel <= this.LEVELS.WARN) {
            const logEntry = this.format(this.LEVELS.WARN, arguments);
            console.warn(`[WARN] ${logEntry.message}`);
            this.store(logEntry);
        }
    },
    
    // 錯誤級別日誌
    error: function() {
        if (this.currentLevel <= this.LEVELS.ERROR) {
            const logEntry = this.format(this.LEVELS.ERROR, arguments);
            console.error(`[ERROR] ${logEntry.message}`);
            this.store(logEntry);
        }
    },
    
    // 創建日誌UI界面
    createLogViewer: function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('找不到日誌容器元素:', containerId);
            return;
        }
        
        // 創建日誌查看器UI
        container.innerHTML = `
            <div class="log-viewer">
                <div class="log-controls">
                    <select id="logLevel">
                        <option value="0">DEBUG</option>
                        <option value="1" selected>INFO</option>
                        <option value="2">WARN</option>
                        <option value="3">ERROR</option>
                    </select>
                    <button id="clearLogs">清除日誌</button>
                    <button id="exportLogs">導出日誌</button>
                </div>
                <div class="log-container">
                    <table class="log-table">
                        <thead>
                            <tr>
                                <th>時間</th>
                                <th>級別</th>
                                <th>消息</th>
                            </tr>
                        </thead>
                        <tbody id="logEntries"></tbody>
                    </table>
                </div>
            </div>
        `;
        
        // 添加樣式
        const style = document.createElement('style');
        style.textContent = `
            .log-viewer {
                font-family: monospace;
                margin: 10px 0;
            }
            .log-controls {
                margin-bottom: 10px;
            }
            .log-container {
                max-height: 300px;
                overflow-y: auto;
                border: 1px solid #ccc;
            }
            .log-table {
                width: 100%;
                border-collapse: collapse;
            }
            .log-table th, .log-table td {
                padding: 4px 8px;
                text-align: left;
                border-bottom: 1px solid #eee;
            }
            .log-table th {
                background-color: #f5f5f5;
            }
            .log-level-DEBUG { color: #6c757d; }
            .log-level-INFO { color: #0275d8; }
            .log-level-WARN { color: #f0ad4e; }
            .log-level-ERROR { color: #d9534f; }
        `;
        document.head.appendChild(style);
        
        // 綁定事件
        document.getElementById('logLevel').addEventListener('change', (e) => {
            this.setLevel(parseInt(e.target.value));
            this.refreshLogViewer();
        });
        
        document.getElementById('clearLogs').addEventListener('click', () => {
            if (confirm('確定要清除所有日誌嗎？')) {
                this.clearLogs();
                this.refreshLogViewer();
            }
        });
        
        document.getElementById('exportLogs').addEventListener('click', () => {
            this.exportLogs();
        });
        
        // 初始顯示日誌
        this.refreshLogViewer();
    },
    
    // 刷新日誌查看器
    refreshLogViewer: function() {
        const logEntries = document.getElementById('logEntries');
        if (!logEntries) return;
        
        const logs = this.getLogs();
        const level = this.currentLevel;
        
        // 清空現有日誌
        logEntries.innerHTML = '';
        
        // 過濾並顯示日誌
        logs.filter(log => {
            const logLevel = this.LEVELS[log.level];
            return logLevel >= level;
        }).forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td class="log-level-${log.level}">${log.level}</td>
                <td>${log.message}</td>
            `;
            logEntries.appendChild(row);
        });
        
        // 滾動到底部
        const container = logEntries.closest('.log-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
};

// 導出Logger對象
window.Logger = Logger;