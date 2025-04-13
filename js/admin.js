/**
 * 管理員模組 - 處理管理員特定功能和GitHub API整合
 */

class Admin {
    constructor() {
        // 初始化GitHub設置
        this.initGitHubSettings();
        
        // 初始化事件監聽器
        this.initEventListeners();
        
        // 檢查URL中是否有OAuth回調碼
        this.checkOAuthCallback();
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
            path: 'books-data.json',
            // OAuth相關設置
            clientId: '',
            accessToken: '',
            tokenType: '',
            scope: '',
            expiresAt: null,
            authMethod: 'pat' // 'pat' 或 'oauth'
        };
        
        // 檢查OAuth令牌是否過期
        this.checkTokenExpiration();
    }
    
    /**
     * 檢查OAuth令牌是否過期
     */
    checkTokenExpiration() {
        // 如果使用OAuth且令牌已過期，清除令牌
        if (this.githubSettings.authMethod === 'oauth' && 
            this.githubSettings.expiresAt && 
            new Date() > new Date(this.githubSettings.expiresAt)) {
            
            console.log('OAuth令牌已過期，需要重新授權');
            this.githubSettings.accessToken = '';
            this.githubSettings.expiresAt = null;
            localStorage.setItem('githubSettings', JSON.stringify(this.githubSettings));
        }
    }
    
    /**
     * 初始化事件監聽器
     */
    initEventListeners() {
        // 獲取元素引用
        const saveGitHubSettingsBtn = document.getElementById('saveGitHubSettingsBtn');
        const syncGitHubBtn = document.getElementById('syncGitHubBtn');
        const githubToken = document.getElementById('githubToken');
        const githubRepo = document.getElementById('githubRepo');
        const githubBranch = document.getElementById('githubBranch');
        const githubPath = document.getElementById('githubPath');
        const githubClientId = document.getElementById('githubClientId');
        const githubAuthMethodPat = document.getElementById('githubAuthMethodPat');
        const githubAuthMethodOAuth = document.getElementById('githubAuthMethodOAuth');
        const authorizeGitHubBtn = document.getElementById('authorizeGitHubBtn');
        
        // 如果元素存在，添加事件監聽器
        if (saveGitHubSettingsBtn) {
            // 載入現有設置
            if (githubToken) githubToken.value = this.githubSettings.token || '';
            if (githubRepo) githubRepo.value = this.githubSettings.repo || '';
            if (githubBranch) githubBranch.value = this.githubSettings.branch || 'main';
            if (githubPath) githubPath.value = this.githubSettings.path || 'books-data.json';
            if (githubClientId) githubClientId.value = this.githubSettings.clientId || '';
            
            // 設置授權方式選項
            if (githubAuthMethodPat && githubAuthMethodOAuth) {
                if (this.githubSettings.authMethod === 'oauth') {
                    githubAuthMethodOAuth.checked = true;
                } else {
                    githubAuthMethodPat.checked = true;
                }
                
                // 根據授權方式顯示/隱藏相關欄位
                this.toggleAuthMethodFields();
                
                // 添加授權方式切換事件
                githubAuthMethodPat.addEventListener('change', () => this.toggleAuthMethodFields());
                githubAuthMethodOAuth.addEventListener('change', () => this.toggleAuthMethodFields());
            }
            
            // 保存設置按鈕事件
            saveGitHubSettingsBtn.addEventListener('click', () => {
                this.saveGitHubSettings();
            });
        }
        
        // 如果授權按鈕存在，添加事件監聽器
        if (authorizeGitHubBtn) {
            authorizeGitHubBtn.addEventListener('click', () => {
                this.authorizeWithGitHub();
            });
        }
        
        // 如果同步按鈕存在，添加事件監聽器
        if (syncGitHubBtn) {
            syncGitHubBtn.addEventListener('click', () => {
                this.manualSyncToGitHub();
            });
        }
    }
    
    /**
     * 切換授權方式相關欄位的顯示/隱藏
     */
    toggleAuthMethodFields() {
        const authMethodPat = document.getElementById('githubAuthMethodPat');
        const tokenField = document.getElementById('githubTokenField');
        const clientIdField = document.getElementById('githubClientIdField');
        const authorizeBtn = document.getElementById('authorizeGitHubBtn');
        const authStatusField = document.getElementById('githubAuthStatusField');
        
        if (authMethodPat && tokenField && clientIdField && authorizeBtn) {
            if (authMethodPat.checked) {
                // PAT模式
                tokenField.classList.remove('d-none');
                clientIdField.classList.add('d-none');
                authorizeBtn.classList.add('d-none');
                if (authStatusField) authStatusField.classList.add('d-none');
            } else {
                // OAuth模式
                tokenField.classList.add('d-none');
                clientIdField.classList.remove('d-none');
                authorizeBtn.classList.remove('d-none');
                if (authStatusField) authStatusField.classList.remove('d-none');
                
                // 顯示當前授權狀態
                this.updateOAuthStatus();
            }
        }
    }
    
    /**
     * 更新OAuth授權狀態顯示
     */
    updateOAuthStatus() {
        const authStatusField = document.getElementById('githubAuthStatusField');
        if (!authStatusField) return;
        
        if (this.githubSettings.accessToken && this.githubSettings.authMethod === 'oauth') {
            // 已授權
            let expiryInfo = '';
            if (this.githubSettings.expiresAt) {
                const expiryDate = new Date(this.githubSettings.expiresAt);
                expiryInfo = `，有效期至 ${expiryDate.toLocaleString()}`;
            }
            
            authStatusField.innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle me-2"></i>
                    已成功授權${expiryInfo}
                </div>
            `;
        } else {
            // 未授權
            authStatusField.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    尚未授權，請點擊「授權GitHub」按鈕
                </div>
            `;
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
        const githubClientId = document.getElementById('githubClientId');
        const githubAuthMethodOAuth = document.getElementById('githubAuthMethodOAuth');
        const githubStatus = document.getElementById('githubStatus');
        
        // 獲取選擇的授權方式
        const authMethod = githubAuthMethodOAuth && githubAuthMethodOAuth.checked ? 'oauth' : 'pat';
        
        // 驗證必填欄位
        if (authMethod === 'pat' && (!githubToken.value || !githubRepo.value)) {
            this.showGitHubStatus('請填寫必填欄位：個人訪問令牌和倉庫名稱', 'danger');
            return;
        } else if (authMethod === 'oauth' && (!githubClientId.value || !githubRepo.value)) {
            this.showGitHubStatus('請填寫必填欄位：Client ID和倉庫名稱', 'danger');
            return;
        }
        
        // 保留現有的OAuth令牌信息
        const currentAccessToken = this.githubSettings.accessToken || '';
        const currentTokenType = this.githubSettings.tokenType || '';
        const currentScope = this.githubSettings.scope || '';
        const currentExpiresAt = this.githubSettings.expiresAt || null;
        
        // 更新設置
        this.githubSettings = {
            token: githubToken ? githubToken.value.trim() : '',
            repo: githubRepo.value.trim(),
            branch: githubBranch.value.trim() || 'main',
            path: githubPath.value.trim() || 'books-data.json',
            clientId: githubClientId ? githubClientId.value.trim() : '',
            authMethod: authMethod,
            // 保留OAuth相關信息
            accessToken: currentAccessToken,
            tokenType: currentTokenType,
            scope: currentScope,
            expiresAt: currentExpiresAt
        };
        
        // 保存到localStorage
        localStorage.setItem('githubSettings', JSON.stringify(this.githubSettings));
        
        // 顯示成功訊息
        this.showGitHubStatus('GitHub設置已保存', 'success');
        
        // 如果是OAuth模式，更新授權狀態顯示
        if (authMethod === 'oauth') {
            this.updateOAuthStatus();
        }
    }
    
    /**
     * 使用GitHub OAuth進行授權
     */
    authorizeWithGitHub() {
        // 檢查Client ID是否已設置
        if (!this.githubSettings.clientId) {
            this.showGitHubStatus('請先設置GitHub Client ID', 'danger');
            return;
        }
        
        // 生成隨機狀態值，用於防止CSRF攻擊
        const state = this.generateRandomState();
        localStorage.setItem('githubOAuthState', state);
        
        // 設置重定向URL（當前頁面URL）
        const redirectUri = encodeURIComponent(window.location.href.split('?')[0]);
        
        // 設置所需權限範圍
        const scope = encodeURIComponent('repo');
        
        // 構建授權URL
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${this.githubSettings.clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
        
        // 顯示授權中訊息
        this.showGitHubStatus('正在跳轉至GitHub授權頁面...', 'info');
        
        // 跳轉到GitHub授權頁面
        window.location.href = authUrl;
    }
    
    /**
     * 生成隨機狀態值
     * @returns {string} 隨機字符串
     */
    generateRandomState() {
        const array = new Uint8Array(24);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * 檢查URL中是否有OAuth回調碼
     */
    checkOAuthCallback() {
        // 獲取URL參數
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        // 如果URL中有code和state參數，處理OAuth回調
        if (code && state) {
            // 驗證state參數，防止CSRF攻擊
            const savedState = localStorage.getItem('githubOAuthState');
            if (state !== savedState) {
                console.error('OAuth state不匹配，可能是CSRF攻擊');
                this.showGitHubStatus('授權失敗：安全驗證不通過', 'danger');
                return;
            }
            
            // 清除已使用的state
            localStorage.removeItem('githubOAuthState');
            
            // 顯示正在處理授權的訊息
            this.showGitHubStatus('正在處理GitHub授權...', 'info');
            
            // 使用授權碼獲取訪問令牌
            this.getAccessToken(code);
            
            // 清除URL中的參數，避免刷新頁面時重複處理
            const url = window.location.href.split('?')[0];
            window.history.replaceState({}, document.title, url);
        }
    }
    
    /**
     * 使用授權碼獲取訪問令牌
     * @param {string} code 授權碼
     */
    getAccessToken(code) {
        // 由於GitHub OAuth需要Client Secret，而前端無法安全存儲該信息
        // 這裡使用代理服務器來處理令牌交換，避免暴露Client Secret
        // 實際應用中，應該使用自己的後端服務來處理
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/https://github.com/login/oauth/access_token';
        
        // 準備請求數據
        const data = {
            client_id: this.githubSettings.clientId,
            // client_secret應該在後端處理，這裡僅為示例
            // 實際應用中，應該將code發送到自己的後端，由後端安全地處理令牌交換
            code: code,
            redirect_uri: window.location.href.split('?')[0]
        };
        
        // 發送請求獲取訪問令牌
        fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`獲取訪問令牌失敗: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(`GitHub API錯誤: ${data.error_description || data.error}`);
            }
            
            // 保存訪問令牌信息
            this.githubSettings.accessToken = data.access_token;
            this.githubSettings.tokenType = data.token_type;
            this.githubSettings.scope = data.scope;
            
            // 設置令牌過期時間（GitHub令牌通常有效期為8小時）
            const expiresIn = data.expires_in || 28800; // 默認8小時
            const expiresAt = new Date();
            expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
            this.githubSettings.expiresAt = expiresAt.toISOString();
            
            // 確保授權方式設為OAuth
            this.githubSettings.authMethod = 'oauth';
            
            // 保存設置
            localStorage.setItem('githubSettings', JSON.stringify(this.githubSettings));
            
            // 顯示授權成功訊息
            this.showGitHubStatus('GitHub授權成功！', 'success');
            
            // 更新授權狀態顯示
            this.updateOAuthStatus();
            
            // 如果GitHub設置模態框是開啟的，更新UI
            const githubAuthMethodOAuth = document.getElementById('githubAuthMethodOAuth');
            if (githubAuthMethodOAuth) {
                githubAuthMethodOAuth.checked = true;
                this.toggleAuthMethodFields();
            }
        })
        .catch(error => {
            console.error('獲取訪問令牌錯誤:', error);
            this.showGitHubStatus(`授權失敗: ${error.message}`, 'danger');
        });
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
            
            // 檢查數據是否為空
            if (!data || (Array.isArray(data) && data.length === 0)) {
                this.updateProgress(0, '錯誤：沒有數據可上傳', 'danger');
                reject(new Error('沒有數據可上傳，請確保有書籍數據'));
                return;
            }
            
            // 檢查設置是否完整
            if (this.githubSettings.authMethod === 'pat' && (!this.githubSettings.token || !this.githubSettings.repo)) {
                this.updateProgress(0, '錯誤：GitHub設置不完整', 'danger');
                reject(new Error('GitHub設置不完整，請先配置GitHub設置'));
                return;
            } else if (this.githubSettings.authMethod === 'oauth' && (!this.githubSettings.accessToken || !this.githubSettings.repo)) {
                this.updateProgress(0, '錯誤：GitHub OAuth授權不完整', 'danger');
                reject(new Error('GitHub OAuth授權不完整，請先完成GitHub授權'));
                return;
            }
            
            // 檢查令牌格式
            if (this.githubSettings.authMethod === 'pat' && !/^ghp_[a-zA-Z0-9]{36}$/.test(this.githubSettings.token)) {
                this.updateProgress(0, '錯誤：GitHub令牌格式不正確', 'danger');
                reject(new Error('GitHub令牌格式不正確，請確保使用有效的個人訪問令牌'));
                return;
            }
            
            // 檢查OAuth令牌是否過期
            if (this.githubSettings.authMethod === 'oauth' && 
                this.githubSettings.expiresAt && 
                new Date() > new Date(this.githubSettings.expiresAt)) {
                
                this.updateProgress(0, '錯誤：GitHub OAuth令牌已過期', 'danger');
                reject(new Error('GitHub OAuth令牌已過期，請重新授權'));
                return;
            }
            
            // 準備API請求URL
            const apiUrl = `https://api.github.com/repos/${this.githubSettings.repo}/contents/${this.githubSettings.path}`;
            
            // 顯示上傳信息
            const recordCount = Array.isArray(data.books) ? data.books.length : 0;
            const dataSize = JSON.stringify(data).length / 1024;
            this.updateProgress(5, `準備上傳 ${recordCount} 筆記錄 (約 ${dataSize.toFixed(1)}KB)`, 'info');
            
            // 更新進度
            this.updateProgress(10, '正在連接GitHub API...', 'info');
            
            // 添加網絡超時處理
            const timeoutId = setTimeout(() => {
                this.updateProgress(10, '連接超時，請檢查網絡連接', 'warning');
            }, 10000); // 10秒超時
            
            // 準備授權頭
            let authHeader;
            if (this.githubSettings.authMethod === 'oauth') {
                authHeader = `${this.githubSettings.tokenType || 'Bearer'} ${this.githubSettings.accessToken}`;
            } else {
                authHeader = `token ${this.githubSettings.token}`;
            }
            
            // 首先獲取文件信息（如果存在）
            fetch(apiUrl, {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/vnd.github.v3+json'
                },
                signal: AbortSignal.timeout(30000) // 30秒超時
            })
            .then(response => {
                // 清除超時計時器
                clearTimeout(timeoutId);
                
                if (response.status === 404) {
                    // 文件不存在，創建新文件
                    this.updateProgress(30, '準備創建新文件...', 'info');
                    return { sha: null };
                } else if (response.status === 401) {
                    this.updateProgress(30, '錯誤：GitHub授權失敗，請檢查您的訪問令牌', 'danger');
                    throw new Error('GitHub授權失敗，請檢查您的個人訪問令牌是否有效');
                } else if (response.status === 403) {
                    this.updateProgress(30, '錯誤：權限不足，請確保令牌有足夠權限', 'danger');
                    throw new Error('權限不足，請確保您的令牌有足夠的權限操作此倉庫');
                } else if (!response.ok) {
                    this.updateProgress(30, `錯誤：GitHub API返回 ${response.status} - ${response.statusText}`, 'danger');
                    throw new Error(`GitHub API錯誤: ${response.status} - ${response.statusText}`);
                }
                this.updateProgress(30, '正在準備更新文件...', 'info');
                return response.json();
            })
            .then(fileInfo => {
                // 準備上傳數據
                this.updateProgress(50, '正在編碼數據...', 'info');
                
                try {
                    // 計算數據大小
                    const jsonData = JSON.stringify(data, null, 2);
                    const dataSizeKB = Math.round(jsonData.length / 1024);
                    
                    // 顯示數據大小信息
                    this.updateProgress(55, `數據大小: ${dataSizeKB}KB，正在進行Base64編碼...`, 'info');
                    
                    // 檢查數據大小
                    if (dataSizeKB > 1000) { // 如果大於1MB
                        this.updateProgress(55, `警告：數據較大 (${dataSizeKB}KB)，上傳可能需要較長時間`, 'warning');
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
                        this.updateProgress(60, '檔案已存在，準備更新...', 'info');
                    } else {
                        this.updateProgress(60, '準備創建新檔案...', 'info');
                    }
                    
                    this.updateProgress(70, '正在上傳到GitHub...', 'info');
                    
                    // 準備授權頭
                    let authHeader;
                    if (this.githubSettings.authMethod === 'oauth') {
                        authHeader = `${this.githubSettings.tokenType || 'Bearer'} ${this.githubSettings.accessToken}`;
                    } else {
                        authHeader = `token ${this.githubSettings.token}`;
                    }
                    
                    // 發送PUT請求更新或創建文件
                    return fetch(apiUrl, {
                        method: 'PUT',
                        headers: {
                            'Authorization': authHeader,
                            'Content-Type': 'application/json',
                            'Accept': 'application/vnd.github.v3+json'
                        },
                        body: JSON.stringify(requestBody),
                        signal: AbortSignal.timeout(60000) // 60秒超時
                    });
                } catch (encodingError) {
                    this.updateProgress(55, `編碼錯誤：${encodingError.message}`, 'danger');
                    throw new Error(`數據編碼失敗：${encodingError.message}`);
                }
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
                    } else if (response.status === 409) {
                        detailedMsg = '衝突：遠程倉庫已被修改，請先同步最新版本';
                    } else if (response.status === 429) {
                        detailedMsg = '請求過多：已超過GitHub API速率限制，請稍後再試';
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
                
                // 確保將數據保存到localStorage，這樣即使頁面刷新也能保持同步狀態
                localStorage.setItem('lastGitHubSyncData', JSON.stringify({
                    timestamp: new Date().toISOString(),
                    sha: data.content.sha,
                    url: data.content.html_url
                }));
                
                // 觸發同步成功事件
                this.triggerSyncEvent('success', data);
                
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
                
                // 觸發同步失敗事件
                this.triggerSyncEvent('error', error);
                
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
    
    /**
     * 手動同步數據到GitHub
     * 用戶可以通過UI按鈕觸發此功能
     */
    manualSyncToGitHub() {
        // 顯示同步開始訊息
        this.showGitHubStatus('正在準備同步數據到GitHub...', 'info');
        
        // 檢查設置是否完整
        if (this.githubSettings.authMethod === 'pat' && (!this.githubSettings.token || !this.githubSettings.repo)) {
            this.showGitHubStatus('GitHub設置不完整，請先配置GitHub設置', 'danger');
            return;
        } else if (this.githubSettings.authMethod === 'oauth' && (!this.githubSettings.accessToken || !this.githubSettings.repo)) {
            this.showGitHubStatus('GitHub OAuth授權不完整，請先完成GitHub授權', 'danger');
            return;
        }
        
        // 檢查OAuth令牌是否過期
        if (this.githubSettings.authMethod === 'oauth' && 
            this.githubSettings.expiresAt && 
            new Date() > new Date(this.githubSettings.expiresAt)) {
            
            this.showGitHubStatus('GitHub OAuth令牌已過期，請重新授權', 'danger');
            return;
        }
        
        // 獲取所有書籍數據
        const books = db.getAllBooks();
        
        // 檢查是否有數據
        if (!books || books.length === 0) {
            this.showGitHubStatus('沒有書籍數據可同步', 'warning');
            return;
        }
        
        // 創建要上傳的數據對象
        const syncData = {
            books: books,
            lastSync: new Date().toISOString(),
            version: '1.0'
        };
        
        // 上傳到GitHub
        this.uploadToGitHub(syncData)
            .then(data => {
                console.log('手動同步成功:', data);
                this.showGitHubStatus(`同步成功！共同步了 ${books.length} 筆書籍記錄`, 'success');
                
                // 更新最後同步時間
                localStorage.setItem('lastGitHubSync', new Date().toISOString());
                
                // 觸發同步成功事件
                this.triggerSyncEvent('success', data);
            })
            .catch(error => {
                console.error('手動同步失敗:', error);
                this.showGitHubStatus(`同步失敗: ${error.message}`, 'danger');
                
                // 觸發同步失敗事件
                this.triggerSyncEvent('error', error);
            });
    }
}

// 初始化管理員實例
const admin = new Admin();