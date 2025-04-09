/**
 * 書籍查詢管理系統 - 數據分片存儲模塊
 * 負責處理大量數據的分片存儲和壓縮
 */

const StorageManager = {
    // 分片大小（字節）
    CHUNK_SIZE: 4 * 1024 * 1024, // 4MB
    
    // 分片存儲的前綴
    CHUNK_PREFIX: 'books_chunk_',
    
    // 分片信息的存儲鍵名
    CHUNK_INFO_KEY: 'books_chunk_info',
    
    // 初始化存儲管理器
    init: function() {
        if (!localStorage.getItem(this.CHUNK_INFO_KEY)) {
            localStorage.setItem(this.CHUNK_INFO_KEY, JSON.stringify({
                totalChunks: 0,
                totalSize: 0,
                lastUpdate: null
            }));
        }
    },
    
    // 壓縮數據
    compress: function(data) {
        return JSON.stringify(data)
            .split('')
            .map(char => char.charCodeAt(0))
            .map(code => String.fromCharCode(code + 1))
            .join('');
    },
    
    // 解壓數據
    decompress: function(compressed) {
        return JSON.parse(
            compressed
                .split('')
                .map(char => char.charCodeAt(0))
                .map(code => String.fromCharCode(code - 1))
                .join('')
        );
    },
    
    // 將數據分片存儲
    saveData: function(data) {
        const serializedData = JSON.stringify(data);
        const compressedData = this.compress(serializedData);
        const chunks = [];
        
        // 分片存儲
        for (let i = 0; i < compressedData.length; i += this.CHUNK_SIZE) {
            chunks.push(compressedData.slice(i, i + this.CHUNK_SIZE));
        }
        
        // 更新分片信息
        const chunkInfo = {
            totalChunks: chunks.length,
            totalSize: compressedData.length,
            lastUpdate: new Date().toISOString()
        };
        
        // 存儲分片
        chunks.forEach((chunk, index) => {
            localStorage.setItem(this.CHUNK_PREFIX + index, chunk);
        });
        
        // 存儲分片信息
        localStorage.setItem(this.CHUNK_INFO_KEY, JSON.stringify(chunkInfo));
        
        return chunkInfo;
    },
    
    // 從分片中讀取數據
    loadData: function() {
        const chunkInfo = JSON.parse(localStorage.getItem(this.CHUNK_INFO_KEY));
        if (!chunkInfo || chunkInfo.totalChunks === 0) {
            return null;
        }
        
        // 讀取並合併所有分片
        let compressedData = '';
        for (let i = 0; i < chunkInfo.totalChunks; i++) {
            const chunk = localStorage.getItem(this.CHUNK_PREFIX + i);
            if (!chunk) {
                console.error('分片數據丟失:', i);
                return null;
            }
            compressedData += chunk;
        }
        
        // 解壓縮數據
        try {
            return this.decompress(compressedData);
        } catch (error) {
            console.error('數據解壓縮失敗:', error);
            return null;
        }
    },
    
    // 清理過期的分片數據
    cleanup: function() {
        const chunkInfo = JSON.parse(localStorage.getItem(this.CHUNK_INFO_KEY));
        if (!chunkInfo) return;
        
        // 刪除所有分片
        for (let i = 0; i < chunkInfo.totalChunks; i++) {
            localStorage.removeItem(this.CHUNK_PREFIX + i);
        }
        
        // 重置分片信息
        localStorage.setItem(this.CHUNK_INFO_KEY, JSON.stringify({
            totalChunks: 0,
            totalSize: 0,
            lastUpdate: null
        }));
    }
};