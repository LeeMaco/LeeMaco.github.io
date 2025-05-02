/**
 * 書籍管理系統 - GitHub 集成模塊
 * 負責將數據變更自動上傳到 GitHub
 */

const GitHubSync = {
    // GitHub 配置
    config: {
        // 用戶需要在初始化時設置這些值
        username: '',
        repository: '',
        token: '',
        branch: 'main',
        filePath: 'books_data.json',
        commitMessage: '更新書籍數據'
    },
    
    // 初始化 GitHub 配置
    init: function(config) {
        // 合併用戶提供的配置
        if (config) {
            this.config = {...this.config, ...config};
        }
        
        // 從本地存儲中加載配置
        const savedConfig = localStorage.getItem('github_config');
        if (savedConfig) {
            try {
                const parsedConfig = JSON.parse(savedConfig);
                this.config = {...this.config, ...parsedConfig};
            } catch (e) {
                console.error('加載 GitHub 配置失敗:', e);
            }
        }
        
        return this.isConfigured();
    },
    
    // 保存 GitHub 配置到本地存儲
    saveConfig: function(config) {
        if (config) {
            this.config = {...this.config, ...config};
        }
        localStorage.setItem('github_config', JSON.stringify(this.config));
    },
    
    // 檢查是否已配置 GitHub
    isConfigured: function() {
        return !!this.config.username && !!this.config.repository && !!this.config.token;
    },
    
    // 獲取文件內容
    getFileContent: async function() {
        if (!this.isConfigured()) {
            throw new Error('GitHub 配置不完整');
        }
        
        try {
            const url = `https://api.github.com/repos/${this.config.username}/${this.config.repository}/contents/${this.config.filePath}?ref=${this.config.branch}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    // 文件不存在，返回 null
                    return { content: null, sha: null };
                }
                throw new Error(`獲取文件失敗: ${response.statusText}`);
            }
            
            const data = await response.json();
            const content = atob(data.content); // Base64 解碼
            
            return {
                content: content,
                sha: data.sha // 需要用於更新文件
            };
        } catch (error) {
            console.error('獲取 GitHub 文件內容失敗:', error);
            throw error;
        }
    },
    
    // 上傳文件到 GitHub
    uploadFile: async function(content, sha = null) {
        if (!this.isConfigured()) {
            throw new Error('GitHub 配置不完整');
        }
        
        try {
            const url = `https://api.github.com/repos/${this.config.username}/${this.config.repository}/contents/${this.config.filePath}`;
            
            const body = {
                message: this.config.commitMessage,
                content: btoa(content), // Base64 編碼
                branch: this.config.branch
            };
            
            // 如果有 SHA，則是更新文件
            if (sha) {
                body.sha = sha;
            }
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`上傳文件失敗: ${response.statusText} - ${errorData.message}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('上傳到 GitHub 失敗:', error);
            throw error;
        }
    },
    
    // 同步數據到 GitHub
    syncData: async function(data) {
        try {
            // 檢查配置
            if (!this.isConfigured()) {
                throw new Error('GitHub 配置不完整，請先設置 GitHub 配置');
            }
            
            // 將數據轉換為 JSON 字符串
            const content = JSON.stringify(data, null, 2);
            
            // 獲取現有文件的 SHA
            let fileInfo;
            try {
                fileInfo = await this.getFileContent();
            } catch (e) {
                // 如果獲取文件失敗，假設文件不存在
                fileInfo = { content: null, sha: null };
            }
            
            // 檢查內容是否有變化
            if (fileInfo.content === content) {
                console.log('數據沒有變化，無需上傳');
                return { success: true, message: '數據沒有變化，無需上傳' };
            }
            
            // 上傳文件
            const result = await this.uploadFile(content, fileInfo.sha);
            
            return { 
                success: true, 
                message: '數據已成功同步到 GitHub', 
                commit: result.commit 
            };
        } catch (error) {
            console.error('同步數據到 GitHub 失敗:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    },
    
    // 顯示 GitHub 配置表單
    showConfigForm: function() {
        const configForm = document.createElement('div');
        configForm.className = 'github-config-form';
        configForm.innerHTML = `
            <h2>GitHub 配置</h2>
            <div class="form-group">
                <label for="githubUsername">GitHub 用戶名</label>
                <input type="text" id="githubUsername" value="${this.config.username || ''}" placeholder="例如: your-username">
            </div>
            <div class="form-group">
                <label for="githubRepo">倉庫名稱</label>
                <input type="text" id="githubRepo" value="${this.config.repository || ''}" placeholder="例如: book-management">
            </div>
            <div class="form-group">
                <label for="githubToken">訪問令牌 (Token)</label>
                <input type="password" id="githubToken" value="${this.config.token || ''}" placeholder="例如: ghp_xxxxxxxxxxxx">
                <small>需要有倉庫寫入權限的 <a href="https://github.com/settings/tokens" target="_blank">Personal Access Token</a></small>
            </div>
            <div class="form-group">
                <label for="githubBranch">分支名稱</label>
                <input type="text" id="githubBranch" value="${this.config.branch || 'main'}" placeholder="例如: main">
            </div>
            <div class="form-group">
                <label for="githubFilePath">文件路徑</label>
                <input type="text" id="githubFilePath" value="${this.config.filePath || 'books_data.json'}" placeholder="例如: data/books.json">
            </div>
            <div class="form-actions">
                <button id="saveGithubConfig" class="btn">保存配置</button>
                <button id="testGithubConfig" class="btn">測試連接</button>
                <button id="cancelGithubConfig" class="btn btn-cancel">取消</button>
            </div>
        `;
        
        return configForm;
    },
    
    // 測試 GitHub 連接
    testConnection: async function(config = null) {
        if (config) {
            this.config = {...this.config, ...config};
        }
        
        if (!this.isConfigured()) {
            return { success: false, message: 'GitHub 配置不完整' };
        }
        
        try {
            const url = `https://api.github.com/repos/${this.config.username}/${this.config.repository}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`連接失敗: ${response.statusText}`);
            }
            
            const data = await response.json();
            return { 
                success: true, 
                message: '連接成功', 
                repoInfo: data 
            };
        } catch (error) {
            console.error('測試 GitHub 連接失敗:', error);
            return { 
                success: false, 
                message: `連接失敗: ${error.message}` 
            };
        }
    }
};