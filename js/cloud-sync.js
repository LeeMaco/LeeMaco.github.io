/**
 * 書籍查詢管理系統 - 雲同步模塊
 * 負責處理與各種雲存儲服務的同步功能
 */

const CloudSync = {
    // 雲服務設置的存儲鍵名
    CLOUD_SETTINGS_KEY: 'cloud_sync_settings',
    
    // 雲服務類型
    CLOUD_SERVICES: {
        GITHUB: 'github',
        GOOGLE_DRIVE: 'google_drive',
        DROPBOX: 'dropbox',
        ONEDRIVE: 'onedrive'
    },
    
    // 初始化雲同步模塊
    init: function() {
        console.log('初始化雲同步模塊');
        
        // 如果本地存儲中沒有雲同步設置，則初始化默認設置
        if (!localStorage.getItem(this.CLOUD_SETTINGS_KEY)) {
            const defaultSettings = {
                enabled: false,
                selectedService: this.CLOUD_SERVICES.GITHUB,
                autoSync: false,
                services: {
                    [this.CLOUD_SERVICES.GITHUB]: {
                        enabled: true,
                        token: localStorage.getItem('githubToken') || '',
                        repo: localStorage.getItem('githubRepo') || '',
                        branch: localStorage.getItem('githubBranch') || 'main'
                    },
                    [this.CLOUD_SERVICES.GOOGLE_DRIVE]: {
                        enabled: false,
                        accessToken: '',
                        refreshToken: '',
                        folderId: ''
                    },
                    [this.CLOUD_SERVICES.DROPBOX]: {
                        enabled: false,
                        accessToken: '',
                        refreshToken: '',
                        folderPath: ''
                    },
                    [this.CLOUD_SERVICES.ONEDRIVE]: {
                        enabled: false,
                        accessToken: '',
                        refreshToken: '',
                        folderId: ''
                    }
                }
            };
            localStorage.setItem(this.CLOUD_SETTINGS_KEY, JSON.stringify(defaultSettings));
        }
    },
    
    // 獲取雲同步設置
    getCloudSettings: function() {
        const settings = localStorage.getItem(this.CLOUD_SETTINGS_KEY);
        return settings ? JSON.parse(settings) : null;
    },
    
    // 保存雲同步設置
    saveCloudSettings: function(settings) {
        localStorage.setItem(this.CLOUD_SETTINGS_KEY, JSON.stringify(settings));
        console.log('雲同步設置已保存:', settings);
        return settings;
    },
    
    // 上傳到選定的雲服務
    uploadToCloud: async function(content, fileName = 'books.json') {
        try {
            const settings = this.getCloudSettings();
            
            if (!settings || !settings.enabled) {
                throw new Error('雲同步功能未啟用');
            }
            
            const selectedService = settings.selectedService;
            const serviceSettings = settings.services[selectedService];
            
            if (!serviceSettings || !serviceSettings.enabled) {
                throw new Error(`所選雲服務 ${selectedService} 未啟用`);
            }
            
            console.log(`開始上傳到 ${selectedService}...`);
            
            switch (selectedService) {
                case this.CLOUD_SERVICES.GITHUB:
                    return await this.uploadToGitHub(content, fileName, serviceSettings);
                case this.CLOUD_SERVICES.GOOGLE_DRIVE:
                    return await this.uploadToGoogleDrive(content, fileName, serviceSettings);
                case this.CLOUD_SERVICES.DROPBOX:
                    return await this.uploadToDropbox(content, fileName, serviceSettings);
                case this.CLOUD_SERVICES.ONEDRIVE:
                    return await this.uploadToOneDrive(content, fileName, serviceSettings);
                default:
                    throw new Error(`不支持的雲服務: ${selectedService}`);
            }
        } catch (error) {
            console.error('上傳到雲服務時發生錯誤:', error);
            throw error;
        }
    },
    
    // 上傳到GitHub
    uploadToGitHub: async function(content, fileName, settings) {
        try {
            // 獲取GitHub個人訪問令牌
            const token = settings.token;
            if (!token) {
                throw new Error('未設置GitHub訪問令牌，請在設置中配置');
            }
            
            // 獲取GitHub倉庫信息
            const repo = settings.repo || '';
            const [owner, repoName] = repo.split('/');
            if (!owner || !repoName) {
                throw new Error('GitHub倉庫格式不正確，應為 "用戶名/倉庫名"');
            }
            
            // 獲取分支名稱
            const branch = settings.branch || 'main';
            
            // 檢查文件是否已存在，獲取SHA
            let fileSha = '';
            try {
                const checkResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/data/${fileName}?ref=${branch}`, {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (checkResponse.status === 200) {
                    const fileData = await checkResponse.json();
                    fileSha = fileData.sha;
                }
            } catch (error) {
                console.log('文件不存在，將創建新文件');
            }
            
            // 準備上傳數據
            const uploadData = {
                message: `更新書籍數據 - ${new Date().toLocaleString()}`,
                content: btoa(unescape(encodeURIComponent(content))),
                branch: branch
            };
            
            // 如果文件已存在，添加SHA
            if (fileSha) {
                uploadData.sha = fileSha;
            }
            
            // 上傳到GitHub
            const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/data/${fileName}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(uploadData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API錯誤: ${errorData.message}`);
            }
            
            const responseData = await response.json();
            console.log('上傳到GitHub成功:', responseData);
            
            return {
                success: true,
                service: this.CLOUD_SERVICES.GITHUB,
                url: responseData.content.html_url,
                fileName: fileName
            };
        } catch (error) {
            console.error('上傳到GitHub時發生錯誤:', error);
            throw error;
        }
    },
    
    // 創建Google Drive文件夾
    createGoogleDriveFolder: async function(folderName) {
        try {
            // 確保訪問令牌有效
            await this.ensureValidGoogleDriveToken();
            
            // 獲取最新的設置
            const settings = this.getCloudSettings();
            const accessToken = settings.services[this.CLOUD_SERVICES.GOOGLE_DRIVE].accessToken;
            
            if (!accessToken) {
                throw new Error('未設置Google Drive訪問令牌，請在設置中配置');
            }
            
            this.updateSyncStatus(`正在創建Google Drive文件夾: ${folderName}...`);
            
            // 檢查文件夾是否已存在
            const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
            const searchResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });
            
            if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                if (searchData.files && searchData.files.length > 0) {
                    this.updateSyncStatus(`找到現有文件夾: ${folderName}`);
                    return searchData.files[0].id;
                }
            } else if (searchResponse.status === 401) {
                // 如果是授權錯誤，嘗試刷新令牌
                this.updateSyncStatus('訪問令牌已過期，正在刷新...');
                await this.refreshGoogleDriveToken();
                // 重新調用創建文件夾方法
                return await this.createGoogleDriveFolder(folderName);
            } else {
                // 處理其他API錯誤
                const errorData = await searchResponse.json();
                console.error('搜索Google Drive文件夾時API返回錯誤:', errorData);
                this.updateSyncStatus('搜索文件夾時發生錯誤，嘗試繼續創建...');
            }
            
            // 創建新文件夾
            this.updateSyncStatus(`正在創建新文件夾: ${folderName}...`);
            const response = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder'
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                // 如果是授權錯誤，嘗試刷新令牌
                if (response.status === 401) {
                    this.updateSyncStatus('訪問令牌已過期，正在刷新...');
                    await this.refreshGoogleDriveToken();
                    // 重新調用創建文件夾方法
                    return await this.createGoogleDriveFolder(folderName);
                }
                throw new Error(`創建文件夾失敗: ${errorData.error?.message || JSON.stringify(errorData)}`);
            }
            
            const folderData = await response.json();
            this.updateSyncStatus(`成功創建文件夾: ${folderName}`);
            
            // 可選：設置文件夾權限
            try {
                await fetch(`https://www.googleapis.com/drive/v3/files/${folderData.id}/permissions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        role: 'reader',
                        type: 'anyone'
                    })
                });
            } catch (permError) {
                console.warn('設置文件夾權限時發生錯誤:', permError);
                // 不中斷流程，僅記錄警告
            }
            
            return folderData.id;
        } catch (error) {
            console.error('創建Google Drive文件夾時發生錯誤:', error);
            this.updateSyncStatus('創建文件夾失敗: ' + error.message);
            throw error;
        }
    },
    
    // 上傳到Google Drive
    uploadToGoogleDrive: async function(content, fileName, settings) {
        try {
            // 確保訪問令牌有效
            await this.ensureValidGoogleDriveToken();
            
            // 獲取最新的設置（可能已經更新了訪問令牌）
            const updatedSettings = this.getCloudSettings();
            const accessToken = updatedSettings.services[this.CLOUD_SERVICES.GOOGLE_DRIVE].accessToken;
            
            if (!accessToken) {
                throw new Error('未設置Google Drive訪問令牌，請在設置中配置');
            }
            
            // 使用設置中的文件夾ID，如果沒有則使用root
            const folderId = settings.folderId || 'root';
            
            // 驗證文件夾ID
            if (folderId !== 'root') {
                this.updateSyncStatus('正在驗證Google Drive文件夾...');
                const isValid = await this.validateGoogleDriveFolderId();
                if (!isValid) {
                    throw new Error('Google Drive文件夾ID無效，請檢查設置');
                }
            }
            
            // 更新同步狀態
            this.updateSyncStatus('正在搜索Google Drive中的文件...');
            
            // 檢查文件是否已存在
            let fileId = null;
            try {
                // 構建查詢參數，搜索指定文件夾中的文件
                const query = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
                const searchResponse = await fetch(
                    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json'
                    }
                });
                
                if (searchResponse.ok) {
                    const searchData = await searchResponse.json();
                    if (searchData.files && searchData.files.length > 0) {
                        fileId = searchData.files[0].id;
                        this.updateSyncStatus(`找到現有文件，準備更新: ${fileName}`);
                    } else {
                        this.updateSyncStatus(`未找到現有文件，準備創建: ${fileName}`);
                    }
                } else {
                    // 處理API錯誤
                    const errorData = await searchResponse.json();
                    console.error('搜索Google Drive文件時API返回錯誤:', errorData);
                    
                    // 如果是授權錯誤，嘗試刷新令牌
                    if (searchResponse.status === 401) {
                        this.updateSyncStatus('訪問令牌已過期，正在刷新...');
                        await this.refreshGoogleDriveToken();
                        // 重新調用上傳方法
                        return await this.uploadToGoogleDrive(content, fileName, settings);
                    }
                    
                    throw new Error(`搜索文件時發生錯誤: ${errorData.error?.message || JSON.stringify(errorData)}`);
                }
            } catch (error) {
                console.error('搜索Google Drive文件時發生錯誤:', error);
                this.updateSyncStatus('搜索文件時發生錯誤，嘗試繼續上傳...');
            }
            
            // 準備文件元數據
            const metadata = {
                name: fileName,
                mimeType: 'application/json'
            };
            
            // 如果不是root文件夾，則指定父文件夾
            if (folderId !== 'root') {
                metadata.parents = [folderId];
            }
            
            this.updateSyncStatus('準備上傳數據...');
            
            // 準備表單數據
            const formData = new FormData();
            const blob = new Blob([content], { type: 'application/json' });
            
            // 添加元數據和文件內容
            formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            formData.append('file', blob);
            
            // 上傳或更新文件
            let response;
            if (fileId) {
                // 更新現有文件
                this.updateSyncStatus('正在更新Google Drive文件...');
                response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: formData
                });
            } else {
                // 創建新文件
                this.updateSyncStatus('正在創建Google Drive文件...');
                response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: formData
                });
            }
            
            // 處理響應
            if (!response.ok) {
                const errorData = await response.json();
                
                // 如果是授權錯誤，嘗試刷新令牌
                if (response.status === 401) {
                    this.updateSyncStatus('訪問令牌已過期，正在刷新...');
                    await this.refreshGoogleDriveToken();
                    // 重新調用上傳方法
                    return await this.uploadToGoogleDrive(content, fileName, settings);
                }
                
                this.updateSyncStatus('上傳失敗: ' + (errorData.error?.message || '未知錯誤'));
                throw new Error(`Google Drive API錯誤: ${errorData.error?.message || JSON.stringify(errorData)}`);
            }
            
            const responseData = await response.json();
            console.log('上傳到Google Drive成功:', responseData);
            
            // 創建共享鏈接（如果需要）
            let webViewLink = '';
            try {
                this.updateSyncStatus('正在創建共享鏈接...');
                const shareResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${responseData.id}/permissions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        role: 'reader',
                        type: 'anyone'
                    })
                });
                
                if (shareResponse.ok) {
                    // 獲取文件的webViewLink
                    const fileInfoResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${responseData.id}?fields=webViewLink,webContentLink`, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    });
                    
                    if (fileInfoResponse.ok) {
                        const fileInfo = await fileInfoResponse.json();
                        webViewLink = fileInfo.webViewLink || fileInfo.webContentLink || '';
                    }
                }
            } catch (error) {
                console.warn('創建共享鏈接時發生錯誤:', error);
                // 不中斷流程，僅記錄警告
            }
            
            this.updateSyncStatus('Google Drive同步完成!');
            
            return {
                success: true,
                service: this.CLOUD_SERVICES.GOOGLE_DRIVE,
                fileId: responseData.id,
                fileName: fileName,
                webViewLink: webViewLink
            };
        } catch (error) {
            console.error('上傳到Google Drive時發生錯誤:', error);
            this.updateSyncStatus('Google Drive同步失敗: ' + error.message);
            throw error;
        }
    },
    
    // 上傳到Dropbox
    uploadToDropbox: async function(content, fileName, settings) {
        try {
            const accessToken = settings.accessToken;
            if (!accessToken) {
                throw new Error('未設置Dropbox訪問令牌，請在設置中配置');
            }
            
            const folderPath = settings.folderPath || '';
            const filePath = folderPath ? `${folderPath}/${fileName}` : `/${fileName}`;
            
            // 上傳文件
            const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/octet-stream',
                    'Dropbox-API-Arg': JSON.stringify({
                        path: filePath,
                        mode: 'overwrite',
                        autorename: false,
                        mute: false
                    })
                },
                body: content
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Dropbox API錯誤: ${errorData.error_summary}`);
            }
            
            const responseData = await response.json();
            console.log('上傳到Dropbox成功:', responseData);
            
            // 創建共享鏈接
            const shareResponse = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: responseData.path_display,
                    settings: {
                        requested_visibility: 'public'
                    }
                })
            });
            
            let shareUrl = '';
            if (shareResponse.ok) {
                const shareData = await shareResponse.json();
                shareUrl = shareData.url;
            }
            
            return {
                success: true,
                service: this.CLOUD_SERVICES.DROPBOX,
                path: responseData.path_display,
                url: shareUrl,
                fileName: fileName
            };
        } catch (error) {
            console.error('上傳到Dropbox時發生錯誤:', error);
            throw error;
        }
    },
    
    // 上傳到OneDrive
    uploadToOneDrive: async function(content, fileName, settings) {
        try {
            const accessToken = settings.accessToken;
            if (!accessToken) {
                throw new Error('未設置OneDrive訪問令牌，請在設置中配置');
            }
            
            const folderId = settings.folderId || 'root';
            let uploadUrl;
            
            if (folderId === 'root') {
                uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${fileName}:/content`;
            } else {
                uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${fileName}:/content`;
            }
            
            // 上傳文件
            const response = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: content
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`OneDrive API錯誤: ${errorData.error.message}`);
            }
            
            const responseData = await response.json();
            console.log('上傳到OneDrive成功:', responseData);
            
            return {
                success: true,
                service: this.CLOUD_SERVICES.ONEDRIVE,
                itemId: responseData.id,
                webUrl: responseData.webUrl,
                fileName: fileName
            };
        } catch (error) {
            console.error('上傳到OneDrive時發生錯誤:', error);
            throw error;
        }
    },
    
    // 授權Google Drive
    authorizeGoogleDrive: function() {
        // Google OAuth2 參數
        const clientId = '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com'; // 請替換為您的實際Google API客戶端ID
        const redirectUri = window.location.origin + '/admin.html';
        const scope = 'https://www.googleapis.com/auth/drive.file';
        
        // 生成隨機狀態值以防止CSRF攻擊
        const state = Math.random().toString(36).substring(2);
        localStorage.setItem('google_auth_state', state);
        
        // 構建授權URL
        const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth' +
            '?client_id=' + encodeURIComponent(clientId) +
            '&redirect_uri=' + encodeURIComponent(redirectUri) +
            '&response_type=code' +
            '&scope=' + encodeURIComponent(scope) +
            '&access_type=offline' +
            '&state=' + encodeURIComponent(state) +
            '&prompt=consent';
        
        // 打開授權窗口
        window.open(authUrl, 'google_auth', 'width=600,height=700');
        
        // 設置消息監聽器以接收授權碼
        const handleAuthCallback = (event) => {
            // 檢查消息來源
            if (event.origin !== window.location.origin) return;
            
            try {
                const data = event.data;
                if (data.type === 'google_auth_callback') {
                    // 移除事件監聽器
                    window.removeEventListener('message', handleAuthCallback);
                    
                    // 驗證狀態以防止CSRF攻擊
                    const savedState = localStorage.getItem('google_auth_state');
                    if (data.state !== savedState) {
                        throw new Error('授權狀態不匹配，可能存在安全風險');
                    }
                    
                    // 使用授權碼交換訪問令牌
                    this.exchangeCodeForToken(data.code, clientId, redirectUri)
                        .then(authResult => {
                            // 更新設置
                            const settings = this.getCloudSettings();
                            settings.services[this.CLOUD_SERVICES.GOOGLE_DRIVE].accessToken = authResult.access_token;
                            settings.services[this.CLOUD_SERVICES.GOOGLE_DRIVE].refreshToken = authResult.refresh_token;
                            settings.services[this.CLOUD_SERVICES.GOOGLE_DRIVE].tokenExpiry = Date.now() + (authResult.expires_in * 1000);
                            this.saveCloudSettings(settings);
                            
                            // 顯示成功消息
                            alert('Google Drive授權成功！');
                            
                            // 驗證文件夾ID
                            this.validateGoogleDriveFolderId();
                        })
                        .catch(error => {
                            console.error('獲取訪問令牌時發生錯誤:', error);
                            alert('Google Drive授權失敗: ' + error.message);
                        });
                }
            } catch (error) {
                console.error('處理授權回調時發生錯誤:', error);
                alert('處理授權回調時發生錯誤: ' + error.message);
            }
        };
        
        window.addEventListener('message', handleAuthCallback);
        
        return {
            pending: true,
            message: '正在等待Google授權...',
        };
    },
    
    // 使用授權碼交換訪問令牌
    exchangeCodeForToken: async function(code, clientId, redirectUri) {
        // 注意：在實際應用中，此請求應在後端進行以保護客戶端密鑰
        // 由於這是前端應用，我們直接與Google OAuth API通信
        // 實際應用中應考慮使用代理服務器以保護客戶端密鑰
        const tokenEndpoint = 'https://oauth2.googleapis.com/token';
        
        // 創建表單數據
        const formData = new URLSearchParams();
        formData.append('code', code);
        formData.append('client_id', clientId);
        formData.append('client_secret', 'YOUR_CLIENT_SECRET'); // 在實際應用中，應從安全的環境變量或後端獲取
        formData.append('redirect_uri', redirectUri);
        formData.append('grant_type', 'authorization_code');
        
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('獲取訪問令牌失敗:', errorData);
            throw new Error(`獲取訪問令牌失敗: ${errorData.error || '未知錯誤'}`);
        }
        
        return await response.json();
    },
    
    // 刷新Google Drive訪問令牌
    refreshGoogleDriveToken: async function() {
        const settings = this.getCloudSettings();
        const refreshToken = settings.services[this.CLOUD_SERVICES.GOOGLE_DRIVE].refreshToken;
        
        if (!refreshToken) {
            throw new Error('沒有可用的刷新令牌，請重新授權Google Drive');
        }
        
        // 直接與Google OAuth API通信
        const tokenEndpoint = 'https://oauth2.googleapis.com/token';
        
        // 創建表單數據
        const formData = new URLSearchParams();
        formData.append('client_id', '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com'); // 請替換為您的實際Google API客戶端ID
        formData.append('client_secret', 'YOUR_CLIENT_SECRET'); // 在實際應用中，應從安全的環境變量或後端獲取
        formData.append('refresh_token', refreshToken);
        formData.append('grant_type', 'refresh_token');
        
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`刷新訪問令牌失敗: ${errorData.error}`);
        }
        
        const tokenData = await response.json();
        
        // 更新設置
        settings.services[this.CLOUD_SERVICES.GOOGLE_DRIVE].accessToken = tokenData.access_token;
        settings.services[this.CLOUD_SERVICES.GOOGLE_DRIVE].tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
        this.saveCloudSettings(settings);
        
        return tokenData;
    },
    
    // 驗證Google Drive文件夾ID
    validateGoogleDriveFolderId: async function() {
        try {
            const settings = this.getCloudSettings();
            const folderId = settings.services[this.CLOUD_SERVICES.GOOGLE_DRIVE].folderId;
            
            // 如果沒有設置文件夾ID，則使用根目錄
            if (!folderId || folderId === 'root') {
                return true;
            }
            
            // 檢查訪問令牌是否有效
            await this.ensureValidGoogleDriveToken();
            
            const accessToken = settings.services[this.CLOUD_SERVICES.GOOGLE_DRIVE].accessToken;
            
            // 檢查文件夾是否存在
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('指定的Google Drive文件夾不存在');
                } else {
                    const errorData = await response.json();
                    throw new Error(`驗證文件夾ID時發生錯誤: ${errorData.error.message}`);
                }
            }
            
            const folderData = await response.json();
            
            // 檢查是否為文件夾
            if (folderData.mimeType !== 'application/vnd.google-apps.folder') {
                throw new Error('指定的ID不是一個文件夾');
            }
            
            console.log('Google Drive文件夾驗證成功:', folderData.name);
            return true;
        } catch (error) {
            console.error('驗證Google Drive文件夾ID時發生錯誤:', error);
            alert(`驗證Google Drive文件夾失敗: ${error.message}`);
            return false;
        }
    },
    
    // 確保Google Drive訪問令牌有效
    ensureValidGoogleDriveToken: async function() {
        const settings = this.getCloudSettings();
        const tokenExpiry = settings.services[this.CLOUD_SERVICES.GOOGLE_DRIVE].tokenExpiry || 0;
        
        // 如果令牌即將過期（5分鐘內），則刷新
        if (Date.now() > tokenExpiry - 300000) {
            await this.refreshGoogleDriveToken();
        }
        
        return settings.services[this.CLOUD_SERVICES.GOOGLE_DRIVE].accessToken;
    },
    
    // 更新同步狀態
    updateSyncStatus: function(message) {
        console.log('同步狀態:', message);
        const statusElement = document.getElementById('cloudSyncStatus');
        if (statusElement) {
            statusElement.textContent = message;
        }
    },
    
    // 授權Dropbox
    authorizeDropbox: function() {
        // 這裡需要實現OAuth2授權流程
        alert('Dropbox授權功能需要後端支持，此處為示例實現');
        
        // 模擬授權成功後的回調
        const mockAuthResult = {
            access_token: 'mock_access_token',
            refresh_token: 'mock_refresh_token',
            expires_in: 3600
        };
        
        // 更新設置
        const settings = this.getCloudSettings();
        settings.services[this.CLOUD_SERVICES.DROPBOX].accessToken = mockAuthResult.access_token;
        settings.services[this.CLOUD_SERVICES.DROPBOX].refreshToken = mockAuthResult.refresh_token;
        this.saveCloudSettings(settings);
        
        return mockAuthResult;
    },
    
    // 授權OneDrive
    authorizeOneDrive: function() {
        // 這裡需要實現OAuth2授權流程
        alert('OneDrive授權功能需要後端支持，此處為示例實現');
        
        // 模擬授權成功後的回調
        const mockAuthResult = {
            access_token: 'mock_access_token',
            refresh_token: 'mock_refresh_token',
            expires_in: 3600
        };
        
        // 更新設置
        const settings = this.getCloudSettings();
        settings.services[this.CLOUD_SERVICES.ONEDRIVE].accessToken = mockAuthResult.access_token;
        settings.services[this.CLOUD_SERVICES.ONEDRIVE].refreshToken = mockAuthResult.refresh_token;
        this.saveCloudSettings(settings);
        
        return mockAuthResult;
    }
};

// 初始化雲同步模塊
document.addEventListener('DOMContentLoaded', function() {
    CloudSync.init();
});