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
            
            // 顯示進度容器
            progressContainer.classList.remove('d-none');
            
            // 初始化進度顯示
            this.updateProgress(0, '準備上傳...', 'info', '正在檢查數據和設置...');
            
            // 檢查數據是否為空
            if (!data || (Array.isArray(data) && data.length === 0)) {
                this.updateProgress(0, '錯誤：沒有數據可上傳', 'danger', '請確保有書籍數據後再嘗試上傳');
                reject(new Error('沒有數據可上傳，請確保有書籍數據'));
                return;
            }
            
            // 檢查設置是否完整
            if (!this.githubSettings.token || !this.githubSettings.repo) {
                this.updateProgress(0, '錯誤：GitHub設置不完整', 'danger', 
                    '請先完成GitHub設置，包括個人訪問令牌和倉庫名稱');
                reject(new Error('GitHub設置不完整，請先配置GitHub設置'));
                return;
            }
            
            // 檢查token格式
            const isLegacyToken = /^ghp_[a-zA-Z0-9]{36}$/.test(this.githubSettings.token);
            const isNewToken = /^github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}$/.test(this.githubSettings.token);
            
            if (!isLegacyToken && !isNewToken) {
                this.updateProgress(0, '錯誤：GitHub令牌格式不正確', 'danger', 
                    '請確保使用有效的個人訪問令牌 (PAT)，支持傳統格式 (ghp_) 和新格式 (github_pat_)');
                reject(new Error('GitHub令牌格式不正確，請確保使用有效的個人訪問令牌'));
                return;
            }
            
            // 準備API請求URL
            const apiUrl = `https://api.github.com/repos/${this.githubSettings.repo}/contents/${this.githubSettings.path}`;
            
            // 顯示上傳信息
            const recordCount = Array.isArray(data.books) ? data.books.length : 0;
            const jsonData = JSON.stringify(data, null, 2);
            const dataSize = jsonData.length / 1024;
            
            this.updateProgress(5, `準備上傳數據...`, 'info', 
                `記錄數量: ${recordCount} 筆<br>數據大小: ${dataSize.toFixed(1)}KB<br>目標倉庫: ${this.githubSettings.repo}`);
            
            // 更新進度
            this.updateProgress(10, '正在連接GitHub API...', 'info', '正在檢查文件狀態...');
            
            // 添加網絡超時處理
            const timeoutId = setTimeout(() => {
                this.updateProgress(10, '連接超時，請檢查網絡連接', 'warning', 
                    '連接GitHub API超過10秒，可能是網絡問題或GitHub服務暫時不可用');
            }, 10000); // 10秒超時
            
            // 首先獲取文件信息（如果存在）
            fetch(apiUrl, {
                headers: {
                    'Authorization': `token ${this.githubSettings.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                signal: AbortSignal.timeout(30000) // 30秒超時
            })
            .then(response => {
                // 清除超時計時器
                clearTimeout(timeoutId);
                
                if (response.status === 404) {
                    // 文件不存在，創建新文件
                    this.updateProgress(30, '準備創建新文件...', 'info', 
                        `路徑: ${this.githubSettings.path}<br>分支: ${this.githubSettings.branch}`);
                    return { sha: null };
                } else if (response.status === 401) {
                    this.updateProgress(30, '錯誤：GitHub授權失敗', 'danger', 
                        '請檢查您的訪問令牌是否有效，或令牌是否已過期');
                    throw new Error('GitHub授權失敗，請檢查您的個人訪問令牌是否有效');
                } else if (response.status === 403) {
                    this.updateProgress(30, '錯誤：權限不足', 'danger', 
                        '請確保您的令牌有足夠的權限操作此倉庫，需要 repo 或 public_repo 權限');
                    throw new Error('權限不足，請確保您的令牌有足夠的權限操作此倉庫');
                } else if (!response.ok) {
                    this.updateProgress(30, `錯誤：GitHub API返回 ${response.status}`, 'danger', 
                        `${response.statusText}<br>請檢查您的設置和網絡連接`);
                    throw new Error(`GitHub API錯誤: ${response.status} - ${response.statusText}`);
                }
                this.updateProgress(30, '正在準備更新文件...', 'info', '文件已存在，準備更新內容');
                return response.json();
            })
            .then(fileInfo => {
                // 準備上傳數據
                this.updateProgress(50, '正在處理數據...', 'info', '準備編碼和上傳');
                
                try {
                    // 計算數據大小
                    const dataSizeKB = Math.round(jsonData.length / 1024);
                    
                    // 顯示數據大小信息
                    this.updateProgress(55, `正在進行Base64編碼...`, 'info', 
                        `數據大小: ${dataSizeKB}KB<br>記錄數量: ${recordCount} 筆`);
                    
                    // 檢查數據大小
                    if (dataSizeKB > 1000) { // 如果大於1MB
                        this.updateProgress(55, `處理大型數據...`, 'warning', 
                            `數據較大 (${dataSizeKB}KB)，上傳可能需要較長時間<br>請耐心等待`);
                    }
                    
                    // Base64編碼
                    const content = btoa(jsonData);
                    
                    // 準備請求體
                    const requestBody = {
                        message: `更新書籍數據 (${new Date().toLocaleString()})`,
                        content: content,
                        branch: this.githubSettings.branch
                    };
                    
                    // 如果文件已存在，添加SHA
                    if (fileInfo.sha) {
                        requestBody.sha = fileInfo.sha;
                        this.updateProgress(60, '準備更新現有檔案...', 'info', 
                            `文件路徑: ${this.githubSettings.path}<br>SHA: ${fileInfo.sha.substring(0, 7)}...`);
                    } else {
                        this.updateProgress(60, '準備創建新檔案...', 'info', 
                            `文件路徑: ${this.githubSettings.path}<br>分支: ${this.githubSettings.branch}`);
                    }
                    
                    this.updateProgress(70, '正在上傳到GitHub...', 'info', '數據傳輸中，請稍候...');
                    
                    // 發送PUT請求更新或創建文件
                    return fetch(apiUrl, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `token ${this.githubSettings.token}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/vnd.github.v3+json'
                        },
                        body: JSON.stringify(requestBody),
                        signal: AbortSignal.timeout(60000) // 60秒超時
                    });
                } catch (encodingError) {
                    this.updateProgress(55, `編碼錯誤`, 'danger', 
                        `數據編碼失敗：${encodingError.message}<br>請檢查數據格式或嘗試減少數據量`);
                    throw new Error(`數據編碼失敗：${encodingError.message}`);
                }
            })
            .then(response => {
                if (!response.ok) {
                    const errorMsg = `上傳失敗: ${response.status} - ${response.statusText}`;
                    let detailedMsg = '';
                    
                    // 提供更詳細的錯誤信息
                    if (response.status === 401) {
                        detailedMsg = '授權失敗：請檢查您的GitHub個人訪問令牌是否有效或已過期';
                    } else if (response.status === 403) {
                        detailedMsg = '權限不足：請確保您的令牌有足夠的權限操作此倉庫 (需要repo或public_repo權限)';
                    } else if (response.status === 404) {
                        detailedMsg = '找不到資源：請檢查倉庫名稱和路徑是否正確';
                    } else if (response.status === 422) {
                        detailedMsg = '請求無效：可能是提交訊息或內容格式有問題';
                    } else if (response.status === 409) {
                        detailedMsg = '衝突：遠程倉庫已被修改，請先同步最新版本';
                    } else if (response.status === 429) {
                        detailedMsg = '請求過多：已超過GitHub API速率限制，請稍後再試';
                    } else {
                        detailedMsg = `${response.status} - ${response.statusText}`;
                    }
                    
                    this.updateProgress(80, `錯誤：上傳失敗`, 'danger', detailedMsg);
                    throw new Error(detailedMsg);
                }
                this.updateProgress(90, '上傳成功，正在完成...', 'info', '正在處理GitHub的響應...');
                return response.json();
            })
            .catch(error => {
                if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                    console.error('網絡連接錯誤:', error);
                    this.updateProgress(80, '錯誤：網絡連接失敗', 'danger', 
                        '無法連接到GitHub服務器，請檢查您的網絡連接或稍後再試');
                    throw new Error('網絡連接失敗，請檢查您的網絡連接');
                } else if (error.name === 'AbortError') {
                    console.error('請求超時:', error);
                    this.updateProgress(80, '錯誤：請求超時', 'danger', 
                        '連接GitHub服務器超時，可能是網絡問題或GitHub服務暫時不可用');
                    throw new Error('請求超時，請稍後再試');
                }
                throw error;
            })
            .then(data => {
                console.log('上傳成功:', data);
                
                // 獲取提交URL和文件URL
                const commitUrl = data.commit?.html_url || '';
                const fileUrl = data.content?.html_url || '';
                
                // 顯示成功信息和鏈接
                this.updateProgress(100, '上傳完成！', 'success', 
                    `文件已成功${data.content?.sha ? '更新' : '創建'}<br>
                    ${commitUrl ? `<a href="${commitUrl}" target="_blank" class="text-success">查看提交</a>` : ''}
                    ${fileUrl ? ` | <a href="${fileUrl}" target="_blank" class="text-success">查看文件</a>` : ''}`);
                
                // 觸發同步成功事件
                this.triggerSyncEvent('success');
                
                // 5秒後隱藏進度條
                setTimeout(() => {
                    const progressContainer = document.getElementById('githubProgressContainer');
                    if (progressContainer) {
                        progressContainer.classList.add('d-none');
                    }
                }, 5000);
                
                resolve(data);
            })
            .catch(error => {
                console.error('上傳錯誤:', error);
                
                // 提供更友好的錯誤訊息
                let userFriendlyMessage = error.message;
                let detailedMessage = '';
                
                if (error.message.includes('Failed to fetch') || error.message.includes('Network Error')) {
                    userFriendlyMessage = '網絡連接失敗';
                    detailedMessage = '無法連接到GitHub服務器，請檢查您的網絡連接';
                } else if (error.message.includes('timeout')) {
                    userFriendlyMessage = '請求超時';
                    detailedMessage = '連接GitHub服務器超時，請稍後再試';
                } else if (error.message.includes('JSON')) {
                    userFriendlyMessage = 'API響應格式錯誤';
                    detailedMessage = 'GitHub API返回了無效的數據格式';
                } else {
                    detailedMessage = error.message;
                }
                
                this.updateProgress(100, `錯誤：${userFriendlyMessage}`, 'danger', detailedMessage);
                
                // 觸發同步失敗事件
                this.triggerSyncEvent('error', error);
                
                // 顯示重試按鈕
                const progressContainer = document.getElementById('githubProgressContainer');
                const statusBody = progressContainer?.querySelector('.status-body');
                
                if (statusBody && !statusBody.querySelector('.retry-btn')) {
                    const retryBtn = document.createElement('button');
                    retryBtn.className = 'btn btn-warning btn-sm retry-btn mt-2';
                    retryBtn.innerHTML = '<i class="fas fa-sync-alt me-2"></i>重試上傳';
                    retryBtn.onclick = () => {
                        // 移除重試按鈕
                        retryBtn.remove();
                        // 重置進度條
                        this.updateProgress(0, '準備重新上傳...', 'info', '正在重新初始化上傳程序...');
                        // 重新嘗試上傳
                        setTimeout(() => this.uploadToGitHub(data).then(resolve).catch(reject), 1000);
                    };
                    statusBody.appendChild(retryBtn);
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
     * @param {string} type 類型 (info, success, danger, warning)
     * @param {string} detailMessage 詳細說明訊息
     */
    updateProgress(percent, message, type = 'info', detailMessage = '') {
        const progressBar = document.getElementById('githubProgressBar');
        const progressStatus = document.getElementById('githubProgressStatus');
        const progressContainer = document.getElementById('githubProgressContainer');
        
        if (progressBar && progressStatus) {
            // 更新進度條
            progressBar.style.width = `${percent}%`;
            progressBar.setAttribute('aria-valuenow', percent);
            
            // 根據類型設置進度條顏色
            progressBar.className = `progress-bar progress-bar-striped progress-bar-animated bg-${type}`;
            
            // 更新狀態文本和詳細訊息
            progressStatus.innerHTML = `<strong>${message}</strong>`;
            progressStatus.className = `mb-2 text-${type}`;
            
            // 如果有詳細訊息，添加到狀態下方
            if (detailMessage) {
                // 檢查是否已存在狀態詳情元素
                let statusBody = progressContainer.querySelector('.status-body');
                if (!statusBody) {
                    statusBody = document.createElement('div');
                    statusBody.className = 'status-body small mt-2 p-2 rounded';
                    progressContainer.appendChild(statusBody);
                }
                
                // 設置詳細訊息和樣式
                statusBody.innerHTML = detailMessage;
                statusBody.className = `status-body small mt-2 p-2 rounded bg-${type === 'info' ? 'light' : type === 'success' ? 'light' : 'light'} text-${type}`;
            }
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