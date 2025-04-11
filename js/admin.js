/**
 * 管理員模組 - 處理管理員特定功能和GitHub API整合
 */

class Admin {
    constructor() {
        // 初始化GitHub設置
        this.initGitHubSettings();
        
        // 初始化事件監聽器
        this.initEventListeners();
    }
    
    /**
     * 初始化GitHub設置
     */
    initGitHubSettings() {
        // 從localStorage獲取GitHub設置
        const settings = localStorage.getItem('githubSettings');
        this.githubSettings = settings ? JSON.parse(settings) : {
            token: '',
            repo: '',
            branch: 'main',
            path: 'books-data.json'
        };
    }
    
    /**
     * 初始化事件監聽器
     */
    initEventListeners() {
        // 獲取元素引用
        const saveGitHubSettingsBtn = document.getElementById('saveGitHubSettingsBtn');
        const githubToken = document.getElementById('githubToken');
        const githubRepo = document.getElementById('githubRepo');
        const githubBranch = document.getElementById('githubBranch');
        const githubPath = document.getElementById('githubPath');
        
        // 如果元素存在，添加事件監聽器
        if (saveGitHubSettingsBtn) {
            // 載入現有設置
            if (githubToken) githubToken.value = this.githubSettings.token || '';
            if (githubRepo) githubRepo.value = this.githubSettings.repo || '';
            if (githubBranch) githubBranch.value = this.githubSettings.branch || 'main';
            if (githubPath) githubPath.value = this.githubSettings.path || 'books-data.json';
            
            // 保存設置按鈕事件
            saveGitHubSettingsBtn.addEventListener('click', () => {
                this.saveGitHubSettings();
            });
        }
    }
    
    /**
     * 保存GitHub設置
     */
    saveGitHubSettings() {
        const githubToken = document.getElementById('githubToken');
        const githubRepo = document.getElementById('githubRepo');
        const githubBranch = document.getElementById('githubBranch');
        const githubPath = document.getElementById('githubPath');
        const githubStatus = document.getElementById('githubStatus');
        
        // 驗證必填欄位
        if (!githubToken.value || !githubRepo.value) {
            this.showGitHubStatus('請填寫必填欄位：個人訪問令牌和倉庫名稱', 'danger');
            return;
        }
        
        // 更新設置
        this.githubSettings = {
            token: githubToken.value.trim(),
            repo: githubRepo.value.trim(),
            branch: githubBranch.value.trim() || 'main',
            path: githubPath.value.trim() || 'books-data.json'
        };
        
        // 保存到localStorage
        localStorage.setItem('githubSettings', JSON.stringify(this.githubSettings));
        
        // 顯示成功訊息
        this.showGitHubStatus('GitHub設置已保存', 'success');
    }
    
    /**
     * 顯示GitHub狀態訊息
     * @param {string} message 訊息
     * @param {string} type 類型 (success, danger, warning)
     */
    showGitHubStatus(message, type) {
        const githubStatus = document.getElementById('githubStatus');
        if (githubStatus) {
            githubStatus.textContent = message;
            githubStatus.className = `alert alert-${type}`;
            githubStatus.classList.remove('d-none');
        }
    }
    
    /**
     * 上傳數據到GitHub
     * @param {Object} data 要上傳的數據
     * @returns {Promise} 上傳結果
     */
    uploadToGitHub(data) {
        return new Promise((resolve, reject) => {
            // 檢查設置是否完整
            if (!this.githubSettings.token || !this.githubSettings.repo) {
                reject(new Error('GitHub設置不完整，請先配置GitHub設置'));
                return;
            }
            
            // 準備API請求URL
            const apiUrl = `https://api.github.com/repos/${this.githubSettings.repo}/contents/${this.githubSettings.path}`;
            
            // 首先獲取文件信息（如果存在）
            fetch(apiUrl, {
                headers: {
                    'Authorization': `token ${this.githubSettings.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            })
            .then(response => {
                if (response.status === 404) {
                    // 文件不存在，創建新文件
                    return { sha: null };
                } else if (!response.ok) {
                    throw new Error(`GitHub API錯誤: ${response.status}`);
                }
                return response.json();
            })
            .then(fileInfo => {
                // 準備上傳數據
                const content = btoa(JSON.stringify(data, null, 2)); // Base64編碼
                
                // 準備請求體
                const requestBody = {
                    message: '更新書籍數據',
                    content: content,
                    branch: this.githubSettings.branch
                };
                
                // 如果文件已存在，添加SHA
                if (fileInfo.sha) {
                    requestBody.sha = fileInfo.sha;
                }
                
                // 發送PUT請求更新或創建文件
                return fetch(apiUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.githubSettings.token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify(requestBody)
                });
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`上傳失敗: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('上傳成功:', data);
                resolve(data);
            })
            .catch(error => {
                console.error('上傳錯誤:', error);
                reject(error);
            });
        });
    }
    
    /**
     * 從Excel匯入並上傳到GitHub
     * @param {Array} books 書籍數據
     * @param {boolean} autoUpload 是否自動上傳到GitHub
     * @returns {Promise} 處理結果
     */
    importFromExcel(books, autoUpload = false) {
        return new Promise((resolve, reject) => {
            // 首先將數據添加到本地數據庫
            const result = db.importBooks(books, true);
            
            // 如果設置了自動上傳且有導入的數據
            if (autoUpload && (result.imported > 0 || result.updated > 0)) {
                // 獲取所有書籍數據
                const allBooks = db.getAllBooks();
                
                // 創建要上傳的數據對象
                const syncData = {
                    books: allBooks,
                    lastSync: new Date().toISOString(),
                    version: '1.0'
                };
                
                // 上傳到GitHub
                this.uploadToGitHub(syncData)
                    .then(() => {
                        // 觸發同步成功事件
                        this.triggerSyncEvent('success');
                        resolve(result);
                    })
                    .catch(error => {
                        // 觸發同步失敗事件
                        this.triggerSyncEvent('error', error);
                        // 仍然返回導入結果，因為本地導入已成功
                        resolve(result);
                    });
            } else {
                // 不需要上傳，直接返回結果
                resolve(result);
            }
        });
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
    }
}

// 初始化管理員實例
const admin = new Admin();