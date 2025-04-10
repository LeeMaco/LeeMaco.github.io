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
     * @param {string} type 類型 (success, danger, warning, info)
     */
    showGitHubStatus(message, type) {
        const githubStatus = document.getElementById('githubStatus');
        if (githubStatus) {
            // 根據類型選擇圖標
            let icon = '';
            switch(type) {
                case 'success':
                    icon = '<i class="fas fa-check-circle me-2"></i>';
                    break;
                case 'danger':
                    icon = '<i class="fas fa-exclamation-circle me-2"></i>';
                    break;
                case 'warning':
                    icon = '<i class="fas fa-exclamation-triangle me-2"></i>';
                    break;
                case 'info':
                default:
                    icon = '<i class="fas fa-info-circle me-2"></i>';
                    break;
            }
            
            githubStatus.innerHTML = icon + message;
            githubStatus.className = `alert alert-${type}`;
            githubStatus.classList.remove('d-none');
            
            // 如果是錯誤或警告，滾動到狀態消息位置
            if (type === 'danger' || type === 'warning') {
                githubStatus.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }
    
    /**
     * 上傳數據到GitHub
     * @param {Object} data 要上傳的數據
     * @returns {Promise} 上傳結果
     */
    uploadToGitHub(data) {
        return new Promise((resolve, reject) => {
            // 創建或獲取進度條元素
            const progressContainer = document.getElementById('githubProgressContainer') || this.createProgressContainer();
            const progressBar = document.getElementById('githubProgressBar');
            const progressStatus = document.getElementById('githubProgressStatus');
            
            // 顯示進度容器
            progressContainer.classList.remove('d-none');
            progressBar.style.width = '0%';
            progressBar.setAttribute('aria-valuenow', '0');
            progressStatus.textContent = '準備上傳...';
            
            // 檢查設置是否完整
            if (!this.githubSettings.token || !this.githubSettings.repo) {
                this.updateProgress(0, '錯誤：GitHub設置不完整', 'danger');
                reject(new Error('GitHub設置不完整，請先配置GitHub設置'));
                return;
            }
            
            // 準備API請求URL
            const apiUrl = `https://api.github.com/repos/${this.githubSettings.repo}/contents/${this.githubSettings.path}`;
            
            // 更新進度
            this.updateProgress(10, '正在連接GitHub API...', 'info');
            
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
                    this.updateProgress(30, '準備創建新文件...', 'info');
                    return { sha: null };
                } else if (!response.ok) {
                    this.updateProgress(30, `錯誤：GitHub API返回 ${response.status}`, 'danger');
                    throw new Error(`GitHub API錯誤: ${response.status} - ${response.statusText}`);
                }
                this.updateProgress(30, '正在準備更新文件...', 'info');
                return response.json();
            })
            .then(fileInfo => {
                // 準備上傳數據
                this.updateProgress(50, '正在編碼數據...', 'info');
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
                
                this.updateProgress(70, '正在上傳到GitHub...', 'info');
                
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
                    const errorMsg = `上傳失敗: ${response.status} - ${response.statusText}`;
                    let detailedMsg = errorMsg;
                    
                    // 提供更詳細的錯誤信息
                    if (response.status === 401) {
                        detailedMsg = '授權失敗：請檢查您的GitHub個人訪問令牌是否有效';
                    } else if (response.status === 403) {
                        detailedMsg = '權限不足：請確保您的令牌有足夠的權限操作此倉庫';
                    } else if (response.status === 404) {
                        detailedMsg = '找不到資源：請檢查倉庫名稱和路徑是否正確';
                    } else if (response.status === 422) {
                        detailedMsg = '請求無效：可能是提交訊息或內容格式有問題';
                    }
                    
                    this.updateProgress(80, `錯誤：${detailedMsg}`, 'danger');
                    throw new Error(detailedMsg);
                }
                this.updateProgress(90, '上傳成功，正在完成...', 'info');
                return response.json();
            })
            .catch(error => {
                if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                    console.error('網絡連接錯誤:', error);
                    this.updateProgress(80, '錯誤：網絡連接失敗，請檢查您的網絡連接', 'danger');
                    throw new Error('網絡連接失敗，請檢查您的網絡連接');
                }
                throw error;
            })
            .then(data => {
                console.log('上傳成功:', data);
                this.updateProgress(100, '上傳完成！', 'success');
                
                // 3秒後隱藏進度條
                setTimeout(() => {
                    progressContainer.classList.add('d-none');
                }, 3000);
                
                resolve(data);
            })
            .catch(error => {
                console.error('上傳錯誤:', error);
                
                // 提供更友好的錯誤訊息
                let userFriendlyMessage = error.message;
                if (error.message.includes('Failed to fetch') || error.message.includes('Network Error')) {
                    userFriendlyMessage = '網絡連接失敗，請檢查您的網絡連接';
                } else if (error.message.includes('timeout')) {
                    userFriendlyMessage = '請求超時，請稍後再試';
                } else if (error.message.includes('JSON')) {
                    userFriendlyMessage = 'GitHub API返回了無效的數據格式';
                }
                
                this.updateProgress(100, `錯誤：${userFriendlyMessage}`, 'danger');
                
                // 顯示重試按鈕
                const progressContainer = document.getElementById('githubProgressContainer');
                if (progressContainer) {
                    const retryBtn = document.createElement('button');
                    retryBtn.className = 'btn btn-warning mt-2';
                    retryBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>重試上傳';
                    retryBtn.onclick = () => {
                        // 移除重試按鈕
                        retryBtn.remove();
                        // 重置進度條
                        this.updateProgress(0, '準備重新上傳...', 'info');
                        // 重新嘗試上傳
                        setTimeout(() => this.uploadToGitHub(data).then(resolve).catch(reject), 1000);
                    };
                    progressContainer.appendChild(retryBtn);
                }
                
                reject(error);
            });
        });
    }
    
    /**
     * 創建進度條容器
     * @returns {HTMLElement} 進度條容器
     */
    createProgressContainer() {
        // 創建進度條容器
        const container = document.createElement('div');
        container.id = 'githubProgressContainer';
        container.className = 'mt-3 d-none';
        
        // 創建進度狀態文本
        const statusText = document.createElement('div');
        statusText.id = 'githubProgressStatus';
        statusText.className = 'mb-2';
        statusText.textContent = '準備上傳...';
        
        // 創建進度條
        const progressDiv = document.createElement('div');
        progressDiv.className = 'progress';
        
        const progressBar = document.createElement('div');
        progressBar.id = 'githubProgressBar';
        progressBar.className = 'progress-bar';
        progressBar.role = 'progressbar';
        progressBar.style.width = '0%';
        progressBar.setAttribute('aria-valuenow', '0');
        progressBar.setAttribute('aria-valuemin', '0');
        progressBar.setAttribute('aria-valuemax', '100');
        
        // 組裝元素
        progressDiv.appendChild(progressBar);
        container.appendChild(statusText);
        container.appendChild(progressDiv);
        
        // 添加到GitHub設置模態框中
        const modalBody = document.querySelector('#githubSettingsModal .modal-body');
        if (modalBody) {
            modalBody.appendChild(container);
        } else {
            // 如果找不到模態框，添加到body
            document.body.appendChild(container);
        }
        
        return container;
    }
    
    /**
     * 更新上傳進度
     * @param {number} percent 進度百分比
     * @param {string} message 狀態消息
     * @param {string} type 類型 (info, success, danger)
     */
    updateProgress(percent, message, type = 'info') {
        const progressBar = document.getElementById('githubProgressBar');
        const progressStatus = document.getElementById('githubProgressStatus');
        
        if (progressBar && progressStatus) {
            // 更新進度條
            progressBar.style.width = `${percent}%`;
            progressBar.setAttribute('aria-valuenow', percent);
            
            // 根據類型設置進度條顏色
            progressBar.className = `progress-bar bg-${type}`;
            
            // 更新狀態文本
            progressStatus.textContent = message;
            progressStatus.className = `mb-2 text-${type}`;
        }
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